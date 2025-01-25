import {
  RenderStates,
  OutputScale,
  approximateFraction,
  roundToDivide
} from "./utils";
import * as pdfjsLib from "pdfjs-dist"


/**
  * @typedef {import("pdfjs-dist").RenderTask} RenderTask
  */

const DEFAULT_SCALE = 1;

export class PDFPageView {
  #page = null;
  #pdfViewer = null;
  #renderQueue = null;
  #canvas = null;
  pageContainer = null;
  #scale = null;
  #renderState = RenderStates.initial;
  #renderError = null;
  #renderContext = null;

  constructor({
    page, pdfViewer, renderQueue
  }) {
    this.#page = page;
    this.id = page.pageNumber;
    this.#pdfViewer = pdfViewer;
    this.#renderQueue = renderQueue;

    this.resume = null;
    this.renderTask = null;

    // creating the page
    const pageContainer = document.createElement("div");
    pageContainer.className = "page";
    pageContainer.setAttribute("data-page-num", this.id);
    this.pageContainer = pageContainer;

    this.setRenderContext();
  }

  get page() {
    return this.#page;
  }

  set page(page) {
    this.#page = page;
  }

  get renderState() {
    return this.#renderState;
  }

  set renderState(state) {
    this.#renderState = state;
  }

  get canvas() {
    return this.#canvas;
  }

  set canvas(canvas) {
    this.#canvas = canvas;
  }

  setScale(scale) {
    this.#scale = scale;
  }

  /**
    * setting the render context of the page view
    */
  setRenderContext() {
    this.reset();

    const canvas = document.createElement("canvas");
    canvas.id = "pdf";

    this.#canvas = canvas;

    const context = canvas.getContext('2d', {
      alpha: false,
    });

    const scale = this.#scale ?? DEFAULT_SCALE;
    const viewport = this.#page.getViewport({ scale });

    // To make the render clearer
    // if we just update the canvas and the render context acccording to the
    // viewport values, the texts will not be clear
    const outputScale = new OutputScale();
    const { width, height } = viewport;
    if (this.#pdfViewer.maxCanvasPixels > 0) {
      const pixelsInViewport = width * height;
      const maxScale = Math.sqrt(this.#pdfViewer.maxCanvasPixels / pixelsInViewport);
      if (outputScale.sx > maxScale || outputScale.sy > maxScale) {
        outputScale.sx = maxScale;
        outputScale.sy = maxScale;
      }
    }
    const sfx = approximateFraction(outputScale.sx);
    const sfy = approximateFraction(outputScale.sy);

    canvas.width = roundToDivide(width * outputScale.sx, sfx[0]);
    canvas.height = roundToDivide(height * outputScale.sy, sfy[0]);

    canvas.style.width = roundToDivide(width, sfx[1]) + "px";
    canvas.style.height = roundToDivide(height, sfy[1]) + "px";

    const { style } = this.pageContainer;
    style.width = roundToDivide(width, sfx[1]) + "px";
    style.height = roundToDivide(height, sfy[1]) + "px";

    const transform = outputScale.scaled
      ? [outputScale.sx, 0, 0, outputScale.sy, 0, 0]
      : null;

    this.#renderContext = {
      canvasContext: context,
      transform,
      viewport,
    };
  }

  /**
    * render the page view
    * @param {Function=} callback callback function after render finish
    */
  render(callback = null) {
    if (this.renderState !== RenderStates.initial) {
      this.reset();
    }

    if (!this.#page || !this.#pdfViewer) {
      this.renderState = RenderStates.finished;
      throw new Error("pdfPage is not loaded");
    }

    if (!this.canvas) this.setRenderContext();

    this.renderState = RenderStates.rendering;

    const onContinueCallback = (cont) => {
      // change to PDFRenderQueue if we use it
      if (!this.#pdfViewer) {
        this.renderState = RenderStates.paused;
        this.resume = () => {
          this.renderState = RenderStates.running;
          cont();
        };
        return;
      }
      cont();
    }

    const renderTask = (this.renderTask = this.#page.render(this.#renderContext));
    renderTask.onContinue = onContinueCallback;

    return renderTask.promise.then(
      async () => {
        // console.log('Page rendered!', this.id);
        await this.#finishRender(renderTask, callback);
      },
      (error) => {
        // console.error('Page error!', this.id);
        return this.#finishRender(renderTask, callback, error);
      }
    ).catch(
      (reason) => {
        console.log(reason);
      }
    );
  }

  /**
    * reset the page view
    * @param {Object} options reset options
    * @param {boolean} [options.keepCanvas=false] whether to keep the canvas
    */
  reset({
    keepCanvas = false
  } = {}) {
    this.renderState = RenderStates.initial;
    this.#renderContext = null;

    if (!keepCanvas) {
      this.canvas?.remove();
      this.canvas = null;
    }
  }

  /**
    * finishing the render task
    * @param {RenderTask} renderTask the render task
    * @param {Function=} callback the callback function
    * @param {Error=} error the render error
    */
  async #finishRender(renderTask, callback = null, error = null) {
    if (renderTask === this.renderTask) this.renderTask = null;

    if (error instanceof pdfjsLib.RenderingCancelledException) {
      this.#renderError = null;
      return;
    }
    this.#renderError = error;

    this.renderState = RenderStates.finished;
    this.pageContainer.appendChild(this.#canvas);
    callback?.(this);

    if (error) throw error;
  }

  destroy() {
    this.reset({
      keepCanvas: false,
    });
    this.page?.cleanup();
  }
}

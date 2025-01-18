import * as pdfjsLib from "pdfjs-dist"


// PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = '/node_modules/pdfjs-dist/build/pdf.worker.mjs';

export const RenderModes = Object.freeze({
  single: 0,
  all: 1
});

class PDFViewBuffer {
  #buffer = [];

}

class PDFPageView {
  #page = null;
  #canvas = null;
  #isRendered = false;

  constructor(canvas) {
    this.#canvas = canvas;
  }

  get page() {
    return this.#page;
  }

  set page(page) {
    this.#page = page;
  }

  get canvas() {
    return this.#canvas;
  }

  set canvas(canvas) {
    this.#canvas = canvas;
  }

  get rendered() {
    return this.#isRendered;
  }

  setRendered(value) {
    this.#isRendered = value;
  }
}

/**
  * PDF viewer
  */
export class PDFViewer {
  #buffer = null;
  #pages = null;
  metadata = null;
  pdfDocument = null;
  pdfLoadingTask = null;
  #currentPage = 0;
  #currentNumPages = 0;
  container = null;
  pageNumElement = null;

  currentRenderMode = null;

  #isRendering = false;

  constructor() {
    this.#buffer = [];
    this.#pages = [];
    this.container = document.getElementById("pdf-container");
    this.pageNumElement = document.getElementById("pdf-page-num");

    this.currentRenderMode = RenderModes.single;
  }

  open(file) {
    this.load(file).then(() => {
      this.render();
    })
  }

  async load(file) {
    if (this.pdfLoadingTask) this.close();
    this.pdfLoadingTask = pdfjsLib.getDocument({ data: file });
    let promise = this.pdfLoadingTask.promise.then((pdf) => {
      this.pdfDocument = pdf;
      this.#currentNumPages = pdf.numPages;
      pdf.getMetadata().then((metadata) => {
        this.metadata = metadata;
      })
      // return new Promise((resolve) => {
      //   resolve();
      // })
      return Promise.withResolvers();
    })
    this.#currentPage = 1;

    return promise;
  }

  get currentPage() {
    return this.#currentPage;
  }

  set currentPage(pageNum) {
    this.#currentPage = pageNum;
  }

  /**
    * render a single page
    * @param param render parameters
    * @param {number} param.pageNum page number of the to render
    * @param {number} param.scale scale of the pdf to render
    * @param {HTMLElement} param.canvas the HTML canvas element to render to
    */
  async renderPage({ pageNum, scale, pageView } = {}) {
    if (!this.pdfDocument) throw new Error('No PDF to render');
    if (!pageNum) throw new Error('No page number specified');
    if (!pageView) throw new Error('No page view specified');

    const { canvas } = pageView;

    const context = canvas.getContext('2d');

    // Load the page.
    return this.pdfDocument.getPage(pageNum).then((page) => {
      const defaultScale = 0.9;
      scale = scale ?? defaultScale;
      const viewport = page.getViewport({ scale });

      // To make the render clearer
      // if we just update the canvas and the render context acccording to the
      // viewport values, the texts will not be clear
      const { width, height } = viewport;
      const outputScale = window.devicePixelRatio || 1;
      canvas.width = Math.floor(width * outputScale);
      canvas.height = Math.floor(height * outputScale);
      const { style } = canvas;
      style.width = Math.floor(width) + "px";
      style.height = Math.floor(height) + "px";

      const transform = outputScale !== 1
            ? [outputScale, 0, 0, outputScale, 0, 0]
            : null;

      const renderContext = {
        canvasContext: context,
        transform,
        viewport,
      };

      pageView.page = page;

      return page.render(renderContext).promise.then(() => {
        console.log('Page rendered!');
        pageView.setRendered(true);
      })
    })
  }

  async #renderSingle() {
    if (!this.pdfDocument) throw new Error('No PDF to render');

    if (this.#pages.length !== 1) {
      this.#pages = [];
      const newCanvas = document.createElement("canvas");
      newCanvas.id = `pdf`
      this.container.appendChild(newCanvas);
      this.#pages.push(new PDFPageView(newCanvas));
    }

    this.pageNumElement.innerHTML = `${this.#currentPage} / ${this.#currentNumPages}`;
    return this.renderPage({
      pageNum: this.#currentPage,
      pageView: this.#pages[0],
    });
  }

  async #renderAll() {
    if (!this.pdfDocument) throw new Error('No PDF to render');

    let pageNum = 0;

    const newPageView = () => {
      if (pageNum >= this.#currentNumPages) return;
      pageNum++;
      const newCanvas = document.createElement("canvas");
      newCanvas.id = `pdf-${pageNum}`
      this.container.appendChild(newCanvas);
      const pageView = new PDFPageView(newCanvas);
      this.#pages.push(pageView);

      return this.renderPage({ pageNum, pageView }).then(newPageView);
    }

    return newPageView();
  }

  async render(renderMode) {
    if (renderMode !== undefined && renderMode !== null && renderMode !== this.currentRenderMode) {
      this.#pages.forEach((pageView) => pageView.canvas.remove());
      this.#pages = [];
      this.#buffer.forEach((canvas) => canvas.remove());
      this.container.innerHTML = "";
      this.currentRenderMode = renderMode;
    }

    switch (this.currentRenderMode) {
      case RenderModes.single:
        this.#currentPage = 1;
        return this.#renderSingle();
      case RenderModes.all:
        return this.#renderAll();
    }
  }

  async close() {
    if (!this.pdfLoadingTask) return;

    const promises = [];

    promises.push(this.pdfLoadingTask.destroy());
    this.pdfLoadingTask = null;

    this.#pages.forEach((pageView) => pageView.canvas.remove());
    this.#pages = [];
    this.#buffer.forEach((canvas) => canvas.remove());
    this.pdfDocument.destroy();
    this.pdfDocument = null;
    this.container.innerHTML = "";

    await Promise.all(promises);
  }

  nextPage() {
    if (this.currentRenderMode !== RenderModes.single) return;
    if (this.#currentPage === this.#currentNumPages) return;
    if (this.#currentPage > this.#currentNumPages) {
      this.#currentPage = this.#currentNumPages;
      return;
    }
    this.#currentPage++;
    this.#renderSingle();
  }

  prevPage() {
    if (this.currentRenderMode !== RenderModes.single) return;
    const FIRST_PAGE = 1;
    if (this.#currentPage === FIRST_PAGE) return;
    if (this.#currentPage < FIRST_PAGE) {
      this.#currentPage = FIRST_PAGE;
      return;
    }
    this.#currentPage--;
    this.#renderSingle();
  }

  nextRenderMode(callback) {
    const modes = Object.keys(RenderModes);
    const newRenderMode = (this.currentRenderMode + 1) % modes.length;
    if (callback) callback(newRenderMode);

    this.render(newRenderMode);
  }

  reset() {
  }
};

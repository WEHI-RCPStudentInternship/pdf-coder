import * as pdfjsLib from "pdfjs-dist"
import { RenderModes, RenderStates, getVisibleElements } from "./utils"
import { PDFPageView } from "./page_view"
import { PDFRenderQueue } from "./render_queue";


const DEFAULT_CACHE_SIZE = 10;

// PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = '/node_modules/pdfjs-dist/build/pdf.worker.mjs';

class PDFViewBuffer {
  #buffer = new Set();
  #size = 0;

  constructor(size) {
    this.#size = size;
  }

  push(pageView) {
    const buffer = this.#buffer;

    // move the item to the end of buffer if exists
    if (buffer.has(pageView)) {
      buffer.delete(pageView);
    }
    buffer.add(pageView);

    if (buffer.size > this.#size) {
      this.#destroyFirst();
    }
  }

  has(pageView) {
    return this.#buffer.has(pageView);
  }

  resize(newSize) {
  }

  #destroyFirst() {
    const pageView = this.#buffer.keys().next().value;

    pageView?.destroy();
    this.#buffer.delete(pageView);
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
  #maxCanvasPixels = null;
  #renderQueue = null;

  currentRenderMode = null;

  constructor() {
    this.#maxCanvasPixels = 2 ** 25;
    this.#renderQueue = new PDFRenderQueue(this);

    this.container = document.getElementById("pdf-container");
    this.pageNumElement = document.getElementById("pdf-page-num");

    this.container.addEventListener("scrollend", this.update.bind(this), {
      passive: true,
    });

    this.#reset();
  }

  open(url) {
    if (this.pdfLoadingTask) this.close();
    this.pdfLoadingTask = pdfjsLib.getDocument(url);

    this.pdfLoadingTask.promise.then(
      async (pdfDocument) => {
        await this.load(pdfDocument);
        this.update();
      }
    );
  }

  get renderQueue() {
    return this.#renderQueue;
  }

  get maxCanvasPixels() {
    return this.#maxCanvasPixels;
  }

  async load(pdfDocument) {
    this.pdfDocument = pdfDocument;
    this.#currentNumPages = pdfDocument.numPages;
    pdfDocument.getMetadata().then((metadata) => {
      this.metadata = metadata;
    })

    const pagesPromise = [];

    // get the pages
    for (let i = 1; i <= pdfDocument.numPages; i++) {
      pagesPromise.push(pdfDocument.getPage(i));
    }
    this.#currentPage = 1;

    // load the pages
    return Promise.all(pagesPromise).then(
      async ([...pages]) => {
        pages.forEach((page) => {
          this.#pages.push(new PDFPageView({
            page,
            pdfViewer: this,
            renderQueue:this.#renderQueue,
          }));
        })
      }
    )
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
    * @param {number} param.pageNum page number of the pdf to render
    * @param {number} param.scale scale of the pdf to render
    */
  // async renderPage({ pageNum, scale } = {}) {
  //   if (!this.pdfDocument) throw new Error('No PDF to render');
  //   if (!pageNum) throw new Error('No page number specified');
  //
  //   // Render the page
  //   const pageView = this.#pages[pageNum - 1];
  //   if (scale) pageView.setScale(scale);
  //
  //   return pageView.render();
  // }
  //
  // #renderSingle(reset = false) {
  //   if (!this.pdfDocument) throw new Error('No PDF to render');
  //   if (reset) this.container.childNodes.forEach((node) => node.remove());
  //
  //   this.pageNumElement.innerHTML = `${this.#currentPage} / ${this.#currentNumPages}`;
  //   this.renderPage({
  //     pageNum: this.#currentPage,
  //   });
  // }
  //
  // #renderAll(reset = false) {
  //   if (!this.pdfDocument) throw new Error('No PDF to render');
  //   if (reset) this.container.childNodes.forEach((node) => node.remove());
  //
  //   let pageNum = 0;
  //
  //   const renderNext = async () => {
  //     if (pageNum >= this.#currentNumPages) return;
  //     pageNum++;
  //     await this.renderPage({ pageNum }).then(renderNext)
  //   }
  //
  //   renderNext();
  // }
  //
  // render() {
  //   switch (this.currentRenderMode) {
  //     case RenderModes.single:
  //       this.#currentPage = 1;
  //       this.#renderSingle(true);
  //       break;
  //     case RenderModes.all:
  //       this.#renderAll(true);
  //       break;
  //   }
  // }

  #updateBuffer(pageView) {
    this.#buffer.push(pageView);
  }

  update() {
    const { visible, preRenderViews } = this.#getVisiblePageViews();

    this.currentPage = visible[0].id;
    this.pageNumElement.innerHTML = `${this.#currentPage} / ${this.#currentNumPages}`;

    visible.forEach(async (view) => {
      if (view.renderState === RenderStates.rendering) return;
      if (view.renderState === RenderStates.paused) {
        view.resume();
        return;
      }
      await view.render(this.#updateBuffer.bind(this));
    })

    preRenderViews.forEach(async (view) => {
      if (view.renderState === RenderStates.rendering) return;
      if (view.renderState === RenderStates.paused) {
        view.resume();
        return;
      }
      await view.render(this.#updateBuffer.bind(this));
    })
  }

  jumpToPage(pageNum) {
  }

  #getVisiblePageViews() {
    const views = (this.currentRenderMode === RenderModes.single) ?
      [this.#pages[this.currentPage - 1]] :
      this.#pages;

    if (this.currentRenderMode === RenderModes.single) {
      this.container.childNodes.forEach((node) => node.remove());
      views.forEach((view) => this.container.appendChild(view.pageContainer));
    }

    return getVisibleElements({
      scrollElement: this.container,
      views,
    });
  }

  async close() {
    if (!this.pdfLoadingTask) return;

    const promises = [];

    promises.push(this.pdfLoadingTask.destroy());
    this.pdfLoadingTask = null;

    this.#reset();
    this.pdfDocument.destroy();
    this.pdfDocument = null;
    this.container.childNodes.forEach((node) => node.remove());

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

    this.container.firstElementChild.remove();
    this.update();
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

    this.container.firstElementChild.remove();
    this.update();
  }

  nextRenderMode(callback) {
    const modes = Object.keys(RenderModes);
    const newRenderMode = (this.currentRenderMode + 1) % modes.length;
    this.currentRenderMode = newRenderMode;
    if (callback) callback(newRenderMode);

    this.container.childNodes.forEach((node) => node.remove());
    if (this.currentRenderMode === RenderModes.all) {
      this.#pages.forEach(
        (page) => {
          this.container.appendChild(page.pageContainer);
        }
      );
    } else {
      this.container.appendChild(this.#pages[this.currentPage - 1].pageContainer);
    }

    this.update();
  }

  #reset() {
    this.#buffer = new PDFViewBuffer(DEFAULT_CACHE_SIZE);
    this.#pages = [];

    this.currentRenderMode = RenderModes.single;
  }
};

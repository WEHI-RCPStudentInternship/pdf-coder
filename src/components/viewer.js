import * as pdfjsLib from "pdfjs-dist"
import { RenderModes, RenderStates, getVisibleElements } from "./utils"
import { PDFPageView } from "./page_view"
import { PDFRenderQueue } from "./render_queue";


/**
  * @typedef {import("pdfjs-dist").PDFDocumentProxy} PDFDocumentProxy
  */
/**
  * @typedef {Object} VisiblePageViews
  * @property {PDFPageView[]} visible page views to render
  * @property {PDFPageView[]} preRenderViews page views to pre render
  */

const DEFAULT_CACHE_SIZE = 10;

// PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = '/node_modules/pdfjs-dist/build/pdf.worker.mjs';

class PDFViewBuffer {
  #buffer = new Set();
  #size = 0;

  constructor(size) {
    this.#size = size;
  }

  /**
    * add new page view to the buffer and remove old items if size exceeded
    * @param {PDFPageView} pageView the page view to add
    */
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

  /**
    * destroy the first item in the buffer
    */
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
  pageInputElement = null;
  totalPageNumElement = null;
  #maxCanvasPixels = null;
  #renderQueue = null;

  currentRenderMode = null;

  constructor() {
    this.#maxCanvasPixels = 2 ** 25;
    this.#renderQueue = new PDFRenderQueue(this);

    this.container = document.getElementById("pdf-container");
    this.pageNumElement = document.getElementById("page-num");
    this.pageInputElement = document.getElementById("page-input");
    this.totalPageNumElement = document.getElementById("total-page-num");

    this.bindEvents();

    this.#reset();
  }


  bindEvents() {
    // const hasScrollEndEvent = ("onscrollend" in window);
    const handleScroll = () => {
      if (this.currentRenderMode === RenderModes.single) return;
      this.update();
    }
    this.container.addEventListener(
      // hasScrollEndEvent ? "scrollend" : "scroll",
      "scroll",
      handleScroll.bind(this),
      {
        passive: true,
      }
    );

    const onInputChange = (e) => {
      e.target.blur();

      const inputLength = e.target.value.length;

      if (
        inputLength === 0 ||
        parseInt(e.target.value) > this.#currentNumPages
      ) {
        this.pageInputElement.value = this.currentPage;

        const len = this.pageInputElement.value.length;
        const style = window.getComputedStyle(e.target);
        const minWidth = parseInt(style.minWidth),
          maxWidth = parseInt(style.maxWidth);

        e.target.style.width = Math.min((minWidth * len), maxWidth) + 'px';
        return;
      }

      this.jumpToPage(parseInt(e.target.value));
    }
    this.pageInputElement.addEventListener(
      "change", onInputChange.bind(this), { passive: true }
    );
  }


  /**
    * open the document - to be changed when we connects with the backend
    * @param {string} url the string of the url object
    */
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


  /**
    * load the document
    * @param {PDFDocumentProxy} pdfDocument the pdf document
    */
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
    * update the buffer
    * @param {PDFPageView} pageView the page view to update
    */
  #updateBuffer(pageView) {
    this.#buffer.push(pageView);
  }


  /**
    * update the viewer state
    */
  update() {
    const { visible, preRenderViews } = this.#getVisiblePageViews();

    this.currentPage = visible[0].id;
    this.pageInputElement.value = this.#currentPage
    this.totalPageNumElement.innerHTML = this.#currentNumPages;

    [...visible, ...preRenderViews].forEach(
      async (pageView) => {
        switch (pageView.renderState) {
          case RenderStates.finished:
            return;
          case RenderStates.paused:
            pageView.resume();
            break;
          case RenderStates.rendering:
            break;
          case RenderStates.initial:
            await pageView.render(this.#updateBuffer.bind(this));
            break;
        }
      }
    )
  }


  /**
    * move the focus to the specified page
    * @param {number=} pageNum the page number to move to
    */
  jumpToPage(pageNum) {
    if (pageNum > this.#currentNumPages) return;

    switch (this.currentRenderMode) {
      case RenderModes.single:
        this.currentPage = pageNum;
        this.update();
        break;
      case RenderModes.all:
        const page =
          this.#pages[(pageNum ? pageNum : this.currentPage) - 1].pageContainer;

        // scroll the container to page
        this.container.scrollTop =
          page.offsetTop -
          // move the page slightly down
        parseInt(window.getComputedStyle(this.container).gap) / 2;
        break;
    }
  }


  /**
    * getting the visible pages and some pages to pre render
    * @returns {VisiblePageViews} The visible and pre render page views
    */
  #getVisiblePageViews() {
    switch (this.currentRenderMode) {
      case RenderModes.single:
        const visible = [this.#pages[this.currentPage - 1]];
        const preRenderViews = [];

        if (this.currentPage - 1 >= 1) {
          preRenderViews.push(this.#pages[this.currentPage - 2]);
        }
        if (this.currentPage + 1 <= this.#currentNumPages) {
          preRenderViews.push(this.#pages[this.currentPage]);
        }

        if (this.currentRenderMode === RenderModes.single) {
          Array.from(this.container.childNodes).forEach((node) => node.remove());
          visible.forEach(
            (view) => this.container.appendChild(view.pageContainer)
          );
        }

        return {
          visible,
          preRenderViews
        }
      case RenderModes.all:
        const views = this.#pages;

        return getVisibleElements({
          scrollElement: this.container,
          views,
        });
    }
  }


  async close() {
    if (!this.pdfLoadingTask) return;

    const promises = [];

    promises.push(this.pdfLoadingTask.destroy());
    this.pdfLoadingTask = null;

    this.#reset();
    this.pdfDocument.destroy();
    this.pdfDocument = null;
    Array.from(this.container.childNodes).forEach((node) => node.remove());

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


  /**
    * change to the next available render mode
    * @param {Function} callback
    */
  nextRenderMode(callback) {
    const modes = Object.keys(RenderModes);
    const newRenderMode = (this.currentRenderMode + 1) % modes.length;
    if (callback) callback(newRenderMode);

    this.updateRenderMode(newRenderMode);
  }


  /**
    * update render mode
    * @param {keyof RenderModes} renderMode
    */
  updateRenderMode(renderMode) {
    this.currentRenderMode = renderMode;

    Array.from(this.container.childNodes).forEach((node) => node.remove());
    if (this.currentRenderMode === RenderModes.all) {
      this.#pages.forEach(
        (page) => {
          this.container.appendChild(page.pageContainer);
        }
      );

      this.jumpToPage();
    }
  }


  #reset() {
    this.#buffer = new PDFViewBuffer(DEFAULT_CACHE_SIZE);
    this.#pages = [];

    this.currentRenderMode = RenderModes.single;
  }
};

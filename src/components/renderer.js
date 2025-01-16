import * as pdfjsLib from "pdfjs-dist"


// PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = '/node_modules/pdfjs-dist/build/pdf.worker.mjs';

export const RenderModes = Object.freeze({
  single: 0,
  all: 1
});

// pdf file renderer
export class PDFViewer {
  canvases = [];
  metadata = null;
  pdfDocument = null;
  currentPage = 0;
  currentNumPages = 0;
  container = null;
  pageNumElement = null;

  currentRenderMode = null;

  constructor() {
    this.currentPage = 0;
    this.currentNumPages = 0;
    this.container = document.getElementById("pdf-container");
    this.pageNumElement = document.getElementById("pdf-page-num");

    this.currentRenderMode = RenderModes.single;
  }

  async load(file) {
    let promise = pdfjsLib.getDocument({ data: file }).promise.then((pdf) => {
      this.pdfDocument = pdf;
      this.currentNumPages = pdf.numPages;
      pdf.getMetadata().then((metadata) => {
        this.metadata = metadata;
      })
      return new Promise((resolve) => {
        resolve(pdf);
      })
    })
    this.currentPage = 1;
    this.container.innerHTML = "";
    this.canvases = [];

    return promise;
  }

  /**
    * render a single page
    * @param param render parameters
    * @param {number} param.pageNum page number of the to render
    * @param {number} param.scale scale of the pdf to render
    * @param {HTMLElement} param.canvas the HTML canvas element to render to
    */
  async renderPage({ pageNum, scale, canvas } = {}) {
    if (!this.pdfDocument) throw new Error('No PDF to render');
    if (!pageNum) throw new Error('No page number specified');
    if (!canvas) throw new Error('No canvas specified');

    const context = canvas.getContext('2d');

    // Load the page.
    this.pdfDocument.getPage(pageNum).then((page) => {
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

      page.render(renderContext).promise.then(() => {
        console.log('Page rendered!');
      })
    })
  }

  async #renderSingle() {
    if (!this.pdfDocument) throw new Error('No PDF to render');

    if (this.canvases.length !== 1) {
      this.canvases = [];
      const newCanvas = document.createElement("canvas");
      newCanvas.id = `pdf`
      this.container.appendChild(newCanvas);
      this.canvases.push(newCanvas);
    }

    this.pageNumElement.innerHTML = `${this.currentPage} / ${this.currentNumPages}`;
    await this.renderPage({ pageNum: this.currentPage, canvas: this.canvases[0] });
  }

  async #renderAll() {
    if (!this.pdfDocument) throw new Error('No PDF to render');

    for (let i = 1; i <= this.currentNumPages; i++) {
      const newCanvas = document.createElement("canvas");
      newCanvas.id = `pdf-${i}`
      this.container.appendChild(newCanvas);
      this.canvases.push(newCanvas);

      await this.renderPage({ pageNum: i, canvas: newCanvas });
    }
  }

  render(renderMode) {
    if (renderMode !== undefined && renderMode !== null && renderMode !== this.currentRenderMode) {
      this.container.innerHTML = "";
      this.canvas = [];
      this.currentRenderMode = renderMode;
    }

    switch (this.currentRenderMode) {
      case RenderModes.single:
        this.currentPage = 1;
        this.#renderSingle();
        break;
      case RenderModes.all:
        this.#renderAll();
        break;
    }
  }

  close() {
    this.container.innerHTML = "";
    this.canvas = [];
    this.pdfDocument = null;
  }

  clear() {
    this.canvases.forEach((canvas) => {
      const context = canvas.getContext("2d");
      context.clearRect(0, 0, canvas.width, canvas.height);
    })
    this.canvases = [];
  }

  nextPage() {
    if (this.currentRenderMode !== RenderModes.single) return;
    if (this.currentPage === this.currentNumPages) return;
    if (this.currentPage > this.currentNumPages) {
      this.currentPage = this.currentNumPages;
      return;
    }
    this.currentPage++;
    this.#renderSingle();
  }

  prevPage() {
    if (this.currentRenderMode !== RenderModes.single) return;
    const FIRST_PAGE = 1;
    if (this.currentPage === FIRST_PAGE) return;
    if (this.currentPage < FIRST_PAGE) {
      this.currentPage = FIRST_PAGE;
      return;
    }
    this.currentPage--;
    this.#renderSingle();
  }

  nextRenderMode() {
    const modes = Object.keys(RenderModes);
    const newRenderMode = (this.currentRenderMode + 1) % modes.length;

    this.render(newRenderMode);
  }
};

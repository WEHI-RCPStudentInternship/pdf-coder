import * as pdfjsLib from "pdfjs-dist"


class OutputScale {
  constructor() {
    const pixelRatio = window.devicePixelRatio || 1;
    this.sx = pixelRatio;
    this.sy = pixelRatio;
  }

  get scaled() {
    return this.sx !== 1 || this.sy !== 1;
  }
}


function approximateFraction(x) {
  // Fast paths for int numbers or their inversions.
  if (Math.floor(x) === x) {
    return [x, 1];
  }
  const xinv = 1 / x;
  const limit = 8;
  if (xinv > limit) {
    return [1, limit];
  } else if (Math.floor(xinv) === xinv) {
    return [1, xinv];
  }

  const x_ = x > 1 ? xinv : x;
  // a/b and c/d are neighbours in Farey sequence.
  let a = 0,
    b = 1,
    c = 1,
    d = 1;
  // Limiting search to order 8.
  while (true) {
    // Generating next term in sequence (order of q).
    const p = a + c,
      q = b + d;
    if (q > limit) {
      break;
    }
    if (x_ <= p / q) {
      c = p;
      d = q;
    } else {
      a = p;
      b = q;
    }
  }
  let result;
  // Select closest of the neighbours to x.
  if (x_ - a / b < c / d - x_) {
    result = x_ === x ? [a, b] : [b, a];
  } else {
    result = x_ === x ? [c, d] : [d, c];
  }
  return result;
}


function roundToDivide(x, div) {
  const r = x % div;
  return r === 0 ? x : Math.round(x - r + div);
}

// PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = '/node_modules/pdfjs-dist/build/pdf.worker.mjs';

export const RenderModes = Object.freeze({
  single: 0,
  all: 1
});

// pdf file renderer
export class PDFRenderer {
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
      const outputScale = new OutputScale();
      const { width, height } = viewport;
      let bsr = context.webkitBackingStorePixelRatio ||
        context.mozBackingStorePixelRatio ||
        context.msBackingStorePixelRatio ||
        context.oBackingStorePixelRatio ||
        context.backingStorePixelRatio || 1
      let maxScale = outputScale.sx / bsr;
      if (outputScale.sx > maxScale || outputScale.sy > maxScale) {
        outputScale.sx = maxScale;
        outputScale.sy = maxScale;
      }
      const sfx = approximateFraction(outputScale.sx);
      const sfy = approximateFraction(outputScale.sy);

      canvas.width = roundToDivide(width * outputScale.sx, sfx[0]);
      canvas.height = roundToDivide(height * outputScale.sy, sfy[0]);
      const { style } = canvas;
      style.width = roundToDivide(width, sfx[1]) + "px";
      style.height = roundToDivide(height, sfy[1]) + "px";

      const transform = outputScale.scaled
            ? [outputScale.sx, 0, 0, outputScale.sy, 0, 0]
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

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
// pdf file renderer
export class PDFRenderer {
  canvas = null;
  metadata = null;
  pdfDocument = null;
  currentPage = 0;
  currentNumPages = 0;
  container = null;
  pageElement = null;

  constructor() {
    this.currentPage = 0;
    this.currentNumPages = 0;
    this.container = document.getElementById("pdf-container");
    this.pageElement = document.getElementById("pdf-page");
  }

  load(file) {
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

    return promise;
  }

  renderPage({ pagenum, scale } = {}) {
    if (!this.pdfDocument) return;

    const canvas = document.getElementById('pdf');
    const context = canvas.getContext('2d');

    // Load the page.
    this.pdfDocument.getPage(pagenum ?? this.currentPage).then((page) => {
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
        this.pageElement.innerHTML = this.currentPage;
        console.log('Page rendered!');
      })
    })
  }

  renderAll(file) {
    if (file) {
      this.load(file).then(() => { this.renderPage() });
      return;
    }

    if (!this.pdfDocument) return;

    const canvas = document.getElementById('pdf');
    const context = canvas.getContext('2d');

    for (let i = 1; i <= this.currentNumPages; i++) {
      // Load the page.
      this.pdfDocument.getPage(i).then((page) => {
        const scale = 0.9;
        const viewport = page.getViewport({ scale });

        // To make the render clearer
        // if we just update the canvas and the render context acccording to the
        // viewport values, the texts will not be clear
        const MAX_CANVAS_PIXELS = 16777216;
        const outputScale = new OutputScale();
        const { width, height } = viewport;
        if (MAX_CANVAS_PIXELS > 0) {
          const pixelsInViewport = width * height;
          const maxScale = Math.sqrt(MAX_CANVAS_PIXELS / pixelsInViewport);
          if (outputScale.sx > maxScale || outputScale.sy > maxScale) {
            outputScale.sx = maxScale;
            outputScale.sy = maxScale;
          }
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

        page.render(renderContext);
      })
    }
  }

  nextPage() {
    if (this.currentPage === this.currentNumPages) return;
    if (this.currentPage > this.currentNumPages) {
      this.currentPage = this.currentNumPages;
      return;
    }
    this.currentPage++;
    this.renderPage();
  }

  prevPage() {
    const FIRST_PAGE = 1;
    if (this.currentPage === FIRST_PAGE) return;
    if (this.currentPage < FIRST_PAGE) {
      this.currentPage = FIRST_PAGE;
      return;
    }
    this.currentPage--;
    this.renderPage();
  }
};

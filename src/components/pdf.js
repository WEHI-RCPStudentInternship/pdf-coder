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
// pdf file render function
export async function render(file) {
	const loadingTask = pdfjsLib.getDocument({data: file});
	const pdf = await loadingTask.promise;
	const canvas = document.getElementById('pdf');
	const context = canvas.getContext('2d');

	// Load the first page.
	const page = await pdf.getPage(1);

  // not scale of 1 because it causes the pdf to overflow
  // this is just a temporaty solution
	const scale = 0.9;
	const viewport = page.getViewport({ scale });

	// To make the render clearer
  // if we just update the canvas and the render context acccording to the
  // viewport values, the texts will not be clear
  const MAX_CANVAS_PIXELS = 16777216;
  const outputScale = new OutputScale();
  const maxCanvasPixels = MAX_CANVAS_PIXELS;
  const { width, height } = viewport;
  if (maxCanvasPixels > 0) {
    const pixelsInViewport = width * height;
    const maxScale = Math.sqrt(maxCanvasPixels / pixelsInViewport);
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
  console.log(canvas);
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
	console.log('Page rendered!');
};

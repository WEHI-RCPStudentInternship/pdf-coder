const RenderModes = {
  single: 0,
  all: 1
};


const RenderStates = {
  initial: 0,
  rendering: 1,
  paused : 2,
  finished: 3,
}

function binarySearchFirstPageView(views, condition, start = 0) {
  let minIdx = start;
  let maxIdx = views.length - 1;

  if (maxIdx < 0 || !condition(views[maxIdx])) {
    return views.length;
  }
  if (condition(views[minIdx])) {
    return minIdx;
  }

  while (minIdx < maxIdx) {
    const currentIdx = (minIdx + maxIdx) >> 1;
    const currentView = views[currentIdx];
    if (condition(currentView)) {
      maxIdx = currentIdx;
    } else {
      minIdx = currentIdx + 1;
    }
  }
  return minIdx;
}

function getVisibleElements({
  scrollElement,
  views,
  sortByVisibility = true,
}) {
  const top = scrollElement.scrollTop, bottom = top + scrollElement.clientHeight;
  // const left = scrollElement.scrollLeft, right = left + scrollElement.clientWidth;

  function isElementVisibleFromTop(view) {
    const el = view.pageContainer;
    const elBottom = el.offsetTop + el.clientTop + el.clientHeight;

    return elBottom > top;
  }

  function isElementVisibleFromBottom(view) {
    const el = view.pageContainer;
    const elTop = el.offsetTop + el.clientTop;

    return elTop < bottom;
  }

  const visible = [];
  const preRenderViews = [];

  const firstVisiblePageIdx = binarySearchFirstPageView(views, isElementVisibleFromTop);
  visible.push(views[firstVisiblePageIdx]);

  // find subsequent visible page views and pre render view
  for (let i = firstVisiblePageIdx + 1; i < views.length; i++) {
    if (isElementVisibleFromBottom(views[i])) {
      visible.push(views[i]);
      continue;
    }

    // pre render views;
    preRenderViews.push(views[i]);
    break;
  }

  // backtrack to find visible views and pre render views
  for (let i = firstVisiblePageIdx - 1; i >= 0; i--) {
    if (isElementVisibleFromTop(views[i])) {
      visible.push(views[i]);
      continue;
    }

    // pre render views;
    preRenderViews.push(views[i]);
    break;
  }

  if (sortByVisibility) {
  }

  return { visible, preRenderViews };
}

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

export {
  RenderModes,
  RenderStates,
  getVisibleElements,
  OutputScale,
  approximateFraction,
  roundToDivide
}

import { RenderStates } from "./utils";
import * as pdfjsLib from "pdfjs-dist"


class PDFRenderQueue {
  #pdfViewer = null;

  constructor(pdfViewer) {
    this.highestPriorityPage = null;
    this.#pdfViewer = pdfViewer;
  }

  isHighestPriority(pageView) {
    return this.highestPriorityPage === pageView.id;
  }

  renderHighestPriority(currentlyVisiblePages) {
    if (this.#pdfViewer.render(currentlyVisiblePages)) {
      return;
    }
  }

  render(pageView) {
    switch (pageView.renderState) {
      case RenderStates.finished:
        return;
      case RenderStates.paused:
        this.highestPriorityPage = pageView.id;
        pageView.resume();
        break;
      case RenderStates.rendering:
        this.highestPriorityPage = pageView.id;
        break;
      case RenderStates.initial:
        this.highestPriorityPage = pageView.id;
        pageView
          .render()
          .finally(() => {
            this.renderHighestPriority();
          })
          .catch(reason => {
            if (reason instanceof RenderingCancelledException) {
              return;
            }
            console.error("renderView:", reason);
          });
        break;
    }
  }
}

export { PDFRenderQueue };

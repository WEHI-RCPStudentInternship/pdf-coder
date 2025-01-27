import { PDFViewer } from "./components/viewer"
import { RenderModes } from "./components/utils"


const App = {
  /** @type {HTMLElement} **/
  uploadElement: null,
  // openModalButton: null,
  /** @type {HTMLElement} **/
  pdfViewerElement: null,
  /** @type {HTMLElement} **/
  overlay: null,
  /** @type {HTMLElement} **/
  closeModalButton: null,
  /** @type {HTMLElement} **/
  dashboard: null,
  /** @type {HTMLElement} **/
  prevButton: null,
  /** @type {HTMLElement} **/
  nextButton: null,
  /** @type {HTMLElement} **/
  renderModeButton: null,
  /** @type {HTMLElement} **/
  renderSingle: null,
  /** @type {HTMLElement} **/
  renderAll: null,
  /** @type {HTMLElement} **/
  prevPageButton: null,
  /** @type {HTMLElement} **/
  nextPageButton: null,
  /** @type {PDFViewer} **/
  pdfViewer: null,
  /** @type {string} **/
  fileName: null,


  initialize() {
    // getting the HTML elements
    this.uploadElement = document.getElementById("upload");
    // this.openModalButton = document.querySelector("[data-modal-target]");
    this.pdfViewerElement = document.getElementById("pdf-viewer");
    this.overlay = document.getElementById("overlay");
    this.closeModalButton = document.getElementById("close-button");
    this.dashboard = document.getElementById("dashboard");
    this.prevButton = document.getElementById("prev");
    this.nextButton = document.getElementById("next");
    this.renderModeButton = document.getElementById("render-mode-button");
    this.renderAll = document.getElementById("all");
    this.renderSingle = document.getElementById("single");
    this.prevPageButton = document.getElementById("prev");
    this.nextPageButton = document.getElementById("next");
    this.fileName = document.getElementById("pdf-name");

    this.pdfViewer = new PDFViewer();

    this.bindEvents();
  },


  run() {
    this.initialize();

    if (this.pdfViewer.currentRenderMode === RenderModes.all) {
      this.renderAll.classList.add("active");
    } else {
      this.renderSingle.classList.add("active");
    }
  },


  bindEvents() {
    // button actions
    this.prevButton.onclick = this.prevPage.bind(this);
    this.nextButton.onclick = this.nextPage.bind(this);
    this.renderModeButton.onclick = this.nextRenderMode.bind(this);

    // adding event listeners
    this.uploadElement.addEventListener("change", this.handleUpload.bind(this));
    this.closeModalButton.addEventListener("click", this.closePDFViewer.bind(this));
  },


  // handling local files uploads, to be changed when we have a backend and db
  handleUpload(e) {
    if (!this.pdfViewerElement || !this.overlay) {
      return;
    }
    const file = e.target.files[0];
    if (!file) {
      return;
    }

    this.addFileToDashboard(file);
  },


  openPDFViewer(url, filename) {
    if (!url || this.pdfViewerElement.classList.contains("active")) return;

    this.fileName.innerHTML = filename;

    this.pdfViewer.open(url);

    this.pdfViewerElement.classList.add("active");
    this.overlay.classList.add("active");
  },


  closePDFViewer() {
    if (!this.pdfViewerElement.classList.contains("active")) return;
    this.pdfViewerElement.classList.remove("active");
    this.overlay.classList.remove("active");

    this.pdfViewer.close();
  },


  addFileToDashboard(file) {
    if (!this.dashboard) return;

    const newFile = document.createElement("div");
    newFile.innerHTML = `
      <div class="file">
        ${file.name}
      </div>
    `

    newFile.firstElementChild.addEventListener("click", () => {
      this.openPDFViewer(URL.createObjectURL(file), file.name);
    })
    this.dashboard.appendChild(newFile.firstElementChild);
  },


  nextPage() {
    if (!this.pdfViewer) return;
    this.pdfViewer.nextPage();
  },


  prevPage() {
    if (!this.pdfViewer) return;
    this.pdfViewer.prevPage();
  },


  nextRenderMode() {
    const update = (renderMode) => {
      switch (renderMode) {
        case RenderModes.single:
          this.renderSingle.classList.add("active");
          this.renderAll.classList.remove("active");
          break;
        case RenderModes.all:
          this.renderSingle.classList.remove("active");
          this.renderAll.classList.add("active");
          break;
      }
    }

    this.pdfViewer.nextRenderMode(update);
  }
}


export { App }

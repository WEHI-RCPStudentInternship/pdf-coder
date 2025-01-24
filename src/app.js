import { PDFViewer } from "./components/viewer"
import { RenderModes } from "./components/utils"


const App = {
  uploadElement: null,
  // openModalButton: null,
  pdfModal: null,
  overlay: null,
  closeModalButton: null,
  dashboard: null,
  prevButton: null,
  nextButton: null,
  renderModeButton: null,
  renderSingle: null,
  renderAll: null,
  viewer: null,
  fileName: null,


  initialize() {
    // getting the HTML elements
    this.uploadElement = document.getElementById("upload");
    // this.openModalButton = document.querySelector("[data-modal-target]");
    this.pdfModal = document.getElementById("pdf-modal");
    this.overlay = document.getElementById("overlay");
    this.closeModalButton = document.getElementById("close-button");
    this.dashboard = document.getElementById("dashboard");
    this.prevButton = document.getElementById("prev");
    this.nextButton = document.getElementById("next");
    this.renderModeButton = document.getElementById("render-mode-button");
    this.renderSingle = document.getElementById("single");
    this.renderAll = document.getElementById("all");
    this.fileName = document.getElementById("pdf-name");

    this.viewer = new PDFViewer();

    this.bindEvents();
  },


  run() {
    this.initialize();
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
    if (!this.pdfModal || !this.overlay) {
      return;
    }
    const file = e.target.files[0];
    if (!file) {
      return;
    }

    this.addFileToDashboard(file);
  },


  openPDFViewer(url, filename) {
    if (!url || this.pdfModal.classList.contains("active")) return;

    this.fileName.innerHTML = filename;

    this.viewer.open(url);

    this.pdfModal.classList.add("active");
    this.overlay.classList.add("active");
  },


  closePDFViewer() {
    if (!this.pdfModal.classList.contains("active")) return;
    this.pdfModal.classList.remove("active");
    this.overlay.classList.remove("active");

    this.viewer.close();
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
    if (!this.viewer) return;
    this.viewer.nextPage();
  },


  prevPage() {
    if (!this.viewer) return;
    this.viewer.prevPage();
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

    this.viewer.nextRenderMode(update);
  }
}


export { App }

import { PDFViewer } from "./components/viewer"
import { RenderModes } from "./components/utils"


const App = {
  /** @type {HTMLElement} **/
  uploadElement: null,
  // openModalButton: null,
  /** @type {HTMLElement} **/
  dashboard: null,
  /** @type {PDFViewer} **/
  pdfViewer: null,
  /** @type {string} **/
  fileName: null,


  initialize() {
    // getting the HTML elements
    this.uploadElement = document.getElementById("upload");
    // this.openModalButton = document.querySelector("[data-modal-target]");
    this.dashboard = document.getElementById("dashboard");

    this.pdfViewer = new PDFViewer();

    this.bindEvents();
  },


  run() {
    this.initialize();
  },


  bindEvents() {
    // adding event listeners
    this.uploadElement.addEventListener("change", this.handleUpload.bind(this));
  },


  // handling local files uploads, to be changed when we have a backend and db
  handleUpload(e) {
    if (!this.pdfViewer) {
      return;
    }
    const file = e.target.files[0];
    if (!file) {
      return;
    }

    this.addFileToDashboard(file);
  },


  openPDFViewer(url, filename) {
    if (!url || this.pdfViewer.mainContainer.classList.contains("active")) return;

    // this.fileName.innerHTML = filename;

    this.pdfViewer.open(url, filename);
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
}


export { App }

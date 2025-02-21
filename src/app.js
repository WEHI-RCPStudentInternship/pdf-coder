import { PDFViewer } from "./components/viewer"
import { stopEvent } from "pdfjs-dist"


const App = {
  /** @type {HTMLElement} **/
  uploadElement: null,
  /** @type {HTMLElement} **/
  mainContainer: null,
  /** @type {HTMLElement} **/
  dashboard: null,
  /** @type {PDFViewer} **/
  pdfViewer: null,
  /** @type {string} **/
  fileName: null,


  initialize() {
    // getting the HTML elements
    this.uploadElement = document.getElementById("upload");
    this.mainContainer = document.getElementById("main-container");
    this.dashboard = document.getElementById("dashboard");

    this.pdfViewer = new PDFViewer();

    this.bindEvents();
  },


  run(...htmlStrings) {
    document.getElementById("app").innerHTML = `
      ${htmlStrings.join("")}
    `
    this.initialize();
  },


  bindEvents() {
    // adding event listeners
    this.uploadElement.addEventListener("change", this.handleUpload.bind(this));
    // Enable dragging-and-dropping a new PDF file onto the viewerContainer.
    this.mainContainer.addEventListener("dragover", (e) => {
      e.preventDefault();
      for (const item of e.dataTransfer.items) {
        if (item.type === "application/pdf") {
          e.dataTransfer.dropEffect =
            e.dataTransfer.effectAllowed === "copy" ? "copy" : "move";
          stopEvent(e);
          return;
        }
      }
    });
    this.mainContainer.addEventListener("drop", (e) => {
      e.preventDefault();
      if (e.dataTransfer.files?.[0].type !== "application/pdf") {
        return;
      }
      this.handleUpload(e);
      stopEvent(e);
    });
  },


  // handling local files uploads, to be changed when we have a backend and db
  handleUpload(e) {
    if (!this.pdfViewer) {
      return;
    }
    const file = e.dataTransfer ?
      e.dataTransfer.files[0] :
      e.target.files[0];

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

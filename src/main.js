import './style.css'
import { PDFViewer, RenderModes } from "./components/viewer"


document.querySelector('#app').innerHTML = `
  <div class="app-container">
    <input
      id="upload"
      type="file"
      accept="application/pdf"
    />
    <div class="toolbar">
      <button
        data-modal-target="#pdf-modal"
        id="uploadBtn"
        value="Browse..."
        onclick="document.getElementById('upload').click()"
      >
        <span id="uploadBtnText">
          +
        </span>
      </button>
    </div>
    <div id="dashboard">
    </div>
  </div>
  <div id="pdf-modal">
    <div id="topbar">
      <div class="item">
        <span id="pdf-name"></span>
      </div>
      <div class="item middle">
        <span id="pdf-page-num"></span>
      </div>
      <div class="item right">
        <button id="render-mode-button">
          <div id="single" class="render-mode active">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="currentColor"
              class="icon-size icon icon-tabler icons-tabler-filled icon-tabler-crop-portrait"
            >
              <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
              <path d="M16 3a3 3 0 0 1 3 3v12a3 3 0 0 1 -3 3h-8a3 3 0 0 1 -3 -3v-12a3 3 0 0 1 3 -3z" />
            </svg>
          </div>
          <div id="all" class="render-mode">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="icon-size icon icon-tabler icons-tabler-outline icon-tabler-spacing-vertical"
            >
              <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
              <path d="M4 20v-2a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v2" />
              <path d="M4 4v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2 -2v-2" />
              <path d="M16 12h-8" />
            </svg>
          </div>
        </button>
        <button id="close-button">&times;</button>
      </div>
    </div>
    <div id="pdf-container"></div>
    <div id="control-panel">
      <button id="prev" class="pdf-nav-button">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="icon-size">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
        </svg>
      </button>
      <button id="next" class="pdf-nav-button">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="icon-size">
          <path stroke-linecap="round" stroke-linejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
        </svg>
      </button>
    </div>
  </div>
  <div id="overlay"></div>
`

const fileList = [];

// getting the HTML elements
const uploadElement = document.getElementById("upload");
// const openModalButton = document.querySelector("[data-modal-target]");
const pdfModal = document.getElementById("pdf-modal");
const overlay = document.getElementById("overlay");
const closeModalButton = document.getElementById("close-button");
const dashboard = document.getElementById("dashboard");
const prevButton = document.getElementById("prev");
const nextButton = document.getElementById("next");
const renderModeButton = document.getElementById("render-mode-button");
const renderSingle = document.getElementById("single");
const renderAll = document.getElementById("all");

const viewer = new PDFViewer();

prevButton.onclick = prevPage;
nextButton.onclick = nextPage;
renderModeButton.onclick = nextRenderMode;

// file reader
const fileReader = new FileReader();
fileReader.onload = function (e) {
  viewer.open(e.target.result);
};


// adding event listeners
uploadElement.addEventListener("change", handleFiles, false);
closeModalButton.addEventListener("click", () => {
  closePDFViewer();
})

// handling local files uploads, to be changed when we have a backend and db
function handleFiles() {
  if (!pdfModal || !overlay) {
    return;
  }
  const file = this.files[0];
  if (!file) {
    return;
  }

  fileList.push(file);

  addFileToDashboard(file);
}


function openPDFViewer(file) {
  if (!file || pdfModal.classList.contains("active")) return;

  document.getElementById("pdf-name").innerHTML = file.name;

  fileReader.readAsArrayBuffer(file);

  pdfModal.classList.add("active");
  overlay.classList.add("active");
}


function closePDFViewer() {
  if (!pdfModal.classList.contains("active")) return;
  pdfModal.classList.remove("active");
  overlay.classList.remove("active");

  viewer.close();
}


function addFileToDashboard(file) {
  if (!dashboard) return;

  const newFile = document.createElement("div");
  newFile.innerHTML = `
    <div class="file">
      ${file.name}
    </div>
  `

  newFile.firstElementChild.addEventListener("click", () => {
    openPDFViewer(file);
  })
  dashboard.appendChild(newFile.firstElementChild);
}


function nextPage() {
  if (!viewer) return;
  viewer.nextPage();
}


function prevPage() {
  if (!viewer) return;
  viewer.prevPage();
}


function nextRenderMode() {
  const update = (renderMode) => {
    switch (renderMode) {
      case RenderModes.single:
        renderSingle.classList.add("active");
        renderAll.classList.remove("active");
        break;
      case RenderModes.all:
        renderSingle.classList.remove("active");
        renderAll.classList.add("active");
        break;
    }
  }

  viewer.nextRenderMode(update);
}

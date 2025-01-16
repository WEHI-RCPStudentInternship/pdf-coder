import './style.css'
import { PDFRenderer, RenderModes } from "./components/pdf"


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
    <div class="topbar" id="header">
      <div class="item">
        <span id="pdf-name"></span>
      </div>
      <div class="item middle">
        <span id="pdf-page-num"></span>
      </div>
      <div class="item right">
        <button id="render-mode-button">
          <div id="single" class="render-mode active">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="icon-size">
              <path stroke-linecap="round" stroke-linejoin="round" d="M5.25 7.5A2.25 2.25 0 0 1 7.5 5.25h9a2.25 2.25 0 0 1 2.25 2.25v9a2.25 2.25 0 0 1-2.25 2.25h-9a2.25 2.25 0 0 1-2.25-2.25v-9Z" />
            </svg>
          </div>
          <div id="all" class="render-mode">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="icon-size">
              <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 8.25V6a2.25 2.25 0 0 0-2.25-2.25H6A2.25 2.25 0 0 0 3.75 6v8.25A2.25 2.25 0 0 0 6 16.5h2.25m8.25-8.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-7.5A2.25 2.25 0 0 1 8.25 18v-1.5m8.25-8.25h-6a2.25 2.25 0 0 0-2.25 2.25v6" />
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
      <select id="change-view" class="pdf-nav-button">
        <option value="single">Single page</option>
        <option value="all">All pages</option>
      </select>
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
const changeViewButton = document.getElementById("change-view");
const renderModeButton = document.getElementById("render-mode-button");
const renderSingle = document.getElementById("single");
const renderAll = document.getElementById("all");

const renderer = new PDFRenderer();

prevButton.onclick = prevPage;
nextButton.onclick = nextPage;
changeViewButton.onchange = changeView;
renderModeButton.onclick = nextRenderMode;

// file reader
const fileReader = new FileReader();
fileReader.onload = function (e) {
  renderer.load(e.target.result).then(() => {
    renderer.render()
  });
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

  renderer.close();
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
  if (!renderer) return;
  renderer.nextPage();
}


function prevPage() {
  if (!renderer) return;
  renderer.prevPage();
}


function changeView(e) {
  renderer.render(RenderModes[e.target.value]);
}


function nextRenderMode() {
  renderer.nextRenderMode();

  switch (renderer.currentRenderMode) {
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

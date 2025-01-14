import './style.css'
import { PDFRenderer } from "./components/pdf"

document.querySelector('#app').innerHTML = `
  <div class="app-container">
    <input
      id="upload"
      type="file"
      accept="application/pdf,application/msword,
      application/vnd.openxmlformats-officedocument.wordprocessingml.document"
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
    <div class="navbar" id="header">
      <span id="pdf-name" class="name">
      </span>
      <button data-close-button class="close-button">&times;</button>
    </div>
    <div id="pdf-container">
      <canvas id="pdf"></canvas>
    </div>
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
const closeModalButton = document.querySelector("[data-close-button]");
const dashboard = document.getElementById("dashboard");
const canvas = document.getElementById("pdf");
const prev = document.getElementById("prev");
const next = document.getElementById("next");

const renderer = new PDFRenderer();

prev.onclick = prevPage;
next.onclick = nextPage;

// file reader
const fileReader = new FileReader();
fileReader.onload = function (e) {
  renderer.render(e.target.result);
};


// adding event listeners
uploadElement.addEventListener("change", handleFiles, false);
// openModalButton.addEventListener("click", () => {
//   const modal = document.querySelector(openModalButton.dataset.modalTarget);
// })
//
closeModalButton.addEventListener("click", () => {
  closeModal();
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


function openModal(file) {
  if (!file || pdfModal.classList.contains("active") || !canvas) return;

  document.getElementById("pdf-name").innerHTML = file.name;

  fileReader.readAsArrayBuffer(file);

  pdfModal.classList.add("active");
  overlay.classList.add("active");
}


function closeModal() {
  if (!pdfModal.classList.contains("active") || !canvas) return;
  pdfModal.classList.remove("active");
  overlay.classList.remove("active");

  const context = canvas.getContext("2d");
  context.clearRect(0, 0, canvas.width, canvas.height);
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
    openModal(file);
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

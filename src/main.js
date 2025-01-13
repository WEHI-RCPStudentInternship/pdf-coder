import './style.css'
import { render } from "./components/pdf"

document.querySelector('#app').innerHTML = `
  <div class="app-container">
    <input
      id="upload"
      type="file"
      accept="application/pdf,application/msword,
      application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    />
    <button
      data-modal-target="#pdf-modal"
      id="uploadBtn"
      value="Browse..."
      onclick="document.getElementById('upload').click()"
    >
      <span id="uploadBtnText">
        Upload file
      </span>
    </button>
  </div>
  <div id="pdf-modal">
    <div class="navbar" id="header">
      <span class="title">
        PDF-Coder
      </span>
      <button data-close-button class="close-button">&times;</button>
    </div>
    <canvas id="pdf"></canvas>
  </div>
  <div id="overlay"></div>
`

// getting the HTML elements
const uploadElement = document.getElementById("upload");
// const openModalButton = document.querySelector("[data-modal-target]");
const pdfModal = document.getElementById("pdf-modal");
const overlay = document.getElementById("overlay");
const closeModalButton = document.querySelector("[data-close-button]");


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
function handleFiles(e) {
  if (!pdfModal || !overlay) {
    return;
  }
  const file = this.files[0];
  if (!file) {
    return;
  }
  const fileReader = new FileReader();
  fileReader.onload = function (e) {
    render(new Uint8Array(e.target.result));
  };
  fileReader.readAsArrayBuffer(file);

  openModal();
}


function openModal() {
  if (pdfModal.classList.contains("active")) return;
  pdfModal.classList.add("active");
  overlay.classList.add("active");
}


function closeModal() {
  if (!pdfModal.classList.contains("active")) return;
  pdfModal.classList.remove("active");
  overlay.classList.remove("active");
}

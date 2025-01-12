import './style.css'
import * as pdfjsLib from "pdfjs-dist"

document.querySelector('#app').innerHTML = `
  <div class="app-container">
    <input
      id="upload"
      type="file"
      accept="application/pdf,application/msword,
      application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    />
    <input
      data-modal-target="#pdf-modal"
      type="button"
      id="uploadBtn"
      value="Browse..."
      onclick="document.getElementById('upload').click()"
    />
    <div id="pdf-modal">
      <div data-close-modal id="overlay">
        <canvas id="pdf"></canvas>
      </div>
    </div>
  </div>
`

// getting the HTML elements
const uploadElement = document.getElementById("upload");
// const openModalButton = document.querySelector("[data-modal-target]");
const pdfModal = document.getElementById("pdf-modal");
const closeModalElement = document.querySelector("[data-close-modal]");


// adding event listeners
uploadElement.addEventListener("change", handleFiles, false);
// openModalButton.addEventListener("click", () => {
//   const modal = document.querySelector(openModalButton.dataset.modalTarget);
// })
//
closeModalElement.addEventListener("click", () => {
  if (!pdfModal) return;
  if (!pdfModal.classList.contains("active")) return;
  pdfModal.classList.remove("active");
})

// handling local files uploads, to be changed when we have a backend and db
function handleFiles(e) {
  if (!pdfModal || !closeModalElement) {
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

  if (pdfModal.classList.contains("active")) return;
  pdfModal.classList.add("active");
}


//PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = '/node_modules/pdfjs-dist/build/pdf.worker.mjs';
//pdf file render function
async function render(file) {
	const loadingTask = pdfjsLib.getDocument({data: file});
	const pdf = await loadingTask.promise;

	// Load the first page.
	const page = await pdf.getPage(1);

	const scale = 1;
	const viewport = page.getViewport({ scale });

	// Set the canvas dimensions.
	const canvas = document.getElementById('pdf');
	const context = canvas.getContext('2d');
	canvas.height = viewport.height;
	canvas.width = viewport.width;

	// Render the page into the canvas.
  if (context === null) return;
	const renderContext = {
		canvasContext: context,
		viewport: viewport,
	};

  page.render(renderContext);
	console.log('Page rendered!');
};

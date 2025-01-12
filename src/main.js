import './style.css'
import { setupCounter } from './counter.js'
import * as pdfjsLib from "pdfjs-dist"

document.querySelector('#app').innerHTML = `
  <div class="pdf-container">
    <input
      id="upload"
      type="file"
      accept="application/pdf,application/msword,
      application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    />
    <canvas id="pdf"></canvas>
  </div>
`

// setupCounter(document.querySelector('#counter'))

const uploadElement = document.getElementById("upload");
uploadElement.addEventListener("change", handleFiles, false);

function handleFiles(e) {
  let file = this.files[0];
  if (!file) {
    return;
  }
  var fileReader = new FileReader();
  fileReader.onload = function (e) {
    render(new Uint8Array(e.target.result));
  };
  fileReader.readAsArrayBuffer(file);
}

pdfjsLib.GlobalWorkerOptions.workerSrc = '/node_modules/pdfjs-dist/build/pdf.worker.mjs';
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

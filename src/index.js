import { App } from './app'


// this helps with template literals highlighting on some editors
const html = String.raw;

const mainContainer = html`
  <div class="main-container">
    <input
      id="upload"
      type="file"
      accept="application/pdf"
    />
    <div class="appbar">
      <button
        data-modal-target="#pdf-viewer"
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
`;

const pdfViewer = html`
  <div id="pdf-viewer">
    <div id="toolbar">
      <div class="item">
        <span id="pdf-name"></span>
      </div>
      <div class="item middle">
        <div class="pdf-nav">
          <button id="prev" class="pdf-nav-button">
            <div class="icon">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke-width="2.5"
                stroke="currentColor"
                class="icon-size"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M15.75 19.5 8.25 12l7.5-7.5"
                />
              </svg>
            </div>
          </button>
          <button id="next" class="pdf-nav-button">
            <div class="icon">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke-width="2.5"
                stroke="currentColor"
                class="icon-size"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="m8.25 4.5 7.5 7.5-7.5 7.5"
                />
              </svg>
            </div>
          </button>
        </div>
        <div id="page-num">
          <input type="text" pattern="^[0-9]+$" id="page-input" />
        </div>
        &#47;
        <span id="total-page-num"></span>
      </div>
      <div class="item right">
        <div id="zoom">
          <button id="zoom-out" class="zoom-button">
            <div class="icon">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke-width="2.5"
                stroke="currentColor"
                class="icon-size"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607ZM13.5 10.5h-6"
                />
              </svg>
            </div>
          </button>
          <button id="zoom-in" class="zoom-button">
            <div class="icon">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke-width="2.5"
                stroke="currentColor"
                class="icon-size"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607ZM10.5 7.5v6m3-3h-6"
                />
              </svg>
            </div>
          </button>
        </div>
        <button id="render-mode-button">
          <div id="all" class="render-mode">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="icon-size"
            >
              <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
              <path d="M4 20v-2a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v2" />
              <path d="M4 4v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2 -2v-2" />
              <path d="M16 12h-8" />
            </svg>
          </div>
          <div id="single" class="render-mode">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="currentColor"
              stroke-width="2.5"
              class="icon-size"
            >
              <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
              <path d="M16 3a3 3 0 0 1 3 3v12a3 3 0 0 1 -3 3h-8a3 3 0 0 1 -3 -3v-12a3 3 0 0 1 3 -3z" />
            </svg>
          </div>
        </button>
        <button id="close-button">&times;</button>
      </div>
    </div>
    <div id="pdf-container"></div>
  </div>
  <div id="overlay"></div>
`;

document.querySelector('#app').innerHTML = `
  ${mainContainer}
  ${pdfViewer}
`

App.run();

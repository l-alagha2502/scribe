const app = document.querySelector('#app');
const favicon = document.querySelector('#dynamic-favicon');
const routes = {
  image: { title: 'Image', eyebrow: '01 / RASTER LAB', description: 'Convert raster files between the formats your workflow actually uses.', formats: ['PNG', 'JPG', 'WEBP', 'SVG', 'BMP', 'ICO', 'AVIF', 'TIFF', 'PDF'], accept: 'image/*' },
  video: { title: 'Video', eyebrow: '02 / MOTION LAB', description: 'Trim and re-encode video locally. Your footage never leaves this tab.', formats: ['MP4', 'WEBM', 'MOV', 'AVI', 'MKV', 'GIF'], accept: 'video/*' },
  audio: { title: 'Audio', eyebrow: '03 / SOUND LAB', description: 'Extract, convert and package audio without a server in the middle.', formats: ['MP3', 'WAV', 'OGG', 'M4A', 'FLAC', 'OPUS', 'AAC'], accept: 'audio/*' },
  docs: { title: 'Docs', eyebrow: '04 / DOCUMENT LAB', description: 'Build, split and convert documents locally. Nothing leaves this browser.', accept: 'image/*,.pdf,application/pdf', formats: ['IMAGES TO PDF', 'PDF TO PNG', 'PDF TO JPG', 'MERGE PDF', 'SPLIT PDF'] }
};
let pendingFile = null;
let pdfLibPromise;
let pdfJsPromise;

function setFavicon() {
  favicon.href = '/public/favicon.svg';
}
setFavicon();

function home() {
  app.innerHTML = `<section class="home-hero"><img class="home-logo" src="/public/logo.svg" alt="Scribe" /><h1>Scribe<span class="dot">.</span></h1><p>Private, Cloudless, Limitless File conversion tool</p><nav class="category-links" aria-label="Conversion categories"><a href="#/image">Image</a><a href="#/video">Video</a><a href="#/audio">Audio</a><a href="#/docs">Docs</a></nav></section>`;
}

function toolPage(kind) {
  const route = routes[kind];
  app.innerHTML = `<section class="tool-page"><div class="tool-heading"><div><div class="tool-label">${route.eyebrow}</div><h1>${route.title}<span class="dot">.</span></h1></div><p>${route.description}</p></div><div class="dropzone" id="dropzone"><input class="file-input" id="file-input" type="file" accept="${route.accept}"><div class="drop-icon">+</div><h2>Drop your ${kind} here</h2><p>or click to browse / no size cap</p></div><div class="controls"><div class="control-box"><label>Selected file</label><div class="file-name empty" id="file-name">Waiting for a file...</div></div><div class="control-box"><label>Target format</label><select class="format-select" id="format-select">${route.formats.map((format) => `<option value="${format.toLowerCase()}">${format}</option>`).join('')}</select></div></div><div class="search-wrap" id="search-wrap"><input id="format-search" type="search" placeholder="SEARCH TARGET FORMATS..." aria-label="Search target formats"></div><div class="actions"><span class="hint">${kind === 'image' ? 'NATIVE CANVAS ENGINE' : 'LAZY-LOADED FFMPEG WASM'}</span><button class="convert-btn" id="convert-btn" disabled>CONVERT LOCALLY ↗</button></div><div class="progress" id="progress"><div class="progress-bar" id="progress-bar"></div></div><div class="result" id="result" role="status" aria-live="polite"></div></section>`;
  bindTool(kind);
}

function docsPage() {
  const route = routes.docs;
  app.innerHTML = `<section class="tool-page docs-page"><div class="tool-heading"><div><div class="tool-label">${route.eyebrow}</div><h1>${route.title}<span class="dot">.</span></h1></div><p>${route.description}</p></div><div class="dropzone docs-dropzone" id="docs-dropzone"><input class="file-input" id="docs-file-input" type="file" accept="${route.accept}" multiple><div class="drop-icon">+</div><h2>Drop documents or images here</h2><p>or click to browse / select multiple files</p></div><div class="docs-controls"><div class="control-box"><label>Selected files</label><div class="file-name empty" id="docs-file-name">Waiting for files...</div></div><div class="control-box docs-action-box"><label>Local action</label><select class="format-select" id="docs-action-select">${route.formats.map((format) => `<option value="${format.toLowerCase().replaceAll(' ', '-')}">${format}</option>`).join('')}</select></div></div><div class="search-wrap show" id="docs-search-wrap"><input id="docs-action-search" type="search" placeholder="SEARCH DOCUMENT ACTIONS..." aria-label="Search document actions"></div><div class="docs-range" id="docs-range"><label for="docs-page-range">Page range</label><input id="docs-page-range" type="text" placeholder="e.g. 1-3, 5" value="1"></div><div class="actions"><span class="hint">LAZY-LOADED PDF WASM</span><button class="convert-btn" id="docs-convert-btn" disabled>PROCESS LOCALLY ↗</button></div><div class="progress" id="docs-progress"><div class="progress-bar" id="docs-progress-bar"></div></div><div class="result" id="docs-result" role="status" aria-live="polite"></div></section>`;
  bindDocs();
}

function bindTool(kind) {
  const input = document.querySelector('#file-input');
  const zone = document.querySelector('#dropzone');
  const name = document.querySelector('#file-name');
  const button = document.querySelector('#convert-btn');
  const select = document.querySelector('#format-select');
  const searchWrap = document.querySelector('#search-wrap');
  const search = document.querySelector('#format-search');
  let file = null;

  const acceptFile = (next) => { if (!next) return; file = next; name.textContent = file.name; name.classList.remove('empty'); button.disabled = false; searchWrap.classList.add('show'); };
  zone.addEventListener('click', () => input.click());
  input.addEventListener('change', () => acceptFile(input.files[0]));
  ['dragenter', 'dragover'].forEach((event) => zone.addEventListener(event, (e) => { e.preventDefault(); zone.classList.add('dragging'); }));
  ['dragleave', 'drop'].forEach((event) => zone.addEventListener(event, (e) => { e.preventDefault(); zone.classList.remove('dragging'); }));
  zone.addEventListener('drop', (e) => acceptFile(e.dataTransfer.files[0]));
  search.addEventListener('input', () => { const query = search.value.toLowerCase(); [...select.options].forEach((option) => { option.hidden = !option.textContent.toLowerCase().includes(query); }); });
  button.addEventListener('click', () => kind === 'image' ? convertImage(file, select.value) : convertMedia(file, select.value, kind));
  if (pendingFile) { acceptFile(pendingFile); pendingFile = null; }
}

function bindDocs() {
  const input = document.querySelector('#docs-file-input');
  const zone = document.querySelector('#docs-dropzone');
  const name = document.querySelector('#docs-file-name');
  const action = document.querySelector('#docs-action-select');
  const search = document.querySelector('#docs-action-search');
  const range = document.querySelector('#docs-range');
  const button = document.querySelector('#docs-convert-btn');
  let files = [];
  const acceptFiles = (next) => { if (!next?.length) return; files = [...next]; name.textContent = files.map((file) => file.name).join(' / '); name.classList.remove('empty'); button.disabled = false; };
  zone.addEventListener('click', () => input.click());
  input.addEventListener('change', () => acceptFiles(input.files));
  ['dragenter', 'dragover'].forEach((event) => zone.addEventListener(event, (e) => { e.preventDefault(); zone.classList.add('dragging'); }));
  ['dragleave', 'drop'].forEach((event) => zone.addEventListener(event, (e) => { e.preventDefault(); zone.classList.remove('dragging'); }));
  zone.addEventListener('drop', (e) => acceptFiles(e.dataTransfer.files));
  search.addEventListener('input', () => { const query = search.value.toLowerCase(); [...action.options].forEach((option) => { option.hidden = !option.textContent.toLowerCase().includes(query); }); });
  action.addEventListener('change', () => range.classList.toggle('show', action.value === 'split-pdf'));
  button.addEventListener('click', () => processDocs(files, action.value, document.querySelector('#docs-page-range').value));
  if (pendingFile) { acceptFiles([pendingFile]); pendingFile = null; }
}

async function loadPdfLib() {
  pdfLibPromise ||= import('https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/+esm');
  return pdfLibPromise;
}

async function loadPdfJs() {
  pdfJsPromise ||= import('https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/legacy/build/pdf.mjs');
  const pdfjs = await pdfJsPromise;
  pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.mjs';
  return pdfjs;
}

function docsProgress(message, percent) {
  document.querySelector('#docs-result').textContent = message;
  document.querySelector('#docs-progress').classList.add('show');
  document.querySelector('#docs-progress-bar').style.width = `${percent}%`;
}

async function imageBytes(file, format) {
  if (format === 'jpg' || format === 'jpeg') return file.arrayBuffer();
  if (format === 'png') return file.arrayBuffer();
  const image = await loadImage(file);
  const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height;
  canvas.getContext('2d').drawImage(image, 0, 0);
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  return blob.arrayBuffer();
}

function parsePageRange(value, count) {
  const pages = new Set();
  value.split(',').forEach((part) => { const [start, end = start] = part.trim().split('-').map(Number); if (!start || start > count) return; for (let page = start; page <= Math.min(end, count); page += 1) pages.add(page - 1); });
  return [...pages].sort((a, b) => a - b);
}

async function processDocs(files, action, pageRange) {
  const result = document.querySelector('#docs-result');
  if (!files.length) return;
  try {
    docsProgress('LOADING DOCUMENT WASM...', 8);
    const { PDFDocument } = await loadPdfLib();
    if (action === 'images-to-pdf') {
      const pdf = await PDFDocument.create();
      for (let index = 0; index < files.length; index += 1) {
        const file = files[index]; const bytes = await imageBytes(file, file.name.split('.').pop().toLowerCase());
        const embedded = file.type === 'image/jpeg' || /\.jpe?g$/i.test(file.name) ? await pdf.embedJpg(bytes) : await pdf.embedPng(bytes);
        const page = pdf.addPage([embedded.width, embedded.height]); page.drawImage(embedded, { x: 0, y: 0, width: embedded.width, height: embedded.height }); docsProgress(`BUILDING PDF / ${index + 1} OF ${files.length}`, 20 + ((index + 1) / files.length) * 65);
      }
      download(new Blob([await pdf.save()], { type: 'application/pdf' }), 'scribe-images.pdf');
    } else if (action === 'merge-pdf' || action === 'split-pdf') {
      const output = await PDFDocument.create();
      for (const file of files) { const source = await PDFDocument.load(await file.arrayBuffer()); const indexes = action === 'split-pdf' ? parsePageRange(pageRange, source.getPageCount()) : source.getPageIndices(); const pages = await output.copyPages(source, indexes); pages.forEach((page) => output.addPage(page)); }
      download(new Blob([await output.save()], { type: 'application/pdf' }), action === 'merge-pdf' ? 'scribe-merged.pdf' : 'scribe-split.pdf');
    } else {
      const pdfjs = await loadPdfJs();
      const pdfDocument = await pdfjs.getDocument({ data: await files[0].arrayBuffer() }).promise;
      const extension = action === 'pdf-to-jpg' ? 'jpg' : 'png'; const mime = extension === 'jpg' ? 'image/jpeg' : 'image/png';
      for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber += 1) { const page = await pdfDocument.getPage(pageNumber); const viewport = page.getViewport({ scale: 2 }); const canvas = document.createElement('canvas'); canvas.width = viewport.width; canvas.height = viewport.height; await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise; const blob = await new Promise((resolve) => canvas.toBlob(resolve, mime, .92)); download(blob, `scribe-page-${pageNumber}.${extension}`); docsProgress(`RENDERING PAGE ${pageNumber} OF ${pdfDocument.numPages}`, 20 + (pageNumber / pdfDocument.numPages) * 75); }
    }
    docsProgress('DONE / DOWNLOAD STARTED / NOTHING UPLOADED', 100);
  } catch (error) { result.textContent = `DOCUMENT ERROR / ${error.message}`; document.querySelector('#docs-progress-bar').style.width = '0%'; console.error(error); }
}

async function convertImage(file, target) {
  const result = document.querySelector('#result'); const progress = document.querySelector('#progress'); const bar = document.querySelector('#progress-bar');
  if (!file) return; progress.classList.add('show'); result.textContent = 'READING PIXELS...'; bar.style.width = '25%';
  try { const image = await loadImage(file); bar.style.width = '60%'; const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height; canvas.getContext('2d').drawImage(image, 0, 0); const mime = target === 'jpg' ? 'image/jpeg' : `image/${target}`; const blob = await new Promise((resolve) => canvas.toBlob(resolve, mime, .9)); bar.style.width = '100%'; download(blob, `${file.name.replace(/\.[^.]+$/, '')}.${target}`); result.textContent = `DONE / ${image.width} × ${image.height} / DOWNLOAD STARTED`; } catch (error) { result.textContent = `ERROR / ${error.name || 'CONVERSION'} / ${error.message}`; }
}

async function loadImage(file) {
  if (file.type === 'image/svg+xml' || /\.svg$/i.test(file.name)) return loadImageElement(file);
  try { return await createImageBitmap(file); } catch { return await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => { const image = new Image(); image.onload = () => resolve(image); image.onerror = () => reject(new Error('The source image could not be decoded.')); image.src = reader.result; }; reader.onerror = () => reject(new Error('The source image could not be read.')); reader.readAsDataURL(file); }); }
}

function loadImageElement(file) {
  return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => { const image = new Image(); image.onload = () => resolve(image); image.onerror = () => reject(new Error('The source image could not be decoded.')); image.src = reader.result; }; reader.onerror = () => reject(new Error('The source image could not be read.')); reader.readAsDataURL(file); });
}

async function convertMedia(file, target, kind) {
  const result = document.querySelector('#result'); const progress = document.querySelector('#progress'); const bar = document.querySelector('#progress-bar');
  if (!file) return; progress.classList.add('show'); result.textContent = 'LOADING FFMPEG WASM...'; bar.style.width = '8%';
  try {
    const { FFmpeg } = await import('https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@0.12.10/dist/esm/index.js');
    const { fetchFile, toBlobURL } = await import('https://cdn.jsdelivr.net/npm/@ffmpeg/util@0.12.1/dist/esm/index.js');
    const ffmpeg = new FFmpeg(); const base = 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/umd';
    await ffmpeg.load({ coreURL: await toBlobURL(`${base}/ffmpeg-core.js`, 'text/javascript'), wasmURL: await toBlobURL(`${base}/ffmpeg-core.wasm`, 'application/wasm') });
    ffmpeg.on('progress', ({ progress }) => { bar.style.width = `${Math.max(10, Math.round(progress * 100))}%`; result.textContent = `PROCESSING LOCALLY / ${Math.round(progress * 100)}%`; });
    await ffmpeg.writeFile(file.name, await fetchFile(file)); const output = `scribe-output.${target}`; await ffmpeg.exec(['-i', file.name, output]); const data = await ffmpeg.readFile(output); const mime = kind === 'audio' ? `audio/${target === 'mp3' ? 'mpeg' : target}` : `video/${target === 'gif' ? 'gif' : target}`; download(new Blob([data.buffer], { type: mime }), output); bar.style.width = '100%'; result.textContent = 'DONE / DOWNLOAD STARTED / NOTHING UPLOADED';
  } catch (error) { bar.style.width = '0%'; result.textContent = 'FFMPEG COULD NOT LOAD / CHECK YOUR CONNECTION'; console.error(error); }
}
function download(blob, name) { const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = name; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
function fileKind(file) {
  const name = file.name.toLowerCase();
  if (file.type === 'application/pdf' || /\.pdf$/.test(name)) return 'docs';
  if (file.type.startsWith('image/') || /\.(png|jpe?g|webp|svg|bmp|avif)$/.test(name)) return 'image';
  if (file.type.startsWith('video/') || /\.(mp4|webm|mov|mkv|avi|gif)$/.test(name)) return 'video';
  if (file.type.startsWith('audio/') || /\.(mp3|wav|ogg|m4a|flac|aac)$/.test(name)) return 'audio';
  return null;
}
const dragOverlay = document.querySelector('#drag-overlay');
let dragDepth = 0;
window.addEventListener('dragenter', (event) => { if (!event.dataTransfer?.types.includes('Files') || location.hash !== '#/' && location.hash !== '') return; event.preventDefault(); dragDepth += 1; dragOverlay.classList.add('show'); });
window.addEventListener('dragover', (event) => { if (!event.dataTransfer?.types.includes('Files') || location.hash !== '#/' && location.hash !== '') return; event.preventDefault(); });
window.addEventListener('dragleave', (event) => { if (location.hash !== '#/' && location.hash !== '') return; event.preventDefault(); dragDepth -= 1; if (dragDepth <= 0) { dragDepth = 0; dragOverlay.classList.remove('show'); } });
window.addEventListener('drop', (event) => { if (location.hash !== '#/' && location.hash !== '') return; event.preventDefault(); dragDepth = 0; dragOverlay.classList.remove('show'); const file = event.dataTransfer?.files[0]; const kind = file && fileKind(file); if (file && kind) { pendingFile = file; location.hash = `/${kind}`; } });
const infoToggle = document.querySelector('#info-toggle');
const infoClose = document.querySelector('#info-close');
const infoDrawer = document.querySelector('#info-drawer');
function setInfo(open) { infoToggle.setAttribute('aria-expanded', String(open)); infoDrawer.setAttribute('aria-hidden', String(!open)); infoDrawer.classList.toggle('show', open); }
infoToggle.addEventListener('click', () => setInfo(!infoDrawer.classList.contains('show')));
infoClose.addEventListener('click', () => setInfo(false));
function render() { const kind = location.hash.replace('#/', '') || 'home'; setInfo(false); document.querySelectorAll('.nav a').forEach((link) => link.classList.toggle('active', link.dataset.route === kind)); if (kind === 'home') home(); else if (kind === 'docs') docsPage(); else toolPage(routes[kind] ? kind : 'image'); app.focus({ preventScroll: true }); }
window.addEventListener('hashchange', render); render();

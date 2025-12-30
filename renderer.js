const urlInput = document.getElementById('url');
const pathInput = document.getElementById('path');
const browseBtn = document.getElementById('browseBtn');
const dlBtn = document.getElementById('dlBtn');
const cancelBtn = document.getElementById('cancelBtn');
const againBtn = document.getElementById('againBtn');
const closeBtn = document.getElementById('closeBtn');

const status = document.getElementById('status');
const log = document.getElementById('log');
const progressBar = document.getElementById('progressBar');
const progressContainer = document.getElementById('progressContainer');

const mainView = document.getElementById('mainView');
const successView = document.getElementById('successView');

let savePath = '';

window.electronAPI.onLog((msg) => { log.textContent = msg; });

window.electronAPI.onProgress((percent) => {
  progressContainer.style.display = 'block';
  progressBar.style.width = percent + '%';
});

browseBtn.addEventListener('click', async () => {
  const path = await window.electronAPI.selectDirectory();
  if (path) {
    savePath = path;
    pathInput.value = path;
  }
});

dlBtn.addEventListener('click', async () => {
  const url = urlInput.value.trim();

  if (!url) { showStatus('Please enter a YouTube URL', 'error'); return; }
  if (!savePath) { showStatus('Please choose a save location', 'error'); return; }

  dlBtn.style.display = 'none';
  cancelBtn.style.display = 'block';
  log.textContent = 'Connecting...'; 

  const result = await window.electronAPI.startDownload({ url, savePath });

  if (result.success) {
    showSuccess();
  } else {
    dlBtn.style.display = 'block'; 
    cancelBtn.style.display = 'none';
    log.textContent = ''; 
    showStatus(result.message, 'error');
  }
});

cancelBtn.addEventListener('click', async () => {
  const cancelled = await window.electronAPI.cancelDownload();
  if (cancelled) {
    dlBtn.style.display = 'block'; 
    cancelBtn.style.display = 'none';
    log.textContent = 'Cancelled';
  }
});

againBtn.addEventListener('click', () => {
  successView.style.display = 'none';
  mainView.style.display = 'block';
  urlInput.value = '';
  log.textContent = '';
  status.textContent = '';
  progressBar.style.width = '0%';
  
  dlBtn.style.display = 'block';
  cancelBtn.style.display = 'none';
});

closeBtn.addEventListener('click', () => {
  window.close();
});

function showSuccess() {
  mainView.style.display = 'none';
  successView.style.display = 'flex';
  log.textContent = ''; 
  status.textContent = '';
}

function showStatus(msg, type) {
  status.textContent = msg;
  status.className = type;
}
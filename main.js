const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');
const axios = require('axios');

let mainWindow;
let downloadProcess = null;

// --- PATHS ---
const YTDLP_FILENAME = process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp';
const YTDLP_PATH = path.join(app.getPath('userData'), YTDLP_FILENAME);

let FFMPEG_PATH;
if (app.isPackaged) {
  FFMPEG_PATH = path.join(process.resourcesPath, 'ffmpeg.exe');
} else {
  FFMPEG_PATH = path.join(__dirname, 'ffmpeg.exe');
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 480,
    height: 620,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    resizable: false,
    icon: path.join(__dirname, 'assets/icon.png')
  });

  mainWindow.loadFile('index.html');
}

app.whenReady().then(createWindow);

// --- SETUP ---

async function ensureYtDlpExists() {
  if (fs.existsSync(YTDLP_PATH)) return true;
  mainWindow.webContents.send('log', 'Downloading video engine...');
  const url = process.platform === 'win32' 
    ? 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe' 
    : 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp';
  const writer = fs.createWriteStream(YTDLP_PATH);
  const response = await axios({ url, method: 'GET', responseType: 'stream' });
  response.data.pipe(writer);
  return new Promise((resolve, reject) => {
    writer.on('finish', () => {
      fs.chmodSync(YTDLP_PATH, '755');
      resolve(true);
    });
    writer.on('error', reject);
  });
}

ipcMain.handle('dialog:openDir', async () => {
  const result = await dialog.showOpenDialog(mainWindow, { properties: ['openDirectory'] });
  return result.filePaths[0];
});

ipcMain.handle('cancel-download', async () => {
  if (downloadProcess) {
    downloadProcess.kill('SIGKILL'); 
    downloadProcess = null;
    return true;
  }
  return false;
});

ipcMain.handle('start-download', async (event, { url, savePath }) => {
  await ensureYtDlpExists();

  // MP4 FIX FOR WINDOWS MEDIA PLAYER
  const formatArg = 'bestvideo[vcodec^=avc1][height<=720]+bestaudio[acodec^=mp4a]/best[ext=mp4][height<=720]/best[ext=mp4]';
  
  const outputFile = path.join(savePath, `%(title)s.%(ext)s`);
  
  const args = [
    '-f', formatArg,
    '-o', outputFile,
    '--newline',
    '--no-playlist',
    '--ffmpeg-location', FFMPEG_PATH,
    url
  ];

  return new Promise((resolve) => {
    downloadProcess = spawn(YTDLP_PATH, args);

    downloadProcess.stdout.on('data', (data) => {
      const text = data.toString();
      const match = text.match(/(\d+\.?\d*)%/);
      if (match) {
        const percent = parseFloat(match[1]);
        mainWindow.webContents.send('download-progress', percent);
        
        if (text.includes('[ffmpeg]')) {
           mainWindow.webContents.send('log', 'Fixing format for Windows Player...');
        } else if (text.includes('[download]')) {
           mainWindow.webContents.send('log', 'Downloading...');
        }
      }
    });

    downloadProcess.on('close', (code) => {
      downloadProcess = null;
      if (code === 0) {
        resolve({ success: true, message: 'Complete' });
      } else {
        resolve({ success: false, message: 'Download Failed. Is ffmpeg.exe in the folder?' });
      }
    });
  });
});
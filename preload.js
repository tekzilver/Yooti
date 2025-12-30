const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  selectDirectory: () => ipcRenderer.invoke('dialog:openDir'),
  startDownload: (data) => ipcRenderer.invoke('start-download', data),
  cancelDownload: () => ipcRenderer.invoke('cancel-download'),
  onProgress: (callback) => ipcRenderer.on('download-progress', (event, percent) => callback(percent)),
  onLog: (callback) => ipcRenderer.on('log', (event, message) => callback(message))
});
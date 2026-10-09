// Exposes a tiny, safe native API to the game page.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('frenchFriedNative', {
  quit: () => ipcRenderer.send('ff:quit'),
  toggleFullscreen: () => ipcRenderer.send('ff:fullscreen'),
  unlockAchievement: (id) => ipcRenderer.send('ff:achievement', String(id)),
});

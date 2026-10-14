// Exposes a tiny, safe native API to the game page.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('backyardNative', {
  isDesktop: true,
  quit: () => ipcRenderer.send('bl:quit'),
  toggleFullscreen: () => ipcRenderer.send('bl:fullscreen'),
  unlockAchievement: (id) => ipcRenderer.send('bl:achievement', String(id)),
});

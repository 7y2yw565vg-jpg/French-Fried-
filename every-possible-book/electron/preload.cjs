// Exposes a tiny, safe native API to the game page.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('libraryNative', {
  quit: () => ipcRenderer.send('epb:quit'),
  toggleFullscreen: () => ipcRenderer.send('epb:fullscreen'),
  unlockAchievement: (id) => ipcRenderer.send('epb:achievement', String(id)),
  load: () => ipcRenderer.invoke('epb:load'),
  save: (data) => ipcRenderer.send('epb:save', String(data)),
});

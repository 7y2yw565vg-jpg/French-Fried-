// Exposes a tiny, safe native API to the game page.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('unicornNative', {
  quit: () => ipcRenderer.send('uni:quit'),
  toggleFullscreen: () => ipcRenderer.send('uni:fullscreen'),
  unlockAchievement: (id) => ipcRenderer.send('uni:achievement', String(id)),
  load: () => ipcRenderer.invoke('uni:load'),
  save: (data) => ipcRenderer.send('uni:save', String(data)),
});

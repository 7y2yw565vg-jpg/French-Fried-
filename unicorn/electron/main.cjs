// Electron shell for the desktop / Steam build of Unicorn.
const { app, BrowserWindow, ipcMain, Menu } = require('electron');
const path = require('path');
const fs = require('fs');

let steam = null;
function initSteam() {
  try {
    const appIdFile = path.join(process.cwd(), 'steam_appid.txt');
    const appId = Number(process.env.STEAM_APP_ID || (fs.existsSync(appIdFile) ? fs.readFileSync(appIdFile, 'utf8').trim() : 0));
    if (!appId) return;
    // Optional dependency: only present in Steam builds.
    steam = require('steamworks.js').init(appId);
  } catch (err) {
    console.warn('Steamworks not available:', err.message);
    steam = null;
  }
}

// Saves live in a file next to Electron's user data so Steam Cloud can sync the folder.
const saveFile = () => path.join(app.getPath('userData'), 'company.sav');

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 640,
    backgroundColor: '#0f1115',
    title: 'Unicorn',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      backgroundThrottling: false,
    },
  });
  Menu.setApplicationMenu(null);
  win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('before-input-event', (_e, input) => {
    if (input.type === 'keyDown' && input.key === 'F11') win.setFullScreen(!win.isFullScreen());
  });
  return win;
}

ipcMain.on('uni:quit', () => app.quit());
ipcMain.on('uni:fullscreen', (e) => {
  const win = BrowserWindow.fromWebContents(e.sender);
  if (win) win.setFullScreen(!win.isFullScreen());
});
ipcMain.on('uni:achievement', (_e, id) => {
  try {
    if (steam && typeof id === 'string') steam.achievement.activate(id.toUpperCase());
  } catch (err) {
    console.warn('achievement failed', err.message);
  }
});
ipcMain.handle('uni:load', () => {
  try {
    return fs.existsSync(saveFile()) ? fs.readFileSync(saveFile(), 'utf8') : null;
  } catch {
    return null;
  }
});
ipcMain.on('uni:save', (_e, data) => {
  if (typeof data !== 'string') return;
  try {
    const tmp = saveFile() + '.tmp';
    fs.writeFileSync(tmp, data, 'utf8');
    fs.renameSync(tmp, saveFile());
  } catch (err) {
    console.warn('save failed', err.message);
  }
});

app.whenReady().then(() => {
  initSteam();
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => app.quit());

// Required for the Steam overlay to render in Electron.
app.commandLine.appendSwitch('in-process-gpu');
app.commandLine.appendSwitch('disable-direct-composition');

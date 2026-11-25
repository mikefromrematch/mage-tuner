// MAGE Tuner — Electron shell.
// Gives the tuner a frameless, truly transparent window that can float above your DAW.
const { app, BrowserWindow, ipcMain, globalShortcut, session, systemPreferences, screen } = require('electron');
const path = require('path');
const fs = require('fs');

// Linux compositors need this for transparent windows.
if (process.platform === 'linux') {
  app.commandLine.appendSwitch('enable-transparent-visuals');
  app.disableHardwareAcceleration();
}

const SIZES = {
  full: { width: 420, height: 680, minWidth: 360, minHeight: 560 },
  overlay: { width: 390, height: 124, minWidth: 330, minHeight: 110 },
};
const stateFile = () => path.join(app.getPath('userData'), 'window-state.json');
let saved = {};
let win = null;
let mode = 'full';
let pinned = false;

function loadState() {
  try { saved = JSON.parse(fs.readFileSync(stateFile(), 'utf8')); } catch { saved = {}; }
}
function saveState() {
  if (win && !win.isDestroyed()) saved[mode] = win.getBounds();
  try { fs.writeFileSync(stateFile(), JSON.stringify(saved)); } catch {}
}
function onScreen(b) {
  return screen.getAllDisplays().some(d => {
    const a = d.workArea;
    return b.x < a.x + a.width && b.x + b.width > a.x && b.y < a.y + a.height && b.y + b.height > a.y;
  });
}

function createWindow() {
  const s = SIZES.full;
  const b = saved.full && onScreen(saved.full) ? saved.full : { width: s.width, height: s.height };
  win = new BrowserWindow({
    ...b,
    minWidth: s.minWidth,
    minHeight: s.minHeight,
    transparent: true,
    frame: false,
    hasShadow: false,
    backgroundColor: '#00000000',
    title: 'MAGE Tuner',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false, // keep analysing while you're focused on the DAW
    },
  });
  win.loadFile('index.html');
  win.on('close', saveState);
}

function applyMode(next) {
  if (!win) return;
  saved[mode] = win.getBounds();
  mode = next;
  const s = SIZES[mode];
  const cur = win.getBounds();
  const b = saved[mode] && onScreen(saved[mode]) ? saved[mode] : { x: cur.x, y: cur.y, width: s.width, height: s.height };
  win.setMinimumSize(s.minWidth, s.minHeight);
  win.setBounds(b);
  const float = mode === 'overlay' || pinned;
  win.setAlwaysOnTop(float, 'floating');
  if (process.platform === 'darwin') win.setVisibleOnAllWorkspaces(mode === 'overlay', { visibleOnFullScreen: true });
  if (mode !== 'overlay') win.setIgnoreMouseEvents(false);
  saveState();
}

app.whenReady().then(async () => {
  loadState();

  // Allow the page to use the microphone / audio interface.
  session.defaultSession.setPermissionRequestHandler((_wc, perm, cb) => cb(perm === 'media'));
  session.defaultSession.setPermissionCheckHandler((_wc, perm) => perm === 'media');
  if (process.platform === 'darwin') {
    try { await systemPreferences.askForMediaAccess('microphone'); } catch {}
  }

  // Linux needs a beat before transparent windows render correctly.
  setTimeout(createWindow, process.platform === 'linux' ? 300 : 0);

  ipcMain.handle('set-mode', (_e, m) => applyMode(m === 'overlay' ? 'overlay' : 'full'));
  ipcMain.on('click-through', (_e, on) => win && win.setIgnoreMouseEvents(!!on, { forward: true }));
  ipcMain.on('pin', (_e, on) => { pinned = !!on; win && win.setAlwaysOnTop(pinned || mode === 'overlay', 'floating'); });
  ipcMain.on('minimize', () => win && win.minimize());
  ipcMain.on('close', () => win && win.close());

  // Global shortcuts work even while your DAW has focus.
  globalShortcut.register('CommandOrControl+Alt+Shift+T', () => win && win.webContents.send('toggle-mode'));
  globalShortcut.register('CommandOrControl+Alt+Shift+C', () => win && win.webContents.send('toggle-through'));
});

app.on('will-quit', () => globalShortcut.unregisterAll());
app.on('window-all-closed', () => app.quit());

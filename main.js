// MAGE Attuner — Electron shell.
// Gives the tuner a frameless, truly transparent window that can float above your DAW.
const { app, BrowserWindow, ipcMain, globalShortcut, session, systemPreferences, screen, Menu } = require('electron');
const path = require('path');
const fs = require('fs');

// Linux compositors need this for transparent windows.
if (process.platform === 'linux') {
  app.commandLine.appendSwitch('enable-transparent-visuals');
  app.disableHardwareAcceleration();
}

const SIZES = {
  full: { width: 420, height: 780, minWidth: 360, minHeight: 600 },
  overlay: { width: 390, height: 124, minWidth: 330, minHeight: 110 },
};
const stateFile = () => path.join(app.getPath('userData'), 'window-state.json');
let saved = {};
let win = null;
let mode = 'full';
let through = false; // click-through on/off (owned here, mirrored in the page)
let hot = false;     // pointer is over the page's "turn off click-through" button

function applyIgnore() {
  if (!win || win.isDestroyed()) return;
  if (through && !hot) win.setIgnoreMouseEvents(true, { forward: true });
  else win.setIgnoreMouseEvents(false);
}
function setThrough(on) {
  through = !!on && mode === 'overlay';
  hot = false;
  applyIgnore();
  if (win && !win.isDestroyed()) win.webContents.send('through-changed', through);
  buildMenu();
}
function buildMenu() {
  const isMac = process.platform === 'darwin';
  const template = [
    ...(isMac ? [{ role: 'appMenu' }] : []),
    {
      label: 'Attuner',
      submenu: [
        { label: 'Window mode', type: 'radio', checked: mode !== 'overlay',
          click: () => win && win.webContents.send('mode', 'full') },
        { label: 'Desktop mode', type: 'radio', checked: mode === 'overlay',
          accelerator: 'CommandOrControl+Alt+Shift+T', registerAccelerator: false,
          click: () => win && win.webContents.send('mode', 'overlay') },
        { label: 'Click-through', type: 'checkbox', checked: through, enabled: mode === 'overlay',
          accelerator: 'CommandOrControl+Alt+Shift+C', registerAccelerator: false,
          click: () => setThrough(!through) },
        { type: 'separator' },
        { role: isMac ? 'close' : 'quit' },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

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
    maximizable: false, // double-clicking the strip must not zoom it to full screen
    fullscreenable: false,
    hasShadow: false,
    backgroundColor: '#00000000',
    title: 'MAGE Attuner',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false, // keep analysing while you're focused on the DAW
    },
  });
  win.loadFile('index.html');
  win.on('close', saveState);
  // Clicking the Dock / taskbar icon (or Cmd/Alt-Tab) brings the window into focus.
  // Clicks pass straight through a click-through window, so focus means "I want it back".
  win.on('focus', () => { if (through) setThrough(false); });
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
  win.setAlwaysOnTop(mode === 'overlay', 'floating');
  if (process.platform === 'darwin') win.setVisibleOnAllWorkspaces(mode === 'overlay', { visibleOnFullScreen: true });
  if (mode !== 'overlay') setThrough(false);
  buildMenu();
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
  ipcMain.on('click-through', (_e, on) => setThrough(on));
  // The page reports how tall the full tuner needs to be; grow the window (and its minimum) to fit,
  // capped to the screen so it never opens taller than the display (the page scrolls then).
  ipcMain.on('fit-height', (_e, h) => {
    if (!win || mode !== 'full' || !Number.isFinite(h)) return;
    const b = win.getBounds();
    const area = screen.getDisplayMatching(b).workArea;
    const need = Math.min(Math.ceil(h), area.height);
    win.setMinimumSize(SIZES.full.minWidth, need);
    if (b.height < need) {
      const y = Math.max(area.y, Math.min(b.y, area.y + area.height - need));
      win.setBounds({ x: b.x, y, width: b.width, height: need });
    }
  });
  ipcMain.on('hot', (_e, on) => { hot = !!on; applyIgnore(); });
  ipcMain.on('minimize', () => win && win.minimize());
  ipcMain.on('close', () => win && win.close());

  // Global shortcuts work even while your DAW has focus.
  globalShortcut.register('CommandOrControl+Alt+Shift+T', () => win && win.webContents.send('toggle-mode'));
  globalShortcut.register('CommandOrControl+Alt+Shift+C', () => {
    if (!win) return;
    if (mode !== 'overlay') { win.webContents.send('toggle-mode'); setTimeout(() => setThrough(true), 150); }
    else setThrough(!through);
  });
  buildMenu();
});

app.on('will-quit', () => globalShortcut.unregisterAll());
app.on('window-all-closed', () => app.quit());
// macOS: clicking the Dock icon always gives you the tuner back.
app.on('activate', () => { if (win) { win.show(); if (through) setThrough(false); } });

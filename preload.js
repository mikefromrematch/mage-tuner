const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desk', {
  setMode: (m) => ipcRenderer.invoke('set-mode', m),
  setClickThrough: (on) => ipcRenderer.send('click-through', !!on),
  setHot: (on) => ipcRenderer.send('hot', !!on),
  setPin: (on) => ipcRenderer.send('pin', on),
  minimize: () => ipcRenderer.send('minimize'),
  close: () => ipcRenderer.send('close'),
  on: (channel, fn) => {
    if (channel === 'toggle-mode' || channel === 'through-changed') ipcRenderer.on(channel, (_e, v) => fn(v));
  },
});

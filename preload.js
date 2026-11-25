const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desk', {
  setMode: (m) => ipcRenderer.invoke('set-mode', m),
  setClickThrough: (on) => ipcRenderer.send('click-through', on),
  setPin: (on) => ipcRenderer.send('pin', on),
  minimize: () => ipcRenderer.send('minimize'),
  close: () => ipcRenderer.send('close'),
  on: (channel, fn) => {
    if (channel === 'toggle-mode' || channel === 'toggle-through') ipcRenderer.on(channel, () => fn());
  },
});

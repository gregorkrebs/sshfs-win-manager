const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('openclaw', {
  windowOpen: (route, opts) => ipcRenderer.invoke('window:open', { route, opts }),
  windowClose: () => ipcRenderer.invoke('window:closeCurrent'),
  windowMinimize: () => ipcRenderer.invoke('window:minimizeCurrent'),
  windowHide: () => ipcRenderer.invoke('window:hideCurrent'),

  // Shell helpers
  openPath: (targetPath) => ipcRenderer.invoke('shell:openPath', targetPath),

  // Dialogs
  selectFile: (options) => ipcRenderer.invoke('dialog:openFile', options),

  // Clipboard
  clipboardWriteText: (text) => ipcRenderer.invoke('clipboard:writeText', text),

  getLoginItemSettings: (options) => ipcRenderer.invoke('app:getLoginItemSettings', options),
  setLoginItemSettings: (settings) => ipcRenderer.invoke('app:setLoginItemSettings', settings),
  getAppVersion: () => ipcRenderer.invoke('app:getVersion'),
  openExternal: (url) => ipcRenderer.invoke('shell:openExternal', url),

  // Events from main
  on: (channel, fn) => {
    ipcRenderer.on(channel, (_evt, data) => fn(data))
  },
  once: (channel, fn) => {
    ipcRenderer.once(channel, (_evt, data) => fn(data))
  },

  emit: (channel, data) => ipcRenderer.send(channel, data)
})

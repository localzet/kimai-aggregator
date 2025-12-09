const { contextBridge, ipcRenderer } = require('electron')

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electron', {
  isElectron: true,
  notionApi: {
    request: (url, options) => ipcRenderer.invoke('notion-api-request', { url, options }),
  },
})


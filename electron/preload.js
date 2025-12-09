const { contextBridge, ipcRenderer } = require('electron')

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
try {
  contextBridge.exposeInMainWorld('electron', {
    isElectron: true,
    notionApi: {
      request: (url, options) => ipcRenderer.invoke('notion-api-request', { url, options }),
    },
  })
  console.log('Electron API exposed to renderer')
} catch (error) {
  console.error('Error exposing Electron API:', error)
}


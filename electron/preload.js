const { contextBridge, ipcRenderer } = require('electron')

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
try {
  contextBridge.exposeInMainWorld('electron', {
    isElectron: true,
    notionApi: {
      request: async (url, options) => {
        try {
          const result = await ipcRenderer.invoke('notion-api-request', { url, options })
          return result
        } catch (error) {
          console.error('IPC Error calling notion-api-request:', error)
          return {
            ok: false,
            status: 0,
            statusText: error.message || 'IPC Communication Error',
            data: null,
            error: error.message || 'IPC Communication Error',
          }
        }
      },
    },
  })
  console.log('Electron API exposed to renderer')
} catch (error) {
  console.error('Error exposing Electron API:', error)
}


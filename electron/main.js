import { app, BrowserWindow, Menu, ipcMain, globalShortcut } from 'electron'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

function createWindow() {
  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged
  const preloadPath = isDev 
    ? join(__dirname, 'preload.js')
    : join(process.resourcesPath, 'app', 'electron', 'preload.js')
  
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: preloadPath,
    },
    autoHideMenuBar: true,
  })

  win.webContents.on('context-menu', (e) => {
    e.preventDefault()
  })

  const openDevTools = process.env.ENABLE_DEVTOOLS === '1' || process.argv.includes('--devtools')

  if (isDev) {
    win.loadURL('http://localhost:5173')
  } else {
    win.loadFile(join(__dirname, '../dist/index.html'))
  }

  win.webContents.on('console-message', (e, level, message, line, sourceId) => {
    console.log(`[renderer:${level}] ${message} (${sourceId}:${line})`)
  })

  win.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error('did-fail-load', { errorCode, errorDescription, validatedURL })
  })

  win.webContents.on('crashed', () => {
    console.error('Renderer process crashed')
  })

  if (openDevTools) {
    win.webContents.openDevTools({ mode: 'detach' })
  }

  return win
}

// IPC handler for Notion API requests (bypasses CORS)
ipcMain.handle('notion-api-request', async (event, { url, options }) => {
  try {
    const response = await fetch(url, options)
    const data = await response.text()
    
    return {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      data: data ? JSON.parse(data) : null,
    }
  } catch (error) {
    return {
      ok: false,
      status: 0,
      statusText: error.message,
      data: null,
      error: error.message,
    }
  }
})

app.whenReady().then(() => {
  Menu.setApplicationMenu(null)
  
  const win = createWindow()

  // Горячая клавиша для открытия DevTools (Ctrl+Shift+I или Cmd+Shift+I на Mac)
  globalShortcut.register('CommandOrControl+Shift+I', () => {
    const windows = BrowserWindow.getAllWindows()
    if (windows.length > 0) {
      const activeWindow = windows[0]
      if (activeWindow && !activeWindow.isDestroyed()) {
        if (activeWindow.webContents.isDevToolsOpened()) {
          activeWindow.webContents.closeDevTools()
        } else {
          activeWindow.webContents.openDevTools({ mode: 'detach' })
        }
      }
    }
  })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  // Отменяем регистрацию горячих клавиш при закрытии всех окон
  globalShortcut.unregisterAll()
  
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('will-quit', () => {
  // Отменяем регистрацию горячих клавиш при выходе из приложения
  globalShortcut.unregisterAll()
})


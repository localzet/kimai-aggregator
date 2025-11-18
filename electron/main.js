import { app, BrowserWindow, Menu } from 'electron'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    autoHideMenuBar: true, // Скрываем меню приложения
  })

  // Отключаем контекстное меню
  win.webContents.on('context-menu', (e) => {
    e.preventDefault()
  })

  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

  // Allow opening devtools in packaged app by passing --devtools or setting env KIMAI_DEVTOOLS=1
  const openDevTools = process.env.KIMAI_DEVTOOLS === '1' || process.argv.includes('--devtools')

  if (isDev) {
    win.loadURL('http://localhost:5173')
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  // Forward renderer console messages and load failures to main process logs
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
    // Detached window so devtools stay open separately
    win.webContents.openDevTools({ mode: 'detach' })
  }
}

app.whenReady().then(() => {
  // Полностью отключаем меню приложения
  Menu.setApplicationMenu(null)
  
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})


import { app, BrowserWindow, Menu, ipcMain, globalShortcut } from 'electron'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { existsSync } from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

function createWindow() {
  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged
  console.log('Creating window - isDev:', isDev, 'NODE_ENV:', process.env.NODE_ENV, 'isPackaged:', app.isPackaged)
  
  // Определяем путь к preload.js
  let preloadPath = join(__dirname, 'preload.js')
  
  // В production проверяем альтернативные пути
  if (!isDev && !existsSync(preloadPath)) {
    const altPaths = [
      join(process.resourcesPath, 'app.asar', 'electron', 'preload.js'),
      join(process.resourcesPath, 'app', 'electron', 'preload.js'),
      join(__dirname, '..', 'electron', 'preload.js'),
    ]
    for (const altPath of altPaths) {
      if (existsSync(altPath)) {
        preloadPath = altPath
        break
      }
    }
  }
  
  // Если preload.js не найден, выводим предупреждение, но продолжаем
  if (!existsSync(preloadPath)) {
    console.warn('Preload.js not found at:', preloadPath)
    console.warn('Notion sync may not work. Check electron-builder configuration.')
  } else {
    console.log('Preload.js found at:', preloadPath)
  }
  
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
  
  // Логируем события загрузки preload
  win.webContents.on('did-start-loading', () => {
    const url = win.webContents.getURL()
    console.log('Window started loading:', url)
  })
  
  win.webContents.on('did-finish-load', () => {
    const url = win.webContents.getURL()
    console.log('Window finished loading:', url)
  })
  
  // Обрабатываем навигацию для OAuth/MIX ID callback
  win.webContents.on('will-navigate', (event, navigationUrl) => {
    try {
      const parsedUrl = new URL(navigationUrl)
      console.log('will-navigate event:', navigationUrl, 'isDev:', isDev)
      
      // В production блокируем навигацию на localhost (dev сервер не запущен)
      if (!isDev && parsedUrl.hostname === 'localhost') {
        console.warn('Blocked localhost navigation in production:', navigationUrl)
        event.preventDefault()
        return
      }
      
      // В dev режиме разрешаем навигацию на localhost для callback
      if (isDev && parsedUrl.hostname === 'localhost' && (parsedUrl.pathname.includes('callback') || parsedUrl.pathname.includes('mixid-callback'))) {
        // Загружаем callback URL в текущем окне
        setTimeout(() => {
          win.loadURL(navigationUrl)
        }, 100)
        event.preventDefault()
        return
      }
      // Для file:// протокола с callback - разрешаем навигацию (React Router обработает)
      if (parsedUrl.protocol === 'file:' && (parsedUrl.pathname.includes('callback') || parsedUrl.pathname.includes('mixid-callback'))) {
        console.log('Allowing file:// callback navigation:', navigationUrl)
        // Разрешаем навигацию - React Router обработает file:///mixid-callback
        return
      }
      
      // Разрешаем навигацию на file:// для внутренней навигации приложения
      if (parsedUrl.protocol === 'file:') {
        return
      }
      // Для других случаев блокируем навигацию на внешние URL (кроме file://)
      if (navigationUrl.startsWith('http://') || navigationUrl.startsWith('https://')) {
        event.preventDefault()
      }
    } catch (e) {
      console.error('Error parsing navigation URL:', e)
    }
  })
  
  // Обрабатываем новые окна (для OAuth popup)
  win.webContents.setWindowOpenHandler(({ url }) => {
    try {
      const parsedUrl = new URL(url)
      // Разрешаем открытие localhost и внешних URL для OAuth
      if (parsedUrl.hostname === 'localhost' || parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:') {
        return { action: 'allow' }
      }
      return { action: 'deny' }
    } catch (e) {
      console.error('Error parsing window open URL:', e)
      return { action: 'deny' }
    }
  })

  win.webContents.on('context-menu', (e) => {
    e.preventDefault()
  })

  const openDevTools = process.env.ENABLE_DEVTOOLS === '1' || process.argv.includes('--devtools')

  if (isDev) {
    console.log('Loading dev URL: http://localhost:5173')
    win.loadURL('http://localhost:5173')
  } else {
    const indexPath = join(__dirname, '../dist/index.html')
    console.log('Loading production file:', indexPath)
    win.loadFile(indexPath).catch((err) => {
      console.error('Failed to load index.html:', err)
    })
  }

  win.webContents.on('console-message', (e, level, message, line, sourceId) => {
    console.log(`[renderer:${level}] ${message} (${sourceId}:${line})`)
  })

  win.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    // Игнорируем ошибки загрузки localhost в production (это нормально)
    if (!isDev && validatedURL && validatedURL.includes('localhost')) {
      console.log('Ignoring localhost load failure in production (expected)')
      return
    }
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
    
    let parsedData = null
    try {
      parsedData = data ? JSON.parse(data) : null
    } catch (parseError) {
      // Если не JSON, возвращаем как текст
      parsedData = data
    }
    
    return {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      data: parsedData,
      error: response.ok ? undefined : (parsedData?.message || parsedData?.code || response.statusText),
    }
  } catch (error) {
    console.error('Notion API request error:', error)
    return {
      ok: false,
      status: 0,
      statusText: error.message || 'Network error',
      data: null,
      error: error.message || 'Network error',
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


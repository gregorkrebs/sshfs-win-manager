const path = require('node:path')
const { app, BrowserWindow, ipcMain, Menu, Tray, shell, dialog, clipboard } = require('electron')

const isDev = !app.isPackaged

// Single-instance lock
const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
}

let tray = null
let windows = new Map() // name -> BrowserWindow

function rendererUrl (route = '/') {
  // Vue-router default mode is hash.
  const hash = route.startsWith('#') ? route : `#${route}`

  if (isDev) {
    return `http://localhost:5173/${hash}`
  }

  return `file://${path.join(__dirname, '..', 'dist', 'index.html')}${hash}`
}

function createWindow (name, route, opts = {}) {
  const win = new BrowserWindow({
    title: 'SSHFS-Win Manager',
    width: opts.width ?? 900,
    height: opts.height ?? 500,
    useContentSize: true,
    frame: false,
    maximizable: false,
    minimizable: false,
    resizable: false,
    show: false,
    parent: opts.parent ?? undefined,
    modal: Boolean(opts.modal),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: true
    }
  })

  win.loadURL(rendererUrl(route))

  win.once('ready-to-show', () => {
    if (opts.show !== false) win.show()
  })

  win.on('closed', () => {
    windows.delete(name)
  })

  windows.set(name, win)
  return win
}

function getMainWindow () {
  return windows.get('main')
}

app.on('second-instance', () => {
  const main = getMainWindow()
  if (main) {
    main.show()
    main.focus()
  }
})

app.whenReady().then(() => {
  app.setAppUserModelId('SSHFS-Win Manager')

  // main window
  createWindow('main', '/')

  // tray
  const staticDir = isDev
    ? path.join(__dirname, '..', 'static')
    : path.join(process.resourcesPath, 'static')

  tray = new Tray(path.join(staticDir, 'tray-icon.ico'))

  const trayMenu = Menu.buildFromTemplate([
    {
      label: 'Quit',
      click () {
        const main = getMainWindow()
        if (main) main.webContents.send('terminate-child-processes')
        app.quit()
      }
    },
    {
      label: 'About',
      click () {
        ipcMain.emit('open:about')
      }
    }
  ])

  tray.setToolTip('SSHFS-Win Manager')
  tray.setContextMenu(trayMenu)
  tray.on('click', () => {
    const main = getMainWindow()
    if (main) main.show()
  })
})

app.on('window-all-closed', () => {
  // keep running in tray
})

// ------------------ IPC ------------------
ipcMain.handle('window:open', async (_evt, { route, opts }) => {
  const main = getMainWindow()

  // Very small allowlist to avoid arbitrary window opens.
  const allowedRoutes = new Set([
    '/add-new-connection',
    '/settings',
    '/about'
  ])

  if (!route || typeof route !== 'string') throw new Error('Invalid route')

  const isEdit = route.startsWith('/edit-connection/')
  const isPassword = route.startsWith('/password-prompt/')

  if (!allowedRoutes.has(route) && !isEdit && !isPassword) {
    throw new Error('Route not allowed')
  }

  const name = opts?.name || `win:${route}`

  // Close existing window with same name
  if (windows.has(name)) {
    const existing = windows.get(name)
    existing.show()
    existing.focus()
    return
  }

  const w = createWindow(name, route, {
    width: opts?.width,
    height: opts?.height,
    modal: opts?.modal,
    parent: opts?.modal ? main : undefined
  })

  return { ok: true }
})

ipcMain.handle('window:closeCurrent', async (evt) => {
  const win = BrowserWindow.fromWebContents(evt.sender)
  if (win) win.close()
  return { ok: true }
})

ipcMain.handle('window:minimizeCurrent', async (evt) => {
  const win = BrowserWindow.fromWebContents(evt.sender)
  if (win) win.minimize()
  return { ok: true }
})

ipcMain.handle('window:hideCurrent', async (evt) => {
  const win = BrowserWindow.fromWebContents(evt.sender)
  if (win) win.hide()
  return { ok: true }
})

ipcMain.handle('shell:openPath', async (_evt, targetPath) => {
  return shell.openPath(targetPath)
})

ipcMain.handle('shell:openExternal', async (_evt, url) => {
  return shell.openExternal(String(url))
})

ipcMain.handle('dialog:openFile', async (_evt, options) => {
  const win = BrowserWindow.getFocusedWindow() || getMainWindow()
  const result = await dialog.showOpenDialog(win, {
    properties: ['openFile'],
    ...(options || {})
  })

  if (result.canceled) return null
  return result.filePaths?.[0] || null
})

ipcMain.handle('clipboard:writeText', async (_evt, text) => {
  clipboard.writeText(String(text ?? ''))
  return { ok: true }
})

ipcMain.handle('app:getLoginItemSettings', async (_evt, options) => {
  return app.getLoginItemSettings(options || {})
})

ipcMain.handle('app:setLoginItemSettings', async (_evt, settings) => {
  app.setLoginItemSettings(settings || {})
  return { ok: true }
})

ipcMain.handle('app:getVersion', async () => {
  return app.getVersion()
})

ipcMain.on('open:about', () => {
  const main = getMainWindow()
  createWindow('about', '/about', { width: 550, height: 380, modal: true, parent: main })
})

// Password prompt forwarding
ipcMain.on('password-prompt:submit', (_evt, data) => {
  const main = getMainWindow()
  if (main) main.webContents.send('connection-password', data)
})

ipcMain.on('password-prompt:cancel', (_evt, data) => {
  const main = getMainWindow()
  if (main) main.webContents.send('connection-password-cancel', data)
})

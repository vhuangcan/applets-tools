"use strict"
import {app, protocol,BrowserWindow, Menu,screen} from "electron"
import {
  createProtocol,
  installVueDevtools
} from "vue-cli-plugin-electron-builder/lib"
import {autoUpdater} from "electron-updater"

autoUpdater.autoDownload = true

const isDevelopment = process.env.NODE_ENV !== "production"

app.whenReady().then(() => {
  protocol.registerFileProtocol('file', (request, callback) => {
    const pathname = decodeURI(request.url.replace('file:///', ''))
    callback(pathname)
  })
})
// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let win

// Scheme must be registered before the app is ready
protocol.registerSchemesAsPrivileged([
  {scheme: "app", privileges: {secure: true, standard: true}}
])

function createWindow() {
  const useH = parseInt(0.865 * screen.getPrimaryDisplay().workAreaSize.height)
  const useW = parseInt(0.725 * screen.getPrimaryDisplay().workAreaSize.width)

  // Create the browser window.
  win = new BrowserWindow({
    width: useW,
    height: useH,
    show: false,
    webPreferences: {
      nodeIntegration: true,
      webSecurity: false, // electron 9以上版本这个失效 解决办法 https://github.com/electron/electron/issues/23664
      enableRemoteModule: true
    }
  })

  if (process.env.WEBPACK_DEV_SERVER_URL) {
    // Load the url of the dev server if in development mode
    win.loadURL(process.env.WEBPACK_DEV_SERVER_URL)
    if (!process.env.IS_TEST) win.webContents.openDevTools()
  } else {
    createProtocol("app")
    // Load the index.html when not in development
    win.loadURL("app://./index.html")
    autoUpdater.checkForUpdatesAndNotify()
  }
  win.on("closed", () => {
    win = null
  })
  win.on("ready-to-show", () => {
    win.show()
  })
  createMenu()
}

autoUpdater.on('update-downloaded', info => {
  sendStatusToWindow('downloaded')
  setTimeout(() => {
    autoUpdater.quitAndInstall()
  }, 1000)
})

autoUpdater.on('update-available', info => {
  sendStatusToWindow('updating')
})

function sendStatusToWindow(type) {
  win.webContents.send('message', type)
}

// Quit when all windows are closed.
app.on("window-all-closed", () => {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== "darwin") {
    app.quit()
  }
})

app.on("activate", () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (win === null) {
    createWindow()
  }
})

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on("ready", async () => {
  if (isDevelopment && !process.env.IS_TEST) {
    // Install Vue Devtools
    // Devtools extensions are broken in Electron 6.0.0 and greater
    // See https://github.com/nklayman/vue-cli-plugin-electron-builder/issues/378 for more info
    // Electron will not launch with Devtools extensions installed on Windows 10 with dark mode
    // If you are not using Windows 10 dark mode, you may uncomment these lines
    // In addition, if the linked issue is closed, you can upgrade electron and uncomment these lines
    // try {
    //   await installVueDevtools()
    // } catch (e) {
    //   console.error('Vue Devtools failed to install:', e.toString())
    // }
  }
  createWindow()
})



// 设置菜单栏
function createMenu() {
  const template = [
    {
      label: "H",
      submenu: [
        {
          role: "forcereload"
        },
        {
          role: "about"
        },
        {
          role: "quit"
        }
      ]
    },
    {
      label: "编辑",
      submenu: [
        {label: "复制", accelerator: "CmdOrCtrl+C", selector: "copy:"},
        {label: "粘贴", accelerator: "CmdOrCtrl+V", selector: "paste:"},
      ]
    },
    {
      label: '使用帮助',
      submenu: [
        {
          label: "切换功能",
          accelerator: "CmdOrCtrl+X",
          click: () => {
            sendStatusToWindow('switch')
          }
        },
        {
          label: "查看教程",
          click: () => {
            sendStatusToWindow('tutorial')
          }
        },
        {
          label: "功能介绍",
          click: () => {
            sendStatusToWindow('intro')
          }
        },
      ]
    }
  ]
  let menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}

// Exit cleanly on request from parent process in development mode.
if (isDevelopment) {
  if (process.platform === "win32") {
    process.on("message", data => {
      if (data === "graceful-exit") {
        app.quit()
      }
    })
  } else {
    process.on("SIGTERM", () => {
      app.quit()
    })
  }
}


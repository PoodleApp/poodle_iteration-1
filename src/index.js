const { app, BrowserWindow, ipcMain } = require('electron')
const account = require('./account')
const ipc = require('./ipc')

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is GCed.
let mainWindow = null

app.on('window-all-closed', function() {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform != 'darwin') {
    app.quit()
  }
})

app.on('ready', function() {
  mainWindow = new BrowserWindow({ width: 800, height: 600 })
  mainWindow.loadURL('file:///'+ __dirname +'/../static/index.html')
  mainWindow.openDevTools()
  mainWindow.on('closed', function() {
    mainWindow = null
  })
  ipc.respond('google-account', account.setupGoogle)
})

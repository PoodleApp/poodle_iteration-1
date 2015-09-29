require('babel/register')

var app = require('app')
var BrowserWindow = require('browser-window')

require('crash-reporter').start({
  productName: 'Poodle',
  companyName: 'Jesse Hallett',
  submitUrl:   'http://localhost:1127/post',
  autoSubmit:  true,
})

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is GCed.
var mainWindow = null

app.on('window-all-closed', function() {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform != 'darwin') {
    app.quit()
  }
})

app.on('ready', function() {
  mainWindow = new BrowserWindow({ width: 800, height: 600 })
  mainWindow.loadUrl('file:///'+ __dirname +'/static/index.html')
  mainWindow.openDevTools()
  mainWindow.on('closed', function() {
    mainWindow = null
  })

  var ipc = require('electron-safe-ipc/host')
  var account = require('./lib/account')

  ipc.respond('google-account', function(email) {
    return account.setupGoogle(email)
  })

  ipc.respond('google-credentials', function(email) {
    return account.getGoogleCredentials(email)
  })
})

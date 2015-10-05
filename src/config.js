/* @flow */

import * as fs          from 'fs'
import * as path        from 'path'
import mkdirp           from 'mkdirp'
import { List, Record } from 'immutable'

export type Config = Record & {
  accounts: List<Account>,
  likeMessage: string,
  notmuchCmd: string,
  sentDir: string,
}

export type Account = Record & {
  displayName: string,
  email: string,
  databaseName: string,
  databaseOptions: Object,
}

var ConfigRecord = Record({
  accounts: List(),
  likeMessage: '+1',
  notmuchCmd: 'notmuch',
  sentDir: '',
})

var AccountRecord = Record({
  displayName: null,
  email: null,
  databaseName: null,
  databaseOptions: null,
})

export {
  ConfigRecord,
  AccountRecord,
  loadConfig,
  saveConfig,
}

var home = process.env.HOME
var configDir  = path.join(home, '.config', 'poodle')
var configPath = path.join(configDir, 'config.json')

function loadConfig(): Promise<Config> {
  return new Promise(resolve => fs.exists(configPath, resolve)).then(exists => {
    if (exists) {
      return new Promise((resolve, reject) => {
        fs.readFile(configPath, { encoding: 'utf8' }, (err, data) => {
          if (err) {
            reject(err)
          }
          else {
            var data = JSON.parse(data)
            if (data.accounts) { data.accounts = List(data.accounts.map(a => new AccountRecord(a))) }
            resolve(new ConfigRecord(data))
          }
        })
      })
    }
    else {
      return Promise.reject("Configuration details not found - please enter settings in the 'Settings' view")
    }
  })
}

function saveConfig(conf: Config): Promise<void> {
  var json = JSON.stringify(conf)
  return getConfigDir().then(dir => new Promise((resolve, reject) => {
    fs.writeFile(configPath, json, err => {
      if (err) { reject(err) } else { resolve(undefined) }
    })
  }))
}

type Path = string

function getConfigDir(): Promise<Path> {
  return new Promise((resolve, reject) => {
    mkdirp(configDir, err => {
      if (err) { reject(err) } else { resolve(configDir) }
    })
  })
}

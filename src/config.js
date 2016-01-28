/* @flow */

import * as fs          from 'fs'
import * as path        from 'path'
import mkdirp           from 'mkdirp'
import { List, Record } from 'immutable'

export type Config = Record<{
  accounts: List<Account>,
  likeMessage: string,
}>

export type Account = Record<{
  displayName: string,
  email: string,
  databaseName: string,
  databaseOptions: Object,
}>

var ConfigRecord = Record({
  accounts: List(),
  likeMessage: '+1',
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
  loadAccount,
}

var home = process.env.HOME
var configDir  = path.join(home || '', '.config', 'poodle')
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
            const config = JSON.parse(data)
            if (config.accounts) { config.accounts = List(config.accounts.map(a => new AccountRecord(a))) }
            resolve(new ConfigRecord(config))
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

function loadAccount(): Promise<Account> {
  return loadConfig().then(config => (
    !config.accounts.isEmpty() ? config.accounts.first() : Promise.reject("Please configure account settings")
  ))
}

type Path = string

function getConfigDir(): Promise<Path> {
  return new Promise((resolve, reject) => {
    mkdirp(configDir, err => {
      if (err) { reject(err) } else { resolve(configDir) }
    })
  })
}

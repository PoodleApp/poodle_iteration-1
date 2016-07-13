/* @flow */

import * as fs          from 'fs'
import * as path        from 'path'
import mkdirp           from 'mkdirp'
import { List }         from 'immutable'
import { constructor }  from './util/record'

import type { Constructor } from './util/record'

export type Config = {
  accounts: List<Account>,
  likeMessage: string,
}

export type Account = {
  displayName: string,
  email: string,
}

const newConfig: Constructor<{},Config> = constructor({
  accounts: List(),
  likeMessage: '+1',
})

const newAccount: Constructor<Account,Account> = constructor({})

export {
  newConfig,
  newAccount,
  loadConfig,
  saveConfig,
  loadAccount,
}

const home = process.env.HOME
const configDir  = path.join(home || '', '.config', 'poodle')
const configPath = path.join(configDir, 'config.json')

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
            if (config.accounts) { config.accounts = List(config.accounts.map(newAccount)) }
            resolve(newConfig(config))
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
  const json = JSON.stringify(conf)
  return getConfigDir().then(dir => new Promise((resolve, reject) => {
    fs.writeFile(configPath, json, err => {
      if (err) { reject(err) } else { resolve(undefined) }
    })
  }))
}

function loadAccount(): Promise<Account> {
  return loadConfig().then(config => {
    const account = config.accounts.first()
    return account || Promise.reject(new Error("Please configure account settings"))
  })
}

type Path = string

function getConfigDir(): Promise<Path> {
  return new Promise((resolve, reject) => {
    mkdirp(configDir, err => {
      if (err) { reject(err) } else { resolve(configDir) }
    })
  })
}

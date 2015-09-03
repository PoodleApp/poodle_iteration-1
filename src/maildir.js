/* @flow */

import { execSync } from 'child_process'
import * as fs      from 'fs'
import * as path    from 'path'

import type { ReadStream } from 'fs'

export {
  record,
}

var host = (execSync('hostname', { encoding: 'utf8' }): any)
  .replace(/\//g, '\\057')
  .replace(/:/g, '\\072')
  .replace(/\s*$/g, '')

function record(msg: ReadStream, sentDir: string): Promise<void> {
  var tmp = path.join(sentDir, 'tmp')
  var new_ = path.join(sentDir, 'new')

  var file = uniqName()

  return Promise.all([isDirectory(tmp), isDirectory(new_)]).catch(() => (
    Promise.reject(new Error(`${sentDir} does not appear to be a maildir directory`))
  ))
  .then(() => (
    streamToFile(path.join(tmp, file), msg, { mode: 0o600 })
  ))
  .then(() => (new Promise((resolve, reject) => {
    fs.rename(path.join(tmp, file), path.join(new_, file+infoString()), err => {
      if (err) { reject(err) } else { resolve() }
    })
  })))
}

function uniqName(): string {
  var millis = Number(new Date())
  var time = String(Math.round(millis / 1000)) +'_'+ String(Math.round(millis % 1000 / 100))
  return `${time}.${process.pid}.${host}`
}

function infoString(): string {
  return `2,S`  // 'S' for 'Seen'
}

function isDirectory(path: string): Promise<void> {
  return new Promise((resolve, reject) => {
    fs.stat(path, (err, stats) => {
      if (err) {
        reject(err)
      }
      else if (stats.isDirectory()) {
        resolve()
      }
      else {
        reject()
      }
    })
  })
}

function streamToFile(path: string, input: ReadStream, opts?: Object): Promise<void> {
  return new Promise((resolve, reject) => {
    var file = fs.createWriteStream(path, opts)
    input.pipe(file)
    file.on('error', reject)
    file.on('finish', resolve)
  })
}

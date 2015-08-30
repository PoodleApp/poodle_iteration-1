/* @flow */

import child_process from 'child_process'

import type { ReadStream } from 'fs'

export {
  msmtp,
}

function msmtp(input: ReadStream): Promise<void> {
  return new Promise((resolve, reject) => {
    var proc = child_process.exec('msmtp --read-envelope-from --read-recipients', (err, stdout, stderr) => {
      if (err) {
        reject(err)
      }
      else {
        resolve(undefined)
      }
    })
    input.pipe(proc.stdin)
  })
}

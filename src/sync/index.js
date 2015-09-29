/* @flow */

import PouchDB        from 'pouchdb'
import { MailParser } from 'mailparser'
import * as Kefir     from 'kefir'
import * as imap      from '../imap'

import type { ReadStream } from 'fs'

const dbname = encodeURIComponent('poodle/jesse(at)sitr(dot)us')
const db = new PouchDB(`http://localhost:5984/${dbname}`)

function record(message: Object): Stream<Object> {
  const _id = message.messageId

  // Insert into db if document does not already exist
  var resp = db.get(_id).catch(_ => db.put({
    _id,
    message,
  }))

  return Kefir.fromPromise(resp)
}

function parseMessage(messageStream: ReadStream): Stream<Object> {
  return Kefir.stream(emitter => {
    const mailparser = new MailParser({ includeMimeTree: true, streamAttachments: true })
    mailparser.on('end', mail => {
      emitter.emit(mail)
      emitter.end()
    })
    mailparser.on('error', err => {
      emitter.error(err)
    })
    messageStream.pipe(mailparser)
  })
}

export {
  db,
  parseMessage,
  record,
}

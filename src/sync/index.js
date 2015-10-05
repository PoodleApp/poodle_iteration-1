/* @flow */

import { MailParser }  from 'mailparser'
import * as Kefir      from 'kefir'
import * as imap       from '../imap'
import { putIfAbsent } from './util'

import type { ReadStream } from 'fs'
import type { PouchDB }    from 'pouchdb'
import type { Message }    from './types'

function record(message: Message, db: PouchDB): Stream<Object> {
  const _id = message.messageId

  // Insert into db if document does not already exist
  return Kefir.fromPromise(
    putIfAbsent({ _id, message }, db)
  )
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
  parseMessage,
  record,
}

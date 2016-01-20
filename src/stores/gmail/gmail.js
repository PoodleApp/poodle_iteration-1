/* @flow */

import * as Kefir         from 'kefir'
import * as imap          from './google-imap'
import { tokenGenerator } from './tokenGenerator'

import type { ReadStream }                      from 'fs'
import type { Thread }           from '../models/thread'
import type { XOAuth2Generator } from './tokenGenerator'

function fetch(query: string, tokenGenerator: XOAuth2Generator): Stream<Thread[]> {
  return Kefir.fromPromise(
    imap.getConnection(tokenGenerator)
  )
  .changes()
  .flatMap(conn => imap.fetchMail(query, conn))
  .flatMap(parseMessage)
  .scan((prev, message) => (

    prev.then(_ => index.record(message, db))
  ))

  imap.fetchMail(query, conn)
}

function parseMessage(messageStream: ReadStream): Stream<Object> {
  return Kefir.stream(emitter => {
    const mailparser = new MailParser({
      includeMimeTree:   true,
      streamAttachments: true,
      defaultCharset:    'utf8',
    })
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
  fetch,
  tokenGenerator,
}

/* @flow */

import * as Kefir         from 'kefir'
import { MailParser }     from 'mailparser'
import * as imap          from './google-imap'
import { tokenGenerator } from './tokenGenerator'

import type { ReadStream }       from 'fs'
import type { Thread }           from '../models/thread'
import type { XOAuth2Generator } from './tokenGenerator'

function fetchStream(query: string, tokenGenerator: XOAuth2Generator): Stream<Thread[]> {
  return Kefir.fromPromise(
    imap.getConnection(tokenGenerator)
  )
  .flatMap(conn => imap.fetchConversations(query, conn))
  .flatMap(parseMessage)
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
  fetchStream,
}

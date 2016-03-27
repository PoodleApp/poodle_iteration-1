/* @flow */

import * as Kefir         from 'kefir'
import * as m             from 'mori'
import { MailParser }     from 'mailparser'
import * as imap          from './google-imap'
import { tokenGenerator } from './tokenGenerator'
import { buildThread }    from 'arfe/models/thread'

import type { ReadStream }       from 'fs'
import type { Stream }           from 'kefir'
import type { Message }          from 'arfe/models/message'
import type { Thread }           from 'arfe/models/thread'
import type { XOAuth2Generator } from './tokenGenerator'

function search(query: string, tokenGenerator: XOAuth2Generator): Stream<Thread,any> {
  return Kefir.fromPromise(
    imap.getConnection(tokenGenerator)
  )
  .flatMap(conn => imap.fetchConversations(query, conn, 100))
  .flatMap(messages => {
    const msgStreams = messages.map(parseMessage)
    const msgListStream = Kefir.merge(msgStreams.toArray()).scan(
      (msgs, msg) => m.conj(msgs, msg), m.vector()
    )
    .last()
    return msgListStream.map(buildThread)
  })
}

function parseMessage(messageStream: ReadStream): Stream<Message,any> {
  return Kefir.stream(emitter => {
    const mailparser = new MailParser({
      includeMimeTree:   true,
      streamAttachments: false,
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
  search,
}

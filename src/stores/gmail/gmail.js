/* @flow */

import * as Kefir         from 'kefir'
import { List }           from 'immutable'
import { MailParser }     from 'mailparser'
import * as imap          from './google-imap'
import { tokenGenerator } from './tokenGenerator'
import { buildThread }    from '../../models/thread'

import type { ReadStream }       from 'fs'
import type { Message }          from '../../models/message'
import type { Thread }           from '../../models/thread'
import type { XOAuth2Generator } from './tokenGenerator'

function search(query: string, tokenGenerator: XOAuth2Generator): Stream<Thread> {
  return Kefir.fromPromise(
    imap.getConnection(tokenGenerator)
  )
  .flatMap(conn => imap.fetchConversations(query, conn))
  .flatMap(messages => {
    const msgStreams = messages.map(([attrs, source]) => parseMessage(source))
    const msgListStream = Kefir.merge(msgStreams.toArray()).scan(
      (msgs, msg) => msgs.add(msg), List()
    )
    .last()
    return msgListStream.map(buildThread)
  })
}

function parseMessage(messageStream: ReadStream): Stream<Message> {
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
  search,
}

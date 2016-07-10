/* @flow */

import * as Kefir         from 'kefir'
import * as m             from 'mori'
import { MailParser }     from 'mailparser'
import * as imap          from './google-imap'
import { tokenGenerator } from './tokenGenerator'
import { buildThread }    from 'arfe/models/thread'

import type { ReadStream }       from 'fs'
import type { Stream }           from 'kefir'
import type { List }             from 'immutable'
import type { Message }          from 'arfe/models/message'
import type { Thread }           from 'arfe/models/thread'
import type { XOAuth2Generator } from './tokenGenerator'

// TODO: Put this in type definitions for 'mailparser'
type Attachment = {
  contentType:        string,
  contentDisposition: string,
  transferEncoding:   string,
  contentId:          string,
  generatedFilename:  string,
  stream:             ReadStream,
}

function search(
  query: string, tokenGenerator: XOAuth2Generator, onAttachment?: ?(a: Attachment, m: Message) => any
): Stream<Thread,any> {
  return Kefir.fromPromise(
    imap.getConnection(tokenGenerator)
  )
  .flatMap(conn => imap.fetchConversations(query, conn, 100))
  .flatMap((messages: List<ReadStream>) => {
    const msgStreams = messages.map(msg => parseMessage(msg, onAttachment))
    const msgListStream = Kefir.merge(msgStreams.toArray()).scan(
      (msgs, msg) => m.conj(msgs, msg), m.vector()
    )
    .last()
    return msgListStream.map(buildThread)
  })
}

function parseMessage(
  messageStream: ReadStream, onAttachment?: ?(a: Attachment, m: Message) => any
): Stream<Message,any> {
  return Kefir.stream(emitter => {
    const mailparser = new MailParser({
      includeMimeTree:   true,
      streamAttachments: true,
      defaultCharset:    'utf8',
    })
    if (onAttachment) {
      mailparser.on('attachment', onAttachment)
    }
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

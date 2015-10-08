/* @flow */

import { MailParser }  from 'mailparser'
import { List }        from 'immutable'
import assign          from 'object-assign'
import * as Kefir      from 'kefir'
import * as imap       from '../imap'
import { putIfAbsent } from './util'

import type { ReadStream }                 from 'fs'
import type { PouchDB }                    from 'pouchdb'
import type { Message, Thread, ThreadDoc } from './types'

function record(message: Message, db: PouchDB): Promise<ThreadDoc> {
  const _id = message.messageId

  // optimization
  if (!hasReferences(message)) {
    return db.put(newThread(message))
    // TODO: this optimization does not apply if there are dangling references
  }

  // TODO
  // db.query('indexes/byDanglingReference'

  return db.query('indexes/byMessageId', { keys: message.references, include_docs: true })
  .then(({ total_rows, rows }) => {
    if (total_rows < 1) {
      return db.put(newThread(message))
    }
    else {
      return Promise.all(rows.map(conv => db.put(insertMessage(message, conv))))
    }
  })
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

function newThread(message: Message): { thread: Thread } {
  return {
    thread: [[message, []]]
  }
}

function insertMessage(message: Message, doc: ThreadDoc): ThreadDoc {
  const msgs = List(doc.thread).flatMap(messages).push(message)
  let [toplevel, replies] = partition(msg => (
    !msgs.some(m => ancestorOf(msg, m))
  ), msgs)
  const thread = toplevel.map(msg => assembleTree(msg, replies))
  return assign({}, doc, { thread })
}

function assembleTree(message: Message, messages: List<Message>): [Message, Thread] {
  const replies = messages.filter(msg => msg !== message && ancestorOf(msg, message))
  const subthread = replies.map(msg => assembleTree(msg, replies))
  return [message, sortReplies(subthread)]
}

function messages([message, replies]: Thread): List<Message> {
  return List.of(message).concat(
    List(replies).flatMap(messages)
  )
}

function parentOf(msg: Message, msg_: Message): boolean {
  return !!msg.inReplyTo && msg.inReplyTo.some(ref => ref === msg_.messageId)
}

function ancestorOf(msg: Message, msg_: Message): boolean {
  return !!msg.references && msg.references.some(ref => ref === msg_.messageId)
}

function hasReferences(message: Message): boolean {
  return !!message.references && message.references.length > 0
}

type ImmutableThread = List<[Message, ImmutableThread]>

function sortReplies(replies: ImmutableThread): ImmutableThread {
  return replies.sortBy(([msg, _]) => msg.receivedDate)
}

function partition<T>(fn: (_: T) => boolean, xs: List<T>): [List<T>, List<T>] {
  const grouped = xs.groupBy(x => fn(x) ? 1 : 0)
  return [grouped.get(1), grouped.get(0)]
}

export {
  parseMessage,
  record,
}

/* @flow */

import { MailParser }  from 'mailparser'
import { List, Map }   from 'immutable'
import assign          from 'object-assign'
import * as Kefir      from 'kefir'
import * as imap       from '../imap'
import { putIfAbsent } from './util'

import type { ReadStream } from 'fs'
import type { PouchDB }    from 'pouchdb'
import type { IndexedSeq } from 'immutable'
import type { Message, Thread, ThreadDoc, QueryResponseWithDoc } from './types'

function record(message: Message, db: PouchDB): Promise<ThreadDoc[]> {
  const _id = message.messageId
  const refs = (message.references || []).concat(_id)

  return Promise.all([
    db.query('indexes/byDanglingReference', { keys: refs, include_docs: true, limit: 999 }),
    db.query('indexes/byMessageId',         { keys: refs, include_docs: true, limit: 999 })
  ])
  .then(([dangling, convs]: [QueryResponseWithDoc<any,ThreadDoc>, QueryResponseWithDoc<any,ThreadDoc>]) => {
    if (dangling.total_rows + convs.total_rows < 1) {
      return db.post(newThread(message))
    }
    // else if (dangling.rows.length < dangling.total_rows || convs.rows.length < convs.total_rows) {
    //   throw new Error('handling paginated result sets is not handled yet')
    // }

    const docs = uniqBy(doc => doc._id, dangling.rows.concat(convs.rows).map(row => row.doc))
    return Promise.all(docs.map(doc => (
      db.put(insertMessage(message, doc))
    )))
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

function newThread(message: Message): { thread: Thread, type: 'thread' } {
  return {
    thread: [[message, []]],
    type: 'thread',
  }
}

function insertMessage(message: Message, doc: ThreadDoc): ThreadDoc {
  const msgs = uniqBy(
    m => m.messageId,
    List(doc.thread).flatMap(messages).push(message)
  )
  let [toplevel, replies] = partition(msg => (
    !msgs.some(m => ancestorOf(msg, m))
  ), msgs)
  const thread = toplevel.map(msg => assembleTree(msg, replies)).toArray()
  return assign({}, doc, { thread })
}

function assembleTree(message: Message, messages: List<Message>): [Message, Thread] {
  const replies = messages.filter(msg => msg !== message && ancestorOf(msg, message))
  const subthread = replies.map(msg => assembleTree(msg, replies))
  return [message, sortReplies(subthread).toArray()]
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
  return [grouped.get(1, List()), grouped.get(0, List())]
}

function uniqBy<T,U>(fn: (_: T) => U, xs: IndexedSeq<T> | T[]): IndexedSeq<T> {
  const map: Map<U,T> = xs.reduce((m, x) => (
    m.set(fn(x), x)
  ), Map())
  return map.valueSeq()
}

export {
  parseMessage,
  record,
}

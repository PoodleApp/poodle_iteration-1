/* @flow */

import { MailParser } from 'mailparser'
import assign         from 'object-assign'
import * as Kefir     from 'kefir'
import * as imap      from '../imap'
import { uniqBy }     from '../util/immutable'
import { insertMessage, newThread } from '../models/thread'

import type { ReadStream }                      from 'fs'
import type { PouchDB }                         from 'pouchdb'
import type { Message }                         from '../models/message'
import type { Thread }                          from '../models/thread'
import type { ThreadDoc, QueryResponseWithDoc } from './types'

export {
  parseMessage,
  record,
}

function record(message: Message, db: PouchDB): Promise<ThreadDoc[]> {
  const _id = message.messageId
  const refs = (message.references || []).concat(_id)

  return Promise.all([
    db.query('indexes/byDanglingReference', { keys: refs, include_docs: true, limit: 999 }),
    db.query('indexes/byMessageId',         { keys: refs, include_docs: true, limit: 999 })
  ])
  .then(([dangling, convs]: [QueryResponseWithDoc<any,ThreadDoc>, QueryResponseWithDoc<any,ThreadDoc>]) => {
    if (dangling.rows.length + convs.rows.length < 1) {
      return db.post(newThread(message))
    }
    // TODO
    // else if (dangling.rows.length < dangling.total_rows || convs.rows.length < convs.total_rows) {
    //   throw new Error('handling paginated result sets is not handled yet')
    // }

    const docs = uniqBy(doc => doc._id, dangling.rows.concat(convs.rows).map(row => row.doc))
    return Promise.all(docs.map(doc => (
      db.put(assign({}, doc, { thread: insertMessage(message, doc) }))
    )))
  })
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

function newThreadDoc(message: Message): { thread: Thread, type: 'thread' } {
  return {
    thread: newThread(message),
    type: 'thread',
  }
}

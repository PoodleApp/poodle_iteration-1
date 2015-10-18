/* @flow */

import { MailParser } from 'mailparser'
import assign         from 'object-assign'
import getRawBody     from 'raw-body'
import * as Kefir     from 'kefir'
import * as imap      from '../imap'
import { uniqBy }     from '../util/immutable'
import { insertMessage, newThread }  from '../models/thread'
import { midPartUri, toplevelParts } from '../models/message'

import type { ReadStream }                      from 'fs'
import type { PouchDB }                         from 'pouchdb'
import type { Message }                         from '../models/message'
import type { Thread }                          from '../models/thread'
import type { ThreadDoc, QueryResponseWithDoc } from './types'

export {
  parseMessage,
  record,
  queryLatest,
  findThread,
}

function record(message: Message, db: PouchDB): Promise<ThreadDoc[]> {
  const _id = message.messageId
  const refs = (message.references || []).concat(_id)

  const activities = getActivities(message)

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
    return activities.then(as => Promise.all(docs.map(doc => {
      const msg = assign({ activities: as }, message)
      return db.put(assign({}, doc, { thread: insertMessage(msg, doc) }))
    })))
  })
}

function queryLatest(since: Date, db: PouchDB): Promise<Thread[]> {
  return db.query('indexes/byLatestActivity', {
    include_docs: true,
    limit: 100,
    descending: true,
    startkey: since.toString(),
  })
  .then(rows => rows.map(row => row.doc.thread))
}

function findThread(messageId: string, db: PouchDB): Promise<Thread[]> {
  return db.query('indexes/byMessageId', {
    include_docs: true,
    key: messageId,
  })
  .then(rows => (
    uniqBy(doc => doc._id, rows.map(row => row.doc)).map(doc => doc.thread)
  ))
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

function getActivities(message: Message): Promise<Object[]> {
  const parts = toplevelParts(part => part.contentType === 'application/activity+json', message)
  return Promise.all(parts.map(part => (
    getRawBody(part.stream, { encoding: 'utf8' })
    .then(JSON.parse)
    .then(json => assign(json, { id: midPartUri(part, message) }))
  )))
}

function newThreadDoc(message: Message): { thread: Thread, type: 'thread' } {
  return {
    thread: newThread(message),
    type: 'thread',
  }
}

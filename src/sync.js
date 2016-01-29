/*
 * TODO: This module, and modules under src/sync/, are not used at this time.
 * They may be returned to active duty at some future time.
 *
 * @noflow
 */

import PouchDB            from 'pouchdb'
import * as Kefir         from 'kefir'
import keytar             from 'keytar'
import * as Config        from './config'
import * as imap          from './stores/gmail/google-imap'
import * as index         from './sync/index'
import * as views         from './sync/views'
import { putOrUpdate }    from './sync/util'
import { tokenGenerator } from './stores/gmail/tokenGenerator'
import * as T             from './models/thread'
import * as M             from './models/message'

import type { Stream }           from 'kefir'
import type { XOAuth2Generator } from './auth/tokenGenerator'
import type { ThreadDoc }        from './sync/types'
import type { Message, URI }     from './models/message'

function sync(query: string, account: Config.Account): Stream<Object> {
  return Kefir.fromPromise(
    init(account)
  )
  .flatMap(db => getMessages(query, account, db))
}

function init(account: Config.Account): Promise<PouchDB> {
  return getDatabase(account).then(db =>
    // Install design documents
    putOrUpdate(views.indexes, db)
    .then(_ => db)
  )
}

function getMessages(query: string, account: Config.Account, db: PouchDB): Stream<ThreadDoc[]> {
  return Kefir.fromPromise(
    getTokenGenerator(account).then(imap.getConnection)
  )
  .changes()
  .flatMap(conn => imap.fetchMail(query, conn))
  .flatMap(index.parseMessage)
  .scan((prev, message) => (
    prev.then(_ => index.record(message, db))
  ), Promise.resolve([]))
  .flatMap(Kefir.fromPromise)
}

function getTokenGenerator(account: Config.Account): Promise<XOAuth2Generator> {
  let creds = keytar.getPassword('Poodle', account.email)
  creds = creds && JSON.parse(creds)
  if (creds && creds.refresh_token) {
    return Promise.resolve(tokenGenerator(account.email, creds))
  }
  else {
    return Promise.reject(new Error('OAuth credentials are not available.'))
  }
}

function getDatabase(account: Config.Account): Promise<PouchDB> {
  let { databaseName, databaseOptions } = account
  if (!databaseName || !databaseOptions) {
    return Promise.reject("Database is not configured")
  }
  else {
    return new PouchDB(databaseName, databaseOptions)
  }
}

function getMessage(messageId: string, db: PouchDB): Promise<Message> {
  return getMessageWithDocId(messageId, db).then(([msg, _]) => msg)
}

function getMessageWithDocId(messageId: string, db: PouchDB): Promise<[Message, string]> {
  return db.query('indexes/byMessageId', { key: messageId, include_docs: true }).then(resp => {
    if (resp.rows.length > 0) {
      const doc: ThreadDoc = resp.rows[0].doc
      const msg = T.getMessages(doc.thread).find(msg => msg.messageId === messageId)
      return [msg, doc._id]
    }
    else {
      return Promise.reject(new Error('Message not found'))
    }
  })
}

function getContent(uri: URI, db: PouchDB): Promise<{ contentType: string, content: Buffer }[]> {
  var parsed = M.parseMidUri(uri)
  if (!parsed) { return Promise.reject(new Error('Error parsing URI')) }

  var { messageId, partId } = parsed
  if (!messageId) {
    // TODO: handle schemes other than mid:
    return Promise.reject(new Error('External resources are not yet supported'))
  }

  return getMessageWithDocId(messageId, db).then(([msg, _id]) => {
    if (!partId) {  // URI refers to entire message
      return [
        { contentType: 'text/plain', content: msg.text },
        { contentType: 'text/html',  content: msg.html }
      ]
      .filter(c => !!c.content)
      .map(({ contentType, content }) => ({ contentType, content: new Buffer((content:any)) }))
    }

    return Promise.all(
      M.flatParts(msg)
      .filter(part => part.contentId === partId)
      .map(part => db.getAttachment(_id, uri).then(content => (
        { contentType: part.contentType, content }
      )))
    )
  })
}

export {
  sync,
  getContent,
  getDatabase,
}

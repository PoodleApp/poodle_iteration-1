/* @flow */

import PouchDB            from 'pouchdb'
import * as Kefir         from 'kefir'
import keytar             from 'keytar'
import * as Config        from './config'
import * as imap          from './imap'
import * as index         from './sync/index'
import * as views         from './sync/views'
import { putOrUpdate }    from './sync/util'
import { tokenGenerator } from './auth/tokenGenerator'

import type { Stream }           from 'kefir'
import type { XOAuth2Generator } from './auth/tokenGenerator'
import type { ThreadDoc }        from './sync/types'

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

export {
  sync,
}

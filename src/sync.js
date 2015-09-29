/* @flow */

import * as Kefir         from 'kefir'
import keytar             from 'keytar'
import * as Config        from './config'
import * as imap          from './imap'
import * as index         from './sync/index'
import { tokenGenerator } from './auth/tokenGenerator'

import type { Stream } from 'kefir'
import type { XOAuth2Generator } from './auth/tokenGenerator'

function sync(query: string, account: Config.Account): Stream<Object> {
  return Kefir.fromPromise(
    getTokenGenerator(account).then(imap.getConnection)
  )
  .changes()
  .flatMap(conn => imap.fetchMail(query, conn))
  .flatMap(index.parseMessage)
  .flatMap(index.record)
}

function getTokenGenerator(account: Config.Account): Promise<XOAuth2Generator> {
  var creds = keytar.getPassword('Poodle', account.email)
  creds = creds && JSON.parse(creds)
  if (creds && creds.refresh_token) {
    return Promise.resolve(tokenGenerator(account.email, creds))
  }
  else {
    return Promise.reject(new Error('OAuth credentials are not available.'))
  }
}

export {
  sync,
}

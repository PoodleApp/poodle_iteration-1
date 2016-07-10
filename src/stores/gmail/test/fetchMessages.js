/* @flow */

import * as Kefir         from 'kefir'
import keytar             from 'keytar'
import PouchDB            from 'pouchdb'
import { search }         from '../gmail'
import { tokenGenerator } from '../tokenGenerator'
import ApiClient          from '../../../imap-store/ApiClient'

import type { XOAuth2Generator } from '../tokenGenerator'

function fetchMessages() {
  const db = new PouchDB('poodle')
  return Kefir.fromPromise(
    getTokenGenerator('jesse@sitr.us')
  )
  .flatMap(tokgen => {
    const client = new ApiClient(tokgen, db)
    return Kefir.fromPromise(
      client.get('/activities', { params: { q: 'poodle talking points' }, fetchConfig: {} })
    )
  })
  .onValue(val => {
    console.log(val)
    console.log("---\n")
  })
  .onError(err => {
    console.log(err)
    process.exit(1)
  })
  .onEnd(() => process.exit(0))
}

function getTokenGenerator(email: string): Promise<XOAuth2Generator> {
  let creds = keytar.getPassword('Poodle', email)
  creds = creds && JSON.parse(creds)
  if (creds && creds.refresh_token) {
    return Promise.resolve(tokenGenerator(email, creds))
  }
  else {
    return Promise.reject(new Error('OAuth credentials are not available.'))
  }
}

function onAttachment(attachment, mail) {
  console.log('##### attachment', attachment, mail.messageId)
}

fetchMessages()

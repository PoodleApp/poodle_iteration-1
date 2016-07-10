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
  getTokenGenerator('jesse@sitr.us').then(tokgen => {
    const client = new ApiClient(tokgen, db)
    return client.get('/activities', { params: { q: 'poodle talking points' }, fetchConfig: {} })
  })
  .then(val => {
    console.log(val)
    console.log("---\n")
    process.exit(0)
  })
  .catch(err => {
    console.log(err)
    process.exit(1)
  })
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

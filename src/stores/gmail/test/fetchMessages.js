/* @flow */

import * as Kefir         from 'kefir'
import keytar             from 'keytar'
import { search }         from '../gmail'
import { tokenGenerator } from '../tokenGenerator'

function fetchMessages() {
  return Kefir.fromPromise(
    getTokenGenerator('jesse@sitr.us')
  )
  .flatMap(tokgen => search('poodle talking points', tokgen))
  .onValue(val => {
    console.log(val)
    console.log("---\n")
  })
  .onError(err => {
    console.err(err)
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

fetchMessages()

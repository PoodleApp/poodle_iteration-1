/* @flow */

import * as Kefir         from 'kefir'
import keytar             from 'keytar'
import { fetchStream }    from '../gmail'
import { tokenGenerator } from '../tokenGenerator'

function fetchMessages() {
  return Kefir.fromPromise(
    getTokenGenerator('jesse@sitr.us')
  )
  .flatMap(tokgen => fetchStream('poodle talking points', tokgen))
  .onValue(val => {
    console.log(val)
    console.log("---\n")
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

fetchMessages()

/* @flow */

import keytar                          from 'keytar'
import google                          from 'googleapis'
import { getAccessToken, oauthClient } from './auth/google'

export {
  setupGoogle,
}

function setupGoogle(): Promise<Object> {
  return getAccessToken().then(creds => {
    var plus = google.plus('v1')
    var oauth = oauthClient(creds)
    return new Promise((resolve, reject) => {
      plus.people.get({ userId: 'me', auth: oauth }, (err, resp) => {
        if (err) { reject(err) } else { resolve(resp) }
      })
    })
  })
}

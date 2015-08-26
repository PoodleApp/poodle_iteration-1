/* @flow */

import keytar                          from 'keytar'
import google                          from 'googleapis'
import { getAccessToken, oauthClient } from './auth/google'

export {
  setupGoogle,
}

export type Profile = {
  kind: 'plus#person',
  etag: string,
  occupation: string,
  emails: { value: Email, type: 'account' }[],
  urls: { value: URL, type: string, label: string }[],
  objectType: 'person',
  id: string,
  displayName: string,
  name: { familyName: string, givenName: string },
  tagline: string,
  url: URL,
  image: { url: URL, isDefault: boolean },
  organizations: { name: string, title: string, type: string, startDate: string, endDate: string: primary: boolean }[],
  placesLived: { value: string, primary?: boolean }[],
  isPlusUser: boolean,
  circledByCount: number,
  verified: boolean,
  cover: {
    layout: string,
    coverPhoto: { url: URL, height: number, width: number },
    coverInfo: { topImageOffset: number, leftImageOffset: number },
  },
}

type Email = string
type URL   = string

function setupGoogle(): Promise<Profile> {
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

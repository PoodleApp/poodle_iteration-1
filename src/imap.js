/* @flow */

import { Map }     from 'immutable'
import { Imap }    from 'imap'
import xoauth2     from 'xoauth2'
import { inspect } from 'util'
import * as Config from './config'

import type { Box, ImapOpts }    from 'imap'
import type { OauthCredentials } from './auth/google'

var client_id = '550977579314-ot07bt4ljs7pqenefen7c26nr80e492p.apps.googleusercontent.com'
var client_secret = 'ltQpgi6ce3VbWgxCXzCgKEEG'

function fetchMailFromGoogle(acct: Config.Account, creds: OauthCredentials): Promise<[Map<string,imap$Headers>, Map<string,imap$MessageAttributes>]> {
  return getXOauthHeader(acct, creds)
  .then(auth => initImap({
    xoauth2: auth,
    host: 'imap.gmail.com',
    port: 993,
    tls: true,
  }))
  .then(fetchMail)
}

function getXOauthHeader(acct: Config.Account, creds: OauthCredentials): Promise<string> {
  var tokenGen = xoauth2.createXOAuth2Generator({
    user:         acct.email,
    accessUrl:    'https://accounts.google.com/o/oauth2/token',
    clientId:     client_id,
    clientSecret: client_secret,
    refreshToken: creds.refresh_token,
    accessToken:  creds.access_token,
  })
  return lift1(cb => tokenGen.getToken(cb)).then(token => (
    `AUTH XOAUTH2 ${token}`
  ))
}

function fetchMail(imap: Imap): Promise<[Map<string,imap$Headers>, Map<string,imap$MessageAttributes>]> {
  return openInbox(imap)
  .then(box => {
    var f = imap.seq.fetch('1:3', {
      bodies: 'HEADER.FIELDS (FROM SUBJECT TO DATE)',
      struct: true,
    })
    var headers = receiveHeaders(f)
    headers.then(() => imap.end())
    return headers
  })
}

function initImap(opts: ImapOpts): Promise<Imap> {
  var imap = new Imap(opts)
  var p = new Promise((resolve, reject) => {
    imap.once('ready', () => resolve(imap))
    imap.once('error', reject)
  })
  imap.connect()
  return p
}

function openInbox(imap: Imap): Promise<Box> {
  return lift1(cb => imap.openBox('INBOX', true, cb))
}

function receiveHeaders(fetch: imap$ImapFetch): Promise<[Map<string,imap$Headers>, Map<string,imap$MessageAttributes>]> {
  return new Promise((resolve, reject) => {
    var headers = Map()
    var attributes = Map()

    fetch.on('message', (msg, seqno) => {
      msg.on('body', (stream, info) => {
        var buffer = ''
        stream.on('data', chunk => {
          buffer += chunk.toString('utf8')
        })
        stream.once('end', () => {
          try {
            headers = headers.set(seqno, Imap.parseHeader(buffer))
          }
          catch(err) { reject(err) }
        })
      })
      msg.once('attributes', attrs => {
        attributes = attributes.set(seqno, attrs)
      })
    })

    fetch.once('end', () => resolve([headers, attributes]))
    fetch.once('error', reject)
  })
}

function lift0<T>(fn: (cb: (err: any) => void) => any): Promise<void> {
  return new Promise((resolve, reject) => {
    fn((err, value) => {
      if (err) { reject(err) }
      else { resolve(undefined) }
    })
  })
}

function lift1<T>(fn: (cb: (err: any, value: T) => void) => any): Promise<T> {
  return new Promise((resolve, reject) => {
    fn((err, value) => {
      if (err) { reject(err) }
      else { resolve(value) }
    })
  })
}

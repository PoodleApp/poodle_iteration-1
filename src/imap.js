/* @flow */

import { Map }          from 'immutable'
import * as Imap        from 'imap'
import { inspect }      from 'util'
import * as Config      from './config'
import { lift1, lift0 } from './util/promises'

import type { Box, ImapOpts }    from 'imap'
import type { OauthCredentials } from './auth/google'
import type { XOAuth2Generator } from './auth/tokenGenerator'

export {
  fetchMailFromGoogle,
  fetchMail,
  getConnection,
}

var client_id = '550977579314-ot07bt4ljs7pqenefen7c26nr80e492p.apps.googleusercontent.com'
var client_secret = 'ltQpgi6ce3VbWgxCXzCgKEEG'

type Result = [Map<string,imap$Headers>, Map<string,imap$MessageAttributes>]

var Connection: Class<Imap.Connection> = Imap.default

function getConnection(tokenGen: XOAuth2Generator): Promise<Imap> {
  return lift1(cb => tokenGen.getToken(cb))
  .then(auth => initImap({
    xoauth2: auth,
    host: 'imap.gmail.com',
    port: 993,
    tls: true,
  }))
}

function fetchMailFromGoogle(tokenGen: XOAuth2Generator): Promise<Result> {
  return lift1(cb => tokenGen.getToken(cb))
  .then(auth => initImap({
    xoauth2: auth,
    host: 'imap.gmail.com',
    port: 993,
    tls: true,
  }))
  .then(fetchMail)
}

// query is a Gmail search query.
// E.g.: newer_than:2d
function fetchMail(query: string, imap: Imap): Promise<Result> {
  return allMailFolder(imap).then(allMail => (
    lift1(cb => imap.openBox(allMail, true, cb))
  ))
  .then(box => (
    lift1(cb => imap.search(['X-GM-RAW', query], cb))
  ))
  .then(uids => (
    console.log(uids), uids
  ))
}

// TODO: Present boxes to user to select which to sync.
function allMailFolder(imap: Imap): Promise<string> {
  return lift1(cb => imap.getBoxes(cb)).then(boxes => {
    var gmail   = boxes['[Gmail]']
    var allmail = gmail ? gmail.children['All Mail'] : null
    var delim   = gmail ? gmail.delimiter : null
    if (gmail && allmail && delim) {
      return `[Gmail]${delim}All Mail`
    }
    else {
      return Promise.reject(new Error("Unable to find 'All Mail' folder"))
    }
  })
}

function initImap(opts: ImapOpts): Promise<Imap> {
  var imap = new Connection(opts)
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

function receiveHeaders(fetch: imap$ImapFetch): Promise<Result> {
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

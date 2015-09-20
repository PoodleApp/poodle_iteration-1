/* @flow */

import { Map, Seq }     from 'immutable'
import * as Imap        from 'imap'
import { inspect }      from 'util'
import * as Config      from './config'
import { lift1, lift0 } from './util/promises'

import type { Box, ImapOpts }    from 'imap'
import type { OauthCredentials } from './auth/google'
import type { XOAuth2Generator } from './auth/tokenGenerator'

export {
  fetchMail,
  getConnection,
  openInbox,
  openAllMail,
  openDrafts,
  openImportant,
  openSent,
  openFlagged,
  openTrash,
  boxByAttribute,
  openBox,
}

type Result = [Map<string,imap$Headers>, Map<string,imap$MessageAttributes>]
export type UID = number

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

// query is a Gmail search query.
// E.g.: newer_than:2d
function fetchMail(query: string, imap: Imap): Promise<UID[]> {
  return openAllMail(true, imap).then(box => (
    lift1(cb => imap.search([['X-GM-RAW', query]], cb))
  ))
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

function openInbox(readonly: boolean, imap: Imap): Promise<Box> {
  return lift1(cb => imap.openBox('INBOX', readonly, cb))
}

function openAllMail(readonly: boolean, imap: Imap): Promise<Box> {
  return openBox(boxByAttribute('\\All'), readonly, imap)
}

function openDrafts(readonly: boolean, imap: Imap): Promise<Box> {
  return openBox(boxByAttribute('\\Drafts'), readonly, imap)
}

function openImportant(readonly: boolean, imap: Imap): Promise<Box> {
  return openBox(boxByAttribute('\\Important'), readonly, imap)
}

function openSent(readonly: boolean, imap: Imap): Promise<Box> {
  return openBox(boxByAttribute('\\Sent'), readonly, imap)
}

function openFlagged(readonly: boolean, imap: Imap): Promise<Box> {
  return openBox(boxByAttribute('\\Flagged'), readonly, imap)
}

function openTrash(readonly: boolean, imap: Imap): Promise<Box> {
  return openBox(boxByAttribute('\\Trash'), readonly, imap)
}

function boxByAttribute(attribute: string): (box: Box) => boolean {
  return box => box.attribs.some(a => a === attribute)
}

function openBox(p: (box: imap$Box) => boolean, readonly: boolean, imap: Imap): Promise<Box> {
  return lift1(cb => imap.getBoxes(cb)).then(boxes => {
    var match = findBox(p, boxes)
    if (match) {
      var [path, box] = match
      return lift1(cb => imap.openBox(path, readonly, cb))
    }
    else {
      return Promise.reject(new Error("Box not found"))
    }
  })
}

function findBox(p: (box: imap$Box) => boolean, boxes: imap$Boxes, path?: string = ''): ?[string, imap$Box] {
  var pairs = Object.keys(boxes).map(k => [k, boxes[k]])
  var match = pairs.find(([_,b]) => p(b))
  if (match) {
    var [name, box] = match
    return [path + name, box]
  }
  else {
    return Seq(pairs).map(([n, b]) => (
      b.children ? findBox(p, b.children, n + b.delimiter) : null
    ))
    .filter(child => !!child)
    .first()
  }
}

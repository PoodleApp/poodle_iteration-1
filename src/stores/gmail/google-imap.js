/* @flow */

import { List, Seq, Set } from 'immutable'
import * as Imap          from 'imap'
import * as Kefir         from 'kefir'
import { inspect }        from 'util'
import { lift1, lift0 }   from '../../util/promises'

import type { Box, ImapMessage, ImapOpts, MessageAttributes } from 'imap'
import type { Stream }           from 'kefir'
import type { ReadStream }       from 'fs'
import type { EventEmitter }     from 'events'
import type { OauthCredentials } from './google-oauth'
import type { XOAuth2Generator } from './tokenGenerator'

export {
  fetchMessages,
  fetchConversations,
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

export type Message = ReadStream

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
function fetchMessages(query: string, imap: Imap): Stream<Message,any> {
  return _fetchMessages([['X-GM-RAW', query]], imap)
}

function _fetchMessages(criteria: any[], imap: Imap): Stream<Message,any> {
  const uidsPromise = openAllMail(true, imap).then(box => (
    lift1(cb => imap.search(criteria, cb))
  ))
  return Kefir.fromPromise(uidsPromise)
  .flatMap(uids => fetch(uids, { bodies: [''] }, imap))
  .flatMap(messageBodyStream)
}

function fetchConversations(query: string, imap: Imap, limit: number = 0): Stream<List<Message>,any> {
  const messageIds = openAllMail(true, imap).then(box => (
    lift1(cb => imap.search([['X-GM-RAW', query]], cb))
  ))

  const threadIds = Kefir.fromPromise(messageIds)
  .flatMap(uids => {
    const uids_ = limit > 0 ? uids.slice(0, limit) : uids
    return fetch(uids_, {/* metadata only */}, imap)
  })
  .flatMap(message => attributes(message))
  .scan(
    (threadIds, msgAttrs) => threadIds.add(msgAttrs['x-gm-thrid']), Set()
  )
  .last()

  return threadIds.flatMap(ids => {
    const threadStreams = ids.toArray().map(
      id => _fetchMessages([['X-GM-THRID', id]], imap).scan(
        (thread, message) => thread.push(message), List()
      )
      .last()
    )
    return Kefir.merge(threadStreams)
  })
}

// TODO: Use 'changedsince' option defined by RFC4551
function fetch(source: imap$MessageSource, opts: imap$FetchOptions, imap: Imap): Stream<ImapMessage,any> {
  return fromEventsWithEnd(imap.fetch(source, opts), 'message', (msg, seqno) => msg)
}

function attributes(message: ImapMessage): Stream<MessageAttributes,any> {
  return fromEventsWithEnd(message, 'attributes')
}

function messageBodyStream(msg: ImapMessage): Stream<Message,any> {
  return fromEventsWithEnd(msg, 'body', (stream, info) => stream)
}

function fromEventsWithEnd<T>(
  eventSource: EventEmitter,
  eventName: string,
  transform: ?((...values: any) => T) = null
): Stream<T,mixed> {
  return Kefir.stream(emitter => {
    eventSource.on(eventName, (...values) => {
      const value = transform ? transform(...values) : values[0]
      emitter.emit(value)
    })
    eventSource.on('error', err => { emitter.emit(err); emitter.end() })
    eventSource.once('end', () => { emitter.end() })
  })
}

// attributes example:
//
// { struct:
//    [ { type: 'alternative',
//        params: { boundary: '----=_Part_437079_307021065.1442840682149' },
//        disposition: null,
//        language: null },
//      [ { partID: '1',
//          type: 'text',
//          subtype: 'plain',
//          params: { charset: 'UTF-8' },
//          id: 'text-body',
//          description: null,
//          encoding: 'QUOTED-PRINTABLE',
//          size: 4117,
//          lines: 101,
//          md5: null,
//          disposition: null,
//          language: null } ],
//      [ { partID: '2',
//          type: 'text',
//          subtype: 'html',
//          params: { charset: 'UTF-8' },
//          id: 'html-body',
//          description: null,
//          encoding: 'QUOTED-PRINTABLE',
//          size: 79675,
//          lines: 1455,
//          md5: null,
//          disposition: null,
//          language: null } ] ],
//   date: Mon Sep 21 2015 06:04:59 GMT-0700 (PDT),
//   flags: [],
//   uid: 83528,
//   modseq: '1347582',
//   'x-gm-labels': [ '\\Inbox' ],
//   'x-gm-msgid': '1512928130170660058',
//   'x-gm-thrid': '1512928130170660058' }

function initImap(opts: ImapOpts): Promise<Imap> {
  var imap = new Connection(opts)
  var p = new Promise((resolve, reject) => {
    imap.once('ready', () => resolve(imap))
    imap.once('error', reject)
  })
  imap.connect()
  return p
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

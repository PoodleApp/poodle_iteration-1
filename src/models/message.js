/* @flow */

import * as m from 'mori'

import type { List, Seq, Seqable } from 'mori'
import type { ReadStream }         from 'fs'
import type { Address }            from './address'

export type Message = {
  messageId:     MessageId,
  headers:       Headers,
  from:          Address[],
  to?:           Address[],
  cc?:           Address[],
  bcc?:          Address[],
  subject:       string,
  references?:   MessageId[],
  inReplyTo?:    MessageId[],
  priority:      Priority,
  text?:         string,
  html?:         string,
  date?:         ISO8601,
  receivedDate:  ISO8601,
  attachments?:  Attachment[],
  mimeTree:      MIMETree,
  activities?:   Object[],
}

export type Attachment = {
  contentType:        string,
  fileName:           string,
  contentDisposition: string,
  contentId:          string,
  transferEncoding:   string,
  length:             number,
  generatedFileName:  string,
  checksum:           string,
}

export type MIMETree = {
  childNodes:         MIMETree[],
  headers:            Headers,
  contentId?:         string,
  contentType:        string,
  charset?:           string,
  transferEncoding?:  string,
  attachment?:        boolean,
  generatedFileName?: string,
  length?:            number,
  checksum?:          string,
  stream?:            ReadStream,
  mimeMultipart?:     string,
  mimeBoundary?:      string,
}

export type MessagePart = {
  headers:            Headers,
  contentId?:         string,
  contentType:        string,
  charset?:           string,
  transferEncoding?:  string,
  attachment?:        boolean,
  generatedFileName?: string,
  length?:            number,
  checksum?:          string,
  stream?:            ReadStream,
}

export type MessageId = string
export type Headers   = { [key: string]: string | string[] }
export type Priority  = 'normal' | 'high' | 'low'
export type ISO8601   = string
export type URI       = string

export {
  flatParts,
  textParts,
  htmlParts,
  midUri,
  midPartUri,
  parseMidUri,
  resolveUri,
  toplevelParts,
}

function flatParts(msg: Message): Seq<MessagePart> {
  const subparts = part => !!part.mimeMultipart ? m.mapcat(subparts, part.childNodes) : m.seq([part])
  return subparts(msg.mimeTree)
}

function toplevelParts(predicate: (_: MessagePart) => boolean, msg: Message): Seqable<MessagePart> {
  return toplevelRec(predicate, msg.mimeTree)
}

function toplevelRec(predicate: (_: MessagePart) => boolean, part: MIMETree): Seqable<MessagePart> {
  const multi = part.mimeMultipart
  const children = part.childNodes
  if (!multi) {
    return predicate(part) ? m.list(part) : m.list()
  }
  // mixed: get all parts
  else if (multi === 'mixed') {
    return m.mapcat(part => topLevelRec(predicate, part), children)
  }
  // alternative: get the last matching part
  else if (multi === 'alternative') {
    return m.last(
      m.filter(parts => m.some(predicate),
      m.map(part => topLevelRec(predicate, part)
      , children))) || m.list()
  }
  // related: get the first part
  else if (multi === 'related') {
    return m.isEmpty(children) ?
      m.list() :
      toplevelRec(predicate, m.first(children))
  }
  // signed: get the first part
  else if (multi.indexOf('signature') > -1) {
    return m.isEmpty(children) ?
      m.list() :
      toplevelRec(predicate, m.first(children))
  }
  else {
    // TODO: What to do when encountering unknown multipart subtype?
    console.log(`Unhandled multipart subtype: multipart/${multi}`)
    return m.list()
  }
}

function textParts(msg: Message): Seq<MessagePart> {
  return m.filter(part => part.contentType.match(/text\/plain/i), flatParts(msg))
}

function htmlParts(msg: Message): Seq<MessagePart> {
  return m.filter(part => part.contentType.match(/text\/html/i), flatParts(msg))
}

function midUri(message: Message): URI {
  return `mid:${message.messageId}`
}

function midPartUri(part: MessagePart, message: Message): URI {
  return `${midUri(message)}/${part.contentId}`
}

const midExp = /(mid:|cid:)([^/]+)(?:\/(.+))?$/

function parseMidUri(uri: URI): ?{ scheme: string, messageId: ?MessageId, partId: ?string } {
  var matches = uri.match(midExp)
  if (matches) {
    var scheme    = matches[1]
    var messageId = scheme === 'mid:' ? matches[2] : undefined
    var partId    = scheme === 'cid:' ? matches[2] : matches[3]
    return { scheme, messageId, partId }
  }
}

function resolveUri(msg: Message, uri: URI): URI {
  var parsed = parseMidUri(uri)
  if (parsed && parsed.scheme === 'cid:' && parsed.partId) {
    return `mid:${msg.messageId}/${parsed.partId}`
  }
  else {
    return uri
  }
}

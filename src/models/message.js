/* @flow */

import type { Address } from './address'

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
}

function flatParts(msg: Message): MessagePart[] {
  const subparts = part => !!part.mimeMultipart ? List(part.childNodes).flatMap(subparts) : List.of(part)
  return subparts(msg.mimeTree)
}

function textParts(msg: Message): MessagePart[] {
  return flatParts(msg).filter(part => part.contentType.match(/text\/plain/i))
}

function htmlParts(msg: Message): MessagePart[] {
  return flatParts(msg).filter(part => part.contentType.match(/text\/html/i))
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


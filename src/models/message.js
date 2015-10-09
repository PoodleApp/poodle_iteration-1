/* @flow */

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

export type Address = {
  address: Email,
  name: string,
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

export type MessageId = string
export type Headers   = { [key: string]: string | string[] }
export type Priority  = 'normal' | 'high' | 'low'
export type ISO8601   = string
export type Email     = string


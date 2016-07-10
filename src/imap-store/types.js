/* @flow */

import type { Message } from 'arfe/models/message'

export type MessageDoc = {
  _id:           string,
  _rev?:         string,
  _attachments?: { [key:string]: CouchDBAttachment },
  type:          'message',
  schema:        1,
  message:       Message,
}

export type AttachmentDoc = {
  _id:           string,
  _rev?:         string,
  _attachments?: { [key:string]: CouchDBAttachment },
  type:          'attachment',
  attachment:    Attachment,
  created:       string,  // ISO 8601, time entered into cache
}

// TODO: Put this in type definitions for 'mailparser'
export type Attachment = {
  contentType:        string,
  contentDisposition: string,
  transferEncoding:   string,
  contentId:          string,
  generatedFilename:  string,
  stream:             ReadStream,
}

export type CouchDBAttachment = {
  content_type: string,  // MIME type
  digest:       string,
  stub?:        boolean,
  data?:        string,
}

export type QueryResponseWithDoc<Value,Doc> = {
  total_rows: number,
  offset:     number,
  rows: {
    doc:   Doc,
    id:    string,
    key:   string,
    value: Value,
  }[],
}

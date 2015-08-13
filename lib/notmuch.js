/* @flow */

import child_process  from 'child_process'
import fs             from 'fs'
import { chain }      from 'ramda'
import { MailParser } from 'mailparser'

export {
  getMessages,
  parseList,
  queryThreads,
}

export type ThreadId = string

export type Thread = {
  id: ThreadId,
  messages: Message[],
}

export type Message = {
  id:            string,
  headers:       Headers,
  from:          Address[],
  to:            Address[],
  cc:            Address[],
  bcc:           Address[],
  subject:       string,
  references?:   MessageId[],
  inReplyTo?:    MessageId[],
  priority:      Priority,
  text:          string,
  html:          string,
  date:          Date,
  date_relative: string,
  attachments?:  Attachment[],
}

export type Address = {
  address: Email,
  name: string,
}

export type Email = string
export type Headers = { [key: string]: string | string[] }

// Type for unique ID associated with an email message
export type MessageId = string

export type Priority = 'normal' | 'high' | 'low'

export type Attachment = {
  contentType:        string,
  fileName:           string,
  contentDisposition: string,
  contentId:          string,
  transferEncoding:   string,
  length:             number,
  generatedFileName:  string,
  checksum:           string,
  content:            Buffer,
}

export type MailingList = {
  id:          string,
  archive:     ?string,
  post:        ?string,
  subscribe:   ?string,
  unsubscribe: ?string,
}

export type URI = string

// A MessageThread contains a Message and an array of replies.
export type NotmuchMessageThread = [NotmuchMessage, NotmuchMessageThread][]

export type NotmuchMessage = {
  id: string,
  match: boolean,
  excluded: boolean,
  filename: string,
  timestamp: number,
  date_relative: string,
  tags: string[],
  headers: { [key: string]: string },
  body: MessagePart[],
}

export type MessagePart = {
  id: number,
  'content-type': string,
  'content-charset'?: string,
  'content-transfer-encoding'?: string,
  'content-length'?: number,
  content?: string | MessagePart[]
}

function queryThreads(q: string): Promise<Thread[]> {
  return findThreads(q).then(tIds => (
    Promise.all(tIds.filter(id => !!id).map(
      tId => getMessages(tId).then(msgs => ({
        id: tId,
        messages: msgs,
      }))
    ))
  ))
}

function findThreads(query: string): Promise<ThreadId[]> {
  return notmuch(`search --output=threads ${query}`).then(out => (
    out.toString('utf8').split("\n")
  ))
}

function getMessages(tId: ThreadId): Promise<Message[]> {
  return notmuch(`show --format=json --body=false ${tId}`).then(out => {
    var thread: NotmuchMessageThread = JSON.parse(out.toString('utf8'))[0]
    var files = flatThread(thread).map(msg => msg.filename)
    var messages = flatThread(thread).map(notmuchToMessage)
    return Promise.all(messages)
  })
}

function getMessage(filename: string): Promise<Message> {
  var parser = mkParser()
  fs.createReadStream(filename).pipe(parser)
  return new Promise((resolve, reject) => {
    parser.on('end', resolve)
    parser.on('error', reject)
  })
}

function notmuchToMessage(notmuchMsg: NotmuchMessage): Promise<Message> {
  return getMessage(notmuchMsg.filename).then(msg => {
    msg.id            = notmuchMsg.id
    msg.date_relative = notmuchMsg.date_relative
    return msg
  })
}

function flatThread(thread: NotmuchMessageThread): NotmuchMessage[] {
  return chain(([msg, replies]) => [msg].concat(flatThread(replies)), thread)
}

function parseList({ headers }: Message): ?MailingList {
  var id = headers['List-ID']
  if (id) {
    return {
      id,
      archive: headers['List-Archive'],
      post: headers['List-Post'],
      subscribe: headers['List-Subscribe'],
      unsubscribe: headers['List-Unsubscribe'],
    }
  }
}

function mkParser() {
  return new MailParser({ defaultCharset: 'utf8' })
}

function notmuch(cmd: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    child_process.exec(`notmuch ${cmd}`, (err, stdout, stderr) => {
      if (err) {
        reject(err)
      }
      else {
        resolve(stdout)
      }
    })
  })
}

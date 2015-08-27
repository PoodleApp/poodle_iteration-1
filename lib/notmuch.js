/* @flow */

import child_process  from 'child_process'
import fs             from 'fs'
import { chain }      from 'ramda'
import { MailParser } from 'mailparser'

export {
  displayName,
  flatParts,
  notmuch,
  notmuchToMessage,
  parseList,
  queryThreads,
  textParts,
  htmlParts,
}

export type ThreadId = string

export type Message = {
  messageId:     MessageId,
  headers:       Headers,
  from:          Address[],
  to:            Address[],
  cc?:           Address[],
  bcc?:          Address[],
  subject:       string,
  references?:   MessageId[],
  inReplyTo?:    MessageId[],
  priority:      Priority,
  text?:         string,
  html?:         string,
  date?:         Date,
  receivedDate:  Date,
  attachments?:  Attachment[],
  body: MessagePart[],
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

export type Thread = [Message, Thread][]

// A MessageThread contains a Message and an array of replies.
export type NotmuchThread = [NotmuchMessage, NotmuchThread][]

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
  id:                           number,
  'content-id':                 string,
  'content-type':               string,
  'content-charset'?:           string,
  'content-transfer-encoding'?: string,
  'content-length'?:            number,
  content?:                     string | MessagePart[]
}

function queryThreads(cmd: string, q: string): Promise<{ id: ThreadId, thread: Thread }[]> {
  return findThreads(cmd, q).then(tIds => (
    Promise.all(tIds.filter(id => !!id).map(tId => (
      getThread(cmd, tId).then(({ id, thread }) => (
        readMessages(thread).then(thread_ => ({ id, thread: thread_ }))
      ))
    )))
  ))
}

function findThreads(cmd: string, query: string): Promise<ThreadId[]> {
  return notmuch(cmd, `search --output=threads ${query}`).then(out => (
    out.toString('utf8').split("\n")
  ))
}

function getThread(cmd: string, tId: ThreadId): Promise<{ id: ThreadId, thread: NotmuchThread }> {
  return notmuch(cmd, `show --format=json --body=true ${tId}`).then(out => {
    var thread: NotmuchThread = JSON.parse(out.toString('utf8'))[0]
    return { id: tId, thread }
  })
}

function readMessages(thread: NotmuchThread): Promise<Thread> {
  return Promise.all(thread.map(([message, subthread]) => (
    Promise.all([notmuchToMessage(message), readMessages(subthread)])
  )))
}

function readMessage(filename: string): Promise<Message> {
  var parser = mkParser()
  fs.createReadStream(filename).pipe(parser)
  return new Promise((resolve, reject) => {
    parser.on('end', resolve)
    parser.on('error', reject)
  })
}

function notmuchToMessage(notmuchMsg: NotmuchMessage): Promise<Message> {
  return readMessage(notmuchMsg.filename).then(msg => {
    msg.body = notmuchMsg.body
    return msg
  })
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

function textParts(msg: Message): Attachment[] {
  return (msg.attachments || []).filter(a => a.contentType.match(/text\/plain/i))
}

function htmlParts(msg: Message): Attachment[] {
  return (msg.attachments || []).filter(a => a.contentType.match(/text\/html/i))
}

function mkParser() {
  return new MailParser({ defaultCharset: 'utf8' })
}

function notmuch(cmd: string, op: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    child_process.exec(`${cmd} ${op}`, (err, stdout, stderr) => {
      if (err) {
        reject(err)
      }
      else {
        resolve(stdout)
      }
    })
  })
}

function displayName(addr: Address): string {
  return addr.name || addr.address
}

function flatParts(msg: Message): MessagePart[] {
  var subparts = part => part.content instanceof Array ? chain(subparts, part.content) : [part]
  return chain(subparts, msg.body)
}

/* @flow */

import { exec } from 'child_process'

export {
  fetchRecentConversations,
  queryThreads,
}

export type ThreadId = string

// A MessageThread contains a Message and an array of replies.
export type MessageThread = [Message, MessageThread[]]

export type Message = {
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

function recentConversations(): Promise<Conversation[]> {
  var q = 'date:1month..'
  queryThreads(q).then(tIds => Promise.all(tIds.map(getMessagesFlat)))
}

function queryThreads(query: string): Promise<ThreadId[]> {
  notmuch(`search --output=threads ${query}`).then(out => {
    return out.toString('utf8').split("\n")
  })
}

function getMessages(includeBody: boolean, tId: ThreadId): Promise<MessageThread> {
  notmuch(`show --format=json --body=${includeBody} ${tId}`).then(out => (
    JSON.parse(out.toString('utf8'))[0]
  ))
}

function flatThread([msg, replies]: MessageThread): Message[] {
  return replies.reduce((ms, reply) => {
    return ms.concat(flatThread(reply))
  }, [msg])
}


function getConversation(tId: ThreadId): Promise<Conversation> {

}

function notmuch(cmd: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    exec(`notmuch ${cmd}`, (err, stdout, stderr) => {
      if (err) {
        reject(err)
      }
      else {
        resolve(stdout)
      }
    })
  })
}

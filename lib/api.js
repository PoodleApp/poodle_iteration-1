/* @flow */

import ipc                    from 'ipc'
import { queryConversations } from './notmuch'

import type { Conversation } from './notmuch'

export {}

type IpcEvent = {
  name: string,
  sender: WebContents,
}

type WebContents = {
  send: Function
}

function handle(channel: string, callback: (...args: string[]) => Promise<any>) {
  ipc.on(channel, function(event, ...args) {
    callback(...args).then(
      value => {
        event.sender.send(`${channel}-response`, JSON.stringify(value))
      },
      err => {
        event.sender.send(`${channel}-fail`, JSON.stringify(err))
      }
    )
  })
}

handle('queryConversations', q => queryConversations(q))

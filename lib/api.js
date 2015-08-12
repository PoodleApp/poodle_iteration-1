/* @flow */

import { recentConversations } from './notmuch'

import type { Conversation } from './notmuch'

export {
  handle,
}

type IpcEvent = {
  name: string,
  sender: WebContents,
}

type WebContents = {
  send: Function
}

function handle(event: IpcEvent, arg: mixed) {
  console.log(event, arg)
  var resp;
  if (event.name === 'recentConversations') {
    resp = recentConversations()
  }
  if (resp) {
    resp.then(value => event.sender.send('asynchronous-reply', JSON.stringify(value)))
  }
}

/* @flow */

import { recentConversations } from './notmuch'

import type { Thread } from './notmuch'

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

function handle(event, arg) {
  console.log(event, arg)
  resp;
  if (event.name === 'recentConversations') {
    resp = recentConversations()
  }
  if (resp) {
    resp.then(value => event.sender.send('asynchronous-reply', JSON.stringify(value)))
  }
}

function recentConversations(): Thread[] {
  fetchRecentConversations().then(threads => {
    event.sender.send('asynchronous-reply', threads)
  })
}

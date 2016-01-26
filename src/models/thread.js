/* @flow */

import { List, Map }         from 'immutable'
import { partition, uniqBy } from '../util/immutable'

import type { Message } from './message'

export type Thread = List<[Message, Thread]>

export {
  buildThread,
  insertMessage,
  getMessages,
  singleton,
}

function buildThread(messages: List<Message>): Thread {
  if (messages.isEmpty()) { throw "Cannot build thread from empty message list" }
  const first = messages.first()
  return messages.shift().reduce(insertMessage, singleton(first))
}

function singleton(message: Message): Thread {
  return List.of([message, []])
}

function insertMessage(thread: Thread, message: Message): Thread {
  const msgs = uniqBy(
    m => m.messageId,
    List(thread).flatMap(getMessages).push(message)
  )
  let [toplevel, replies] = partition(msg => (
    !msgs.some(m => ancestorOf(msg, m))
  ), msgs)
  return toplevel.map(msg => assembleTree(msg, replies))
}

function assembleTree(message: Message, messages: List<Message>): [Message, Thread] {
  const descendents = messages.filter(msg => msg !== message && ancestorOf(msg, message))
  let [replies, subreplies] = partition(msg => (
    !descendents.some(m => ancestorOf(msg, m))
  ), descendents)
  const subthread = replies.map(msg => assembleTree(msg, subreplies))
  return [message, sortReplies(subthread)]
}

function getMessages([message, replies]: Thread): List<Message> {
  return replies.flatMap(getMessages).unshift(message)
}

function parentOf(msg: Message, msg_: Message): boolean {
  return !!msg.inReplyTo && msg.inReplyTo.some(ref => ref === msg_.messageId)
}

function ancestorOf(msg: Message, msg_: Message): boolean {
  return !!msg.references && msg.references.some(ref => ref === msg_.messageId)
}

function hasReferences(message: Message): boolean {
  return !!message.references && message.references.length > 0
}

function sortReplies(replies: Thread): Thread {
  return replies.sortBy(([msg, _]) => msg.receivedDate)
}

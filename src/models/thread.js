/* @flow */

import { List, Map }         from 'immutable'
import { partition, uniqBy } from '../util/immutable'

import type { Message } from './message'

export type Thread = [Message, Thread][]

export {
  newThread,
  insertMessage,
  getMessages,
}

function newThread(message: Message): Thread {
  return [[message, []]]
}

function insertMessage(message: Message, thread: Thread): Thread {
  const msgs = uniqBy(
    m => m.messageId,
    List(thread).flatMap(getMessages).push(message)
  )
  let [toplevel, replies] = partition(msg => (
    !msgs.some(m => ancestorOf(msg, m))
  ), msgs)
  return toplevel.map(msg => assembleTree(msg, replies)).toArray()
}

function assembleTree(message: Message, messages: List<Message>): [Message, Thread] {
  const descendents = messages.filter(msg => msg !== message && ancestorOf(msg, message))
  let [replies, subreplies] = partition(msg => (
    !descendents.some(m => ancestorOf(msg, m))
  ), descendents)
  const subthread = replies.map(msg => assembleTree(msg, subreplies))
  return [message, sortReplies(subthread).toArray()]
}

function getMessages([message, replies]: Thread): List<Message> {
  return List.of(message).concat(
    List(replies).flatMap(getMessages)
  )
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

type ImmutableThread = List<[Message, ImmutableThread]>

function sortReplies(replies: ImmutableThread): ImmutableThread {
  return replies.sortBy(([msg, _]) => msg.receivedDate)
}

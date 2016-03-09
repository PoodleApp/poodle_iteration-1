/* @flow */

import * as m                from 'mori'
import { partition, uniqBy } from '../util/mori'

import type { Seq, Seqable, Vector } from 'mori'
import type { Message } from './message'

export type Thread = Seqable<[Message, Thread]>

export {
  buildThread,
  foldThread,
  insertMessage,
  getMessages,
  singleton,
}

function buildThread(messages: Seqable<Message>): Thread {
  return m.reduce(insertMessage, singleton(m.first(messages)), m.rest(messages))
}

function singleton(message: Message): Thread {
  return m.vector([message, m.vector()])
}

function insertMessage(thread: Thread, message: Message): Thread {
  const msgs = uniqBy(
    m => m.messageId,
    m.concat(getMessages(thread), [message])
  )
  let [toplevel, replies] = partition(msg => (
    !m.some(m => ancestorOf(msg, m), msgs)
  ), msgs)
  return m.map(msg => assembleTree(msg, replies), toplevel)
}

function assembleTree(message: Message, messages: Seqable<Message>): [Message, Thread] {
  const descendents = m.filter(msg => msg !== message && ancestorOf(msg, message), messages)
  let [replies, subreplies] = partition(msg => (
    !m.some(m => ancestorOf(msg, m), descendents)
  ), descendents)
  const subthread = m.map(msg => assembleTree(msg, subreplies), replies)
  return [message, sortReplies(subthread)]
}

function getMessages(thread: Thread): Seq<Message> {
  const allMsgs = m.mapcat(([msg, subthread]) => m.cons(msg, getMessages(subthread)), thread)
  return m.sortBy(msg => msg.receivedDate, allMsgs)
}

function parentOf(msg: Message, msg_: Message): boolean {
  return !!msg.inReplyTo && !!m.some(ref => ref === msg_.messageId, msg.inReplyTo)
}

function ancestorOf(msg: Message, msg_: Message): boolean {
  return !!msg.references && !!m.some(ref => ref === msg_.messageId, msg.references)
}

function hasReferences(message: Message): boolean {
  return !!message.references && !m.isEmpty(message.references)
}

function sortReplies(replies: Thread): Thread {
  return m.sortBy(([msg, _]) => msg.receivedDate, replies)
}

function foldThread<T>(reducer: (accum: T, msg: Message) => T, init: T, thread: Thread): T {
  return m.reduce(reducer, init, getMessages(thread))
}

/* @flow */

import type { Message, Thread, ThreadDoc } from './types'

declare function emit(value: any): void

const indexes = {
  _id: '_design/indexes',
  language: 'javascript',
  views: {
    byMessageId: {
      map: function(doc: ThreadDoc | Object) {
        function recMessage(nodes: Thread) {
          nodes.forEach(node => {
            const message = node[0]
            const thread  = node[1]
            emit(message.messageId, 1)
            recMessage(thread)
          })
        }
        if (doc.type === 'thread') {
          recMessage(doc.thread)
        }
      }.toString(),
    },

    byDanglingReference: {
      map: function(doc: ThreadDoc | Object) {
        function eachMessage(fn: (_: Message) => any, thread: Thread) {
          thread.forEach(node => {
            const message = node[0]
            const replies = node[1]
            fn(message)
            eachMessage(fn, replies)
          })
        }
        if (doc.type !== 'thread') { return }
        const ids = []
        eachMessage(msg => ids.push(msg.messageId), doc.thread)
        eachMessage(msg => {
          (msg.references || []).forEach(ref => {
            if (!ids.some(id => ref === id)) {
              emit(ref, 1)
            }
          })
        }, doc.thread)
      }.toString(),
    }
  }
}

export {
  indexes,
}

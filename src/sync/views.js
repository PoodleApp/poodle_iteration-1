/* @flow */

import type { Thread, ThreadDoc } from './types'

declare function emit(value: any): void

const indexes = {
  _id: '_design/indexes',
  views: {
    byMessageId: {
      map: function(doc: ThreadDoc | Object) {
        function recMessage(nodes: Thread) {
          nodes.forEach(node => {
            const message = node[0]
            const thread  = node[1]
            emit(message.messageId)
            recMessage(thread)
          })
        }
        if (doc.type === 'thread') {
          recMessage(doc.thread)
        }
      }.toString(),
    }
  }
}

export {
  indexes,
}


/* @flow */

import type { MessageDoc } from './types'

// Functions defined in this module will actually be stringified to be run in
// PouchDB. Therefore we declare the global variable `emit` that is available to
// PouchDB / CouchDB views.
declare function emit(value: any): void

export const indexes = {
  _id: '_design/indexes',
  language: 'javascript',
  views: {

    byMessageId: {
      map: function(doc: MessageDoc | { type: '' }) {
        if (doc.type === 'message') {
          var id = doc.message.messageId
          emit(id, 1)
        }
      }.toString(),
    },

    // Emit a key for the messageId, and for every Id in the referenced messages
    // list.
    byReferences: {
      map: function(doc: MessageDoc | { type: '' }) {
        if (doc.type === 'message') {
          var id   = doc.message.messageId
          var refs = doc.message.references || []
          emit(refs.concat(id), 1)
        }
      }.toString(),
    },
  },
}


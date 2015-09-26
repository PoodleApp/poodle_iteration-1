/* @flow */

import PouchDB    from 'pouchdb'
import * as Kefir from 'kefir'
import * as imap  from '../imap'

const dbname = encodeURIComponent('poodle/jesse(at)sitr(dot)us')
const db = new PouchDB(`http://localhost:5984/${dbname}`)

// TODO: emit errors
function record(messages: Stream<imap.Result>): Stream<Object> {
  return messages.flatMap(([headers, rawMessage]) => {
    const _id = headers['message-id'][0]

    // Insert into db if document does not already exist
    var resp = db.get(_id).catch(_ => {
      return db.put({
        _id,
        headers,
        rawMessage,
      })
    })

    return Kefir.fromPromise(resp)
  })
}

export {
  db,
  record,
}

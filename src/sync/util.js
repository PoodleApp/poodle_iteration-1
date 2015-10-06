/* @flow */

import assign from 'object-assign'

import type { PouchDB } from 'pouchdb'

export {
  putIfAbsent,
  putOrUpdate,
}

function putOrUpdate<T:{ _id: string }>(doc: T, db: PouchDB): Promise<T> {
  return db.get(doc._id)
  .catch(err => err.status === 404 ? doc : Promise.reject(err))
  .then(({ _rev }) => {
    const doc_ = _rev ? assign({}, doc, { _rev }) : doc
    return db.put(doc_)
  })
}

function putIfAbsent<T:{ _id: string }>(doc: T, db: PouchDB): Promise<T> {
  return db.put(doc).catch(err => {
    if (err.status === 409) {
      // Ignore failure due to conflict with exist doc
      return doc
    }
    else {
      // If a different problem occurred, re-reject with the same error
      return Promise.reject(err)
    }
  })
}

/* @flow */

import assign from 'object-assign'

import type { PouchDB } from 'pouchdb'

export {
  putIfAbsent,
  putOrUpdate,
}

function putOrUpdate<T:{ _id: string }>(doc: T, db: PouchDB): Promise<T> {
  return db.get(doc._id)
  .catch(_ => doc)
  .then(({ _rev }) => {
    const doc_ = _rev ? assign({}, doc, { _rev }) : doc
    return db.put(doc_)
  })
}

function putIfAbsent<T:{ _id: string }>(doc: T, db: PouchDB): Promise<T> {
  return db.get(doc._id).catch(_ => db.put(doc))
}

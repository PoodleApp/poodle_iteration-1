/* @flow */

import moment          from 'moment'
import * as m          from 'mori'
import assign          from 'object-assign'
import getRawBody      from 'raw-body'
import { uniqBy }      from './util/mori'
import { displayName } from './models/address'
import { midPartUri
       , parseMidUri
       , resolveUri
       , toplevelParts
       } from './models/message'

import type { Moment }         from 'moment'
import type { Seq, Seqable }   from 'mori'
import type { Address, Email } from './models/address'
import type { Message
            , MessageId
            , MessagePart
            } from './models/message'

export {
  actor,
  flatParticipants,
  getActivities,
  mailtoUri,
  objectContent,
  participants,
  published,
  title,
}

export type URI = string
type IRI = string  // RFC3987
type ISO8601 = string  // datetime string

export type Activity = {
  object?:  ActivityObject,
  target?:  ActivityObject,
  title?:   string,
  updated?: ISO8601,
  verb:     Verb,
}

export type ActivityObject = {
  author?:      ActivityObject,
  content?:     string,
  displayName?: string,
  image?:       MediaLink,
  objectType?:  string,
  published?:   ISO8601,
  summary?:     string,
  uri?:         URI,
  inline?:      Object,
}

export type Verb = 'post' | 'reply' | 'share' | 'edit' | 'like' | 'unknown' | 'delete'

export type MediaLink = {
  url:       IRI,
  duration?: number,
  height?:   number,
  width?:    number,
}

// export type Collection = {
//   totalItems?: number,
//   items?:      ActivityObject[],
//   url?:        IRI,  // link to JSON document containing full listing of objects in collection
// }

// export type ActivityStream = {
//   totalItems?: number,
//   items:       Activity[],
//   url?:        IRI,  // link to JSON document containing full listing of objects in collection
// }

export type Zack = [Activity, Message]

function getActivities(message: Message): Promise<Seqable<Activity>> {
  const parts = toplevelParts(part => part.contentType === 'application/activity+json', message)
  return Promise.all(m.intoArray(m.map(part => (
    getRawBody(part.stream, { encoding: 'utf8' })
    .then(JSON.parse)
    .then(json => assign(json, { id: midPartUri(part, message) }))
  ), parts)))
}

function mailtoUri(email: Email): URI {
  // TODO: Should we normalize? Maybe lowercase?
  return `mailto:${email}`
}

function participants(messages: Seqable<Message>): { to:   Seq<Address>
                                                   , from: Seq<Address>
                                                   , cc:   Seq<Address>
                                                   } {
  const { to, from, cc } = m.reduce((ls, message) => ({
    to:   m.filter(addr => !!addr, m.concat(ls.to,   message.to)),
    from: m.filter(addr => !!addr, m.concat(ls.from, message.from)),
    cc:   m.filter(addr => !!addr, m.concat(ls.cc,   message.cc)),
  })
  , { to: m.vector(), from: m.vector(), cc: m.vector() }
  , messages)
  return {
    to:   uniqBy(addr => addr.address, to),
    from: uniqBy(addr => addr.address, from),
    cc:   uniqBy(addr => addr.address, cc),
  }
}

function flatParticipants(messages: Seqable<Message>): Seq<Address> {
  var { from, to, cc } = participants(messages)
  return uniqBy(
    addr => addr.address,
    m.concat(m.reverse(from), m.reverse(to), m.reverse(cc))
  )
}

function published([_, msg]: Zack): Moment {
  var d = msg.date || msg.receivedDate
  return moment(d || new Date(0))
}

function title([act, msg]: Zack): string {
  return act.title || msg.subject
}

function actor([act, msg]: Zack): ActivityObject {
  var a = msg.from[0]
  return {
    uri:         mailtoUri(a.address),
    objectType:  'person',
    displayName: displayName(a),
  }
}

function objectContent([act, msg]: Zack): ?URI {
  var { object } = act
  if (!object) { return null }
  var { uri } = object
  if (!uri) { return null }
  return resolveUri(msg, uri)
}

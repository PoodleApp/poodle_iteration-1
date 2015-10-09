/* @flow */

import moment          from 'moment'
import { uniqBy }      from './util/immutable'
import { displayName } from './models/address'
import { flatParts
       , textParts
       , htmlParts
       } from './models/message'

import type { Moment }  from 'moment'
import type { List }    from 'immutable'
import type { Address } from './models/address'
import type { Email
            , Message
            , MessageId
            , MessagePart
            } from './models/message'

export {
  actor,
  flatParticipants,
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

function mailtoUri(email: Email): URI {
  // TODO: Should we normalize? Maybe lowercase?
  return `mailto:${email}`
}

function participants(messages: List<Message>): { to: List<Address>, from: List<Address>, cc: List<Address> } {
  var { to, from, cc } = messages.reduce((ls, message) => ({
    to:   ls.to.concat((message.to || List()).filter(addr => !!addr)),
    from: ls.from.concat((message.from || List()).filter(addr => !!addr)),
    cc:   ls.cc.concat((message.cc || List()).filter(addr => !!addr)),
  }), { to: List(), from: List(), cc: List() })
  return {
    to:   uniqBy(addr => addr.address, to),
    from: uniqBy(addr => addr.address, from),
    cc:   uniqBy(addr => addr.address, cc)
  }
}

function flatParticipants(messages: List<Message>): Address[] {
  var { from, to, cc } = participants(messages)
  return uniqBy(
    addr => addr.address,
    from.reverse().concat(to.reverse()).concat(cc.reverse())
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

function objectContent([act, msg]: Zack): { contentType: string, content: Buffer }[] {
  var { object } = act
  if (!object) { return [] }
  var { uri } = object
  if (!uri) { return [] }

  var parsed = parseMidUri(resolveUri(msg, uri))  // TODO: handle schemes other than mid:
  if (!parsed) { return [] }

  var { partId } = parsed
  if (!partId) {  // URI refers to entire message
    return [
      { contentType: 'text/plain', content: msg.text },
      { contentType: 'text/html',  content: msg.html }
    ]
    .filter(c => !!c.content)
    .map(({ contentType, content }) => ({ contentType, content: new Buffer((content:any)) }))
  }

  return flatParts(msg).filter(part => part['content-id'] === partId).map(part => ({
    content:     new Buffer(typeof part.content === 'string' ? part.content : '', 'utf8'),
    contentType: part['content-type'],
  }))
}

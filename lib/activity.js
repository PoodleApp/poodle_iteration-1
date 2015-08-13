/* @flow */

import type { Attachment, Email, Message } from './notmuch'

type URI = string
type IRI = string  // RFC3987
type ISO8601 = string  // datetime string

export type Activity = ActivityObject & {
  actor:      ActivityObject,
  published:  ISO8601,
  content?:   string,
  generator?: ActivityObject,
  icon?:      MediaLink,
  object?:    ActivityObject,
  provider?:  ActivityObject,
  target?:    ActivityObject,
  title?:     string,
  updated?:   ISO8601,
  url?:       IRI,  // link to HTML representation
  verb?:      Verb,
}

export type ActivityObject = {
  attachments?:          ActivityObject[],
  author?:               ActivityObject,
  content?:              string,
  displayName?:          string,
  downstreamDuplicates?: IRI[],
  id?:                   IRI,
  image?:                MediaLink,
  objectType?:           string,
  published?:            ISO8601,
  summary?:              string,
  updated?:              ISO8601,
  upstreamDuplicates?:   IRI[],
  url?:                  IRI,
  contentType?:          string,
  uri?:                  URI,
}

export type Verb = 'post' | 'share' | 'edit'

export type MediaLink = {
  url:       IRI,
  duration?: number,
  height?:   number,
  width?:    number,
}

export type Collection = {
  totalItems?: number,
  items?:      ActivityObject[],
  url?:        IRI,  // link to JSON document containing full listing of objects in collection
}

export type ActivityStream = {
  totalItems?: number,
  items:       Activity[],
  url?:        IRI,  // link to JSON document containing full listing of objects in collection
}

export {
  asActivities,
}

function asActivities(message: Message): Activity[] {
  var activities: Activity[] = message.attachments.filter(a => (
    a.contentType === 'application/activity+json'
  ))
  .map(attachment => {
    var activity = JSON.parse(attachment.content.toString('utf8'))
    activity.id = activity.id || midPartUri(attachment, message)
    // TODO: translate relative URIs in activity structure to be fully-qualified
    return activity
  })
  if (activities.length > 0) {
    return activities
  }
  else {
    return [asNote(message)]
  }
}

function asNote(message: Message): Activity {
  var from = message.from[0]
  var actor = {
    objectType: 'person',
    displayName: from.name,
    id: mailtoUri(from.address),
  }
  var activity = {
    id: midUri(message),  // TODO: Little inconsistency: this URI references the message rather than an attachment
    published: message.date.toISOString(),
    actor,
    object: {
      objectType: 'note',
      contentType: 'text/plain',
      content: message.text,
      author: actor,
    }
  }
  return activity
}

function midUri(message: Message): URI {
  return `mid:${message.id}`
}

function midPartUri(part: Attachment, message: Message): URI {
  return `${midUri(message)}/${part.contentId}`
}

function mailtoUri(email: Email): URI {
  // TODO: Should we normalize? Maybe lowercase?
  return `mailto:${email}`
}

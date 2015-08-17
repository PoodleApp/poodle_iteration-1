/* @flow */

import randomstring    from 'randomstring'
import { mailtoUri }   from './activity'
import { displayName } from './notmuch'

import type { Activity, ActivityObject, Verb } from './activity'
import type { Burger, ComposerAttachment }     from './compose'
import type { Address, Email, URI }                 from './notmuch'

export {
  like,
  note,
}

function like(target: ActivityObject): Burger {
  var activityId = randomstring.generate()

  var activity = {
    id: cidUri(activityId),
    verb: 'like',
    target,
  }

  return [activity, []]
}

type NoteOpts = {
  verb:    Verb,
  author:  Address,
  subject: string,
  body:    string | Buffer,
  target?: ActivityObject,
}

function note({ verb, author, subject, body, target }: NoteOpts): Burger {
  var object: ComposerAttachment = {
    cid:                randomstring.generate(),
    contents:           body,
    contentDisposition: 'inline',
    contentEncoding:    'quoted-printable',
    contentType:        'text/plain',
  }

  var authorObj = {
    uri:         mailtoUri(author.address),
    objectType:  'person',
    displayName: displayName(author),
  }

  var activityId = randomstring.generate()

  var activity: Activity = {
    id: cidUri(activityId),
    title: subject,
    verb,
    object: {
      objectType: 'note',
      author: authorObj,
      uri: cidUri(object.cid),
    }
  }

  if (target) {
    activity.target = target
  }

  return [activity, [object]]
}

function cidUri(partId: string): URI {
  return `cid:${partId}`
}

/* @flow */

import randomstring    from 'randomstring'
import * as Act        from './derivedActivity'
import { mailtoUri }   from './activity'
import { displayName } from './notmuch'

import type { DerivedActivity }                from './derivedActivity'
import type { Activity, ActivityObject, Verb } from './activity'
import type { Burger, ComposerAttachment }     from './compose'
import type { Address, Email, URI }            from './notmuch'

export {
  edit,
  like,
  note,
}

type EditOpts = {
  amended: Burger,
  target:  DerivedActivity,
}

function edit({ amended, target }: EditOpts): Burger {
  var [amendedActivity, attachments] = amended
  var activityId = randomstring.generate()

  var activity = {
    id: cidUri(activityId),
    verb: 'edit',
    object: {
      objectType: 'activity',
      inline:     amendedActivity,
    },
    target: {
      objectType: 'activity',
      uri:        Act.activityId(target),
    }
  }

  return [activity, attachments]
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
  target?: ?ActivityObject,
}

function note({ verb, author, subject, body, target }: NoteOpts): Burger {
  var object: ComposerAttachment = {
    cid:                randomstring.generate(),
    contents:           body,
    contentDisposition: 'attachment',
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

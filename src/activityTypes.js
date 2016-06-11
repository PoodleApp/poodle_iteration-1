/* @flow */

import * as AS         from 'activitystrea.ms'
import randomstring    from 'randomstring'
import * as Act        from 'arfe/derivedActivity'
import { displayName } from 'arfe/models/address'
import { mailtoUri }   from 'arfe/models/uri'

import type { DerivedActivity }            from 'arfe/derivedActivity'
import type { Activity }                   from 'arfe/activity'
import type { Address, Email }             from 'arfe/models/address'
import type { URI }                        from 'arfe/models/message'
import type { Burger, ComposerAttachment } from './compose'

export {
  document,
  edit,
  like,
  note,
}

type EditOpts = {
  amended: Burger,
  target:  DerivedActivity,
}

function edit({ amended, target }: EditOpts): Burger {
  var [amendedId, amendedActivity, attachments] = amended

  var activity = {
    verb: 'edit',
    object: {
      objectType: 'activity',
      inline:     amendedActivity,
    },
    target: {
      objectType: 'activity',
      uri:        Act.getId(target),
    }
  }
  var activityId = randomstring.generate()

  return [cidUri(activityId), activity, attachments]
}

function like(target: AS.models.Object): Burger {
  var activity = {
    verb: 'like',
    target,
  }

  var activityId = randomstring.generate()

  return [cidUri(activityId), activity, []]
}

type ContentOpts = {
  verb:    Verb,
  author:  Address,
  subject: string,
  body:    string | Buffer,
  target?: ?ActivityObject,
}

function note(opts: ContentOpts): Burger {
  return content('note', opts)
}

function document(opts: ContentOpts): Burger {
  return content('document', opts)
}

function content(objectType: string, { verb, author, subject, body, target }: ContentOpts): Burger {
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

  var activity: Activity = {
    title: subject,
    verb,
    object: {
      objectType,
      author: authorObj,
      uri: cidUri(object.cid),
    }
  }
  var activityId = randomstring.generate()

  if (target) {
    activity.target = target
  }

  return [cidUri(activityId), activity, [object]]
}

function cidUri(partId: string): URI {
  return `cid:${partId}`
}

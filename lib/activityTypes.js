/* @flow */

import randomstring    from 'randomstring'
import { mailtoUri }   from './activity'
import { displayName } from './notmuch'

import type { Activity, Verb }             from './activity'
import type { Burger, ComposerAttachment } from './compose'
import type { Address, Email }             from './notmuch'

export {
  note,
}

function note(verb: Verb, author: Address, subject: string, body: string | Buffer): Burger[] {
  var object: ComposerAttachment = {
    cid:                randomstring.generate(),
    contents:           body,
    contentDisposition: 'inline',
    contentEncoding:    'quoted-printable',
    contentType:        'text/plain',
  }

  var authorObj = {
    id:          mailtoUri(author.address),
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

  return [activity, [object]]
}

function cidUri(partId: string): URI {
  return `cid:${partId}`
}

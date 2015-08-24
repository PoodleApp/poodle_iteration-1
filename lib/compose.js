/* @flow */

import { MailComposer }               from 'mailcomposer'
import { chain }                      from 'ramda'
import randomstring                   from 'randomstring'
import { objectContent, parseMidUri } from './activity'

import type { ReadStream }                  from 'fs'
import type { Activity }                    from './activity'
import type { Address, Message, MessageId } from './notmuch'

export type ComposerAttachment = {
  cid:                string,
  contents:           string | Buffer,
  contentDisposition: string,
  contentType:        string,
}

export type Burger = [ActivityId, Activity, ComposerAttachment[]]

export type ActivityId = string

export type Draft = {
  activities:  Burger[],
  from:        Address,
  to:          Address[],
  cc?:         Address[],
  inReplyTo?:  MessageId,
  references?: MessageId[],
  subject?:    string,
  fallback?:   string,
}

export {
  assemble,
}

function assemble({ activities, from, to, cc, inReplyTo, references, subject, fallback }: Draft): ReadStream {
  var comp = new MailComposer()
  comp.setMessageOption({
    from: comp.convertAddress(from),
    to:   to.map(comp.convertAddress.bind(comp)).join(', '),
    body: withFooter(fallback || fallbackContent(activities)),
  })
  if (subject) {
    comp.setMessageOption({ subject })
  }
  if (cc) {
    comp.setMessageOption({ cc: cc.map(comp.convertAddress.bind(comp)).join(', ') })
  }
  if (inReplyTo) {
    comp.setMessageOption({ inReplyTo })
  }
  if (references) {
    comp.setMessageOption({ references })
  }

  activities.forEach(([activityId, activity, attachments]) => {
    var parsed = parseMidUri(activityId)
    if (!parsed || !parsed.partId) { throw "No part Id for activity" }
    var { partId } = parsed
    comp.addAttachment({
      cid: partId,
      contents: JSON.stringify(activity),
      contentEncoding: 'quoted-printable',
      contentType: 'application/activity+json',
    })
    attachments.forEach(a => comp.addAttachment(a))
  })

  comp.streamMessage()
  return comp
}

// TODO: specific fallback behavior for each verb and object type
function fallbackContent(acts: Burger[]): string {
  var contents  = chain(([_, __, attachments]) => attachments, acts)
  var textParts = contents.filter(c => c.contentType === 'text/plain')
  var text      = textParts.length > 0 ? textParts[0].contents.toString('utf8') : ''
  return text
}

function withFooter(body: string): string {
  return body + "\n\n---\nThis message is best viewed with Poodle <https://github.com/hallettj/poodle>."
}

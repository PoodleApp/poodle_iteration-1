/* @flow */

import * as m            from 'mori'
import { join }          from './util/mori'
import { MailComposer }  from 'mailcomposer'
import randomstring      from 'randomstring'
import uuid              from 'uuid'
import moment            from 'moment'
import objectAssign      from 'object-assign'
import { objectContent } from './activity'
import { parseMidUri }   from './models/message'

import type { Seqable }            from 'mori'
import type { ReadStream }         from 'fs'
import type { Content }            from 'mailcomposer'
import type { Activity }           from './activity'
import type { Address }            from './models/address'
import type { Message, MessageId } from './models/message'

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
  to:          Seqable<Address>,
  cc?:         Seqable<Address>,
  inReplyTo?:  MessageId,
  references?: MessageId[],
  subject?:    string,
  fallback?:   string,
}

export {
  assemble,
}

function assemble({ activities, from, to, cc, inReplyTo, references, subject, fallback }: Draft): ReadStream {
  const comp = new MailComposer()
  comp.setMessageOption({
    from: convertAddress(comp, from),
    to:   join(', ', m.map(convertAddress.bind(null, comp), to)),
  })
  if (subject) {
    comp.setMessageOption({ subject })
  }
  if (cc) {
    comp.setMessageOption({ cc: join(', ', m.map(convertAddress.bind(null, comp), cc)) })
  }
  if (inReplyTo) {
    comp.setMessageOption({ inReplyTo })
  }
  if (references) {
    comp.setMessageOption({ references })
  }

  comp.addHeader('Message-ID', `<${uuid.v4()}@${from.address.split('@')[1]}>`)
  comp.addHeader('Date', moment().format('ddd, DD MMM YYYY HH:mm:ss ZZ'))

  const textPart = {
    contentType: 'text/plain',
    contentEncoding: 'quoted-printable',
    contents: fallback || fallbackContent(activities),
  }

  const jsonAndAttachments = activities.map(([activityId, activity, attachments]) => {
    const parsed = parseMidUri(activityId)
    if (!parsed) { throw "Could not parse activity ID" }
    const { partId } = parsed
    if (!partId) { throw "No part Id for activity" }
    const jsonPart: Content = {
      cid: partId,
      contents: JSON.stringify(activity),
      contentEncoding: 'quoted-printable',
      contentType: 'application/activity+json',
      contentDisposition: 'inline',
      fileName: 'activity.json',
    }
    return [jsonPart, attachments]
  })

  const jsonParts = jsonAndAttachments.map(([json, _]) => json)
  const attachments = m.intoArray(m.mapcat(([_, as]) => as, jsonAndAttachments))

  const combinedJsonParts = jsonParts.length > 0 ?
    { multipart: 'mixed', childNodes: jsonParts } : jsonParts[0]

  const activitiesPart = attachments.length > 0 ?
    { multipart: 'related', childNodes: [combinedJsonParts].concat(attachments) } :
    combinedJsonParts

  comp.setBodyStructure({
    multipart: 'alternative',
    childNodes: [
      textPart,
      activitiesPart,
    ]
  })

  comp.streamMessage()
  return (comp: any)
}

// TODO: specific fallback behavior for each verb and object type
function fallbackContent(acts: Burger[]): string {
  const contents  = m.mapcat(([_, __, attachments]) => attachments, acts)
  const textParts = m.filter(c => c.contentType === 'text/plain', contents)
  const firstPart = m.first(textParts)
  const text      = firstPart ? firstPart.contents.toString('utf8') : ''
  return text
}

function withFooter(body: string): string {
  return body + "\n\n---\nThis message is best viewed with Poodle <https://github.com/hallettj/poodle>."
}

// It seems that the MailComposer#convertAddress method mutates the input
// object. This wrapper produces a defensive copy.
function convertAddress(comp: MailComposer, addr: Address): string {
  return comp.convertAddress(objectAssign({}, addr))
}

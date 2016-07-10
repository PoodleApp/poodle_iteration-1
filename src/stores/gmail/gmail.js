/* @flow */

import * as Kefir         from 'kefir'
import * as m             from 'mori'
import { MailParser }     from 'mailparser'
import * as imap          from './google-imap'
import { tokenGenerator } from './tokenGenerator'
import { getActivities }  from 'arfe/activity'
import { buildThread }    from 'arfe/models/thread'

import type { ReadStream }       from 'fs'
import type { Stream }           from 'kefir'
import type { List }             from 'immutable'
import type { Message }          from 'arfe/models/message'
import type { Thread }           from 'arfe/models/thread'
import type { XOAuth2Generator } from './tokenGenerator'

// TODO: Put this in type definitions for 'mailparser'
type Attachment = {
  contentType:        string,
  contentDisposition: string,
  transferEncoding:   string,
  contentId:          string,
  generatedFilename:  string,
  stream:             ReadStream,
}

function search(
  query: string, tokenGenerator: XOAuth2Generator, onAttachment?: ?(a: Attachment, m: Message) => any
): Stream<Thread,any> {
  return Kefir.fromPromise(
    imap.getConnection(tokenGenerator)
  )
  .flatMap(conn => imap.fetchConversations(query, conn, 100))
  .flatMap((messages: List<ReadStream>) => {
    const activityPromises = messages.map(msg => getActivities(msg, onAttachment)).toArray()
    return Kefir.fromPromise(
      Promise.all(activityPromises).then(activitySets => {
        const flattened = m.mapcat(acts => acts, activitySets)
        return buildThread(flattened)
      })
    )
  })
}

export {
  search,
}

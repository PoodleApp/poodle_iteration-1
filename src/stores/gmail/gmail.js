/* @flow */

import * as imap from '../imap'
import { tokenGenerator } from './tokenGenerator'

import type { XOAuth2Generator } from './tokenGenerator'

function fetch(query: string, tokenGenerator: XOAuth2Generator): Promise<Activity[]> {
}

export {
  fetch,
  getTokenGenerator,
}

/* @flow */

import { Record } from 'immutable'
import xoauth2    from 'xoauth2'
import { field }  from 'safety-lens/immutable'
import { lift1 }  from '../util/promises'

type AuthStateSpec = {
  tokenGen: ?Object,
}

export type AuthState = AuthStateSpec & Record<AuthStateSpec>

var AuthStateRecord = Record(({
  tokenGen: null,
}: AuthStateSpec))

var initialState = new AuthStateRecord()

var tokenGen = field('tokenGen')

function getToken(state: AuthState): Promise<string> {
  var { tokenGen } = state
  if (!tokenGen) { return Promise.reject("No token generator is available") }
  const gen = tokenGen
  return lift1(cb => gen.getToken(cb))
}


// TODO: Turn token into a proper store

import keytar             from 'keytar'
import { tokenGenerator } from '../stores/gmail/tokenGenerator'
import type { Account }          from '../config'
import type { OauthCredentials } from '../stores/gmail/google-oauth'

let tokGen: ?Object

function getTokenGenerator({ email }: Account): Object {
  if (!tokGen) {
    const creds = getCreds(email)
    if (creds) {
      tokGen = tokenGenerator(email, creds)
    }
  }
  if (!tokGen) {
    throw `Could not get credentials for IMAP account ${email}`
  }
  return tokGen
}

function getCreds(email: string): ?OauthCredentials {
  let creds = keytar.getPassword('Poodle', email)
  creds = creds && JSON.parse(creds)
  if (creds && creds.refresh_token) {
    return creds
  }
}

export {
  getToken,
  getTokenGenerator,
  initialState,
  tokenGen,
}

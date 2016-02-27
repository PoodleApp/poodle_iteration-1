/* @flow */

import xoauth2         from 'xoauth2'
import { prop }        from 'safety-lens/es2015'
import { lift1 }       from '../util/promises'
import { constructor } from '../util/record'

import type { Constructor } from '../util/record'

export type AuthState = {
  tokenGen?: Object,
}

const newAuthState: Constructor<{},AuthState> = constructor({})

const initialState = newAuthState({})

const tokenGen = prop('tokenGen')

function getToken(state: AuthState): Promise<string> {
  const { tokenGen } = state
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

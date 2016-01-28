/* @flow */

import { emit, reduce, update } from 'sunshine-framework'
import { set }                  from 'safety-lens'
import keytar                   from 'keytar'
import { tokenGenerator }       from '../stores/gmail/tokenGenerator'
import * as AuthState           from './state'
import * as Config              from '../config'

import type { Reducers }         from 'sunshine-framework'
import type { OauthCredentials } from '../stores/gmail/google-oauth'

class AccessToken {
  email: string;
  creds: OauthCredentials;
  constructor(email: string, creds: OauthCredentials) {
    this.email = email
    this.creds = creds
  }
}

class SetAccount {
  account: Config.Account;
  constructor(account: Config.Account) { this.account = account }
}

const reducers: Reducers<AuthState.AuthState> = [

  reduce(AccessToken, (state, { email, creds }) => {
    const tokenGen = tokenGenerator(email, creds)
    return update(
      set(AuthState.tokenGen, tokenGen, state)
    )
  }),

  reduce(SetAccount, (state, { account }) => {
    let creds = keytar.getPassword('Poodle', account.email)
    creds = creds && JSON.parse(creds)
    if (creds && creds.refresh_token) {
      return emit(new AccessToken(account.email, creds))
    }
  }),

]

export {
  AccessToken,
  SetAccount,
  reducers,
}

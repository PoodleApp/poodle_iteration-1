/* @flow */

import * as Sunshine          from 'sunshine-framework'
import { compose, over, set } from 'safety-lens'
import { field }              from 'safety-lens/immutable'
import keytar                 from 'keytar'
import { tokenGenerator }     from './tokenGenerator'
import * as State             from '../state'
import * as AuthState         from './state'
import * as Config            from '../config'

import type { OauthCredentials } from './google'

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

var authLens = field('authState')

function init(app: Sunshine.App<State.AppState>) {
  app.on(AccessToken, (state, { email, creds }) => {
    var tokenGen = tokenGenerator(email, creds)
    return set(compose(authLens, AuthState.tokenGen), tokenGen, state)
  })

  app.on(SetAccount, (state, { account }) => {
    var creds = keytar.getPassword('Poodle', account.email)
    creds = creds && JSON.parse(creds)
    if (creds && creds.refresh_token) {
      app.emit(new AccessToken(account.email, creds))
    }
  })
}

export {
  AccessToken,
  SetAccount,
}

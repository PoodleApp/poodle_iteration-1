/* @flow */

import { takeLatest }     from 'redux-saga'
import { fork }           from 'redux-saga/effects'
import * as actions       from '../actions/auth'

import type { Effect }           from 'redux-saga'
import type { Account }          from '../config'
import type { OauthCredentials } from '../stores/gmail/google-oauth'

function* fetchAccessToken({ account: Account }: Object): Generator<Effect,void,any> {
  let creds = keytar.getPassword('Poodle', email)
  creds = creds && JSON.parse(creds)
  if (creds && creds.refresh_token) {
    yield put(actions.accessToken(account.email, creds))
  }
}

export default function* root(): Generator<Effect,void,any> {
  yield [
    fork(takeLatest, 'auth/setAccount', fetchAccessToken)
  ]
}

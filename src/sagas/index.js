/* @flow */

import keytar                         from 'keytar'
import PouchDB                        from 'pouchdb'
import { crudSaga }                   from 'redux-crud-store'
import { takeLatest }                 from 'redux-saga'
import { call, cancelled, fork, put } from 'redux-saga/effects'
import ApiClient                      from '../imap-store/ApiClient'
import * as actions                   from '../actions'
import * as Config                    from '../config'
import * as ipc                       from '../ipc'
import { tokenGenerator }             from '../stores/gmail/tokenGenerator'

import type { Effect }           from 'redux-saga'
import type { Account }          from '../config'
import type { OauthCredentials } from '../stores/gmail/google-oauth'

// Generator type parameters are of the form: `Generator<+Yield,+Return,-Next>`

function* loadAccount(): Generator<Effect,void,any> {
  try {
    const account = yield call(Config.loadAccount)
    yield put(actions.setAccount(account))
  }
  catch(err) {
    yield put(actions.showError(err))
  }
}

function* initAccount({ account }: Object): Generator<Effect,void,any> {
  let token = loadAccessToken(account)
  if (!token) {
    token = yield* fetchNewAccessToken(account)
  }
  if (token) {
    yield put(actions.accessToken(account.email, token))
  }
}

function loadAccessToken(account: Account): ?OauthCredentials {
  let creds = keytar.getPassword('Poodle', account.email)
  creds = creds && JSON.parse(creds)
  if (creds && creds.refresh_token) {
    return creds
  }
}

function* fetchNewAccessToken(account: Account): Generator<Effect,?OauthCredentials,any> {
  try {
    yield put(actions.indicateLoading('google-account', 'Authorizing with Google'))
    return yield call(ipc.request, 'google-account')
  }
  catch (err) {
    yield put(actions.showError(err))
  }
  finally {
    yield put(actions.doneLoading('google-account'))
  }
}

// TODO: clear redux-crud-store app state when credentials change
function* initImapStore({ email, creds }: Object): Generator<Effect,void,any> {
  const tokenGen  = tokenGenerator(email, creds)
  const db        = new PouchDB('poodle')  // store db under $XDG_CACHE_HOME/
  const apiClient = new ApiClient(tokenGen, db)
  yield* crudSaga(apiClient)()
}

export default function* root(): Generator<Effect,void,any> {
  yield [
    fork(takeLatest, 'auth/setAccount',  initAccount),
    fork(takeLatest, 'auth/accessToken', initImapStore),
    fork(loadAccount),
  ]
}

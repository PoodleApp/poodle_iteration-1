/* @flow */

import { crudSaga }             from 'redux-crud-store'
import { takeLatest }           from 'redux-saga'
import { call, cancelled, put } from 'redux-saga'
import * as actions             from '../actions'
import * as Config              from '../config'
import * as ipc                 from '../ipc'
import { tokenGenerator }       from '../stores/gmail/tokenGenerator'

import type { Effect } from 'redux-saga'

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

function* initAccount({ email }: Object): Generator<Effect,void,any> {
  try {
    yield put(actions.indicateLoading('google-account', 'Authorizing with Google'))
    const account = yield call(ipc.request, 'google-account')
    yield put(actions.newAccount(account))
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
    fork(takeLatest, 'add_account/newAccount', initAccount),
    fork(takeLatest, 'auth/accessToken',       initImapStore),
    fork(loadAccount),
  ]
}

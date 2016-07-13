/* @flow */

import { crudSaga }         from 'redux-crud-store'
import { call, takeLatest } from 'redux-saga'
import * as Config          from '../config'
import * as actions         from '../actions'
import { tokenGenerator }   from '../stores/gmail/tokenGenerator'

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

// TODO: clear redux-crud-store app state when credentials change
function* initImapStore({ email, creds }: Object): Generator<Effect,void,any> {
  const tokenGen  = tokenGenerator(email, creds)
  const db        = new PouchDB('poodle')  // store db under $XDG_CACHE_HOME/
  const apiClient = new ApiClient(tokenGen, db)
  yield* crudSaga(apiClient)()
}

export default function* root(): Generator<Effect,void,any> {
  yield [
    fork(takeLatest, 'auth/accessToken', initImapStore),
    fork(loadAccount),
  ]
}

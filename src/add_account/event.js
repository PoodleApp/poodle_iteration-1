
import { emit, reduce } from 'sunshine-framework'
import ipc              from 'electron-safe-ipc/guest'
import * as Ev          from '../event'
import * as AS          from './state'

import type { Reducers } from 'sunshine-framework'

class NewAccount {
  email: ?string;
  constructor(email?: string) {
    this.email = email
  }
}

// TODO: Turn this event handler into a saga

const reducers: Reducers<AS.AddAccountState> = [

  reduce(NewAccount, (state, { email }) => Ev.indicateLoading(
    'Authorizing with Google',
    ipc.request('google-account', email).then(
      () => emit(new Ev.LoadConfig())
    )
  )),

]

export {
  NewAccount,
  reducers,
}

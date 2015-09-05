/* @flow */

import * as Sunshine from 'sunshine-framework'
import ipc           from 'electron-safe-ipc/guest'
import * as State    from '../state'
import * as Ev       from '../event'
import * as AS       from './state'

class NewAccount {
  email: ?string;
  constructor(email?: string) {
    this.email = email
  }
}

function init(app: Sunshine.App<State.AppState>) {
  app.on(NewAccount, (state, { email }) => {
    indicateLoading(
      'Authorizing with Google',
      ipc.request('google-account', email)
      .then(
        () => app.emit(new Ev.LoadConfig()),
        err => app.enit(new Ev.GenericError(err))
      )
    )
  })

  function indicateLoading<T>(label: string, p: Promise<T>): Promise<T> {
    app.emit(new Ev.Loading())
    p.then(
      success => app.emit(new Ev.DoneLoading()),
      err => app.emit(new Ev.DoneLoading())
    )
    return p
  }
}

export {
  NewAccount,
  init,
}

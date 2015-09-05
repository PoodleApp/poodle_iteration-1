/* @flow */

import * as Sunshine from 'sunshine-framework'
import * as State    from '../state'
import * as Ev       from '../event'
import * as AS       from './state'
import { setupGoogle } from '../account'

class NewAccount {
  email: ?string;
  constructor(email?: string) {
    this.email = email
  }
}

function init(app: Sunshine.App<State.AppState>) {
  app.on(NewAccount, (state, { email }) => {
    indicateLoading('Authorizing with Google', setupGoogle(email))
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

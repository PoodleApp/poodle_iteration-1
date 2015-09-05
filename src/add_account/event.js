/* @flow */

import * as Sunshine from 'sunshine-framework'
import * as State    from '../state'
import * as AS       from './state'

class NewAccount {
  email: ?string;
  constructor(email?: string) {
    this.email = email
  }
}

function init(app: Sunshine.App<State.AppState>) {
  app.on(NewAccount, (state, { email }) => {

  })
}

export {
  NewAccount,
  init,
}

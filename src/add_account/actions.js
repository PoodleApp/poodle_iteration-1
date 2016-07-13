/* @flow */

export type Action = {
  type: 'add_account/newAccount',
  email: ?string,
}

function newAccount(email: ?string): Action {
  return {
    type: 'add_account/newAccount',
    email,
  }
}

export {
  newAccount,
}

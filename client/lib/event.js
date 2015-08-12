/* @flow */

import * as Sunshine    from 'sunshine'
import { set }          from 'lens'
import { greetingLens } from './state'

import type { AppState } from './state'

export class GreetingChange {
  greeting: string;
  constructor(greeting: string) {
    this.greeting = greeting
  }
}

export function init(app: Sunshine.App<AppState>) {
  app.on(GreetingChange, (state, { greeting }) => {
    return set(greetingLens, greeting, state)
  })
}

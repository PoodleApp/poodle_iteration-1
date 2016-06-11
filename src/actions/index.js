/* @flow */

import type { Action as AddAccountAction } from '../add_account/actions'
import type { Action as ChromeAction }     from './chrome'

export type Action = AddAccountAction | ChromeAction

export * from '../add_account/actions'
export * from './chrome'

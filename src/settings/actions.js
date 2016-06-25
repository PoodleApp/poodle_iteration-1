/* @flow */

import type { Config } from '../config'

export type Action =
  | { type: 'gotConfig',  config: Config }
  | { type: 'loadConfig' }
  | { type: 'saveConfig', config: Config }

export function gotConfig(config: Config): Action {
  return {
    type: 'gotConfig',
    config,
  }
}

export function loadConfig(): Action {
  return { type: 'loadConfig' }
}

export function saveConfig(config: Config): Action {
  return {
    type:   'saveConfig',
    config,
  }
}

/* @flow */

import type { Observable } from 'kefir'

export {
  hasEnded,
}

function hasEnded(obs: Observable): boolean {
  let ended = false
  const cb = () => (ended = true)
  obs.onEnd(cb)
  obs.offEnd(cb)
  return ended
}

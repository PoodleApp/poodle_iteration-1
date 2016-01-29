/* @flow */

import type { Observable } from 'kefir'

export {
  hasEnded,
}

function hasEnded<A>(obs: Observable<A>): boolean {
  let ended = false
  const cb = () => (ended = true)
  obs.onEnd(cb)
  obs.offEnd(cb)
  return ended
}

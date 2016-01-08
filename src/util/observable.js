/* @flow */

import type { Observable } from 'kefir'

function reduceObservable<A,B>(reducer: (reduction: B, value: A) => B, initial: B, obs: Observable<A>): Promise<B> {
  let reduction = initial
  let error = null
  obs.onValue(v => {
    reduction = reducer(reduction, v)
  })
  obs.onError(e => error = e)
  return new Promise((resolve, reject) => {
    obs.onEnd(() => {
      if (error) {
        reject(error)
      }
      else {
        resolve(reduction)
      }
    })
  })
}

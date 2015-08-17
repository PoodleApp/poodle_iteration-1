/* @flow */

import { activityId, resolveUri } from './activity'

import type { Activity, Zack } from './activity'
import type { Message }        from './notmuch'

export {
  derive,
}

export type DerivedActivity = {
  orig:    Activity,
  message: Message,
  likes:   number,
}

function derive(activities: Zack[]): DerivedActivity[] {
  return activities.reduce(deriveAct(activities), [])
}

function deriveAct(activities: Zack[]): (ds: DerivedActivity[], activity: Zack) => DerivedActivity[] {
  return (ds, activity) => {
    var thisId     = activityId(activity)
    var [act, msg] = activity
    var likes      = activities.reduce((count, [otherAct, otherMsg]) => {
      var uri = otherAct.target ? otherAct.target.uri : null
      if (otherAct.verb === 'like' && uri) {
        var uri = resolveUri(otherMsg, uri)
        if (uri === thisId) {
          return count + 1
        }
      }
      return count
    })

    if (act.verb === 'like') {
      return ds  // likes are not directly visible
    }
    else {
      ds.push({
        orig:    act,
        message: msg,
        likes,
      })
      return ds
    }
  }
}

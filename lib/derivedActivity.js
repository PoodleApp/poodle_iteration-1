/* @flow */

import { uniqBy }                        from 'ramda'
import { activityId, actor, resolveUri } from './activity'

import type { Activity, ActivityObject, Zack } from './activity'
import type { Message }                        from './notmuch'

export {
  derive,
  likes,
  likeCount,
}

export type DerivedActivity = Activity & {
  orig:  Activity,
  likes: ActivityObject[],
}

export type DerivedZack = [DerivedActivity, Message]

function derive(activities: Zack[]): DerivedZack[] {
  return activities.reduce(deriveAct(activities), [])
}

function deriveAct(activities: Zack[]): (ds: DerivedZack[], activity: Zack) => DerivedZack[] {
  return (ds, activity) => {
    var thisId     = activityId(activity)
    var [act, msg] = activity
    var likes      = activities.reduce((ppl, [otherAct, otherMsg]) => {
      var uri = otherAct.target ? otherAct.target.uri : null
      if (otherAct.verb === 'like' && uri) {
        var uri = resolveUri(otherMsg, uri)
        if (uri === thisId) {
          ppl.push(actor([otherAct, otherMsg]))
          return ppl
        }
      }
      return ppl
    }, [])

    if (act.verb === 'like') {
      return ds  // likes are not directly visible
    }
    else {
      ds.push([Object.assign(({
        orig: act,
        likes: uniqBy(l => l.id, likes),
      }: any), act), msg])
      return ds
    }
  }
}

function likes([act, _]: DerivedZack): ActivityObject[] {
  return act.likes
}

function likeCount([act, _]: DerivedZack): number {
  return act.likes.length
}

/* @flow */

import * as Sunshine   from 'sunshine/react'
import React           from 'react'
import { displayName } from '../notmuch'
import { Avatar
       } from 'material-ui'

import type { Address } from '../notmuch'
import type { ActivityObject } from '../activity'

export {
  actorAvatar,
  addressAvatar,
}

function actorAvatar(p: ActivityObject): React.Element {
  var str = (p.displayName || '?')[0].toUpperCase()
  return <Avatar>{str}</Avatar>
}

function addressAvatar(p: Address): React.Element {
  var str = (displayName(p) || '?')[0].toUpperCase()
  return <Avatar>{str}</Avatar>
}

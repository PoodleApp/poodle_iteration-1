/* @flow */

import * as Sunshine  from 'sunshine/react'
import React          from 'react'
import { activityId } from '../derivedActivity'
import * as CE        from '../composer/event'
import { AppBar
       , IconButton
       , IconMenu
       , Styles
       } from 'material-ui'
import MenuItem     from 'material-ui/lib/menus/menu-item'
import MoreVertIcon from 'material-ui/lib/svg-icons/navigation/more-vert'

import type { DerivedActivity } from '../derivedActivity'
import type { Conversation }    from '../conversation'

type ActivityProps = {
  activity:     DerivedActivity,
  conversation: Conversation,
  editing:      ?DerivedActivity,
  loading:      boolean,
  username:     string,
  useremail:    string,
}

var { Colors } = Styles

export class MyContentOptsMenu extends Sunshine.Component<{},ActivityProps,{}> {
  render() {
    return (
      <IconMenu
        iconButtonElement={
          <IconButton>
            <MoreVertIcon color={Colors.grey400} />
          </IconButton>
        }
        onItemTouchTap={this.onMenuAction.bind(this)}
        {...this.props}
        >
        <MenuItem
          value='edit'
          primaryText='Edit'
          checked={this.editingThis()}
          style={{ boxSizing: 'content-box' }}
          />
      </IconMenu>
    )
  }

  onMenuAction(event: Event, item: React.Element) {
    var { activity } = this.props
    if (item.props.value === 'edit') {
      if (this.editingThis()) {
        this.emit(new CE.Reset())
      }
      else {
        this.emit(new CE.Edit(activity))
      }
    }
  }

  editingThis(): boolean {
    var { activity, editing } = this.props
    return editing && activityId(editing) === activityId(activity)
  }
}

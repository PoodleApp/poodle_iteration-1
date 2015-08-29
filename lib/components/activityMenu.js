/* @flow */

import * as Sunshine  from 'sunshine/react'
import React          from 'react'
import { mailtoUri }  from '../activity'
import * as Act       from '../derivedActivity'
import * as Ev        from '../event'
import * as CE        from '../composer/event'
import { AppBar
       , IconButton
       , IconMenu
       , List as ListWidget
       , ListItem
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

export class ActivityOptsMenu extends Sunshine.Component<{},ActivityProps,{}> {
  render() {
    var { activity, useremail } = this.props

    var edit =
      <MenuItem
        value='edit'
        primaryText='Edit'
        checked={this.editingThis()}
        style={{ boxSizing: 'content-box' }}
        disabled={!myContent(activity, useremail)}
        />

    var link =
      <MenuItem
        value='link'
        primaryText='Permalink'
        style={{ boxSizing: 'content-box' }}
        />

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
        {edit}
        {link}
      </IconMenu>
    )
  }

  onMenuAction(event: Event, item: React.Element) {
    var { activity } = this.props
    var { value } = item.props
    if (value === 'edit') {
      if (this.editingThis()) {
        this.emit(new CE.Reset())
      }
      else {
        this.emit(new CE.Edit(activity))
      }
    }
    else if (value === 'link') {
      this.emit(new Ev.ShowLink(activity))
    }
  }

  editingThis(): boolean {
    var { activity, editing } = this.props
    return editing && Act.activityId(editing) === Act.activityId(activity)
  }
}

export class ActivityActions extends Sunshine.Component<{},ActivityProps,{}> {
  render() {
    var { activity, useremail } = this.props
    return (
      <ListWidget subheader='Actions'>
        <ListItem
          primaryText='Edit'
          onTouchTap={this.onEdit.bind(this)}
          />
        <ListItem
          primaryText='Permalink'
          onTouchTap={this.onShowLink.bind(this)}
          />
        <ListItem
          primaryText='View revisions'
          />
      </ListWidget>
    )
  }

  onEdit() {
    var { activity } = this.props
    if (this.editingThis()) {
      this.emit(new CE.Reset())
    }
    else {
      this.emit(new CE.Edit(activity))
    }
  }

  onShowLink() {
    var { activity } = this.props
    this.emit(new Ev.ShowLink(activity))
  }

  editingThis(): boolean {
    var { activity, editing } = this.props
    return editing && Act.activityId(editing) === Act.activityId(activity)
  }
}

function myContent(activity: DerivedActivity, email: string): boolean {
  var me   = mailtoUri(email)
  var them = Act.actor(activity)
  return !!them && (them.uri === me)
}

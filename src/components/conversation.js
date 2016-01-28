/* @flow */

import * as Sunshine    from 'sunshine-framework/react'
import React            from 'react'
import { List }         from 'immutable'
import { get, lookup }  from 'safety-lens'
import { mailtoUri }    from '../activity'
import * as Act         from '../derivedActivity'
import { allNames, flatAsides, flatParticipants, lastActive } from '../conversation'
import { displayName }     from '../models/address'
import * as State          from '../state'
import * as Ev             from '../event'
import { activityStream }  from '../stream'
import { ActivityView }    from './activities'
import { ActivityHeader }  from './activityHeaders'
import { ComposeReply }    from './compose'
import { addressAvatar }   from './avatar'
import { ActivityActions } from './activityMenu'
import { Card
       , CardHeader
       , RaisedButton
       , List as ListWidget
       , ListDivider
       , ListItem
       , Paper
       , Styles
       , TextField
       , Toolbar
       , ToolbarGroup
       , ToolbarTitle
       } from 'material-ui'

import type { Address }         from '../models/address'
import type { Activity, URI }   from '../activity'
import type { Conversation }    from '../conversation'
import type { DerivedActivity } from '../derivedActivity'

type ConversationsState = {
  conversations: List<Conversation>,
  loading: boolean,
  searchQuery: ?string,
  username: ?string,
  useremail: ?string,
}

var { Colors, Spacing } = Styles

export class Conversations extends Sunshine.Component<{},{},ConversationsState> {
  getState(state: State.AppState): ConversationsState {
    return {
      conversations: lookup(State.conversations, state) || List(),
      loading:       get(State.isLoading, state),
      searchQuery:   lookup(State.routeParam('q'), state),
      username:      lookup(State.username, state),
      useremail:     lookup(State.useremail, state),
    }
  }

  render(): React.Element {
    var { conversations, useremail } = this.state
    var user = useremail ? mailtoUri(useremail) : null
    var activities = activityStream(user, conversations)
    var headers = activities.map(([acts, conv], i) => (
      <div key={acts.map(Act.activityId).join(';')}>
        <ActivityHeader activities={acts} conversation={conv} user={user} />
        {i < activities.size - 1 ?
          <ListDivider inset={true} /> : ''}
      </div>
    ))
    return (
      <div>
        <Toolbar>
          <ToolbarGroup key={0} float='left'>
            <form onSubmit={this.onSearch.bind(this)}>
              <label>
              <ToolbarTitle text='Enter notmuch query'/>
              <TextField
                hintText='date:2days..'
                defaultValue={this.state.searchQuery || 'date:2days..'}
                ref='query'
                />
              </label>
              &nbsp;
              <RaisedButton label='Search' disabled={this.state.loading} onTouchTap={this.onSearch.bind(this)} />
            </form>
          </ToolbarGroup>
        </Toolbar>
        <ListWidget>{headers}</ListWidget>
      </div>
    )
  }

  onSearch(event: Event) {
    event.preventDefault()
    window.location = `#/?q=${encodeURIComponent(this.refs.query.getValue())}`
  }
}

export class ConversationView extends Sunshine.Component<{},{ conversation: ?Conversation },{}> {
  getStyles(): Object {
    const participantListWidth = Spacing.desktopKeylineIncrement * 4 + 'px'
    const { palette } = (this.context: any).muiTheme.rawTheme
    const styles = {
      body: {
        padding: '16px',
        paddingTop: 0,
        whiteSpace: 'pre-wrap',
      },
      mainSection: {
        marginRight: participantListWidth,
      },
      participantList: {
        position: 'absolute',
        top: '88px',
        right: 0,
        width: participantListWidth,
        borderLeft: 'solid 1px '+ palette.borderColor,
      },
    }
    return styles
  }

  render(): React.Element {
    var conversation = this.props.conversation
    if (!conversation) {
      return <p>not found</p>
    }

    var styles = this.getStyles()
    var { subject } = conversation

    var activities = conversation.activities.map(act => (
      <ActivityView activity={act} {...this.props} key={Act.activityId(act)} />
    ))

    var people = flatParticipants(conversation).map(addr => {
      var disp = displayName(addr)
      return (
        <ListItem
          leftAvatar={addressAvatar(addr)}
          primaryText={disp}
          secondaryText={addr.address}
          disabled={true}
          key={addr.address}
          />
      )
    })

    var doc = getDocument(conversation)

    return (
      <div>
        <div style={styles.mainSection}>
          <br/>
          {activities}
          <ComposeReply inReplyTo={conversation} />
        </div>
        <div style={styles.participantList}>
          {doc ? <ActivityActions activity={doc} {...this.props} /> : ''}
          <ListWidget subheader='Who can see this discussion'>
            {people}
          </ListWidget>
        </div>
      </div>
    )
  }
}

ConversationView.contextTypes = {
  _sunshineApp: React.PropTypes.instanceOf(Sunshine.App).isRequired,
  muiTheme: React.PropTypes.object.isRequired,
}

function getDocument(conv: Conversation): ?DerivedActivity {
  var act = conv.activities.first()
  if (Act.objectType(act) === 'document') { return act }
}

/* @flow */

import * as Sunshine    from 'sunshine-framework/react'
import React            from 'react'
import * as m           from 'mori'
import { get, lookup }  from 'safety-lens'
import { mailtoUri }    from '../activity'
import * as Act         from '../derivedActivity'
import { allNames, flatAsides, flatParticipants, lastActive } from '../conversation'
import { displayName }     from '../models/address'
import * as State          from '../state'
import * as Ev             from '../event'
import * as ViewEvent      from '../event/viewEvent'
import { activityStream }  from '../stream'
import { join }            from '../util/mori'
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

import type { Seqable }         from 'mori'
import type { Address }         from '../models/address'
import type { Activity, URI }   from '../activity'
import type { Conversation }    from '../conversation'
import type { DerivedActivity } from '../derivedActivity'

type ConversationsState = {
  conversations: ?Seqable<Conversation>,
  loading: boolean,
  searchQuery: ?string,
  username: ?string,
  useremail: ?string,
}

const { Colors, Spacing } = Styles

export class Conversations extends Sunshine.Component<{},{},ConversationsState> {
  getState(state: State.AppState): ConversationsState {
    const conversations = lookup(State.conversations, state)
    return {
      conversations,
      loading:       !conversations,
      searchQuery:   lookup(State.routeParam('q'), state),
      username:      lookup(State.username, state),
      useremail:     lookup(State.useremail, state),
    }
  }

  render(): React.Element {
    const { conversations, useremail } = this.state
    const user = useremail ? mailtoUri(useremail) : null
    const activities = conversations ? activityStream(user, conversations) : m.vector()
    const activityCount = m.count(activities)
    const headers = m.intoArray(m.mapIndexed((i, [acts, conv]) => (
      <div key={join(';', m.map(Act.activityId, acts))}>
        <ActivityHeader activities={acts} conversation={conv} user={user} />
        {i < activityCount - 1 ?
          <ListDivider inset={true} /> : ''}
      </div>
    ), activities))
    return (
      <div>
        <Toolbar>
          <ToolbarGroup key={0} float='left'>
            <form onSubmit={this.onSearch.bind(this)}>
              <label>
              <ToolbarTitle text='Enter query'/>
              <TextField
                hintText='newer_than:1d'
                defaultValue={this.state.searchQuery || 'newer_than:1d'}
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
    const q = this.refs.query.getValue()
    this.emit(new ViewEvent.ViewRoot(q))
  }
}

type ConversationViewProps = {
  conversation: ?Conversation,
  editing:      ?DerivedActivity,
  loading:      boolean,
  username:     string,
  useremail:    string,
}

export class ConversationView extends Sunshine.Component<void,ConversationViewProps,{}> {
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
    const conversation = this.props.conversation
    if (!conversation) {
      return <p>Loading...</p>
    }

    const styles = this.getStyles()
    const { subject } = conversation

    const activities = m.map(act => (
      <ActivityView
        activity={act}
        conversation={conversation}
        editing={this.props.editing}
        loading={this.props.loading}
        username={this.props.username}
        useremail={this.props.useremail}
        key={Act.activityId(act)}
        />
    )
    , conversation.activities)

    const people = m.map(addr => {
      const disp = displayName(addr)
      return (
        <ListItem
          leftAvatar={addressAvatar(addr)}
          primaryText={disp}
          secondaryText={addr.address}
          disabled={true}
          key={addr.address}
          />
      )
    }
    , flatParticipants(conversation))

    const doc = getDocument(conversation)

    return (
      <div>
        <div style={styles.mainSection}>
          <br/>
          {activities}
          <ComposeReply inReplyTo={conversation} />
        </div>
        <div style={styles.participantList}>
          {doc ? <ActivityActions
                   activity={doc}
                   editing={this.props.editing}
                   loading={this.props.loading}
                   username={this.props.username}
                   useremail={this.props.useremail}
                   conversation={conversation}
                   /> : ''}
          <ListWidget subheader='Who can see this discussion'>
            {people}
          </ListWidget>
        </div>
      </div>
    )
  }
}

ConversationView.contextTypes = {
  _sunshineApp: React.PropTypes.instanceOf(Sunshine.Session).isRequired,
  muiTheme: React.PropTypes.object.isRequired,
}

function getDocument(conv: Conversation): ?DerivedActivity {
  const act = m.first(conv.activities)
  if (act && Act.objectType(act) === 'document') { return act }
}

Poodle
======

Experimental email client with social features

Poodle produces and consume messages that contained structured JSON data. This
enables rich features that email normally lacks, such as likes, and editing
messages after they have been sent.


Prerequisites
-------------

Poodle reads and composes messages. Currently it relies on external programs to
actually fetch and send messages. Because of these dependencies, Poodle works
well on Linux and OS X, but is not likely to work on Windows.

You will need three additional pieces of software:

- Something to download email to the local filesystem. Must use Maildir format.
The author uses [offlineimap][]. There is another option called isync/mbsync.

- [notmuch][], which indexes mail stored in Maildir format.

- msmtp to send mail

It is handy to have offlineimap (or equivalent) running in the background all
the time. Notmuch does not run in the background - but you do need to run `$
notmuch new` whenever you get new mail to add the new messages to the index.
You can run that manually, or get offlineimap to run it whenever it syncs
changes.

All of these programs are probably available in your favorite package manager.

A good source of information for configuration is the Arch Wiki:

- https://wiki.archlinux.org/index.php/OfflineIMAP
- https://wiki.archlinux.org/index.php/Notmuch
- https://wiki.archlinux.org/index.php/Msmtp

[offlineimap]: https://github.com/OfflineIMAP/offlineimap/blob/master/README.md
[notmuch]: http://notmuchmail.org/

To build Poodle you will also need [Node.js and npm][npm].

[npm]: https://docs.npmjs.com/getting-started/installing-node


Detailed setup guide for OS X
-----------------------------

(This guide is a work-in-progress)

pre-reqs: git, homebrew, node.js

* Clone Git repo: `git clone git@github.com:hallettj/poodle.git`
* `cd poodle && npm install`
* `brew install offlineimap`
* `brew install notmuch`
* `mkdir -P ~/mail/personal`
* `touch ~/.offlineimaprc`
* edit `~/.offlineimaprc` to look like this:

```
[general]
accounts = personal
ui = ttyui

[Account personal]
localrepository = personal-local
remoterepository = personal-remote
status_backend = sqlite

[Repository personal-local]
type = Maildir
localfolders = ~/mail/personal
# Spaces in pathname are bad. Lets use `archive` which is a simple word
# Besides, we only need `All Mail` folder.
# Sup would manage mails on its own.
# If your GMail language setting is not English, you can execute
# `offlineimap --info` to find out the name of folder which is
# translated and encoded after your account is configured.
nametrans = lambda folder: {'archive': '[Gmail]/All Mail',
                            }.get(folder, folder)

[Repository personal-remote]
# IMAP with hardcoded GMail config
type = Gmail
# The path of ca-certfile might be different on your system.
sslcacertfile = /usr/local/etc/openssl/cert.pem
# Remember that GMail requires full mail address as username
remoteuser = YOUR-EMAIL@gmail.com
remotepass = YOUR-PASSWORD
nametrans = lambda folder: {'[Gmail]/All Mail': 'archive',
                            }.get(folder, folder)
folderfilter = lambda folder: folder == '[Gmail]/All Mail'
# Or, if you have a lot of mail and don't want to wait for a long time before
# using sup, you can archive all your old mails on Gmail and only sync the
# inbox with the following line replacing the previous `folderfilter` line:
# folderfilter = lambda folder: folder == 'INBOX'
```

Note: If you have 2-factor auth for gmail enabled, you will need to create an "App-Specific Password." You can set those up here.

* Run `offlineimap`. If it is configured correctly, you should see:

```
$ offlineimap
OfflineIMAP 6.5.7
  Licensed under the GNU GPL v2 or any later version (with an OpenSSL exception)
Account sync personal:
 *** Processing account personal
 Establishing connection to imap.gmail.com:993
 Creating folder archive[personal-local]
 Creating new Local Status db for personal-local:archive
Folder archive [remote name [Gmail]/All Mail] [acc: personal]:
 Syncing [Gmail]/All Mail: Gmail -> Maildir
 Copy message 1 (1 of 127831) personal-remote:[Gmail]/All Mail -> personal-local
 Copy message 2 (2 of 127831) personal-remote:[Gmail]/All Mail -> personal-local
 Copy message 3 (3 of 127831) personal-remote:[Gmail]/All Mail -> personal-local
 ...etc
```

* Create ~/.notmuch-config file: `touch ~/.notmuch-config`
* Edit ~/.notmuch-config to look like this:

```
[database]
path=/Users/HOMEDIR/mail
[user]
name=YOUR-NAME
primary_email=YOUR-EMAIL
[new]
tags=unread;inbox;
ignore=
[search]
exclude_tags=deleted;spam;
[maildir]
synchronize_flags=true
```
* Run `$ notmuch new`


Running
-------

From the project directory, run:

    $ npm install && npm start


Configuring
-----------

In addition to configuring the external utilities,
you will need to enter some details in the Settings view
(accessed via the menu button in the upper-left of the Activity Stream view).
The somewhat complicated detail here is that you need to specify a directory
for sent mail that is an existing directory in your maildir.
That is, it needs to match up with an existing IMAP folder.

The sent mail directory setting is not required.
But if you do not set it, when you send messages you will not see updates in
the UI until you do a mail fetch and reload the UI.


License
-------

Copyright 2015 Jesse Hallett

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

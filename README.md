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


Running
-------

From the project directory, run:

    $ npm install && npm start


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

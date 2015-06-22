Wall
====

An interactive display built on web technology.

We use it as jukebox device in our kitchen. People can push content
(youtube-videos, urls, etc) to the display with their mobile devices
or control the MPD (http://mpd.wikia.com/wiki/Music_Player_Daemon_Wiki)
on the device.

It consist of a python server (built upon tornado) that talks to the display,
a browser in fullscreen/kiosk mode, and the clients (browser on your mobile),
via websockets.

Setup
-----

Wall requires:

* Python >= 2.6
* Tornado >= 2.3
* Redis >= 2.4
* redis-py >= 2.4

Run Wall with:

    python walld.py <config_file>

 * config_file: path to a config file (optional). Documentation is available in
   the default config file (`wall/res/default.cfg`).

## Platform Support

The Wall server should work on any [POSIX](https://en.wikipedia.org/wiki/POSIX) system.

## Browser Support

The Wall clients support the latest version of popular browsers (i.e. Chrome,
Firefox, Internet Explorer and Safari; see http://caniuse.com/ ).

Built With
----------

 * Python (2.6) by Python Software Foundation - https://python.org/
 * Tornado (2.3) by Facebook - http://www.tornadoweb.org/en/stable/
 * Redis (2.4) by Salvatore Sanfilippo - http://redis.io/
 * redis-py (2.4) by Andy McCurdy - https://github.com/andymccurdy/redis-py
 * websocket-client (0.12) by Hiroki Ohtani -
   https://github.com/liris/websocket-client
 * ES6-Promise (2.0) by Yehuda Katz, Tom Dale, Stefan Penner and contributors -
   https://github.com/jakearchibald/es6-promise
 * HTML Imports (0.5) by The Polymer Project Authors -
   https://www.polymer-project.org/platform/html-imports.html
 * jQuery (2.1) by jQuery Foundation and other contributors -
   https://jquery.com/
 * Open Sans (2014-28-01) by Google - http://opensans.com/
 * Font Awesome (4.1) by Dave Gandy - http://fontawesome.io/
 * normalize.css (2.1) by Nicolas Gallagher, Jonathan Neal -
   https://necolas.github.io/normalize.css/

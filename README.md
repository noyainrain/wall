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

 * Python   >= 2.6
 * Tornado  >= 2.3
 * Redis    >= 2.4
 * redis-py >= 2.4

Run Wall with:

    ./wall.py <config_file>

 * config_file: path to a config file (optional). Documentation is available in
   the default config file (`wall/res/default.cfg`).

Bricks (aka Plugins)
--------------------

If you want to create a brick, have a look at wall/url for reference.

At the moment there exists bricks for:

 * YouTube
 * URLs
 * MPD
 * Volume-control


Browser support
---------------

* **Display:** Mozilla Firefox 11+, Google Chrome 16+, Opera 12.10+, Internet Explorer 10+, Safari 6+
* **Client:** Mozilla Firefox for Android 11+, Google Chrome 16+, Opera Mobile 12.10+, Safari Mobile 6.0

**Note:** The Android stock browser is not supported, because it lacks support of websockets.

Testing
-------

To run the test cases, simply type:

    python -m unittest -v wall wall.util wall.bricks.url

Software Used
-------------

* normalize.css - https://github.com/necolas/normalize.css
* Clarity Icons - https://github.com/jcubic/Clarity
* jQuery Tubeplayer Plugin - https://github.com/nirvanatikku/jQuery-TubePlayer-Plugin

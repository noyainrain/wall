Wall
====

Digital wall (display) that can be controlled remotely, for example via mobile
or tablet.

Setup
-----

Wall requires:

 * Python  >= 2.6
 * Tornado >= 2.3

Run Wall with:

    ./wall.py <config_file>

 * config_path: path to a config file (optional). Documentation is available in
   the default config file (`wall/res/default.cfg`).

Bricks (aka Plugins)
--------------------

If you want to create a brick, have a look at wall/url for reference.

Testing
-------

To run the test cases, simply type:

    python -m unittest wall

Software Used
-------------

normalize.css - https://github.com/necolas/normalize.css
Clarity Icons - https://github.com/jcubic/Clarity

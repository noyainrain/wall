#!/usr/bin/env python2

# Wall

# Python forward compatibility
from __future__ import (division, absolute_import, print_function,
    unicode_literals)

import sys
import signal
import wall
from wall import WallApp


def signal_handler(signal, frame):
    print('Server shutdown requested by user...')
    # TODO: maybe do more stuff? e.g. message display, proper closing of connections
    sys.exit(0)

if __name__ == '__main__':
    # TODO: use option instead
    config_path = sys.argv[1] if len(sys.argv) >= 2 else None
    print('Wall #{}'.format(wall.release))
    print('display: http://localhost:8080/display')
    print('client:  http://localhost:8080/')

    signal.signal(signal.SIGINT, signal_handler)
    print('Press Ctrl+C to quit the wall server.')

    WallApp(config_path=config_path).run()

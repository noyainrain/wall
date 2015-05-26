#!/usr/bin/env python2

# Wall

"""Wall server."""

# Python forward compatibility
from __future__ import (division, absolute_import, print_function,
                        unicode_literals)

import sys
import logging
import wall
from logging import StreamHandler, Formatter
from wall import WallApp

def main(args):
    """Run the Wall server."""
    # TODO: use option instead
    config_path = args[1] if len(args) >= 2 else None

    logger = logging.getLogger()
    logger.setLevel(logging.DEBUG)
    handler = StreamHandler()
    handler.setFormatter(
        Formatter('%(asctime)s %(levelname)s %(name)s: %(message)s'))
    logger.addHandler(handler)

    print('Wall #{}'.format(wall.release))
    print('display: http://localhost:8080/display')
    print('client:  http://localhost:8080/')
    WallApp(config_path=config_path).run()
    return 0

if __name__ == '__main__':
    sys.exit(main(sys.argv))

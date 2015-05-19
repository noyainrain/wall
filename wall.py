#!/usr/bin/env python2

# Wall

"""Wall server."""

# Python forward compatibility
from __future__ import (division, absolute_import, print_function,
                        unicode_literals)

import sys
import wall
from wall import WallApp

def main(args):
    """Run the Wall server."""
    # TODO: use option instead
    config_path = args[1] if len(args) >= 2 else None
    print('Wall #{}'.format(wall.release))
    print('display: http://localhost:8080/display')
    print('client:  http://localhost:8080/')
    WallApp(config_path=config_path).run()
    return 0

if __name__ == '__main__':
    sys.exit(main(sys.argv))

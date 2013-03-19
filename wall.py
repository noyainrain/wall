#!/usr/bin/python

# Wall

# Python forward compatibility
from __future__ import (division, absolute_import, print_function,
    unicode_literals)

from wall import WallApp

if __name__ == '__main__':
    print('display: http://localhost:8080/display/')
    print('client:  http://localhost:8080/')
    WallApp().run()

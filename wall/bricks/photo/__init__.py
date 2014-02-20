# Wall

# Python forward compatibility
from __future__ import (division, absolute_import, print_function,
    unicode_literals)

from wall import Brick

class PhotoBrick(Brick):
    id = 'photo'
    maintainer = 'Sven James <sven.jms AT gmail.com>'

Brick = PhotoBrick

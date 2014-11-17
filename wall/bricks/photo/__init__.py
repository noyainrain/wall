# Wall

# Python forward compatibility
from __future__ import (division, absolute_import, print_function,
    unicode_literals)

from wall import Brick

maintainer = 'Sven James <sven.jms AT gmail.com>'

class PhotoBrick(Brick):
    id = 'photo'

Brick = PhotoBrick

# Wall

# Python forward compatibility
from __future__ import (division, absolute_import, print_function,
    unicode_literals)

from wall import Brick as _Brick, randstr

import mpdclient2

# TODO: port to new brick architecture

class Brick(_Brick):
    id = 'mpc'
    maintainer = 'Thomas Karmann <thomas AT krmnn.de>'
    js_module = 'wall.mpc'
    post_type = 'MpcPost'


    def post_new(self, type, **args):

        m = mpdclient2.connect()
        if not m:
            return MpcPost(randstr(), "offline", m.currentsong())

        return MpcPost(randstr(), "online", m.currentsong())

class MpcPost(object):
    def __init__(self, id, status, currentsong):
        self.id       = id
        self.status   = status
        self.currentsong = currentsong
        self.__type__ = type(self).__name__

# Wall

# Python forward compatibility
from __future__ import (division, absolute_import, print_function,
    unicode_literals)

from wall import Brick as _Brick, randstr

class Brick(_Brick):
    id        = 'tagesschau'
    js_module = 'wall.tagesschau'
    post_type = 'TagesschauPost'

    def post_new(self, type, **args):
        return TagesschauPost(randstr())

class TagesschauPost(object):
    def __init__(self, id):
        self.id       = id
        self.__type__ = type(self).__name__

# Wall

# Python forward compatibility
from __future__ import (division, absolute_import, print_function,
    unicode_literals)

from wall import Brick as _Brick, randstr

# TODO: deprecated. Use starred posts instead, once available.

class Brick(_Brick):
    id = 'omfgdogs'
    maintainer = 'Philip Taffner <philip.taffner AT bluegfx.de>'
    js_module = 'wall.omfgdogs'
    post_type = 'OmfgDogsPost'

    def post_new(self, type, **args):
        return OmfgDogsPost(randstr())

class OmfgDogsPost(object):
    def __init__(self, id):
        self.id       = id
        self.__type__ = type(self).__name__

# Wall

# Python forward compatibility
from __future__ import (division, absolute_import, print_function,
    unicode_literals)

from wall import Brick as _Brick, randstr

class Brick(_Brick):
    id = 'photo'
    maintainer = 'Sven James <sven.jms AT gmail.com>'
    post_type = 'ImagePost'
    
    def post_new(self, type, **args):
        return ImagePost(randstr(), args['url'])

class ImagePost(object):
    # TODO: move ImagePost to core on new brick architecture
    def __init__(self, id, url):
        self.id = id
        self.url = url
        self.__type__ = type(self).__name__

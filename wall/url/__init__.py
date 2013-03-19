# Wall

# Python forward compatibility
from __future__ import (division, absolute_import, print_function,
    unicode_literals)

from wall import Brick as _Brick, randstr

class Brick(_Brick):
    id        = 'url'
    js_module = 'wall.url'
    post_type = 'UrlPost'

    def post_new(self, type, **args):
        url = args['url'].strip()
        if not url:
            raise ValueError('url')
        if not url.startswith(('http://', 'https://')):
            url = 'http://' + url
        return UrlPost(randstr(), url)

class UrlPost(object):
    def __init__(self, id, url):
        self.id       = id
        self.url      = url
        self.__type__ = type(self).__name__

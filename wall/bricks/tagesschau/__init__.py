# Wall

# Python forward compatibility
from __future__ import (division, absolute_import, print_function,
    unicode_literals)

from wall import Brick as _Brick, randstr

import feedparser

# TODO: port to new brick architecture. Use VideoPost, once available.

class Brick(_Brick):
    id = 'tagesschau'
    maintainer = 'Thomas Karmann <thomas AT krmnn.de>'
    js_module = 'wall.tagesschau'
    post_type = 'TagesschauPost'

    def post_new(self, type, **args):
        status = ""
        url = ""

        ts_mpg4_960x544_url = 'http://www.tagesschau.de/export/video-podcast/webl/tagesschau'
        feed = feedparser.parse(ts_mpg4_960x544_url)

        latest_broadcast = feed["items"][0]
        video_url = latest_broadcast["links"][0]["href"] 

        return TagesschauPost(randstr(), status, video_url)

class TagesschauPost(object):
    def __init__(self, id, status, url):
        self.id       = id
        self.status = status
        self.url   = url
        self.__type__ = type(self).__name__

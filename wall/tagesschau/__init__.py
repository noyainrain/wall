# Wall

# Python forward compatibility
from __future__ import (division, absolute_import, print_function,
    unicode_literals)

from wall import Brick as _Brick, randstr

import json, urllib2

class Brick(_Brick):
    id        = 'tagesschau'
    js_module = 'wall.tagesschau'
    post_type = 'TagesschauPost'

    def post_new(self, type, **args):
        status = ""
        url = ""

        try:
            tagesschau_str = urllib2.urlopen("http://www.tagesschau.de/api/multimedia/sendung/letztesendungen100~_type-TS.json").read()
        except urllib2.URLError as e:
            status = str(e.reason)
        else:
            tagesschau_json = json.loads(tagesschau_str)
            url = tagesschau_json['latestBroadcastsPerType'][0]['detailsWeb']

        return TagesschauPost(randstr(), status,  url)

class TagesschauPost(object):
    def __init__(self, id, status, url):
        self.id       = id
        self.status = status
        self.url   = url
        self.__type__ = type(self).__name__

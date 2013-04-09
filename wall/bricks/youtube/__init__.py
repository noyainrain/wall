# Wall

# Python forward compatibility
from __future__ import (division, absolute_import, print_function,
    unicode_literals)

import json
from wall import Brick as _Brick, randstr, Message
from urllib import urlencode
from tornado.httpclient import AsyncHTTPClient

class Brick(_Brick):
    id        = 'youtube'
    js_module = 'wall.youtube'
    post_type = 'YoutubePost'
    
    def __init__(self, app):
        super(Brick, self).__init__(app)
        self.app.msg_handlers['url.search'] = self._search_msg

    def post_new(self, type, **args):
        url = args['url'].strip()
        title = args['title'].strip()
        if not url:
            raise ValueError('url')
        if not url.startswith(('http://', 'https://')):
            url = 'http://' + url
        if not title:
            title = 'No title'

        return YoutubePost(randstr(), url, title)
    
    def search(self, query, callback):
        def cb(response):
            # TODO: check response for errors
            
            data = json.load(response.buffer)
            entries = data['feed']['entry']
            
            results = []
            for entry in entries:
                meta = entry['media$group']
                
                # get default video URL and enable autoplay
                video = filter(lambda v: 'isDefault' in v,
                    meta['media$content'])[0]
                video = video['url'] + '&autoplay=1'
                # alternative: video = meta['media$player']['url']
                
                thumbnail = filter(lambda t: t['yt$name'] == 'default',
                    meta['media$thumbnail'])[0]
                thumbnail = thumbnail['url']
                
                results.append({
                    'title':     meta['media$title']['$t'],
                    'url':       video,
                    'thumbnail': thumbnail,
                    'provider':  'Youtube'
                })
            
            callback(results)
        
        # Youtube API documentation:
        # https://developers.google.com/youtube/2.0/developers_guide_protocol
        client = AsyncHTTPClient()
        qs = urlencode({
            'q':           query,
            'max-results': '5',
            'alt':         'json',
            'v':           '2'
        })
        client.fetch('https://gdata.youtube.com/feeds/api/videos/?' + qs, cb)
    
    def _search_msg(self, msg):
        def cb(results):
            msg.frm.send(Message(msg.type, results))
        self.search(msg.data['query'], cb)

class YoutubePost(object):
    def __init__(self, id, url, title):
        self.id       = id
        self.url      = url
        self.title    = title
        self.__type__ = type(self).__name__

# ==== Tests ====

from wall import WallApp
from tornado.testing import AsyncTestCase
from tornado.ioloop import IOLoop

class BrickTest(AsyncTestCase):
    def setUp(self):
        super(BrickTest, self).setUp()
        self.app = WallApp()
        self.brick = self.app.bricks[0]
    
    def test_search(self):
        def cb(results):
            self.assertTrue(results)
            self.stop()
        self.brick.search('Babylon 5', cb)
        self.wait()
    
    def get_new_ioloop(self):
        return IOLoop.instance()

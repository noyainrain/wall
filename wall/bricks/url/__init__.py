# Wall

# Python forward compatibility
from __future__ import (division, absolute_import, print_function,
    unicode_literals)

import os
import json
from wall import Brick, PostHandler, Post, Message, randstr
from wall.util import WebAPI, Pool
from urllib import urlencode
from tornado.httpclient import AsyncHTTPClient
from functools import partial

class UrlBrick(Brick):
    id = 'url'
    maintainer = 'Sven James <sven.jms AT gmail.com>'
    js_module = 'wall.bricks.url'

    def __init__(self, app):
        super(Brick, self).__init__(app)
        self.search_handlers = []

        self.app.add_post_handler(UrlPostHandler(self.app))
        self.app.add_message_handler('url.get_search_handlers',
            self._get_search_handlers_msg)
        self.app.add_message_handler('url.search', self._search_msg)

        # ----

        self.add_search_handler(
            YoutubeSearchHandler(randstr(), 'Youtube', '#ff0000'))

        # ----

        titles = self.config.get('url.title', '').split()
        auth_codes = self.config.get('url.auth_code', '').split()
        self.boxes = [Box(t, auth_code=a) for t, a in zip(titles, auth_codes)]
        self.logger.info('%d dropbox(es) configured', len(self.boxes))

        for box in self.boxes:
            def cb(result, box):
                if hasattr(result, 'error') and result.error == 'invalid_grant':
                    self.logger.error('auth_code of dropbox "%s" is invalid',
                        box.title)
                    return
                box.token = result.access_token
                self.add_search_handler(DropboxSearchHandler(randstr(), box))

            WebAPI('https://api.dropbox.com/1').call(
                '/oauth2/token',
                {
                    'code': box.auth_code,
                    'grant_type': 'authorization_code',
                    'client_id': dropbox_app_id,
                    'client_secret': dropbox_app_secret
                },
                partial(cb, box=box),
                method='POST'
            )

    def search(self, query, callback):
        results = []
        def cb():
            callback(results)
        pool = Pool(self.search_handlers, cb)

        for handler in self.search_handlers:
            def cb(handler_results, handler):
                results.extend(handler_results)
                pool.finish(handler)
            handler.search(query, partial(cb, handler=handler))

    def add_search_handler(self, handler):
        self.search_handlers.append(handler)

    def _get_search_handlers_msg(self, msg):
        handlers = [h.json() for h in self.search_handlers]
        msg.frm.send(Message(msg.type, handlers))

    def _search_msg(self, msg):
        def cb(results):
            msg.frm.send(Message(msg.type, [vars(r) for r in results]))
        self.search(msg.data['query'], cb)

class UrlPost(Post):
    def __init__(self, app, id, title, posted, url, **kwargs):
        super(UrlPost, self).__init__(app, id, title, posted, **kwargs)
        self.url = url

class UrlPostHandler(PostHandler):
    cls = UrlPost

    def create_post(self, **args):
        url = args['url'].strip()
        if not url:
            raise ValueError('url')
        if not url.startswith(('http://', 'https://')):
            url = 'http://' + url
        post = UrlPost(self.app, randstr(), url, None, url)
        self.app.db.hmset(post.id, post.json())
        return post

class SearchHandler(object):
    def __init__(self, id, title, color):
        self.id = id
        self.title = title
        self.color = color

    def search(self, query, callback):
        raise NotImplementedError()

    def json(self):
        return {'id': self.id, 'title': self.title, 'color': self.color}

class SearchResult(object):
    def __init__(self, title, url, handler, thumbnail=None):
        self.title = title
        self.url = url
        self.handler = handler
        self.thumbnail = thumbnail

Brick = UrlBrick

# ----
# TODO: move to own module once the new plugin architecture is ready

class YoutubeSearchHandler(SearchHandler):
    def search(self, query, callback):
        def cb(response):
            # TODO: check response for errors

            data = json.load(response.buffer)
            entries = data['feed']['entry']

            results = []
            for entry in entries:
                meta = entry['media$group']

                # construct video URL (with autoplay enabled)
                video = 'https://www.youtube.com/embed/{0}?autoplay=1'.format(
                    meta['yt$videoid']['$t'])

                thumbnail = filter(lambda t: t['yt$name'] == 'default',
                    meta['media$thumbnail'])[0]
                thumbnail = thumbnail['url']

                result = SearchResult(meta['media$title']['$t'], video, self.id,
                    thumbnail)
                results.append(result)

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

# ----
# TODO: move to own module once the new plugin architecture is ready

# Dropbox API documentation: https://www.dropbox.com/developers/core/docs

dropbox_app_id = 'kuyowpo8hdmu4ks'
dropbox_app_secret = 'mn6q5x1qil1ze37'

class DropboxSearchHandler(SearchHandler):
    def __init__(self, id, box):        
        super(DropboxSearchHandler, self).__init__(id, 'Dropbox ' + box.title,
            '#0000ff')
        self.box = box
        self._api = WebAPI('https://api.dropbox.com/1',
            {'access_token': box.token})

    def search(self, query, callback):
        def cb(items):
            results = []
            def cb():
                callback(results)
            pool = Pool(items, cb)

            for item in items:
                if item.is_dir:
                    pool.finish(item)
                    continue

                def cb(link, item):
                    result = SearchResult(os.path.basename(item.path), link.url,
                        self.id)
                    results.append(result)
                    pool.finish(item)
                self._api.call('/media/dropbox' + item.path,
                    callback=partial(cb, item=item))

        self._api.call('/search/dropbox/', {'query': query, 'file_limit': '5'},
            cb)

class Box(object):
    def __init__(self, title, auth_code=None, token=None):
        self.title = title
        self.auth_code = auth_code
        self.token = token

# ==== Tests ====

from wall import WallApp
from wall.util import TestCase

class BrickTest(TestCase):
    def setUp(self):
        super(BrickTest, self).setUp()
        self.app = WallApp()
        self.brick = self.app.bricks['url']

    def test_search(self):
        def cb(results):
            handlers = set(h.id for h in self.brick.search_handlers)
            result_handlers = set(r.handler for r in results)
            self.assertTrue(handlers == result_handlers)
            self.stop()
        self.brick.search('Wall', cb)
        self.wait()

class DropboxSearchHandlerTest(TestCase):
    """
    Test for DropboxSearchHandler. For this test to work, there must be

     * a file "called url-test-token.txt" in the current directory, which
       contains a valid Dropbox access token
     * and at least one file in the Dropbox matching the query "Wall" (i.e.
       "Wall.txt").
    """

    token_path = 'url-test-token.txt'

    def setUp(self):
        super(DropboxSearchHandlerTest, self).setUp()
        try:
            self.token = open(self.token_path).read().strip()
        except IOError:
            self.skipTest('could not read token from ' + self.token_path)
            return
        self.box = Box('Ivanova', token=self.token)
        self.handler = DropboxSearchHandler(randstr(), self.box)

    def test_search(self):
        def cb(results):
            self.assertTrue(results)
            self.stop()
        self.handler.search('Wall', cb)
        self.wait()

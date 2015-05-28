# Wall

# Python forward compatibility
from __future__ import (division, absolute_import, print_function,
    unicode_literals)

import logging
from collections import Mapping
from tornado.testing import AsyncTestCase
from tornado.ioloop import IOLoop
from redis import StrictRedis
from wall import WallApp, Post, randstr

class TestCase(AsyncTestCase):
    """
    Subclass API: Base for Wall unit tests. Takes care of setting / cleaning up
    the test environment and provides utilities for testing.

    Attributes:

     * `db`: connection to temporary Redis database (`15`)
     * `app`: Wall application. `TestPost` is available as registered post type.
     * `user`: active user.
    """

    def setUp(self):
        super(TestCase, self).setUp()
        self.db = StrictRedis(db=15)
        self.db.flushdb()
        self.app = WallApp(config={'db': 15})
        self.app.add_post_type(TestPost)
        self.user = self.app.login('Ivanova', 'test')
        self.app.user = self.user

    def get_new_ioloop(self):
        return IOLoop.instance()

class CommonCollectionTest(object):
    """
    Subclass API: Mixin for `Collection` tests. Provides common tests for the
    `Collection` API.

    Attributes:

     * `collection`: collection to test. Must be set by host during `setUp`.
    """

    def setUp(self):
        self.collection = None

    def test_post(self):
        post = self.collection.post_new('TestPost')
        self.assertIn(post, self.collection.items)

    def test_remove_item(self):
        post = self.collection.post_new('TestPost')
        removed_post = self.collection.remove_item(0)
        self.assertEqual(removed_post, post)
        self.assertNotIn(post, self.collection.items)

    def test_remove_item_out_of_range_index(self):
        with self.assertRaises(ValueError):
            self.collection.remove_item(42)

class CommonPostTest(object):
    """
    Subclass API: Mixin for `Post` tests. Provides common tests of the `Post`
    API.

    Attributes:

     * `post`: post to test. Must be set by host during `setUp()`.
     * `post_type`: post type to test. Must be set by host during `setUp()`.
     * `create_args`: valid `args` for `post_type`'s `create` method. Must
           be set by host during `setUp()`.
    """

    def setUp(self):
        self.post = None
        self.post_type = None
        self.create_args = None

    def test_create(self):
        post = self.post_type.create(self.app, **self.create_args)
        self.assertTrue(post.id)

    def test_edit(self):
        self.post.edit(title='Look, a new title!  ')
        self.assertEqual(self.post.title, 'Look, a new title!')

    def test_edit_empty_title(self):
        with self.assertRaisesRegexp(ValueError, 'title_empty'):
            self.post.edit(title='')

    def test_json_include_poster(self):
        poster_json = self.post.json(include_poster=True).get('poster')
        self.assertIsInstance(poster_json, Mapping)
        self.assertEqual(poster_json.get('id'), self.user.id)
        self.assertNotIn('session', poster_json)

class TestPost(Post):
    @classmethod
    def create(cls, app, **args):
        post = TestPost(id='test_post:' + randstr(), app=app, title='Test',
            poster_id=app.user.id, posted=None)
        app.db.hmset(post.id, post.json())
        return post

    def __init__(self, **args):
        super(TestPost, self).__init__(**args)
        self.activate_called = False
        self.deactivate_called = False

    def activate(self):
        self.activate_called = True

    def deactivate(self):
        self.deactivate_called = True

    def json(self, **args):
        json = super(TestPost, self).json(**args)
        return dict((k, v) for k, v in json.items()
            if k not in ['activate_called', 'deactivate_called'])

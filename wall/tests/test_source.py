# Wall

# Python forward compatibility
from __future__ import (division, absolute_import, print_function,
    unicode_literals)

from tornado.gen import Task
from tornado.testing import gen_test
from wall import ImageSource, WebError
from wall.test import TestCase, CommonSourceTest

class SourceTest(TestCase):
    def setUp(self):
        super(SourceTest, self).setUp()
        self.source_type = ImageSource

    @gen_test
    def test_fetch_not_found_host(self):
        source = self.source_type('http://localhoax/')
        e = yield Task(source.fetch)
        self.assertIsInstance(e, WebError)
        self.assertEquals(e.args[0], 'resource_not_found')

    @gen_test
    def test_fetch_not_found_resource(self):
        # TODO: use webserver
        source = self.source_type('http://localhost:8042/foo')
        e = yield Task(source.fetch)
        self.assertIsInstance(e, WebError)
        self.assertEquals(e.args[0], 'resource_not_found')

class ImageSourceTest(TestCase, CommonSourceTest):
    def setUp(self):
        super(ImageSourceTest, self).setUp()
        CommonSourceTest.setUp(self)
        self.source_type = ImageSource

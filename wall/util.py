# Wall

# Python forward compatibility
from __future__ import (division, absolute_import, print_function,
    unicode_literals)

import sys
import json
import logging
from urllib import urlencode
from logging import getLogger
from collections import Mapping
from tornado.httpclient import AsyncHTTPClient
from tornado.testing import AsyncTestCase
from tornado.ioloop import IOLoop
from redis import StrictRedis

class WebAPI(object):
    class Object(object):
        def __init__(self, dict={}, **kwargs):
            self.__dict__.update(dict)
            self.__dict__.update(kwargs)

        def __str__(self):
            return str(vars(self))
        __repr__ = __str__

    def __init__(self, url, default_args={}, verbose=False):
        self.url = url
        self.default_args = default_args
        self.verbose = verbose

    def call(self, url, args={}, callback=None, method='GET'):
        url = self.url + url
        args = dict(self.default_args.items() + args.items())

        if method == 'GET':
            url = url + '?' + urlencode(args)
            data = None
        elif method == 'POST':
            data = urlencode(args)
        else:
            raise ValueError('method')

        if self.verbose:
            print(method, url, file=sys.stderr)
            print('data:', data, file=sys.stderr)

        def cb(response):
            # TODO: handle errors
            if self.verbose:
                print(response.code, file=sys.stderr)
                print('data:', response.body, file=sys.stderr)
            if callback:
                callback(json.load(response.buffer, object_hook=WebAPI.Object))
        AsyncHTTPClient().fetch(url, cb, method=method, body=data)

class EventTarget(object):
    """
    Event target.

    Inspired by the DOM specification (see
    http://dom.spec.whatwg.org/#interface-eventtarget ).
    """

    def __init__(self):
        self._event_listeners = {}

    def add_event_listener(self, type, listener):
        if type not in self._event_listeners:
            self._event_listeners[type] = set()
        self._event_listeners[type].add(listener)

    def remove_event_listener(self, type, listener):
        try:
            self._event_listeners.get(type, set()).remove(listener)
        except KeyError:
            raise ValueError('listener_unknown')

    def dispatch_event(self, event):
        event.target = self
        for listener in self._event_listeners.get(event.type, set()):
            listener(event)

class Event(object):
    def __init__(self, type, args={}, **kwargs):
        self.type = type
        self.target = None
        self.args = dict(args.items() + kwargs.items())

class RedisContainer(Mapping):
    def __init__(self, db, set_key, cls):
        self.db = db
        self.set_key = set_key
        self.cls = cls

    def keys(self):
        return self.db.smembers(self.set_key)

    def __getitem__(self, key):
        if key not in self:
            raise KeyError()
        return self.cls(**self.db.hgetall(key))

    def __iter__(self):
        return iter(self.keys())

    def __len__(self):
        return self.db.scard(self.set_key)

    def __contains__(self, item):
        return self.db.sismember(self.set_key, item)

    def __str__(self):
        return str(dict(self))
    __repr__ = __str__

class Pool(object):
    """
    Utility for keeping track of a pool of asynchronous tasks. A callback is
    executed when all tasks are done.

    Properties:

     * tasks: list of running tasks
     * callback: called when all tasks are done
    """

    def __init__(self, tasks, callback):
        self.tasks = list(tasks)
        self.callback = callback
        if self.done():
            self.callback()

    def done(self):
        return not self.tasks

    def finish(self, task):
        self.tasks.remove(task)
        if self.done():
            self.callback()

class TestCase(AsyncTestCase):
    @classmethod
    def setUpClass(cls):
        getLogger('wall').setLevel(logging.CRITICAL)

    def setUp(self):
        super(TestCase, self).setUp()
        self.db = StrictRedis(db=15)
        self.db.flushdb()

    def get_new_ioloop(self):
        return IOLoop.instance()

def truncate(s, length=64, ellipsis='\u2026'):
    if len(s) > length:
        return s[:length - len(ellipsis)] + ellipsis
    else:
        return s

# ==== Tests ====

class EventTargetTest(TestCase):
    class Ship(EventTarget):
        def fire(self, weapon):
            self.dispatch_event(Event('fired', weapon=weapon))

    def setUp(self):
        super(EventTargetTest, self).setUp()
        self.ship = EventTargetTest.Ship()
        self.ship.add_event_listener('fired', self.fired)
        self.dispatched_event = None

    def test_remove_event_listener(self):
        self.ship.remove_event_listener('fired', self.fired)
        self.ship.fire('plasma')
        self.assertFalse(self.dispatched_event)

    def test_remove_event_listener_unknown(self):
        with self.assertRaises(ValueError):
            self.ship.remove_event_listener('fired', lambda e: e)

    def test_dispatch_event(self):
        self.ship.fire('plasma')
        self.assertTrue(self.dispatched_event)
        self.assertEqual(self.dispatched_event.target, self.ship)
        self.assertEqual(self.dispatched_event.args['weapon'], 'plasma')

    def fired(self, event):
        self.dispatched_event = event

class RedisContainerTest(TestCase):
    class Ship(object):
        def __init__(self, id, type):
            self.id = id
            self.type = type

    def setUp(self):
        super(RedisContainerTest, self).setUp()

        self.list = [
            RedisContainerTest.Ship('0', 'Starfury'),
            RedisContainerTest.Ship('1', 'Starfury')
        ]

        self.db = StrictRedis(db=15)
        self.db.flushdb()
        for ship in self.list:
            self.db.hmset(ship.id, vars(ship))
            self.db.sadd('ships', ship.id)

        self.ships = RedisContainer(self.db, 'ships', RedisContainerTest.Ship)

    def test_keys(self):
        self.assertEqual(self.ships.keys(), set(s.id for s in self.list))

    def test_getitem(self):
        self.assertEqual(vars(self.ships['0']), vars(self.list[0]))

    def test_len(self):
        self.assertEqual(len(self.ships), len(self.list))

    def test_contains(self):
        self.assertTrue('0' in self.ships)
        self.assertFalse('foo' in self.ships)

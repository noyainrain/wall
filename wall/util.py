# Wall

# Python forward compatibility
from __future__ import (division, absolute_import, print_function,
    unicode_literals)

import sys
import json
import logging
from urllib import urlencode
from tornado.httpclient import AsyncHTTPClient
from tornado.testing import AsyncTestCase
from tornado.ioloop import IOLoop
from logging import getLogger

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
        
    def get_new_ioloop(self):
        return IOLoop.instance()

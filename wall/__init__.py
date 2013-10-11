# Wall

# Python forward compatibility
from __future__ import (division, absolute_import, print_function,
    unicode_literals)

import sys, os, json
from logging import StreamHandler, Formatter, getLogger, DEBUG
from ConfigParser import SafeConfigParser, Error as ConfigParserError
from subprocess import Popen
from string import ascii_lowercase
from random import choice
from tornado.ioloop import IOLoop
from tornado.web import Application, RequestHandler, StaticFileHandler
from tornado.websocket import WebSocketHandler
from wall.util import EventTarget

res_path      = os.path.join(os.path.dirname(__file__), 'res')
static_path   = os.path.join(res_path, 'static')
template_path = os.path.join(res_path, 'templates')

class WallApp(Application, EventTarget):
    def __init__(self, config={}, config_path=None):
        Application.__init__(self, template_path=template_path, autoescape=None)
        EventTarget.__init__(self)

        self.logger = getLogger('wall')
        self.bricks = {}
        self.post_handlers = {}
        self.clients = []
        self.posts = {}
        self.current_post = None
        self._init = True

        config_paths = [os.path.join(res_path, 'default.cfg')]
        if config_path:
            config_paths.append(config_path)
        try:
            parser = SafeConfigParser()
            parser.read(config_paths)
        except ConfigParserError as e:
            self.logger.error('failed to parse configuration file')
            self._init = False
            return

        self.config = {}
        for section in parser.sections():
            prefix = section + '.' if section != 'wall' else ''
            for key, value in parser.items(section):
                self.config[prefix + key] = value
        self.config.update(config)

        # set Tornado debug mode
        self.settings['debug'] = (self.config['debug'] == 'True')

        # setup message handlers
        self.msg_handlers = {'post_new': self.post_new_msg}

        # initialize bricks
        bricks = self.config['bricks'].split()
        for name in bricks:
            module = __import__(name, globals(), locals(), [b'foo'])
            brick = module.Brick(self)
            self.bricks[brick.id] = brick

        # setup URL handlers
        urls = [
            ('/$',            ClientPage),
            ('/display/$',    DisplayPage),
            ('/api/socket/$', Socket),
        ]
        for brick in self.bricks.values():
            urls.append(('/static/{0}/(.+)$'.format(brick.id),
                StaticFileHandler, {'path': brick.static_path}))
        urls.append(('/static/(.+)$', StaticFileHandler, {'path': static_path}))
        self.add_handlers('.*$', urls)

    @property
    def js_modules(self):
        return [b.js_module for b in self.bricks.values()]

    @property
    def scripts(self):
        scripts = []
        for brick in self.bricks.values():
            scripts.extend(brick.id + '/' + s for s in brick.scripts)
        return scripts

    @property
    def stylesheets(self):
        stylesheets = []
        for brick in self.bricks.values():
            stylesheets.extend(brick.id + '/' + s for s in brick.stylesheets)
        return stylesheets

    def run(self):
        if not self._init:
            return
        self.listen(8080)
        self.logger.info('server started')
        IOLoop.instance().start()

    def add_message_handler(self, type, handler):
        self.msg_handlers[type] = handler

    def sendall(self, msg):
        for client in self.clients:
            client.send(msg)

    def post_new_msg(self, msg):
        post_type = msg.data.pop('type')
        post = self.post_new(post_type, **msg.data)
        msg.frm.send(Message('post_new', post.json()))
        # wake display
        Popen('DISPLAY=:0.0 xset dpms force on', shell=True)

    def post(self, id):
        try:
            post = self.posts[id]
        except KeyError:
            raise KeyError('id')
        if self.current_post:
            self.post_handlers[self.current_post.__type__].cleanup_post()
        self.current_post = post
        self.post_handlers[post.__type__].init_post(post)
        self.sendall(Message('posted', post.json()))
        return post

    def post_new(self, type, **args):
        handler = self.post_handlers[type]
        post = handler.create_post(**args)
        self.posts[post.id] = post
        return self.post(post.id)

    def add_post_handler(self, handler):
        self.post_handlers[handler.type] = handler

class Socket(WebSocketHandler):
    def initialize(self):
        self.app = self.application

    def send(self, msg):
        self.write_message(str(msg))

    def open(self):
        print('client connected')
        self.app.clients.append(self)
        self.app.dispatch_event('connected', self)
        if self.app.current_post:
            self.send(Message('posted', self.app.current_post.json()))

    def on_close(self):
        print('client disconnected')
        self.app.clients.remove(self)
        self.app.dispatch_event('disconnected', self)

    def on_message(self, msgstr):
        msg = Message.parse(msgstr, self)
        handle = self.app.msg_handlers[msg.type]
        #try:
        handle(msg)
        #except Exception as e:
        #    e = {'args': e.args, '__type__': type(e).__name__}
        #    self.send(Message(msg.type, e))

class Message(object):
    @classmethod
    def parse(cls, msgstr, frm=None):
        msg = json.loads(msgstr)
        return Message(msg['type'], msg['data'], frm)

    def __init__(self, type, data=None, frm=None):
        self.type = type
        self.data = data
        self.frm  = frm

    def __str__(self):
        return json.dumps({'type': self.type, 'data': self.data})

class ClientPage(RequestHandler):
    def get(self):
        self.render('client.html', app=self.application)

class DisplayPage(RequestHandler):
    def get(self):
        self.render('display.html', app=self.application)

class PostHandler(object):
    type = None

    def __init__(self, app):
        self.app = app

    def create_post(self, **args):
        raise NotImplementedError()

    def init_post(self, post):
        pass

    def cleanup_post(self):
        pass

class Post(object):
    def __init__(self, app, id):
        self.app = app
        self.id = id
        self.__type__ = type(self).__name__

    def json(self):
        return dict((k, v) for k, v in vars(self).items() if k != 'app')

class Brick(object):
    """
    An extension (plugin) for Wall.
    """
    id = None
    maintainer = None
    js_module = None
    static_path = None # default: '<module_dir>/static'
    scripts = None # default: ['<id>.js']
    stylesheets = None # default: ['<id>.css'] if existant, else []

    def __init__(self, app):
        self.app = app
        self.config = app.config
        self.logger = getLogger('wall.' + self.id)

        # set defaults
        self.static_path = self.static_path or os.path.join(
            os.path.dirname(sys.modules[self.__module__].__file__), 'static')
        self.scripts = self.scripts or [self.id + '.js']
        if not self.stylesheets:
            if os.path.isfile(os.path.join(self.static_path, self.id + '.css')):
                self.stylesheets = [self.id + '.css']
            else:
                self.stylesheets = []

def randstr(length=8, charset=ascii_lowercase):
    return ''.join(choice(charset) for i in xrange(length))

def error_json(error):
    return dict({'__type__': type(error).__name__, 'args': error.args})

def _setup_logger():
    logger = getLogger('wall')
    logger.setLevel(DEBUG)
    handler = StreamHandler()
    handler.setFormatter(
        Formatter('%(asctime)s %(levelname)s %(name)s: %(message)s'))
    logger.addHandler(handler)
_setup_logger()

# ==== Tests ====

from wall.util import TestCase
from tempfile import NamedTemporaryFile

class TestPost(Post):
    pass

class TestPostHandler(PostHandler):
    type = 'TestPost'

    def __init__(self):
        super(TestPostHandler, self).__init__()
        self.init_post_called = False
        self.cleanup_post_called = False

    def create_post(self, **args):
        return TestPost(randstr())

    def init_post(self, post):
        self.init_post_called = True

    def cleanup_post(self):
        self.cleanup_post_called = True

class WallTest(TestCase):
    def setUp(self):
        super(WallTest, self).setUp()
        self.app = WallApp()

    def test_init(self):
        # without config file
        app = WallApp()
        self.assertTrue(app._init)

        # valid config file
        f = NamedTemporaryFile(delete=False)
        f.write('[wall]\ndebug = True\n')
        f.close()
        app = WallApp(config_path=f.name)
        self.assertTrue(app._init)

        # invalid config file
        f = NamedTemporaryFile(delete=False)
        f.write('foo')
        f.close()
        app = WallApp(config_path=f.name)
        self.assertFalse(app._init)

    def test_post_new(self):
        # test post_new and also post

        handler = TestPostHandler()
        self.app.add_post_handler(handler)

        post = self.app.post_new('TestPost')
        self.assertTrue(self.app.posts)
        self.assertEqual(self.app.current_post, post)
        self.assertTrue(handler.init_post_called)

        self.app.post(post.id)
        self.assertTrue(handler.cleanup_post_called)

        self.assertRaises(KeyError, self.app.post_new, 'foo')
        self.assertRaises(KeyError, self.app.post, 'foo')

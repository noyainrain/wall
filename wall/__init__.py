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

res_path      = os.path.join(os.path.dirname(__file__), 'res')
static_path   = os.path.join(res_path, 'static')
template_path = os.path.join(res_path, 'templates')

class WallApp(Application):
    def __init__(self, config_path=None):
        super(WallApp, self).__init__(template_path=template_path,
            autoescape=None)
        
        self.logger        = getLogger('wall')
        self.bricks        = []
        self.post_handlers = {}
        self.clients       = []
        self.posts         = {}
        self.current_post  = None
        self._init         = True
        
        config_paths = [os.path.join(res_path, 'default.cfg')]
        if config_path:
            config_paths.append(config_path)
        try:
            parser = SafeConfigParser()
            parser.read(config_paths)
            self.config = dict(parser.items('wall'))
        except ConfigParserError as e:
            self.logger.error('failed to parse config file')
            self._init = False
            return
        
        # set Tornado debug mode
        self.settings['debug'] = (self.config['debug'] == 'True')
        
        # setup message handlers
        self.msg_handlers = {'post_new': self.post_new_msg}
        
        # initialize bricks
        bricks = self.config['bricks'].split()
        for name in bricks:
            module = __import__(name, globals(), locals(), [b'foo'])
            brick = module.Brick(self)
            self.bricks.append(brick)
            self.post_handlers[brick.post_type] = brick
        
        # setup URL handlers
        urls = [
            ('/$',            ClientPage),
            ('/display/$',    DisplayPage),
            ('/api/socket/$', Socket),
        ]
        for brick in self.bricks:
            urls.append(('/static/{0}/(.+)$'.format(brick.id),
                StaticFileHandler, {'path': brick.static_path}))
        urls.append(('/static/(.+)$', StaticFileHandler, {'path': static_path}))
        self.add_handlers('.*$', urls)
    
    @property
    def js_modules(self):
        return [b.js_module for b in self.bricks]
    
    @property
    def js_scripts(self):
        return [b.id + '/' + b.js_script for b in self.bricks]

    @property
    def stylesheets(self):
        return [b.id + '/' + b.stylesheet for b in self.bricks if b.stylesheet]

    def run(self):
        if not self._init:
            return
        self.listen(8080)
        self.logger.info('server started')
        IOLoop.instance().start()
    
    def sendall(self, msg):
        for client in self.clients:
            client.send(msg)
    
    def post_new_msg(self, msg):
        post_type = msg.data.pop('type')
        self.post_new(post_type, **msg.data)
        msg.frm.send(Message('post_new'))
        # wake display
        Popen('DISPLAY=:0.0 xset dpms force on', shell=True)
    
    def post_new(self, type, **args):
        try:
            brick = self.post_handlers[type]
        except KeyError:
            raise ValueError('type')
        post = brick.post_new(type, **args)
        self.posts[post.id] = post
        self.current_post = post
        self.sendall(Message('posted', vars(post)))

class Socket(WebSocketHandler):
    def initialize(self):
        self.app = self.application
    
    def send(self, msg):
        self.write_message(str(msg))
    
    def open(self):
        print('client connected')
        self.app.clients.append(self)
        if self.app.current_post:
            self.send(Message('posted', vars(self.app.current_post)))
    
    def on_close(self):
        print('client disconnected')
        self.app.clients.remove(self)
    
    def on_message(self, msgstr):
        print('received: ' + msgstr)
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

class Brick(object):
    id          = None
    js_module   = None
    js_script   = None # default: <id>.js
    static_path = None # default: <module_dir>/static
    post_type   = None
    stylesheet  = None
    
    def __init__(self, app):
        self.app = app
        self.js_script = self.js_script or self.id + '.js'
        self.static_path = self.static_path or os.path.join(
            os.path.dirname(sys.modules[self.__module__].__file__), 'static')
        # brick brings its own stylesheet
        if os.path.exists(os.path.join(self.static_path, self.id + '.css')):
            self.stylesheet = self.id + '.css'
    
    def post_new(self, type, **args):
        pass

def randstr(length=8, charset=ascii_lowercase):
    return ''.join(choice(charset) for i in xrange(length))

def _setup_logger():
    logger = getLogger('wall')
    logger.setLevel(DEBUG)
    handler = StreamHandler()
    handler.setFormatter(
        Formatter('%(asctime)s %(levelname)s %(name)s: %(message)s'))
    logger.addHandler(handler)
_setup_logger()

# ==== Tests ====

from unittest import TestCase
from tempfile import NamedTemporaryFile

class WallTest(TestCase):
    def setUp(self):
        self.app = WallApp()
    
    def test_init(self):
        # without config file
        app = WallApp()
        self.assertTrue(app._init)
        
        # valid config file
        f = NamedTemporaryFile(delete=False)
        f.write('[wall]\ndebug = True\n')
        f.close()
        app = WallApp(f.name)
        self.assertTrue(app._init)
        
        # invalid config file
        f = NamedTemporaryFile(delete=False)
        f.write('foo')
        f.close()
        app = WallApp(f.name)
        self.assertFalse(app._init)
    
    def test_post_new(self):
        self.app.post_new('UrlPost', url='http://example.org/')
        self.assertTrue(self.app.posts)
        self.assertRaises(ValueError, self.app.post_new, 'foo')

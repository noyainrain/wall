# Wall

# Python forward compatibility
from __future__ import (division, absolute_import, print_function,
    unicode_literals)

import sys
import os
import json
import exceptions
from datetime import datetime
from logging import StreamHandler, Formatter, getLogger, DEBUG
from ConfigParser import SafeConfigParser, Error as ConfigParserError
from subprocess import Popen
from string import ascii_lowercase
from random import choice
from collections import OrderedDict
from tornado.ioloop import IOLoop
from tornado.web import Application, RequestHandler, StaticFileHandler
import tornado.autoreload
from tornado.websocket import WebSocketHandler
from redis import StrictRedis
from wall.util import EventTarget, Event, ObjectRedis, RedisContainer, truncate

release = 20

res_path = os.path.join(os.path.dirname(__file__), 'res')
static_path = os.path.join(res_path, 'static')
template_path = os.path.join(res_path, 'templates')

class Object(object):
    """
    Object in the Wall universe.

    Attributes:

     * `id`: unique ID.
     * `app`: Wall application.
    """

    def __init__(self, id, app):
        self.id = id
        self.app = app

class Collection(object):
    """
    Collection of posts.

    Attributes:

     * `items`: list of posts in collection.

    `Collection` is a Mixin for `Object`s. Hosts must implement `get_item`,
    `do_post`, `do_remove_item` and the `items` property.
    """

    def __init__(self):
        self.is_collection = True

    @property
    def items(self):
        raise NotImplementedError()

    def get_item(self, index):
        """
        Return the post at the given `index`. May raise an `index_out_of_range`
        `ValueError`.
        """
        raise NotImplementedError()

    def post(self, post):
        """
        Post the given `post` to the collection.

        Note that only `Wall` can hold `Collection`s. Thus, if the collection is
        not `Wall`, but `post` is a `Collection`, a
        `ValueError('post_collection_not_wall')` is raised.
        """

        if isinstance(post, Collection) and self != self.app:
            raise ValueError('post_collection_not_wall')
        self.do_post(post)
        self.app.dispatch_event(
            Event('collection_posted', collection=self, post=post))

    def do_post(self, post):
        """
        Post the given `post` to the collection.

        Hosts must override the method and implement the specific behaviour.
        Called by `post`, which takes care of common tasks.
        """

        raise NotImplementedError()

    def post_new(self, type, **args):
        """
        Create a new post and subsequently post it to the collection. `type` is
        the name of the post type (e.g. 'text_post'). Additional arguments may
        be passed as `args`. Refer to the documentation of `create` of the
        specific post type to learn about the accepted arguments.

        If the post `type` does not exist, a `ValueError('type_unknown')` is
        raised.

        Note that only `Wall` can hold `Collection`s. Thus, if the collection is
        not `Wall`, but `type` refers to a `Collection`, a
        `ValueError('type_collection_not_wall')` is raised.
        """

        try:
            post_type = self.app.post_types[type]
        except KeyError:
            raise ValueError('type_unknown')
        if issubclass(post_type, Collection) and self != self.app:
            raise ValueError('type_collection_not_wall')

        post = post_type.create(self.app, **args)
        self.app.db.sadd('posts', post.id)
        self.post(post)
        return post

    def remove_item(self, index):
        """
        Remove the post at the given `index` from the collection. The removed
        post is returned. May raise an `index_out_of_range` `ValueError`.
        """

        post = self.do_remove_item(index)
        self.app.dispatch_event(Event('collection_item_removed',
            collection=self, index=index, post=post))
        return post

    def do_remove_item(self, index):
        """
        Remove the post at the given `index` from the collection.

        Hosts must override the method and implement the specific behaviour.
        Called by `remove_item`, which takes care of common tasks.
        """

        raise NotImplementedError()

    def activate_item(self, index):
        post = self.get_item(index)
        post.activate()
        post.posted = datetime.utcnow().isoformat()
        self.app.db.hset(post.id, 'posted', post.posted)
        self.app.dispatch_event(Event('collection_item_activated',
            collection=self, index=index, post=post))

    def deactivate_item(self, index):
        post = self.get_item(index)
        post.deactivate()
        self.app.dispatch_event(Event('collection_item_deactivated',
            collection=self, index=index, post=post))

class WallApp(Object, EventTarget, Collection, Application):
    """
    Wall application.

    Events:

     * `collection_posted`
     * `collection_item_removed`
     * `collection_item_activated`
     * `collection_item_deactivated`
     * `connected`
     * `disconnected`
    """

    def __init__(self, config={}, config_path=None):
        super(WallApp, self).__init__('wall', self)
        EventTarget.__init__(self)
        Collection.__init__(self)
        Application.__init__(self, template_path=template_path, autoescape=None)

        self.logger = getLogger('wall')
        self.bricks = {}
        self.post_types = {}
        self.clients = []
        self.current_post = None
        self._init = True

        self._setup_logger()

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

        self.db = ObjectRedis(StrictRedis(db=int(self.config['db'])),
            self._decode_redis_hash)
        self.posts = RedisContainer(self.db, 'posts')

        self.add_post_type(TextPost)
        self.add_post_type(ImagePost)
        self.add_post_type(GridPost)

        self.msg_handlers = {
            'get_history': self.get_history_msg,
            'collection_get_items': self.collection_get_items_msg,
            'collection_post': self.collection_post_msg,
            'collection_post_new': self.collection_post_new_msg,
            'collection_remove_item': self.collection_remove_item_msg
        }

        self.add_event_listener('collection_posted', self._collection_posted)
        self.add_event_listener('collection_item_removed',
            self._collection_item_removed)
        self.add_event_listener('collection_item_activated',
            self._collection_item_activated)
        self.add_event_listener('collection_item_deactivated',
            self._collection_item_deactivated)

        # initialize bricks
        bricks = self.config['bricks'].split()
        for name in bricks:
            module = __import__(name, globals(), locals(), [b'foo'])
            brick = module.Brick(self)
            self.bricks[brick.id] = brick

        self.do_post_handlers = []
        for handler in self.config['do_post_handlers'].split():
            if handler not in ['note', 'grid', 'history']:
                self.logger.warning('configuration: invalid item in do_post_handlers: "{}" unknown'.format(handler));
                continue
            if handler in self.do_post_handlers:
                self.logger.warning('configuration: invalid item in do_post_handlers: "{}" non-unique'.format(handler))
                continue
            self.do_post_handlers.append(handler)

        if self.config['debug'] == 'True':
            self.settings['debug'] = True
            tornado.autoreload.watch(os.path.join(res_path, 'default.cfg'))
            tornado.autoreload.start()

        # setup URL handlers
        urls = [
            ('/$', ClientPage),
            ('/display$', DisplayPage),
            ('/display/post$', DisplayPostPage),
            ('/api/socket$', Socket),
        ]
        for brick in self.bricks.values():
            urls.append(('/static/{0}/(.+)$'.format(brick.id),
                StaticFileHandler, {'path': brick.static_path}))
        urls.append(('/static/(.+)$', StaticFileHandler, {'path': static_path}))
        self.add_handlers('.*$', urls)

    @property
    def items(self):
        return [self.current_post] if self.current_post else []

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
        """
        Extension API: register a new message `handler` for messages of the
        given `type`.

        A message handler is a function `handle(msg)` that processes a received
        message. It may return a `Message`, which is sent back to the sender as
        response. If a (subclass of) `Error` is raised, it is converted to a
        `Message` and sent back to the sender as error response.
        """
        self.msg_handlers[type] = handler

    def sendall(self, msg):
        for client in self.clients:
            client.send(msg)

    def get_item(self, index):
        if self.current_post and index == 0:
            return self.current_post
        else:
            raise ValueError('index_out_of_range')

    def do_post(self, post):
        if self.current_post:
            self.remove_item(0)
        self.current_post = post
        self.activate_item(0)

    def do_remove_item(self, index):
        self.deactivate_item(index)
        post = self.current_post
        self.current_post = None
        return post

    def get_collection(self, id):
        # TODO: document
        if id == 'wall':
            return self
        else:
            # TODO: check for Collection
            return self.posts[id]

    # TODO: validate input in message handlers
    def get_history_msg(self, msg):
        return Message('get_history',
            [p.json('common') for p in self.get_history()])

    def collection_get_items_msg(self, msg):
        collection = self.get_collection(msg.data['collection_id'])
        return Message('collection_get_items',
            [p.json() for p in collection.items])

    def collection_post_msg(self, msg):
        collection = self.get_collection(msg.data['collection_id'])
        post = self.posts[msg.data['post_id']]
        collection.post(post)
        return Message('collection_post')

    def collection_post_new_msg(self, msg):
        # wake display
        Popen('DISPLAY=:0.0 xset dpms force on', shell=True)

        collection = self.get_collection(msg.data.pop('collection_id'))
        post_type = msg.data.pop('type')
        post = collection.post_new(post_type, **msg.data)
        return Message('collection_post_new', post.json())

    def collection_remove_item_msg(self, msg):
        collection = self.get_collection(msg.data['collection_id'])
        index = int(msg.data['index'])
        post = collection.remove_item(index)
        return Message('collection_remove_item', post.json())

    def get_history(self):
        return sorted(self.posts.values(), key=lambda p: p.posted, reverse=True)

    def add_post_type(self, post_type):
        """
        Extension API: register a new post type. `post_type` is a class (type)
        that extends `Post`.
        """
        self.post_types[post_type.__name__] = post_type

    def _decode_redis_hash(self, hash):
        post_type = self.post_types[hash['__type__']]
        return post_type(self, **hash)

    def _setup_logger(self):
        logger = getLogger()
        logger.setLevel(DEBUG)
        handler = StreamHandler()
        handler.setFormatter(
            Formatter('%(asctime)s %(levelname)s %(name)s: %(message)s'))
        logger.addHandler(handler)

    def _collection_posted(self, event):
        self.sendall(Message('collection_posted', {
            'collection_id': event.args['collection'].id,
            'post': event.args['post'].json()
        }))

    def _collection_item_removed(self, event):
        self.sendall(Message('collection_item_removed', {
            'collection_id': event.args['collection'].id,
            'index': event.args['index'],
            'post': event.args['post'].json()
        }))

    def _collection_item_activated(self, event):
        self.sendall(Message('collection_item_activated', {
            'collection_id': event.args['collection'].id,
            'index': event.args['index'],
            'post': event.args['post'].json()
        }))

    def _collection_item_deactivated(self, event):
        self.sendall(Message('collection_item_deactivated', {
            'collection_id': event.args['collection'].id,
            'index': event.args['index'],
            'post': event.args['post'].json()
        }))

    def __str__(self):
        return '<{}>'.format(self.__class__.__name__)
    __repr__ = __str__

class Socket(WebSocketHandler):
    def initialize(self):
        self.app = self.application

    def send(self, msg):
        self.write_message(str(msg))
        self.app.logger.debug('sent message %s to %s',
            truncate(str(msg), ellipsis='\u2026}'), self.request.remote_ip)

    def open(self):
        self.app.clients.append(self)
        self.app.logger.debug('client %s connected', self.request.remote_ip)
        self.app.dispatch_event(Event('connected', client=self))

        # TODO: announce current post as response to hello message
        if self.app.current_post:
            self.send(Message('collection_item_activated', {
                'collection_id': 'wall',
                'index': 0,
                'post': self.app.current_post.json()
            }))

    def on_close(self):
        self.app.clients.remove(self)
        self.app.logger.debug('client %s disconnected', self.request.remote_ip)
        self.app.dispatch_event(Event('disconnected', client=self))

    def on_message(self, msgstr):
        msg = Message.parse(msgstr, self)
        self.app.logger.debug('received message %s from %s',
            truncate(str(msg), ellipsis='\u2026}'), self.request.remote_ip)

        handle = self.app.msg_handlers[msg.type]
        try:
            # TODO: support Future for asynchronous handlers (see
            # https://code.google.com/p/pythonfutures/ )
            response = handle(msg)
        except Error as e:
            response = Message(msg.type, e.json())

        if response:
            msg.frm.send(response)

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
        return json.dumps(
            OrderedDict([('type', self.type), ('data', self.data)])
        )

class ClientPage(RequestHandler):
    def get(self):
        self.render('remote.html', app=self.application)

class DisplayPage(RequestHandler):
    def get(self):
        # TODO: make app.config['info'] available via API
        self.render('display.html', app=self.application)

class DisplayPostPage(RequestHandler):
    def get(self):
        self.render('display-post.html', app=self.application)

class Post(Object):
    @classmethod
    def create(cls, app, **args):
        """
        Extension API: create a post of this type. Must be overridden and create
        a post, store it in the database and return it. Specific arguments are
        passed to `create` as `args`. `app` is the wall instance.

        Called when a new post of this type should be created via
        `Wall.post_new`.
        """
        raise NotImplementedError()

    def __init__(self, app, id, title, posted, **kwargs):
        super(Post, self).__init__(id, app)
        self.title = title
        self.posted = posted

    def activate(self):
        """
        Activate the post.

        Extension API: may be overridden for advanced posts. Called when the
        post is posted to / shown on the wall.
        """
        pass

    def deactivate(self):
        """
        Deactivate the post.

        Extension API: may be overridden for advanced posts. Called when the
        post is removed / hidden from the wall.
        """
        pass

    def json(self, view=None):
        if not view:
            filter = lambda k: not k.startswith('_') and k != 'app'
        elif view == 'common':
            filter = lambda k: k in ['id', 'title', 'posted']
        else:
            raise ValueError('view')

        return dict(((k, v) for k, v in vars(self).items() if filter(k)),
            __type__=type(self).__name__)

    def __eq__(self, other):
        # TODO: replace this by identity mapping / caching (see
        # https://docs.python.org/2/library/weakref.html )
        return self.id == other.id

    def __str__(self):
        return '<{} {}>'.format(self.__class__.__name__, self.id)
    __repr__ = __str__

class Brick(object):
    """
    An extension (plugin) for Wall.

    Static attributes:

     * id: unique brick identifier. Must be set by subclass.
     * maintainer: brick maintainer. Must be set by subclass.
     * js_module: corresponding JavaScript module (i.e. namespace). Defaults to
       the name of the Python module.
     * static_path: path to static resources. Defaults to '<module_dir>/static'.
     * scripts: corresponding JavaScript scripts. Defaults to ['<id>.js'].
     * stylesheets: corresponding stylesheets. Defaults to ['<id>.css'] if
       existant, else [].

    Attributes:

     * app: Wall application.
    """
    id = None
    maintainer = None
    js_module = None
    static_path = None
    scripts = None
    stylesheets = None

    def __init__(self, app):
        self.app = app
        self.config = app.config
        self.logger = getLogger('wall.' + self.id)

        # set defaults
        self.js_module = self.js_module or type(self).__module__
        self.static_path = self.static_path or os.path.join(
            os.path.dirname(sys.modules[self.__module__].__file__), 'static')
        self.scripts = self.scripts or [self.id + '.js']
        if not self.stylesheets:
            if os.path.isfile(os.path.join(self.static_path, self.id + '.css')):
                self.stylesheets = [self.id + '.css']
            else:
                self.stylesheets = []

class TextPost(Post):
    @classmethod
    def create(cls, app, **kwargs):
        try:
            content = kwargs['content'].strip()
        except KeyError:
            raise ValueError('content_missing')
        if not content:
            raise ValueError('content_empty')

        title = truncate(content.splitlines()[0])

        post = TextPost(app, 'text_post:' + randstr(), title, None, content)
        app.db.hmset(post.id, post.json())
        return post

    def __init__(self, app, id, title, posted, content, **kwargs):
        super(TextPost, self).__init__(app, id, title, posted, **kwargs)
        self.content = content

class ImagePost(Post):
    @classmethod
    def create(cls, app, **kwargs):
        # TODO: check args
        url = kwargs['url']
        post = ImagePost(app, 'image_post:' + randstr(), 'Image', None, url)
        app.db.hmset(post.id, post.json())
        return post

    def __init__(self, app, id, title, posted, url, **kwargs):
        super(ImagePost, self).__init__(app, id, title, posted, **kwargs)
        self.url = url

class GridPost(Post, Collection):
    @classmethod
    def create(cls, app, **args):
        post = GridPost(app, 'grid_post:' + randstr(), 'Grid', None)
        app.db.hmset(post.id, post.json())
        return post

    def __init__(self, app, id, title, posted, **kwargs):
        super(GridPost, self).__init__(app, id, title, posted, **kwargs)
        Collection.__init__(self)
        self._items_key = self.id + '.items'

    @property
    def items(self):
        return self.app.db.omget(self.app.db.lrange(self._items_key, 0, -1))

    def activate(self):
        for i in range(self.app.db.llen(self._items_key)):
            self.activate_item(i)

    def deactivate(self):
        for i in range(self.app.db.llen(self._items_key)):
            self.deactivate_item(i)

    def get_item(self, index):
        id = self.app.db.lindex(self._items_key, index)
        if not id:
            raise ValueError('index_out_of_range')
        return self.app.posts[id]

    def do_post(self, post):
        index = self.app.db.rpush(self._items_key, post.id) - 1
        self.activate_item(index)

    def do_remove_item(self, index):
        self.deactivate_item(index)
        post = self.get_item(index)
        self.app.db.lset(self._items_key, index, '__removed__')
        self.app.db.lrem(self._items_key, 0, '__removed__')
        return post

class Error(Exception):
    def json(self):
        return {'args': self.args, '__type__': type(self).__name__}

class ValueError(Error, exceptions.ValueError): pass

def randstr(length=8, charset=ascii_lowercase):
    return ''.join(choice(charset) for i in xrange(length))

# ==== Tests ====

from wall.test import TestCase, CommonPostTest, CommonCollectionTest, TestPost
from tempfile import NamedTemporaryFile

class CollectionTest(TestCase):
    def setUp(self):
        super(CollectionTest, self).setUp()
        self.collection = self.app

    def test_post_new(self):
        post = self.collection.post_new('TestPost')
        self.assertIsInstance(post, TestPost)
        self.assertIn(post, self.collection.items)

    def test_post_new_unknown_type(self):
        with self.assertRaises(ValueError):
            self.collection.post_new('foo')

class WallTest(TestCase, CommonCollectionTest):
    def setUp(self):
        super(WallTest, self).setUp()
        CommonCollectionTest.setUp(self)
        self.collection = self.app

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

    def test_post(self):
        CommonCollectionTest.test_post(self)
        post = self.app.post_new('TestPost')
        self.assertEqual(self.app.current_post, post)
        self.assertTrue(post.activate_called)
        self.app.post(post)
        self.assertTrue(post.deactivate_called)

    def test_get_history(self):
        posts = []
        posts.insert(0, self.app.post_new('TestPost'))
        posts.insert(0, self.app.post_new('TestPost'))
        self.assertEqual(posts, self.app.get_history()[0:2])

class TextPostTest(TestCase, CommonPostTest):
    def setUp(self):
        super(TextPostTest, self).setUp()
        CommonPostTest.setUp(self)
        self.post_type = TextPost
        self.create_args = {'content': 'Babylon 5'}

class ImagePostTest(TestCase, CommonPostTest):
    def setUp(self):
        super(ImagePostTest, self).setUp()
        CommonPostTest.setUp(self)
        self.post_type = ImagePost
        self.create_args = {'url': 'https://welcome.b5/logo.png'}

class GridPostTest(TestCase, CommonPostTest, CommonCollectionTest):
    def setUp(self):
        super(GridPostTest, self).setUp()
        CommonPostTest.setUp(self)
        CommonCollectionTest.setUp(self)
        self.post = self.app.post_new('GridPost')
        self.post_type = GridPost
        self.create_args = {}
        self.collection = self.post

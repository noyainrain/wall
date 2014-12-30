# Wall

# Python forward compatibility
from __future__ import (division, absolute_import, print_function,
    unicode_literals)

from wall import Brick, Post, Message, randstr
from wall.util import Event

class MixBrick(Brick):
    id = 'mix'

    def __init__(self, app):
        super(MixBrick, self).__init__(app)
        self.app.add_post_type(MixPost)
        self.app.add_message_handler('mix_post_update_track',
            self.mix_post_update_track_msg)
        self.app.add_event_listener('mix_post_track_added',
            self._mix_post_track_x)
        self.app.add_event_listener('mix_post_track_removed',
            self._mix_post_track_x)
        self.app.add_event_listener('mix_post_track_updated',
            self._mix_post_track_x)

    def mix_post_update_track_msg(self, msg):
        post = self.app.posts[msg.data['post_id']]
        post.update_track(msg.data['values'])
        return Message('mix_post_update_track')

    def _mix_post_track_x(self, event):
        self.app.sendall(Message(event.type, {
            'post_id': event.args['post'].id,
            'track': event.args['track'].json()
        }))

class MixPost(Post):
    @classmethod
    def create(cls, app, **args):
        post = MixPost(id='mix_post:' + randstr(), app=app, title='Mix',
            poster_id=app.user.id, posted=None)
        app.db.hmset(post.id, post.json())
        return post

    def __init__(self, **args):
        super(MixPost, self).__init__(**args)
        self._tracks = {}

    def activate(self):
        self.app.add_event_listener('disconnected', self._disconnected)

    def update_track(self, values):
        track = Track(self.app.user, values)
        event_type = 'mix_post_track_updated'
        if self.app.user not in self._tracks:
            event_type = 'mix_post_track_added'
        self._tracks[self.app.user] = track
        self.app.dispatch_event(Event(event_type, post=self, track=track))

    def _disconnected(self, event):
        user = event.args['client'].user
        if user in self._tracks:
            track = self._tracks.pop(user)
            self.app.dispatch_event(Event('mix_post_track_removed', post=self, track=track))

class Track(object):
    def __init__(self, user, values):
        self.user = user
        self.values = values

    def json(self):
        return {'user_id': self.user.id, 'values': self.values}

Brick = MixBrick

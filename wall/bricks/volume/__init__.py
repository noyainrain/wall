# Wall

# depends on amixer
# apt-get install amixer

# Python forward compatibility
from __future__ import (division, absolute_import, print_function,
        unicode_literals)

from wall import Brick as _Brick, randstr, Message
import subprocess, re

# TODO: deprecated. Integrate into client menu instead, once available.

class Brick(_Brick):
    id = 'volume'
    maintainer = 'Thomas Karmann <thomas AT krmnn.de>'
    js_module = 'wall.volume'
    post_type = 'VolumePost'

    # for client interface
    def set_volume(self, msg):
        # TODO: read device and interval from config
        soundcard = '0'
        mixer     = 'Master'

        if msg.data == 'down':
            diff = '5-'
        else:
            diff = '5+'

        cmd_setvol = 'amixer -c {0} sset {1} {2}'.format(soundcard, mixer, diff)
        setvol = subprocess.Popen(cmd_setvol, shell=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)

        # trigger the display
        new_post = VolumePost(randstr(), self.get_volume())
        self.app.sendall(Message('volume.update', vars(new_post)))

    def get_volume(self):
        # TODO: read device and interval from config
        soundcard = '0'
        mixer     = 'Master'
        cmd_getvol = 'amixer -c {0} sget {1}'.format(soundcard, mixer)
        getvol = subprocess.Popen(cmd_getvol, shell=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        getvol_output = getvol.stdout.read()
        volume =  re.sub('[\[\]]', '', getvol_output.split()[21])
        return volume

    def post_new(self, type, **args):
        self.app.msg_handlers['volume.set'] = self.set_volume;
        return VolumePost(randstr(), self.get_volume())

class VolumePost(object):
    def __init__(self, id, volume):
        self.id       = id
        self.volume   = volume
        self.__type__ = type(self).__name__

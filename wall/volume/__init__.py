# Wall

# depends on amixer
# apt-get install amixer

# Python forward compatibility
from __future__ import (division, absolute_import, print_function,
    unicode_literals)

from wall import Brick as _Brick, randstr
import subprocess, re

class Brick(_Brick):
    id        = 'volume'
    js_module = 'wall.volume'
    post_type = 'VolumePost'

    def post_new(self, type, **args):

        # TODO: read device and interval from config
        soundcard = "0"
        mixer = "Master"
        cmd_getvol = "amixer -c " + soundcard + " sget '" + mixer + "'"

        getvol = subprocess.Popen(cmd_getvol, shell=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        getvol_output = getvol.stdout.read()
        volume =  re.sub('[\[\]]', '', getvol_output.split()[21])

        return VolumePost(randstr(), volume)

class VolumePost(object):
    def __init__(self, id, volume):
        self.id       = id
        self.volume   = volume
        self.__type__ = type(self).__name__

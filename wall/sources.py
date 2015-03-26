# Wall

# Python forward compatibility
from __future__ import (division, absolute_import, print_function,
    unicode_literals)

from .wall import Source

class ImageSource(Source):
    def parse(self, url, headers):
        pass
    def fetch(self):
        supported_types = ['image/gif', 'image/jpeg', 'image/png', 'image/svg+xml']
        if headers.get('Content-Type') in supported_types:
            return (ImagePost, {'url': url})
        return None

class WebsiteSource(Source):
    pass

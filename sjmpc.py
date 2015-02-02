#!/usr/bin/env python2

# Wall

# Python forward compatibility
from __future__ import (division, absolute_import, print_function,
    unicode_literals)

import sys
import json
from argparse import ArgumentParser
import websocket
from websocket import WebSocketException
from wall import Message

class SjmpClient():
    def __init__(self):
        self._connection = None

    def run(self):
        parser = ArgumentParser()
        parser.add_argument('url')
        parser.add_argument('type')
        parser.add_argument('arg', type=namedarg, nargs='*')
        parser.add_argument('--auth-token')
        args = parser.parse_args()

        try:
            self._connection = websocket.create_connection(args.url)
        except ValueError as e:
            parser.error(
                "argument url: invalid url value: '{}'".format(args.url))
        except (IOError, WebSocketException) as e:
            print('error: failed to connect (details: {})'.format(e),
                file=sys.stderr)
            sys.exit(1)

        try:
            if args.auth_token:
                if not self._call('authenticate', {'token': args.auth_token}):
                    print('error: failed to authenticate')
                    sys.exit(1)
            result = self._call(args.type, dict(args.arg))
            self._connection.close()
        except WebSocketException as e:
            print('error: disconnected (details: {})'.format(e),
                file=sys.stderr)
            sys.exit(1)

        print(json.dumps(result, indent=4))

    def _call(self, type, args):
        self._connection.send(str(Message(type, args)))
        while True:
            msg = Message.parse(self._connection.recv())
            if msg.type == type:
                return msg.data

def namedarg(value):
    tokens = value.split('=', 1)
    if len(tokens) != 2 or not tokens[0]:
        raise ValueError('value_bad_format')
    # TODO: convert value to specific type (string, number, true, false, null)
    return tuple(tokens)

if __name__ == '__main__':
    SjmpClient().run()

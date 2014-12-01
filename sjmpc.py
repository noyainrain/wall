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
    def run(self):
        parser = ArgumentParser()
        parser.add_argument('url')
        parser.add_argument('type')
        parser.add_argument('arg', type=namedarg, nargs='*')
        args = parser.parse_args()

        try:
            connection = websocket.create_connection(args.url)
        except ValueError as e:
            parser.error(
                "argument url: invalid url value: '{}'".format(args.url))
        except (IOError, WebSocketException) as e:
            print('error: failed to connect (details: {})'.format(e),
                file=sys.stderr)
            sys.exit(1)

        try:
            call_msg = Message(args.type, dict(args.arg))
            connection.send(str(call_msg))
            while True:
                result_msg = Message.parse(connection.recv())
                if result_msg.type == call_msg.type:
                    break
            connection.close()
        except WebSocketException as e:
            print('error: disconnected (details: {})'.format(e),
                file=sys.stderr)
            sys.exit(1)

        print(json.dumps(result_msg.data, indent=4))

def namedarg(value):
    tokens = value.split('=', 1)
    if len(tokens) != 2 or not tokens[0]:
        raise ValueError('value_bad_format')
    # TODO: convert value to specific type (string, number, true, false, null)
    return tuple(tokens)

if __name__ == '__main__':
    SjmpClient().run()

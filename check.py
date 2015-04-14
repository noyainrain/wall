#!/usr/bin/env python2

# Wall

"""Run the Wall code quality checks."""

# Python forward compatibility
from __future__ import (division, absolute_import, print_function,
                        unicode_literals)

import sys
from unittest import TextTestRunner, defaultTestLoader
from pylint.lint import PyLinter

def main():
    """Run the Wall code quality checks."""
    print('Running unit tests...')
    # TODO: tests = defaultTestLoader.discover('.')
    tests = defaultTestLoader.loadTestsFromNames(
        ['wall', 'wall.util', 'wall.bricks.url'])
    test_result = TextTestRunner(stream=sys.stdout).run(tests)

    print('\nLinting...')
    linter = PyLinter()
    linter.load_default_plugins()
    linter.load_file_configuration()
    # TODO: linter.check(['wall', 'runwall.py', 'sjmpc.py', 'check.py'])
    linter.check(['wall.util', 'runwall.py', 'check.py'])

    if not (test_result.wasSuccessful() and linter.msg_status == 0):
        return 1

    print("\nEverything looks fine, good work!")
    return 0

if __name__ == '__main__':
    sys.exit(main())

#!/usr/bin/env python2

# Wall

"""Run the Wall code quality checks."""

# Python forward compatibility
from __future__ import (division, absolute_import, print_function,
                        unicode_literals)

import sys
from unittest import TextTestRunner, defaultTestLoader
from pylint.lint import PyLinter
from wall.lib.checkre import (
    checkre, line_length_check, simple_indentation_check, trailing_space_check,
    header_check, whitespace_check, newline_at_eof_check)

def main():
    """Run the Wall code quality checks."""
    print('Running unit tests...')
    # TODO: tests = defaultTestLoader.discover('.')
    tests = defaultTestLoader.loadTestsFromNames(
        ['wall', 'wall.util', 'wall.bricks.url'])
    test_result = TextTestRunner(stream=sys.stdout).run(tests)

    print('\nLinting (Python)...')
    linter = PyLinter()
    linter.load_default_plugins()
    linter.load_file_configuration()
    linter.load_configuration(ignore='lib')
    # TODO: linter.check(['wall', 'walld.py', 'sjmpc.py', 'check.py'])
    linter.check(['wall.util', 'walld.py', 'check.py'])

    print('\nLinting (text)...')
    checkre_result = checkre({
        (
            r'(?!.*/lib/).*\.(html|css)',
            r'wall/res/default.cfg',
            r'wall/res/static/(display|remote)/config.default.json',
            r'pylintrc'
        ): (
            line_length_check(),
            simple_indentation_check(),
            trailing_space_check(),
            whitespace_check(),
            newline_at_eof_check()
        ),
        r'(?!.*/lib/).*\.md': (
            line_length_check(),
            trailing_space_check(),
            whitespace_check(),
            newline_at_eof_check()
        ),
        r'(?!.*/lib/|walld.py|sjmpc.py|check.py).*\.py':
            header_check('wall/__init__.py', 2),
        r'(?!.*/lib/).*\.js': header_check('wall/res/static/wall.js', 4)
    })

    if (not test_result.wasSuccessful() or linter.msg_status != 0
            or checkre_result != 0):
        return 1

    print('\nEverything looks fine, good work!')
    return 0

if __name__ == '__main__':
    sys.exit(main())

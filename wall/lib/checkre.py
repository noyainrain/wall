# checkre
# https://github.com/NoyaInRain/util/blob/master/checkre.py
# by Sven James <sven.jms AT gmail.com>
# released into the public domain

"""Utility to check files against regular expressions.

This is useful to search and report illegal patterns in a set of text files,
like violations of style/coding conventions. A few simple checks are included
with the module.
"""

# TODO: add main()
# TODO: support config file (e.g. JSON)

# Python forward compatibility
from __future__ import (division, absolute_import, print_function,
                        unicode_literals)

import os
import re
import logging
from io import open
from itertools import islice

def checkre(config, path='.'):
    """Check files against regular expressions.

    All files in `path` are examined (recursively).

    `config` is a dictionary that maps a set of files to a set of checks. A file
    set is defined by a path pattern (relative to the given `path`). A check is
    a tuple `(pattern, msg)`. Checks are applied by searching for `pattern` and
    reporting `msg` for any match.
    """
    logger = logging.getLogger('checkre')

    # Normalize config
    input_config = config
    config = {}
    for file_patterns, checks in input_config.items():
        if isinstance(file_patterns, basestring):
            file_patterns = (file_patterns, )
        if isinstance(checks[0], basestring):
            checks = (checks, )
        for file_pattern in file_patterns:
            config[file_pattern] = checks

    # TODO: report errors
    files = (os.path.relpath(os.path.join(p, f), path)
             for p, ds, fs in os.walk(path) for f in fs)

    # Check...
    result = 0
    for file in files:
        logger.debug('examining %s', file)
        content = None
        for file_pattern, checks in config.items():
            if re.match(file_pattern + '$', file):
                logger.debug('file matches "%s", running checks', file_pattern)
                if not content:
                    # TODO: report error
                    content = (open(os.path.join(path, file), newline='\n')
                               .read())
                for pattern, msg in checks:
                    for match in re.finditer(pattern, content, re.MULTILINE):
                        line = content.count('\n', 0, match.start()) + 1
                        print('{}:{}: {}'.format(file, line, msg))
                        result = 1

    return result

def line_length_check(length=80):
    """Check to ensure that lines are no longer than `length` characters.

    Long lines that contain an URL or string are okay though.
    """
    # TODO: validate input
    return (r'^(?!.*(://|\'.*\'|".*")).{{{}}}'.format(length + 1),
            'line is longer than {} characters'.format(length))

def simple_indentation_check(width=4):
    """Simple check to ensure that indentation has a consistent width.

    More precisely, checks that indentation is a multiple of `width` spaces.
    C-style comments are accounted for and indentation in XML/HTML comments and
    continuations is ignored.
    """
    # TODO: validate input
    # C-style comments
    prefix_exceptions = [r'[ ]\*']
    # XML/HTML comments and continuations
    # NOTE: CSS continuations could be ('\w+:', ';\n')
    span_exceptions = [(r'<!--', r'-->'), (r'<\w', r'[\'"/]>')]
    span_exceptions = [
        r'((?!{})[\s\S])*{}'.format(e[0], e[1]) for e in span_exceptions]
    exceptions = '|'.join(prefix_exceptions + span_exceptions)
    pattern = r'^([ ]{{{}}})*(?!{})[ ]{{1,{}}}\S'.format(width, exceptions,
                                                         width - 1)
    msg = ('indentation has inconsistent width (not multiple of {} spaces)'
           .format(width))
    return (pattern, msg)

def trailing_space_check():
    """Check to ensure that lines don't end with trailing spaces."""
    return (r'[ ]$', 'trailing space')

def header_check(file, length):
    """Check to ensure that the file header matches a reference header.

    `file` contains the reference header. It can be given either as a path,
    which will be opened, or as a stream. The first `length` lines are compared.

    If there is a problem reading from (or opening) `file`, an `IOError` is
    raised.
    """
    # TODO: validate input
    if isinstance(file, basestring):
        file = open(file)
    header = ''.join(islice(file, length))
    return (r'\A(?!{})'.format(re.escape(header)), 'header is not as expected')

def whitespace_check():
    """Check to ensure that the file doesn't contain an invalid whitespace.

    Only space and newline are considered valid characters.
    """
    return (r'[^ \n\S]', 'invalid whitespace (not space, newline)')

def newline_at_eof_check():
    """Check to ensure that the file ends with a newline character."""
    return (r'[^\n]\Z', 'no newline at EOF')

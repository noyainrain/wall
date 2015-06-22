Contributing to Wall
====================

## How to Contribute

1. For any non-trivial change:
   1. [Create an issue](https://github.com/NoyaInRain/wall/issues) describing
      the intended change [1]
   2. Receive feedback and adjust the draft accordingly
2. Create a topic branch
3. Code...
4. Run the code quality checks with `python check.py` and fix possible issues
5. [Create a pull request](https://github.com/NoyaInRain/wall/pulls)
6. Receive feedback and adjust the change accordingly
7. The change is merged \o/

Please make sure to follow the Wall *Conventions*.

[1] A good description contains:

* if the API or Web API is modified, any method signature (including a
  description of the return value and possible errors) and object signature
  (including a descripton of the properties)
* if the UI is modified, a simple sketch
* if a new dependency is introduced, a short description of the dependency and
  possible alternatives and the reason why it is the best option

## Development Dependencies

* Pylint >= 1.3 (for `check.py`)
* websocket-client >= 0.12 (for `sjmpc.py`)

## Testing

To run all Wall test cases, type:

    python -m unittest -v wall wall.util wall.bricks.url

## Conventions

### General

* Consistency: take a look around and be consistent with what you see
* [KISS](https://en.wikipedia.org/wiki/KISS_principle)
* [DRY](https://en.wikipedia.org/wiki/Don%27t_repeat_yourself)
* Python: [style guide](https://www.python.org/dev/peps/pep-0008/)
* HTML: [void elements](http://www.w3.org/TR/html5/syntax.html#void-elements)
  use self-closing notation, e.g. `<br />`.
* For dependencies, the version available in Debian stable is prefered. This
  should simplify the installation of Wall (dependencies) on a wide range of
  systems.

### Methods

Public methods/functions should:

* validate all input (i.e. arguments)
* validate the current state if necessary
* have one or more accompanying unit tests (unless the functionality is trivial)

### Pylint

We use Pylint to enforce code conventions (for configuration details see
`pylintrc`). If, in certain circumstances, an exception from a rule is
reasonable, mark the affected line (or block) with

    # <reason>, pylint: disable=<msg>

where `msg` is the name of a
[Pylint message](http://docs.pylint.org/features.html) and `reason` is a tiny
description why the rule is broken.

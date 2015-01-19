Wall Developer Documentation
============================

Testing
-------

To run all Wall test cases, type:

    python -m unittest -v wall wall.util wall.bricks.url

How to Contribute
-----------------

 1. If the change modifies / introduces an interface (i.e. API, Web API, UI):
    1. [Create an issue](https://github.com/NoyaInRain/wall/issues) describing
       the modification / the new interface
    2. Receive feedback and adjust the draft
 2. Code...
 3. [Create a pull request](https://github.com/NoyaInRain/wall/pulls)
 4. Receive feedback and adjust the code
 5. The change is merged. \o/

Please make sure to follow the Wall *Conventions*.

Conventions
-----------

### General

 * Consistency: take a look around and be consistent with what you see
 * [KISS](https://en.wikipedia.org/wiki/KISS_principle)
 * [DRY](https://en.wikipedia.org/wiki/Don%27t_repeat_yourself)
 * [Style Guide for Python Code](https://www.python.org/dev/peps/pep-0008/)

### Interface

The following conventions apply to interfaces (i.e. API, Web API, UI):

 * Functions should...
   * validate all input (i.e. arguments)
   * validate the current state
   * have documentation
   * have one or more accompanying unit tests (unless the functionality is
     trivial)
 * Classes (including attributes) should...
   * have documentation

If a mentioned requirement is not met, this must be stated as `TODO`.

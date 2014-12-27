Wall Developer Documentation
============================

Testing
-------

To run all Wall test cases, type:

    python -m unittest -v wall wall.util wall.bricks.url

Coding Conventions
------------------

### Public Interface

 * Functions should…
   * validate all input (i.e. arguments)
   * validate the current state
   * have documentation
   * have one or more accompanying unit test (unless the functionality is
     trivial)
 * Classes (including attributes) should…
   * have documentation

If a requirement is not met, this must be clearly stated as TODO.

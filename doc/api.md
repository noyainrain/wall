Wall API
========

SJMP - Simple JSON Message Protocol
-----------------------------------

*SJMP* is a protocol for exchanging simple *JSON* messages over a *WebSocket*. A
*message* is defined as a *JSON object* with two attributes:

 * `type`: user defined type of the *message*. A non-empty *JSON string*.
 * `body`: content of the *message*. Any *JSON value* (including `null`).

Example:

```json
{
    "type": "status",
    "body": "okay"
}
```

### SJMP Calls

Additionally, a *client* can call a method of a *server* and retrieve the
result. A *call message* is defined as a *message*, where `type` is set to the
call type (i.e. method name) and `body` contains the named call / method
arguments as *JSON object*.

Example:

```json
{
    "type": "sum",
    "body": {
        "a": 1,
        "b": 2
    }
}
```

The *server* responds with a *result message*, which is defined as a *message*,
where `type` is set to the `type` of the corresponding *call message* and `body`
contains the result.

Example:

```json
{
    "type": "sum",
    "body": 3
}
```

Post Types
----------

These are the core post types bundled with Wall:

 * Text (`text_post`)
 * Image (`image_post`)
 * URL (`url_post`)

Further post types can be introduced by extensions.

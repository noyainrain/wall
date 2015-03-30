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

### Authentication

```
authenticate: token
```

Authenticate an user. `token` is a secret authentication token that identifies
the user. If the authentication is successful, a non-`null` value (for example a
representation of the user) is returned, if it fails `null`.

Calls
-----

```
get_history
```

```
collection_get_items: collection_id
```

Return list of posts in the collection given by `collection_id`.

```
collection_post: collection_id, post_id
```

Allowed: authenticated user, if `allow_modification_by_authenticated` is set, or
trusted user.

```
collection_post_new: collection_id, type, …
```

Allowed: authenticated user, if `allow_modification_by_authenticated` is set, or
trusted user.

```
collection_remove_item: collection_id, index
```

Remove the post at `index` from the collection given by `collection_id`. The
removed post is returned. May return a `ValueError('index_out_of_range')`.

Allowed: poster of the item to remove or trusted user.

```
login: name
```

Log in an user (device). A new user is created and returned. `name` is the
requested user name. If it is already taken by someone else, a
`user_name_exists` error is returned.

The `session` attribute of the new user can be used as authentication token. See
*Authentication*.

Events
------

```
collection_posted: collection_id, post
```

```
collection_item_removed: collection_id, index, post
```

```
collection_item_activated: collection_id, index, post
```

```
collection_item_deactivated: collection_id, index, post
```

Objects
-------

### User

Wall user.

Attributes:

 * `name`: name.
 * `trusted`: is the user trusted?
 * `session`: current session id (and authentication token).
 * `ap`: current access point (e.g. IP address).

### Post

Post.

Attributes:

 * `title`: title.
 * `poster_id`: id of the `User` who posted the post.
 * `posted`: time the post was posted.

### Collection

Collection of posts.

Attributes:

 * `limit`: maximum number of items.
 * `allow_modification_by_authenticated`: allow authenticated users to modify
   the collection?

Post Types
----------

These are the core post types bundled with Wall:

 * Text (`text_post`)
 * Image (`image_post`)
 * URL (`url_post`)

Further post types can be introduced by extensions.

Errors
------

 * `PermissionError`: raised if a user is not allowed to call a method.

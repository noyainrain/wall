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
the user. `true` is returned if the authentication is successful, `false`
otherwise.

Calls
-----

```
get_history
```

`post_edit: post_id, attrs...`

Edit the post given by `post_id`.

`attrs` are the attributes to modify. Which attributes can be modified depends
on the post type. See the specific post type's documentation for more
information.

If a given attribute has an invalid value, a `ValueError` is returned.

```
collection_get_items: collection_id
```

```
collection_post: collection_id, post_id
```

```
collection_post_new: collection_id, type, …
```

```
collection_remove_item: collection_id, index
```

Events
------

`post_edited`

Dispatched when a post has been edited.

* `post`: the modified post.

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

```
login: name
```

Log in an user (device). A new user is created and returned. `name` is the
requested user name. If it is already taken by someone else, a
`user_name_exists` error is returned.

The `session` attribute of the new user can be used as authentication token. See
*Authentication*.

Objects
-------

### User

Wall user.

Attributes:

 * `name`: name.
 * `session`: current session id (and authentication token).
 * `ap`: current access point (e.g. IP address).

### Collection

Collection of posts.

Attributes:

* `is_collection`: hint that this is a collection. Always `true`.

### Post

Post.

Attributes:

* `title`: title.
* `poster_id`: id of the `User` who posted the post.
* `posted`: time the post was posted.

`title` is editable.

### Post Types

The following are the core post types bundled with Wall. Further post types can
be introduced by extensions.

#### TextPost

Text post.

Extends `Post`.

Attributes:

* `content`: text content.

`content` is editable.

#### ImagePost

Image post.

Extends `Post`.

Attributes:

* `url`: URL of the image.

#### GridPost

Grid post.

Extends `Post` and `Collection`.

#### UrlPost

URL post.

Extends `Post`.

Attributes:

* `url`: URL.

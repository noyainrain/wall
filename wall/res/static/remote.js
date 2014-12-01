/*
 * Wall
 */

wall.remote = {};
(function(ns) {

/* ==== RemoteUi ==== */

/**
 * Wall remote user interface.
 */
ns.RemoteUi = function() {
    wall.Ui.call(this);

    this.screenStack = [];
    this.mainScreen = null;
    this.doPostHandlers = [];
    this.baseUrl = "/static/remote/";
    this.brickType = "ClientBrick";
};

ns.RemoteUi.prototype = Object.create(wall.Ui.prototype, {
    // TODO: document
    init: {value: function() {
        if (!this.isBrowserSupported()) {
            document.body.innerHTML =
                'Your browser is outdated. Please use a decent browser like <a href="https://play.google.com/store/apps/details?id=org.mozilla.firefox">Firefox</a> or <a href="https://play.google.com/store/apps/details?id=com.android.chrome">Chrome</a>.';
            return Promise.resolve();
        }
        window.onerror = this._erred.bind(this);

        return this.loadConfig().then(function() {
            this.initCommon();

            this.addEventListener("collection_item_activated",
                this._itemActivated.bind(this));
            this.addEventListener("collection_item_deactivated",
                this._itemDeactivated.bind(this));

            if (!wall.util.isArray(this.config.do_post_handlers, "string")) {
                throw new wall.util.ConfigurationError(
                    "do_post_handlers_invalid_type");
            }
            var handlers = wall.util.createSet(this.config.do_post_handlers);

            handlers.forEach(function(handler) {
                if (["note", "history"].indexOf(handler) === -1) {
                    throw new wall.util.ConfigurationError(
                        "do_post_handlers_unknown_item");
                }
                switch (handler) {
                case "note":
                    this.addDoPostHandler(
                        new ns.ScreenDoPostHandler(ns.PostNoteScreen, "Note",
                            "/static/images/note.svg", this));
                    break;
                case "history":
                    this.addDoPostHandler(
                        new ns.ScreenDoPostHandler(ns.PostHistoryScreen,
                            "History", "/static/images/history.svg", this));
                    break;
                }
            }, this);

            return this.loadBricks();
        }.bind(this)).then(function() {
            this.mainScreen = new ns.PostScreen(this);
            this.mainScreen.hasGoBack = false;
            this.showScreen(this.mainScreen);
            this.showScreen(new ns.ConnectionScreen(this));

            this.connect();
        }.bind(this));
    }},

    notify: {value: function(msg) {
        $("#notification").text(msg).show();
    }},

    // TODO: document
    notifyError: {value: function(error) {
        this.notify("Fatal error: " + error.message);
    }},

    closeNotification: {value: function() {
        $("#notification").hide();
    }},

    showScreen: {value: function(screen) {
        // backward compatibility: wrap HTML elements as pseudo Screen objects
        // TODO: port all (HTML element) screens to Screen type and remove this
        if (screen instanceof $) {
            screen = {
                element: screen[0],
                attachedCallback: function() {},
                detachedCallback: function() {}
            };
        }

        this.screenStack.push(screen);

        screen.element.classList.add("screen-pushed");
        screen.element.style.zIndex = this.screenStack.length - 1;
        document.querySelector(".screen-stack").appendChild(screen.element);
        screen.attachedCallback();

        // apply screen style (so that subsequent style changes may trigger
        // animations)
        getComputedStyle(screen.element).width;

        screen.element.classList.add("screen-open")
        screen.element.classList.remove("screen-pushed");
    }},

    popScreen: {value: function() {
        var screen = this.screenStack.pop();

        screen.element.classList.add("screen-popped");
        screen.element.classList.remove("screen-open");
        $(screen.element).one("transitionend", function(event) {
            screen.element.classList.remove("screen-popped");
            document.querySelector(".screen-stack").removeChild(screen.element);
            screen.detachedCallback();
        }.bind(this));
    }},

    post: {value: function(collectionId, postId, callback) {
        this.call("collection_post",
            {"collection_id": collectionId, "post_id": postId}, callback);
    }},

    postNew: {value: function(collectionId, type, args, callback) {
        this.call("collection_post_new",
            $.extend({"collection_id": collectionId, "type": type}, args),
            callback);
    }},

    addDoPostHandler: {value: function(handler) {
        this.doPostHandlers.push(handler);
    }},

    isBrowserSupported: {value: function() {
        return "WebSocket" in window;
    }},

    _connect: {value: function() {
        wall.Ui.prototype._connect.call(this);
        this.screenStack[this.screenStack.length - 1].setState(
            this.connectionState);
    }},

    _opened: {value: function(event) {
        wall.Ui.prototype._opened.call(this, event);
        this.popScreen();
    }},

    _closed: {value: function(event) {
        wall.Ui.prototype._closed.call(this, event);
        if (this.connectionState == "disconnected") {
            this.showScreen(new ns.ConnectionScreen(this));
        }
        this.screenStack[this.screenStack.length - 1].setState(
            this.connectionState);
    }},

    _erred: {value: function(message, url, line, column, error) {
        this.notifyError(error);
    }},

    _itemActivated: {value: function(event) {
        if (event.args.collection_id !== "wall") {
            return;
        }
        this.mainScreen.post = event.args.post;
    }},

    _itemDeactivated: {value: function(event) {
        if (event.args.collection_id !== "wall") {
            return;
        }
        this.mainScreen.post = null;
    }}
});

/* ==== Screen ==== */

ns.Screen = function(ui) {
    wall.Element.call(this, ui);
    this._title = null;
    this._hasGoBack = true;

    this.element = wall.util.cloneChildNodes(
        document.querySelector(".screen-template")).firstElementChild;
    this.content = this.element.querySelector(".screen-content");
    this.element.querySelector(".screen-settings").addEventListener(
        "click", this._settingsClicked.bind(this));
    this.element.querySelector(".screen-go-back").addEventListener(
        "click", this._goBackClicked.bind(this));

    this.title = null;
};

ns.Screen.prototype = Object.create(wall.Element.prototype, {
    title: {
        set: function(value) {
            this._title = value;
            this.element.querySelector("header.bar").style.display =
                this._title ? "" : "none";
            this.element.querySelector("header.bar h1").textContent =
                this._title || "";
        },
        get: function() {
            return this._title;
        }
    },

    hasGoBack: {
        set: function(value) {
            this._hasGoBack = value;
            this.element.querySelector(".screen-go-back").style.display =
                this._hasGoBack ? "" : "none";
        },
        get: function() {
            return this._hasGoBack;
        }
    },

    _settingsClicked: {value: function(event) {
        // TODO: implement settings
        location.reload();
    }},

    _goBackClicked: {value: function(event) {
        this.ui.popScreen();
    }}
});

/* ==== PostScreen ==== */

ns.PostScreen = function(ui, post) {
    post = post || null;

    ns.Screen.call(this, ui);
    this._post = null;
    this._postElement = null;

    $(this.element).addClass("post-screen");
    $(this.content).append($(
        '<div class="post-space"></div>' +
        '<div class="post-menu"></div> '
    ));

    // build post menu
    for (var i = 0; i < this.ui.doPostHandlers.length; i++) {
        var handler = this.ui.doPostHandlers[i];
         $("<button>")
             .text(handler.title)
             .css("background-image", "url(" + handler.icon + ")")
             .data("handler", handler)
             .click(this._postMenuItemClicked.bind(this))
            .appendTo($(".post-menu", this.content));
    }

    this.title = "Empty Wall";
    this.post = post;
};

ns.PostScreen.prototype = Object.create(ns.Screen.prototype, {
    post: {
        set: function(value) {
            // TODO: implement (remote) PostElement

            if (this._post) {
                this._post = null;
                if (this._postElement) {
                    $(".post-space", this.content).empty();
                    this._postElement.detachedCallback();
                    this._postElement = null;
                }
                this.title = "Empty Wall";
            }

            this._post = value;
            if (!this._post) {
                return;
            }

            var postElementType =
                this.ui.postElementTypes[this._post.__type__];
            if (postElementType) {
                this._postElement =
                    new postElementType(this._post, this.ui);
                $(".post-space", this.content).append(
                    this._postElement.element);
                this._postElement.attachedCallback();
            }
            this.title = this._post.title;
        },
        get: function() {
            return this._post;
        }
    },

    detachedCallback: {value: function() {
        this.post = null;
    }},

    _postMenuItemClicked: {value: function(event) {
        var handler = $(event.currentTarget).data("handler");
        handler.post("wall");
     }}
});

/* ==== ConnectionScreen ==== */

ns.ConnectionScreen = function(ui) {
    ns.Screen.call(this, ui);
    this.element.classList.add("connection-screen");
    this.content.appendChild(wall.util.cloneChildNodes(
        document.querySelector(".connection-screen-template")));
    this.title = "Connection";
    this.hasGoBack = false;
};

ns.ConnectionScreen.prototype = Object.create(ns.Screen.prototype, {
    setState: {value: function(state) {
        var stateP = this.element.querySelector(".connection-screen-state");
        var detailP = this.element.querySelector(".connection-screen-detail");

        switch (state) {
        case "connecting":
            stateP.textContent = "Connecting...";
            detailP.textContent = "";
            break;
        case "failed":
            stateP.textContent = "Failed to connect!";
            detailP.textContent = "Retrying shortly.";
            break;
        case "disconnected":
            stateP.textContent = "Connection lost!";
            detailP.textContent = "Trying to reconnect shortly.";
            break;
        }
    }}
});

/* ==== NotSupportedScreen ==== */

ns.NotSupportedScreen = function(what, ui) {
    ns.Screen.call(this, ui);
    this.what = what;

    $(this.content).append($('<p>Unfortunately, your browser does not support <span class="not-supported-what"></span>. Please use a current browser.</p>'));
    $(".not-supported-what", this.content).text(what);
    this.title = "Not Supported";
};

ns.NotSupportedScreen.prototype = Object.create(ns.Screen.prototype);

/* ==== DoPostScreen ==== */

ns.DoPostScreen = function(ui) {
    ns.Screen.call(this, ui);
    this.collectionId = null;
}

ns.DoPostScreen.prototype = Object.create(ns.Screen.prototype);

/* ==== PostNoteScreen ==== */

ns.PostNoteScreen = function(ui) {
    ns.DoPostScreen.call(this, ui);

    $(this.content).append($(
        '<form class="post-note-screen-post">                            ' +
        '    <textarea name="content"></textarea>                        ' +
        '    <p class="buttons">                                         ' +
        '        <button><img src="static/images/post.svg"/>Post</button>' +
        '    </div>                                                      ' +
        '</form>                                                         '
    ));
    var form = this.content.querySelector(".post-note-screen-post");
    form.addEventListener("submit", this._postSubmitted.bind(this));

    this.title = "Post Note";
};

ns.PostNoteScreen.prototype = Object.create(ns.Screen.prototype, {
    _postSubmitted: {value: function(event) {
        event.preventDefault();

        var content =
            this.content.querySelector(".post-note-screen-post textarea").value;

        this.ui.notify("Posting…");
        this.ui.postNew(this.collectionId, "TextPost", {content: content},
            function(post) {
                this.ui.closeNotification();
                if (post.__type__ == "ValueError" &&
                    post.args[0] == "content_empty")
                {
                    this.ui.notify("Some content for the note is required.");
                    return;
                }
                this.ui.popScreen();
            }.bind(this));
    }}
});

/* ==== PostHistoryScreen ==== */

ns.PostHistoryScreen = function(ui) {
    ns.DoPostScreen.call(this, ui);
    this.title = "History";

    $(this.element).addClass("post-history-screen");
    $(this.content).append($('<ul class="select"></ul>'));

    this.ui.call("get_history", {}, function(posts) {
        posts.forEach(function(post) {
            var li = $("<li>")
                .data("post", post)
                .click(this._postClicked.bind(this))
                .appendTo($("ul", this.content));
            $("<p>").text(post.title).appendTo(li);
        }, this);
    }.bind(this));
};

ns.PostHistoryScreen.prototype = Object.create(ns.Screen.prototype, {
    _postClicked: {value: function(event) {
        var post = $(event.currentTarget).data("post");
        this.ui.post(this.collectionId, post.id, function(error) {
            // TODO: error handling
            this.ui.popScreen();
        }.bind(this));
    }}
});

/* ==== DoPostHandler ==== */

ns.DoPostHandler = function(ui) {
    this.ui = ui;
    this.title = null;
    this.icon = null;
};

ns.DoPostHandler.prototype = Object.create(Object.prototype, {
    post: {value: function(collectionId) {}}
});

/* ==== ScreenDoPostHandler ==== */

ns.ScreenDoPostHandler = function(screenType, title, icon, ui) {
    ns.DoPostHandler.call(this, ui);
    this.screenType = screenType;
    this.title = title;
    this.icon = icon;
};

ns.ScreenDoPostHandler.prototype = Object.create(ns.DoPostHandler.prototype, {
    post: {value: function(collectionId) {
        var screen = new this.screenType(this.ui);
        screen.collectionId = collectionId;
        this.ui.showScreen(screen);
    }}
});

/* ==== SingleDoPostHandler ==== */

ns.SingleDoPostHandler = function(postType, title, icon, ui) {
    ns.DoPostHandler.call(this, ui);
    this.postType = postType;
    this.title = title;
    this.icon = icon;
};

ns.SingleDoPostHandler.prototype = Object.create(ns.DoPostHandler.prototype, {
    post: {value: function(collectionId) {
        this.ui.postNew(collectionId, this.postType, {}, function(post) {});
    }}
});

}(wall.remote));

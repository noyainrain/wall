/*
 * Wall
 */

wall.remote = {};
(function(ns) {

/* ==== RemoteUi ==== */

/**
 * Wall remote user interface.
 *
 * Attributes:
 *
 * - `user`: active user.
 * - `mainScreen`: main post screen.
 * - `connectionScreen`: connection screen.
 */
ns.RemoteUi = function() {
    wall.Ui.call(this);

    this.user = null;
    this.screenStack = [];
    this.mainScreen = null;
    this.connectionScreen = null;
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

            if (localStorage.user) {
                this.user = JSON.parse(localStorage.user);
            }

            this.addEventListener("collection_item_activated",
                this._itemActivated.bind(this));
            this.addEventListener("collection_item_deactivated",
                this._itemDeactivated.bind(this));
            this.addPostElementType(ns.GridPostElement);

            if (!wall.util.isArray(this.config.do_post_handlers, "string")) {
                throw new wall.util.ConfigurationError(
                    "do_post_handlers_invalid_type");
            }
            var handlers = wall.util.createSet(this.config.do_post_handlers);

            handlers.forEach(function(handler) {
                if (["note", "grid", "history"].indexOf(handler) === -1) {
                    throw new wall.util.ConfigurationError(
                        "do_post_handlers_unknown_item");
                }
                switch (handler) {
                case "note":
                    this.addDoPostHandler(
                        new ns.ScreenDoPostHandler(ns.PostNoteScreen, "Note",
                            "fa fa-file-text fa-fw", this));
                    break;
                case "grid":
                    this.addDoPostHandler(new ns.GridDoPostHandler(this));
                    break;
                case "history":
                    this.addDoPostHandler(
                        new ns.ScreenDoPostHandler(ns.PostHistoryScreen,
                            "History", "fa fa-history fa-fw", this));
                    break;
                }
            }, this);

            return this.loadBricks();
        }.bind(this)).then(function() {
            this.mainScreen = new ns.PostScreen(this);
            this.mainScreen.hasGoBack = false;
            this.connectionScreen = new ns.ConnectionScreen();
            this.showScreen(this.mainScreen);
            this.showScreen(this.connectionScreen);

            this.connect();
        }.bind(this));
    }},

    initConnection: {value: function() {
        var p;
        if (this.user) {
            p = this.call("authenticate", {token: this.user.session});
        } else {
            p = Promise.resolve(null);
        }
        return p.then(function(user) {
            this.popScreen(); // ConnectionScreen
            if (user !== null) {
                this.user = user;
                localStorage.user = JSON.stringify(this.user);
            } else {
                this.showScreen(new ns.LoginScreen());
            }
        }.bind(this));
    }},

    connect: {value: function() {
        wall.Ui.prototype.connect.call(this);
        this.connectionScreen.setState(this.connectionState);
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

    _closed: {value: function(event) {
        wall.Ui.prototype._closed.call(this, event);
        if (this.connectionState === "disconnected") {
            this.showScreen(this.connectionScreen);
        }
        this.connectionScreen.setState(this.connectionState);
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

ns.Screen = function() {
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
    this._hasPostMenu = true;

    this.element.classList.add("post-screen");
    var postSpace = document.createElement("div");
    postSpace.classList.add("post-space");
    this.content.appendChild(postSpace);

    this._postMenu = new ns.PostMenu(this.ui);
    // TODO: if (settings.allow_post_for_untrusted || ...
    if (ui.user && ui.user.trusted) {
        this._postMenu.addTarget("wall", "Wall");
    }
    this.content.appendChild(this._postMenu.element);
    this._postMenu.attachedCallback();

    this.title = "Empty Wall";
    this.post = post;
};

ns.PostScreen.prototype = Object.create(ns.Screen.prototype, {
    post: {
        set: function(value) {
            // TODO: implement (remote) PostElement
            var postSpace = this.element.querySelector(".post-space");

            if (this._post) {
                if (this._postElement) {
                    postSpace.removeChild(this._postElement.element);
                    this._postElement.detachedCallback();
                    this._postElement = null;
                }
                this.title = "Empty Wall";
                if (this._post.is_collection) {
                    this._postMenu.removeTarget(this._post.id);
                }
                this._post = null;
            }

            this._post = value;
            if (!this._post) {
                return;
            }

            var postElementType = this.ui.postElementTypes[this._post.__type__];
            if (postElementType) {
                this._postElement =
                    new postElementType(this._post, this.ui);
                postSpace.appendChild(this._postElement.element);
                this._postElement.attachedCallback();
            }
            this.title = this._post.title;
            if (this._post.is_collection) {
                // TODO: if (this._post.allow_post_for_untrusted || ui.user.trusted) {
                    this._postMenu.addTarget(this._post.id, this._post.title);
                    this._postMenu.selectTarget(this._post.id);
                //}
            }
        },
        get: function() {
            return this._post;
        }
    },

    hasPostMenu: {
        get: function() {
            return this._hasPostMenu;
        },
        set: function(value) {
            this._hasPostMenu = value;
            this._postMenu.element.style.display =
                this._hasPostMenu ? "" : "none";
        }
    },

    detachedCallback: {value: function() {
        this.post = null;
    }}
});

/* ==== ConnectionScreen ==== */

/**
 * Connection screen.
 */
ns.ConnectionScreen = function() {
    ns.Screen.call(this);
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

/* ==== LoginScreen ==== */

/**
 * Login screen.
 */
ns.LoginScreen = function() {
    ns.Screen.call(this);
};

ns.LoginScreen.prototype = Object.create(ns.Screen.prototype, {
    attachedCallback: {value: function() {
        ns.Screen.prototype.attachedCallback.call(this);
        this.title = "Log in";
        this.hasGoBack = false;
        this._loginSubmittedHandler = this._loginSubmitted.bind(this);

        var template = document.querySelector(".login-screen-template");
        this.content.appendChild(wall.util.cloneChildNodes(template));
        this.content.querySelector(".login-screen-login")
            .addEventListener("submit", this._loginSubmittedHandler);
    }},

    _loginSubmitted: {value: function(event) {
        event.preventDefault();
        var name = this.content
            .querySelector('.login-screen-login input[name="name"]').value;
        ui.notify("Logging in...")
        ui.call("login", {name: name}).then(function(user) {
            ui.closeNotification();
            if (user.__type__ === "ValueError") {
                this.ui.notify({
                    "name_empty": "Name is missing.",
                    "user_name_exists": "Name is already taken by another user."
                }[user.args[0]]);
                return;
            }

            ui.user = user;
            localStorage.user = JSON.stringify(ui.user);
            ui.popScreen(); // LoginScreen
        }.bind(this));
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
        '        <button><span class="icon fa fa-plus-circle fa-fw"/>Post</button>' +
        '    </div>                                                      ' +
        '</form>                                                         '
    ));
    var form = this.content.querySelector(".post-note-screen-post");
    form.addEventListener("submit", this._postSubmitted.bind(this));

    this.title = "Post Note";
};

ns.PostNoteScreen.prototype = Object.create(ns.DoPostScreen.prototype, {
    attachedCallback: {
        value: function(){
            $('textarea').focus();
        }
    },
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
    this._list = null;

    this.element.classList.add("post-history-screen");
    this._list = new ns.ListElement(this.ui);
    this._list.element.addEventListener("select", this._selected.bind(this));
    this.content.appendChild(this._list.element);
    this._list.attachedCallback();
    this.title = "History";
};

ns.PostHistoryScreen.prototype = Object.create(ns.DoPostScreen.prototype, {
    attachedCallback: {value: function() {
        this.ui.call("get_history", {}, function(posts) {
            for (var i = 0; i < posts.length; i++) {
                var post = posts[i];
                var li = document.createElement("li");
                li._post = post;
                var p = document.createElement("p");
                p.textContent = post.title;
                li.appendChild(p);
                this._list.element.appendChild(li);
            }
        }.bind(this));
    }},

    _selected: {value: function(event) {
        var post = event.detail.li._post;
        this.ui.post(this.collectionId, post.id, function(error) {
            if (error && error.__type__ === "ValueError"
                && error.args[0] === "post_collection_not_wall")
            {
                // "The selected post is a collection, but the target is not Wall."
                this.ui.notify("Only Wall can hold collections.");
                return;
            }
            this.ui.popScreen();
        }.bind(this));
    }}
});

/* ==== GridPostElement ==== */

ns.GridPostElement = function(post, ui) {
    wall.PostElement.call(this, post, ui);
    this._list = new ns.ListElement(this.ui);
    this._list.element.addEventListener("select", this._selected.bind(this));
    this._list.element.addEventListener("actionclick",
        this._actionClicked.bind(this));
    this.element = this._list.element;
};

/**
 * View for grid posts.
 */
ns.GridPostElement.prototype = Object.create(wall.PostElement.prototype, {
    postType: {value: "GridPost"},

    attachedCallback: {value: function() {
        this.ui.call("collection_get_items", {collection_id: this.post.id},
            function(posts) {
                this.ui.addEventListener("collection_posted",
                    this._posted.bind(this));
                this.ui.addEventListener("collection_item_removed",
                    this._itemRemoved.bind(this));

                for (var i = 0; i < posts.length; i++) {
                    this._addItem(posts[i]);
                }
            }.bind(this));
    }},

    _addItem: {value: function(post) {
        var li = document.createElement("li");
        li._post = post;
        var p = document.createElement("p");
        p.textContent = post.title;
        li.appendChild(p);
        // XXX ui.user should always be set. Show mainScreen after login and
        // retreive current post via collection_get_items
        if (ui.user && (ui.user.id === post.poster_id || ui.user.trusted)) {
            var button = document.createElement("button");
            var icon = document.createElement("span");
            icon.setAttribute("class", "icon fa fa-times-circle fa-fw");
            button.appendChild(icon);
            li.appendChild(button);
        }
        this._list.element.appendChild(li);
    }},

    _removeItem: {value: function(index, post) {
        this._list.element.removeChild(this._list.element.children[index]);
    }},

    _selected: {value: function(event) {
        var screen = new ns.PostScreen(this.ui);
        screen.post = event.detail.li._post;
        screen.hasPostMenu = false;
        this.ui.showScreen(screen);
    }},

    _actionClicked: {value: function(event) {
        this.ui.call("collection_remove_item",
            {collection_id: this.post.id, index: event.detail.index});
    }},

    _posted: {value: function(event) {
        if (event.args.collection_id !== this.post.id) {
            return;
        }
        this._addItem(event.args.post);
    }},

    _itemRemoved: {value: function(event) {
        if (event.args.collection_id !== this.post.id) {
            return;
        }
        this._removeItem(event.args.index, event.args.post);
    }}
});

/* ==== ListElement ==== */

ns.ListElement = function(ui) {
    wall.Element.call(this, ui);
    this.element = document.createElement("ul");
    this.element.classList.add("list");
    this.element.addEventListener("click", this._clicked.bind(this));
    this.content = this.element;
};

/**
 * Interactive list.
 */
ns.ListElement.prototype = Object.create(wall.Element.prototype, {
    _clicked: {value: function(event) {
        var li = null;
        var button = null;
        for (var e = event.target; e != this.element; e = e.parentElement) {
            if (e instanceof HTMLLIElement) {
                li = e;
            }
            if (e instanceof HTMLButtonElement) {
                button = e;
            }
        }

        var index = 0;
        for (; index < this.element.children.length; index++) {
            var child = this.element.children[index];
            if (child === li) {
                break;
            }
        }

        var event = null;
        if (button) {
            event = new CustomEvent("actionclick",
                {detail: {button: button, li: li, index: index}});
        } else {
            event = new CustomEvent("select", {detail: {li: li, index: index}});
        }
        this.element.dispatchEvent(event);
    }}
});

/* ==== PostMenu ==== */

ns.PostMenu = function(ui) {
    wall.Element.call(this, ui);
    this.targets = [];
    this.target = null;

    this.element = wall.util.cloneChildNodes(
        document.querySelector(".post-menu-template")).firstElementChild;

    this._targetToggle = this.element.querySelector(".post-menu-target");
    this._targetToggle.addEventListener("click", this._targetClicked.bind(this));

    var actionsDiv = this.element.querySelector(".post-menu-actions");
    for (var i = 0; i < this.ui.doPostHandlers.length; i++) {
        var handler = this.ui.doPostHandlers[i];
        /* if icon strings starts with a slash, it's the path to the logo,
         * otherwise just a CSS class for webfonts */
        var icon = null;
        if (handler.icon.match("^/")) {
            icon = document.createElement("img");
            icon.setAttribute("src", handler.icon);
        } else {
            icon = document.createElement("span");
            icon.setAttribute("class", "icon " + handler.icon);
        }
        var button = document.createElement("button");
        button._handler = handler;
        button.appendChild(icon);
        button.appendChild(document.createTextNode(handler.title));
        button.addEventListener("click", this._actionClicked.bind(this));
        actionsDiv.appendChild(button);
    }
};

/**
 * Menu for posting.
 *
 * The control posts to a `target` collection. A selection of `targets` can be added to
 * the control via `addTarget()`. If more than one target is available, a toggle is
 * presented to the user.
 *
 * Attributes:
 *
 *  - `targets`: selection of targets.
 *  - `target`: selected target.
 */
ns.PostMenu.prototype = Object.create(wall.Element.prototype, {
    /**
     * Return the target with the given `collectionId`. If the target does not exist,
     * `undefined` is returned.
     */
    getTarget: {value: function(collectionId) {
        return this.targets[this._getTargetIndex(collectionId)];
    }},

    /**
     * Add a target to the selection. `collectionId` is the ID of the collection to post
     * to and `label` is the UI label for the target. If the target already exists, it is
     * updated.
     */
    addTarget: {value: function(collectionId, label) {
        var target = {collectionId: collectionId, label: label};
        var index = this._getTargetIndex(collectionId);
        if (index === -1) {
            this.targets.push(target);
            if (this.targets.length === 1) {
                this.selectTarget(collectionId);
            } else if (this.targets.length === 2) {
                this._targetToggle.classList.remove("incognito");
                this._targetToggle.disabled = false;
            }
        } else {
            this.targets[index] = target;
            // update toggle
            if (this.target.collectionId === collectionId) {
                this.selectTarget(collectionId);
            }
        }
    }},

    /**
     * Remove the target with the given `collectionId` from the selection. If the target
     * does not exist, nothing will happen.
     */
    removeTarget: {value: function(collectionId) {
        var index = this._getTargetIndex(collectionId);
        if (index === -1) {
            return;
        }
        // update toggle
        if (this.target.collectionId === collectionId) {
            this.toggleTarget();
        }
        this.targets.splice(index, 1);
        if (this.targets.length === 1) {
            this._targetToggle.classList.add("incognito");
            this._targetToggle.disabled = true;
        }
    }},

    /**
     * Select the target with the given `collectionId`. If the target does not exist,
     * nothing will happen.
     */
    selectTarget: {value: function(collectionId) {
        var target = this.getTarget(collectionId);
        if (!target) {
            return;
        }
        this.target = target;
        this._targetToggle.textContent = this.target.label;
    }},

    /**
     * Toggle the selected target, i.e. select the next one from the selection.
     */
    toggleTarget: {value: function() {
        var next =
            (this._getTargetIndex(this.target.collectionId) + 1) % this.targets.length;
        this.selectTarget(this.targets[next].collectionId);
    }},

    _getTargetIndex: {value: function(collectionId) {
        for (var i = 0; i < this.targets.length; i++) {
            var target = this.targets[i];
            if (target.collectionId === collectionId) {
                return i;
            }
        }
        return -1;
    }},

    _targetClicked: {value: function(event) { this.toggleTarget(); }},

    _actionClicked: {value: function(event) {
        event.currentTarget._handler.post(this.target.collectionId);
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

/* ==== GridDoPostHandler ==== */

ns.GridDoPostHandler = function(ui) {
    ns.DoPostHandler.call(this, ui);
    this.title = "Grid";
    this.icon = "fa fa-th-large fa-fw";
};

ns.GridDoPostHandler.prototype = Object.create(ns.DoPostHandler.prototype, {
    post: {value: function(collectionId) {
        this.ui.postNew(collectionId, "GridPost", {}, function(post) {
            if (post.__type__ === "ValueError"
                && post.args[0] === "type_collection_not_wall")
            {
                // see PostHistoryScreen._selected
                this.ui.notify("Only Wall can hold collections.");
                return;
            }
        }.bind(this));
    }}
});

}(wall.remote));

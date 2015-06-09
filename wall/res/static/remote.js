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
 * - `editPostScreens`: registered `EditPostScreen`s indexed by the name of the
 *   associated post type.
 * - `mainScreen`: main post screen.
 * - `connectionScreen`: connection screen.
 */
ns.RemoteUi = function() {
    wall.Ui.call(this);

    this.screenStack = [];
    this.editPostScreens = {};
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

            this.addEventListener("collection_item_activated",
                this._itemActivated.bind(this));
            this.addEventListener("collection_item_deactivated",
                this._itemDeactivated.bind(this));
            this.registerPostElement("GridPost", ns.GridPostElement);
            this.registerEditPostScreen("TextPost",
                ns.posts.EditTextPostScreen);

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
                            "/static/images/note.svg", this));
                    break;
                case "grid":
                    this.addDoPostHandler(new ns.GridDoPostHandler());
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
            this.connectionScreen = new ns.ConnectionScreen();
            this.showScreen(this.mainScreen);
            this.showScreen(this.connectionScreen);

            this.connect();
        }.bind(this));
    }},

    initConnection: {value: function() {
        var p;
        if (localStorage.session) {
            p = this.call("authenticate", {token: localStorage.session});
        } else {
            p = Promise.resolve(false);
        }
        return p.then(function(authenticated) {
            this.popScreen(); // ConnectionScreen
            if (!authenticated) {
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

    /**
     * Register a new `PostElement` for `postType`.
     *
     * `postElement` is the constructor to register. Optionally, an
     * `EditPostScreen` can be registered along, given by the `editPostScreen`
     * constructor.
     */
    registerPostElement: {value: function(postType, postElement,
                                          editPostScreen) {
        this.postElementTypes[postType] = postElement;
        if (editPostScreen) {
            this.registerEditPostScreen(postType, editPostScreen);
        }
    }},

    /**
     * Register a new `EditPostScreen` for `postType`.
     *
     * `editPostScreen` is the constructor to register.
     */
    registerEditPostScreen: {value: function(postType, editPostScreen) {
        this.editPostScreens[postType] = editPostScreen;
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

    this._postMenu = new ns.PostMenu();
    this._postMenu.addTarget("wall", "Wall");
    this.content.appendChild(this._postMenu.element);
    this._postMenu.attachedCallback();

    this.title = "Empty Wall";
    this.post = post;
};

ns.PostScreen.prototype = Object.create(ns.Screen.prototype, {
    post: {
        set: function(value) {
            var postSpace = this.element.querySelector(".post-space");

            if (this._post) {
                postSpace.removeChild(this._postElement.element);
                this._postElement.detachedCallback();
                this._postElement = null;
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

            var postElementType = this.ui.postElementTypes[this._post.__type__]
                || ns.PostElement;
            this._postElement = new postElementType();
            this._postElement.post = this._post;
            postSpace.appendChild(this._postElement.element);
            this._postElement.attachedCallback();
            this.title = this._post.title;
            if (this._post.is_collection) {
                this._postMenu.addTarget(this._post.id, this._post.title);
                this._postMenu.selectTarget(this._post.id);
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

    attachedCallback: {value: function() {
        ns.Screen.prototype.attachedCallback.call(this);
        ui.addEventListener("post_edited", this);
    }},

    detachedCallback: {value: function() {
        ns.Screen.prototype.detachedCallback.call(this);
        ui.removeEventListener("post_edited", this);
        // This is a hack to trigger detachedCallback() for children. TODO:
        // remove once we switch to webcomponents.js.
        this.post = null;
    }},

    handleEvent: {value: function(event) {
        if (event.target === ui && event.type === "post_edited") {
            if (!this._post || event.args.post.id !== this._post.id) {
                return;
            }
            this._post = event.args.post;
            this.title = this._post.title;
            if (this._post.is_collection) {
                this._postMenu.addTarget(this._post.id, this._post.title);
            }
        }
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
    this._loginSubmittedHandler = this._loginSubmitted.bind(this);
    this.title = "Log in";
    this.hasGoBack = false;

    var template = document.querySelector(".login-screen-template");
    this.content.appendChild(wall.util.cloneChildNodes(template));
    this.content.querySelector(".login-screen-login")
        .addEventListener("submit", this._loginSubmittedHandler);
};

ns.LoginScreen.prototype = Object.create(ns.Screen.prototype, {
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
            localStorage.session = user.session;
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
    wall.util.loadTemplate(this.element.querySelector(".screen-content"),
                           ".post-note-screen-template");
    var form = this.content.querySelector(".post-note-screen-post");
    form.addEventListener("submit", this._postSubmitted.bind(this));
    this.title = "Post Note";
};

ns.PostNoteScreen.prototype = Object.create(ns.DoPostScreen.prototype, {
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
    this.title = "History";

    this.element.classList.add("post-history-screen");
    this._list = new ns.ListElement();
    this._list.element.addEventListener("select", this._selected.bind(this));
    this.content.appendChild(this._list.element);
    this._list.attachedCallback();
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
                this.ui.notify("Only Wall can hold collections.");
                return;
            }
            this.ui.popScreen();
        }.bind(this));
    }}
});

/**
 * Post element.
 *
 * Content can be added to the `.post-content` element.
 *
 * Properties:
 *
 * - `post`: associated `Post`.
 *
 * Subclass API: subclasses should implement `updateContent()`.
 */
ns.PostElement = function() {
    wall.Element.call(this, ui);
    this._post = null;
    var template = document.querySelector(".post-template");
    this.element = template.firstElementChild.cloneNode(true);
    this.element.querySelector(".post-edit").addEventListener("click", this);
};

ns.PostElement.prototype = Object.create(wall.Element.prototype, {
    postType: {value: null},

    post: {
        get: function() {
            return this._post;
        },
        set: function(value) {
            this._post = value;
            this.element.querySelector(".post-poster").textContent =
                this._post.poster.name;
            this.element.querySelector(".post-posted").textContent =
                new Date(this._post.posted).toLocaleString();
            this.updateContent();
        }
    },

    attachedCallback: {value: function() {
        ui.addEventListener("post_edited", this);
    }},

    detachedCallback: {value: function() {
        ui.removeEventListener("post_edited", this);
    }},

    /**
     * Subclass API: update the content UI.
     *
     * Called when `post` is set or edited. The default implementation does
     * nothing.
     */
    updateContent: {value: function() {}},

    handleEvent: {value: function(event) {
        if (event.currentTarget === this.element.querySelector(".post-edit")
                && event.type === "click") {
            var screenType = ui.editPostScreens[this._post.__type__]
                || ns.posts.EditPostScreen;
            var screen = new screenType();
            screen.post = this._post;
            ui.showScreen(screen);

        } else if (event.target === ui && event.type === "post_edited") {
            if (event.args.post.id !== this._post.id) {
                return;
            }
            this.post = event.args.post;
        }
    }}
});

/* ==== GridPostElement ==== */

ns.GridPostElement = function() {
    wall.remote.PostElement.call(this);
    this.element.classList.add("grid-post");
    this._list = new ns.ListElement();
    this._list.element.addEventListener("select", this);
    this._list.element.addEventListener("actionclick", this);
    this.element.querySelector(".post-content").appendChild(this._list.element);
};

/**
 * View for grid posts.
 */
ns.GridPostElement.prototype = Object.create(wall.remote.PostElement.prototype,
        {
    postType: {value: "GridPost"},

    attachedCallback: {value: function() {
        this.ui.call("collection_get_items", {collection_id: this.post.id},
            function(posts) {
                ui.addEventListener("post_edited", this);
                ui.addEventListener("collection_posted", this);
                ui.addEventListener("collection_item_removed", this);
                for (var i = 0; i < posts.length; i++) {
                    this._addItem(posts[i]);
                }
            }.bind(this));
    }},

    detachedCallback: {value: function() {
        ui.removeEventListener("post_edited", this);
        ui.removeEventListener("collection_posted", this);
        ui.removeEventListener("collection_item_removed", this);
    }},

    _addItem: {value: function(post) {
        var li = document.createElement("li");
        li._post = post;
        var p = document.createElement("p");
        p.textContent = post.title;
        li.appendChild(p);
        var button = document.createElement("button");
        var img = document.createElement("img");
        img.src = "/static/images/remove.svg";
        button.appendChild(img);
        li.appendChild(button);
        this._list.element.appendChild(li);
    }},

    _removeItem: {value: function(index, post) {
        this._list.element.removeChild(this._list.element.children[index]);
    }},

    handleEvent: {value: function(event) {
        ns.PostElement.prototype.handleEvent.call(this, event);

        if (event.currentTarget === this._list.element
                && event.type === "select") {
            var screen = new ns.PostScreen(this.ui);
            screen.post = event.detail.li._post;
            screen.hasPostMenu = false;
            this.ui.showScreen(screen);

        } else if (event.currentTarget === this._list.element
                && event.type == "actionclick") {
            this.ui.call("collection_remove_item",
                {collection_id: this.post.id, index: event.detail.index});

        } else if (event.target === ui && event.type === "post_edited") {
            Array.forEach(this._list.element.children,
                function(li) {
                    if (event.args.post.id === li._post.id) {
                        li._post = event.args.post;
                        li.querySelector("p").textContent = li._post.title;
                    }
                },
                this);

        } else if (event.target === ui && event.type === "collection_posted") {
            if (event.args.collection_id !== this.post.id) {
                return;
            }
            this._addItem(event.args.post);

        } else if (event.target === ui
                && event.type === "collection_item_removed") {
            if (event.args.collection_id !== this.post.id) {
                return;
            }
            this._removeItem(event.args.index, event.args.post);
        }
    }}
});

/* ==== ListElement ==== */

ns.ListElement = function() {
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
            } else if (e instanceof HTMLButtonElement) {
                button = e;
            }
        }
        if (!li) {
            // may happen if the list is empty
            return;
        }
        var index = Array.prototype.indexOf.call(this.element.children, li);

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

// TODO: rename to DoPostMenu.
/**
 * Menu for posting.
 *
 * The control posts to a `target` collection. A selection of `targets` can be
 * added to the control via `addTarget()`. If more than one target is available,
 * a toggle is presented.
 *
 * Attributes:
 *
 *  - `targets`: selection of targets.
 *  - `target`: selected target.
 */
ns.PostMenu = function() {
    wall.Element.call(this, ui);
    this.targets = [];
    this.target = null;

    var template = document.querySelector(".post-menu-template");
    this.element = wall.util.cloneChildNodes(template).firstElementChild;

    this._targetToggle = this.element.querySelector(".post-menu-target");
    this._targetToggle.addEventListener("click",
        this._targetClicked.bind(this));

    var actionsDiv = this.element.querySelector(".post-menu-actions");
    for (var i = 0; i < this.ui.doPostHandlers.length; i++) {
        var handler = this.ui.doPostHandlers[i];
        var icon = document.createElement("img");
        icon.setAttribute("src", handler.icon);
        var button = document.createElement("button");
        button._handler = handler;
        button.appendChild(icon);
        button.appendChild(document.createTextNode(handler.title));
        button.addEventListener("click", this._actionClicked.bind(this));
        actionsDiv.appendChild(button);
    }
};

ns.PostMenu.prototype = Object.create(wall.Element.prototype, {
    /**
     * Return the target with the given `collectionId`. If the target does not
     * exist, `undefined` is returned.
     */
    getTarget: {value: function(collectionId) {
        return this.targets[this._getTargetIndex(collectionId)];
    }},

    /**
     * Add a target to the selection. `collectionId` is the ID of the collection
     * to post to and `label` is the UI label for the target. If the target
     * already exists, it is updated.
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
     * Remove the target with the given `collectionId` from the selection. If
     * the target does not exist, nothing will happen.
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
     * Select the target with the given `collectionId`. If the target does not
     * exist, nothing will happen.
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
        var next = (this._getTargetIndex(this.target.collectionId) + 1) %
            this.targets.length;
        this.selectTarget(this.targets[next].collectionId);
    }},

    _getTargetIndex: {value: function(collectionId) {
        for (var i = 0; i < this.targets.length; i++) {
            if (this.targets[i].collectionId === collectionId) {
                return i;
            }
        }
        return -1;
    }},

    _targetClicked: {value: function(event) {
        this.toggleTarget();
    }},

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

ns.GridDoPostHandler = function() {
    ns.DoPostHandler.call(this, ui);
    this.title = "Grid";
    this.icon = "/static/images/grid.svg";
};

ns.GridDoPostHandler.prototype = Object.create(ns.DoPostHandler.prototype, {
    post: {value: function(collectionId) {
        this.ui.postNew(collectionId, "GridPost", {}, function(post) {
            if (post.__type__ === "ValueError"
                && post.args[0] === "type_collection_not_wall")
            {
                this.ui.notify("Only Wall can hold collections.");
                return;
            }
        }.bind(this));
    }}
});

}(wall.remote));

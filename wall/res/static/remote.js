/*
 * Wall
 */

wall.remote = {};
(function(ns) {

/* ==== RemoteUi ==== */

ns.RemoteUi = function(bricks, doPostHandlers) {
    if(!this.isBrowserSupported()){
        $('#main').html('<div id="browser_not_supported">Your browser is outdated. Please use a decent browser like <a href="https://play.google.com/store/apps/details?id=org.mozilla.firefox">Firefox</a> or <a href="https://play.google.com/store/apps/details?id=com.android.chrome">Chrome</a>.</div>').show();
        return;
    }

    wall.Ui.call(this);
    this.doPostHandlers = [];
    this.screenStack = [];
    this.mainScreen = null;

    window.onerror = $.proxy(this._erred, this);
    this.addEventListener("collection_item_activated",
        this._itemActivated.bind(this));
    this.addEventListener("collection_item_deactivated",
        this._itemDeactivated.bind(this));

    this.loadBricks(bricks, "ClientBrick");

    // setup enabled do post handlers
    for (var i = 0; i < doPostHandlers.length; i++) {
        var handler = doPostHandlers[i];
        switch (handler) {
        case "note":
            this.addDoPostHandler(
                new ns.ScreenDoPostHandler(ns.PostNoteScreen, "Note",
                    "static/images/note.svg", this));
            break;
        case "history":
            this.addDoPostHandler(
                new ns.ScreenDoPostHandler(ns.PostHistoryScreen, "History",
                    "/static/images/history.svg", this));
            break;
        }
    }

    this.mainScreen = new ns.PostScreen(this);
    this.mainScreen.hasGoBack = false;
};

ns.RemoteUi.prototype = Object.create(wall.Ui.prototype, {
    run: {value: function() {
        this.showScreen(this.mainScreen);
        this.showScreen(new ns.ConnectionScreen(this));
        wall.Ui.prototype.run.call(this);
    }},

    isBrowserSupported: {value: function(){
        return 'WebSocket' in window;
    }},

    notify: {value: function(msg) {
        $("#notification").text(msg).show();
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

    _erred: {value: function(msg, url, line) {
        this.notify("fatal error: " + msg);
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

    this.element.classList.add("post-screen");
    var postSpace = document.createElement("div");
    postSpace.classList.add("post-space");
    this.content.appendChild(postSpace);

    this._postMenu = new ns.PostMenu(this.ui);
    this._postMenu.addTarget("wall", "Wall");
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
                this._postMenu.addTarget(this._post.id, this._post.title);
                this._postMenu.selectTarget(this._post.id);
            }
        },
        get: function() {
            return this._post;
        }
    },

    detachedCallback: {value: function() {
        this.post = null;
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

}(wall.remote));

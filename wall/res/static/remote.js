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

    this.loadBricks(bricks, "ClientBrick");
    this.msgHandlers["posted"] = $.proxy(this._postedMsg, this);

    // setup enabled do post handlers
    for (var i = 0; i < doPostHandlers.length; i++) {
        var handler = doPostHandlers[i];
        if (["history"].indexOf(handler) < 0) {
            console.warn('config: invalid do post handler "' + handler + '"');
        }
    }
    if (doPostHandlers.indexOf("history") >= 0) {
        this.addDoPostHandler(new ns.ScreenDoPostHandler(ns.PostHistoryScreen,
            "History", "/static/images/history.svg", this));
    }

    this.mainScreen = new ns.PostScreen(this);
    this.mainScreen.hasGoBack = false;
};

$.extend(ns.RemoteUi.prototype, wall.Ui.prototype, {
    run: function() {
        this.showScreen(this.mainScreen);
        this.showScreen(new ns.ConnectionScreen(this));
        wall.Ui.prototype.run.call(this);
    },

    isBrowserSupported: function(){
        return 'WebSocket' in window;
    },

    notify: function(msg) {
        $("#notification").text(msg).show();
    },

    closeNotification: function() {
        $("#notification").hide();
    },

    showScreen: function(screen) {
        // backward compatibility: wrap HTML elements as pseudo Screen objects
        // TODO: port all (HTML element) screens to Screen type and remove this
        if (screen instanceof $) {
            screen = {
                element: screen,
                attachedCallback: function() {},
                detachedCallback: function() {}
            };
        }

        this.screenStack.push(screen);

        screen.element.addClass("screen-pushed")
            .css("z-index", this.screenStack.length - 1);
        $(".screen-stack").append(screen.element);
        screen.attachedCallback();

        // apply screen style (so that subsequent style changes may trigger
        // animations)
        getComputedStyle(screen.element[0]).width;

        screen.element.addClass("screen-open").removeClass("screen-pushed");
    },

    popScreen: function() {
        var screen = this.screenStack.pop();

        screen.element.addClass("screen-popped").removeClass("screen-open");
        screen.element.one("transitionend", function(event) {
            screen.element.removeClass("screen-popped").detach();
            screen.detachedCallback();
        });
    },

    post: function(id, callback) {
        this.call("post", {"id": id}, callback);
    },

    postNew: function(type, args, callback) {
        this.call("post_new", $.extend({"type": type}, args), callback);
    },

    addDoPostHandler: function(handler) {
        this.doPostHandlers.push(handler);
    },

    _connect: function() {
        wall.Ui.prototype._connect.call(this);
        this.screenStack[this.screenStack.length - 1].setState(
            this.connectionState);
    },

    _opened: function(event) {
        wall.Ui.prototype._opened.call(this, event);
        this.popScreen();
    },

    _closed: function(event) {
        wall.Ui.prototype._closed.call(this, event);
        if (this.connectionState == "disconnected") {
            this.showScreen(new ns.ConnectionScreen(this));
        }
        this.screenStack[this.screenStack.length - 1].setState(
            this.connectionState);
    },

    _postedMsg: function(msg) {
        this.mainScreen.post = msg.data;
    },

    _erred: function(msg, url, line) {
        this.notify("fatal error: " + msg);
    }
});

/* ==== Screen ==== */

ns.Screen = function(ui) {
    wall.Element.call(this, ui);
    this._title = null;
    this._hasGoBack = true;

    this.element = $(
        '<div class="screen">                                 ' +
        '    <header class="bar">                             ' +
        '        <h1></h1>                                    ' +
        '        <button class="screen-settings">Wall</button>' +
        '        <button class="bar-secondary screen-go-back">' +
        '            <img src="static/images/go-back.svg"/>   ' +
        '        </button>                                    ' +
        '    </header>                                        ' +
        '    <div class="screen-content"></div>               ' +
        '</div>                                               '
    );
    this.content = $(".screen-content", this.element);
    $(".screen-settings", this.element).click(this._settingsClicked.bind(this));
    $(".screen-go-back", this.element).click(this._goBackClicked.bind(this));

    this.title = null;
};

ns.Screen.prototype = Object.create(wall.Element.prototype, {
    title: {
        set: function(value) {
            this._title = value;
            $("header.bar", this.element).css("display",
                 this._title ? "" : "none");
            $("header.bar h1", this.element).text(this._title || "");
        },
        get: function() {
            return this._title;
        }
    },

    hasGoBack: {
        set: function(value) {
            this._hasGoBack = value;
            $(".screen-go-back", this.element).css("display",
                this._hasGoBack ? "" : "none");
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

    this.element.addClass("post-screen");
    this.content.append($(
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
        handler.post();
     }}
});

/* ==== ConnectionScreen ==== */

ns.ConnectionScreen = function(ui) {
    ns.Screen.call(this, ui);
    this.element.addClass("connection-screen");
    this.content.append($(
        '<p class="connection-screen-state"></p> ' +
        '<p class="connection-screen-detail"></p>'
    ));
    this.title = "Connection";
    this.hasGoBack = false;
};

ns.ConnectionScreen.prototype = Object.create(ns.Screen.prototype, {
    setState: {value: function(state) {
        switch (state) {
        case "connecting":
            $(".connection-screen-state", this.content).text("Connecting...");
            $(".connection-screen-detail", this.content).empty();
            break;
        case "failed":
            $(".connection-screen-state", this.content)
                .text("Failed to connect!");
            $(".connection-screen-detail", this.content)
                .text("Retrying shortly.");
            break;
        case "disconnected":
            $(".connection-screen-state", this.content)
                .text("Connection lost!");
            $(".connection-screen-detail", this.content)
                .text("Trying to reconnect shortly.");
            break;
        }
    }}
});

/* ==== NotSupportedScreen ==== */

ns.NotSupportedScreen = function(what, ui) {
    ns.Screen.call(this, ui);
    this.what = what;

    this.content.append($('<p>Unfortunately, your browser does not support <span class="not-supported-what"></span>. Please use a current browser.</p>'));
    $(".not-supported-what", this.content).text(what);
    this.title = "Not Supported";
};

ns.NotSupportedScreen.prototype = Object.create(ns.Screen.prototype);

/* ==== PostHistoryScreen ==== */

ns.PostHistoryScreen = function(ui) {
    ns.Screen.call(this, ui);
    this.title = "History";

    this.element.addClass("post-history-screen");
    this.content.append($('<ul class="select"></ul>'));

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
        this.ui.post(post.id, function(post) {
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

ns.DoPostHandler.prototype = {
    post: function() {}
};

/* ==== ScreenDoPostHandler ==== */

ns.ScreenDoPostHandler = function(screenType, title, icon, ui) {
    ns.DoPostHandler.call(this, ui);
    this.screenType = screenType;
    this.title = title;
    this.icon = icon;
};

ns.ScreenDoPostHandler.prototype = Object.create(ns.DoPostHandler.prototype, {
    post: {value: function() {
        this.ui.showScreen(new this.screenType(this.ui));
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
    post: {value: function() {
        this.ui.postNew(this.postType, {}, function(post) {});
    }}
});

}(wall.remote));

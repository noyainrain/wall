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
    this._connectionScreen = null;

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
        this.addDoPostHandler(new ns.DoPostHistoryHandler(this));
    }

    this.mainScreen = new ns.PostScreen(this);
    this._connectionScreen = $(
        '<div class="screen connection-screen">      ' +
        '    <p class="connection-screen-state"></p> ' +
        '    <p class="connection-screen-detail"></p>' +
        '</div>                                      '
    );
};

$.extend(ns.RemoteUi.prototype, wall.Ui.prototype, {
    run: function() {
        this.showScreen(this.mainScreen);
        this.showScreen(this._connectionScreen);
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
            screen = {element: screen};
        }

        this.screenStack.push(screen);

        screen.element.addClass("screen-pushed")
            .css("z-index", this.screenStack.length - 1);
        $(".screen-stack").append(screen.element);

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
        });
    },

    showNotSupportedScreen: function(what) {
        this.showScreen($(ns._not_supported_html));
        $("#not-supported-what").text(what);
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
        this._setConnectionScreenState(this.connectionState);
    },

    _opened: function(event) {
        wall.Ui.prototype._opened.call(this, event);
        this.popScreen();
    },

    _closed: function(event) {
        wall.Ui.prototype._closed.call(this, event);
        if (this.connectionState == "disconnected") {
            this.showScreen(this._connectionScreen);
        }
        this._setConnectionScreenState(this.connectionState);
    },

    _setConnectionScreenState: function(state) {
        switch (state) {
        case "connecting":
            $(".connection-screen-state", this._connectionScreen)
                .text("Connecting...");
            $(".connection-screen-detail", this._connectionScreen).empty();
            break;
        case "failed":
            $(".connection-screen-state", this._connectionScreen)
                .text("Failed to connect!");
            $(".connection-screen-detail", this._connectionScreen)
                .text("Retrying shortly.");
            break;
        case "disconnected":
            $(".connection-screen-state", this._connectionScreen)
                .text("Connection lost!");
            $(".connection-screen-detail", this._connectionScreen)
                .text("Trying to reconnect shortly.");
            break;
        }
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

    this.element = $(
        '<div class="screen">                  ' +
        '    <header><h1></h1></header>        ' +
        '    <div class="screen-content"></div>' +
        '</div>                                '
    );
    this.content = $(".screen-content", this.element);

    this.title = null;
};

ns.Screen.prototype = Object.create(wall.Element.prototype, {
    title: {
        set: function(value) {
            this._title = value;
            $("header", this.element).css("display", this._title ? "" : "none");
            $("header h1", this.element).text(this._title || "");
        },
        get: function() {
            return this._title;
        }
    }
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
                    this._postElement.cleanup();
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
            }
            this.title = this._post.title;
        },
        get: function() {
            return this._post;
        }
    },

    _postMenuItemClicked: {value: function(event) {
        var handler = $(event.currentTarget).data("handler");
        handler.post();
     }}
});

/* ==== DoPostHandler ==== */

ns.DoPostHandler = function(ui) {
    this.ui = ui;
};

ns.DoPostHandler.prototype = {
    title: null,
    icon: null,

    post: function() {}
};

/* ==== DoPostSingleHandler ==== */

ns.DoPostSingleHandler = function(ui, postType, title, icon) {
    ns.DoPostHandler.call(this, ui);
    this.postType = postType;
    this.title = title;
    this.icon = icon;
};

$.extend(ns.DoPostSingleHandler.prototype, ns.DoPostHandler.prototype, {
    post: function() {
        this.ui.postNew(this.postType, {}, function(post) {});
    }
});

/* ==== DoPostHistoryHandler ==== */

ns.DoPostHistoryHandler = function(ui) {
    ns.DoPostHandler.call(this, ui);
};

$.extend(ns.DoPostHistoryHandler.prototype, ns.DoPostHandler.prototype, {
    title: "History",
    icon: "/static/images/history.svg",

    post: function() {
        this.ui.showScreen($(
            '<div id="post-history-screen" class="screen"> ' +
            '    <h2>History</h2>                          ' +
            '    <ul class="select"></ul>                  ' +
            '</div>                                        '
        ));

        this.ui.call("get_history", {}, $.proxy(function(posts) {
            posts.forEach(function(post) {
                var li = $("<li>")
                    .data("post", post)
                    .click($.proxy(this._postClicked, this))
                    .appendTo($("#post-history-screen ul"));
                $("<p>").text(post.title).appendTo(li);
            }, this);
        }, this));
    },

    _postClicked: function(event) {
        var post = $(event.currentTarget).data("post");
        this.ui.post(post.id, $.proxy(function(post) {
            // TODO: error handling
            this.ui.popScreen();
        }, this));
    }
});

/* ==== */

ns._not_supported_html =
    '<div id="#not-supported-screen" class="screen">\n' +
    '    <h2>Not Supported</h2>\n' +
    '    <p>Unfortunately, your browser does not support <span id="not-supported-what"></span>. Please use a current browser.</p>\n' +
    '</div>\n';

}(wall.remote));

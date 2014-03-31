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

    this._connectionScreen = $(
        '<div class="screen connection-screen">      ' +
        '    <p class="connection-screen-state"></p> ' +
        '    <p class="connection-screen-detail"></p>' +
        '</div>                                      '
    );

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
};

$.extend(ns.RemoteUi.prototype, wall.Ui.prototype, {
    run: function() {
        this.showScreen($("#main").detach());
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
        this.screenStack.push(screen);

        screen.addClass("screen-pushed")
            .css("z-index", this.screenStack.length - 1);
        $(".screen-stack").append(screen);

        // apply screen style (so that subsequent style changes may trigger
        // animations)
        getComputedStyle(screen[0]).width;

        screen.addClass("screen-open").removeClass("screen-pushed");
    },

    popScreen: function() {
        var screen = this.screenStack.pop();

        screen.addClass("screen-popped").removeClass("screen-open");
        screen.one("transitionend", function(event) {
            screen.detach();
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
        $("<button>")
            .text(handler.title)
            .css("background-image", "url(" + handler.icon + ")")
            .data("handler", handler)
            .click($.proxy(this._postMenuItemClicked, this))
            .appendTo($("#post-menu"));
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

    _postMenuItemClicked: function(event) {
        var handler = $(event.currentTarget).data("handler");
        handler.post();
    },

    _postedMsg: function(msg) {
        // TODO: implement (remote) PostElement

        if (this.currentPostElement) {
            this.currentPostElement.element.remove();
            this.currentPostElement.cleanup();
            this.currentPostElement = null;
        }

        var post = msg.data;
        var postElementType = this.postElementTypes[post.__type__];
        if (postElementType) {
            this.currentPostElement = new postElementType(post, this);
            $("#post").append(this.currentPostElement.element);
        }
    },

    _erred: function(msg, url, line) {
        this.notify("fatal error: " + msg);
    }
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

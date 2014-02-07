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
        wall.Ui.prototype.run.call(this);
        this.showScreen($("#main").detach());
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
        if (this.screenStack.length) {
            this.screenStack[this.screenStack.length - 1].hide();
        }
        this.screenStack.push(screen);
        $("body").append(screen);
    },

    popScreen: function() {
        this.screenStack.pop().remove();
        this.screenStack[this.screenStack.length - 1].show();
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

    _postMenuItemClicked: function(event) {
        var handler = $(event.currentTarget).data("handler");
        handler.post();
    },

    _postedMsg: function(msg) {
        // TODO: implement BasePostHandler

        if (this.currentPostHandler) {
            this.currentPostHandler.cleanupPost();
            $("#post").empty().hide();
        }

        this.currentPost = msg.data;
        this.currentPostHandler =
            this.postHandlers[this.currentPost.__type__] || null;
        if (this.currentPostHandler) {
            this.currentPostHandler.initPost($("#post").show(),
                this.currentPost);
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

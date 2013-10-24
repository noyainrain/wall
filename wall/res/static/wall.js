/*
 * Wall
 */

var wall = {};
wall.bricks = {};
(function(ns) {

/* ==== Ui ==== */

ns.Ui = function(bricks) {
    this.bricks = {};
    this.postHandlers = {};
    this.msgHandlers = {};
    this.currentPost = null;
    this.currentPostHandler = null;
    this.socket = null;
    this._connect();
};

ns.Ui.prototype = {
    addPostHandler: function(handler) {
        this.postHandlers[handler.type] = handler;
    },

    send: function(msg) {
        this.socket.send(JSON.stringify(msg));
    },

    call: function(method, args, callback) {
        args = args || {};
        this.msgHandlers[method] = $.proxy(function(msg) {
            delete this.msgHandlers[method];
            callback(msg.data);
        }, this);
        this.send({"type": method, "data": args});
    },

    loadBricks: function(bricks, type) {
        // initialize bricks (inspired by server's wall.WallApp.__init__)
        for (var i = 0; i < bricks.length; i++) {
            var name = bricks[i];
            var module = name.split(".").reduce(
                function(o, n) { return o[n]; }, window);
            var brick = new module[type](this);
            this.bricks[brick.id] = brick;
        }
    },

    _connect: function() {
        console.log("connecting...");
        this.socket = new WebSocket("ws://" + location.host + "/api/socket/");
        this.socket.addEventListener("open",    $.proxy(this._opened,   this));
        this.socket.addEventListener("close",   $.proxy(this._closed,   this));
        this.socket.addEventListener("message", $.proxy(this._received, this));
    },

    _opened: function(event) {
        console.log("connected");
    },

    _closed: function(event) {
        console.log("disconnected");
        setTimeout($.proxy(this._connect, this), 1000);
    },

    _received: function(event) {
        var msg = JSON.parse(event.data);
        this.msgHandlers[msg.type] && this.msgHandlers[msg.type](msg);
    }
};

/* ==== DisplayUi ==== */

ns.DisplayUi = function(bricks) {
    ns.Ui.call(this, bricks);
    this.loadBricks(bricks, "DisplayBrick");
    this.msgHandlers["posted"] = $.proxy(this._postedMsg, this);
    this.addPostHandler(new wall.display.ImagePostHandler());
};

$.extend(ns.DisplayUi.prototype, ns.Ui.prototype, {
    _postedMsg: function(msg) {
        if (this.currentPost) {
            this.currentPostHandler.cleanupPost();
            $("#content").empty();
        }
        this.currentPost = msg.data;
        this.currentPostHandler = this.postHandlers[this.currentPost.__type__];
        this.currentPostHandler.initPost($("#content"), this.currentPost);
    }
});

/* ==== ClientUi ==== */

ns.ClientUi = function(bricks) {
    if(!this.isBrowserSupported()){
        $('#main').html('<div id="browser_not_supported">Your browser is outdated. Please use a decent browser like <a href="https://play.google.com/store/apps/details?id=org.mozilla.firefox">Firefox</a> or <a href="https://play.google.com/store/apps/details?id=com.android.chrome">Chrome</a>.</div>').show();
        return;
    }

    ns.Ui.call(this);
    this.doPostHandlers = [];
    this.screenStack = [];

    this.loadBricks(bricks, "ClientBrick");
    this.msgHandlers["posted"] = $.proxy(this._postedMsg, this);
    this.addDoPostHandler(new ns.DoPostHistoryHandler(this));

    this.showScreen($("#main").detach());
};

$.extend(ns.ClientUi.prototype, ns.Ui.prototype, {
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
        if (this.currentPost) {
            this.currentPostHandler.cleanupPost();
            $("#post").empty().hide();
        }
        this.currentPost = msg.data;
        this.currentPostHandler = this.postHandlers[this.currentPost.__type__];
        this.currentPostHandler.initPost($("#post").show(), this.currentPost);
    }
});

/* ==== Brick ==== */

ns.Brick = function(ui) {
    this.ui = ui;
};

ns.Brick.prototype = {
    id: null
};

/* ==== PostHandler ==== */

ns.PostHandler = function() {};

ns.PostHandler.prototype = {
    type: null,

    initPost: function(elem, post) {},

    cleanupPost: function() {}
};

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

}(wall));

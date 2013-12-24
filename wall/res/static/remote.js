/*
 * Wall
 */

wall.remote = {};
(function(ns) {

/* ==== ClientUi ==== */

ns.ClientUi = function(bricks, doPostHandlers) {
    if(!this.isBrowserSupported()){
        $('#main').html('<div id="browser_not_supported">Your browser is outdated. Please use a decent browser like <a href="https://play.google.com/store/apps/details?id=org.mozilla.firefox">Firefox</a> or <a href="https://play.google.com/store/apps/details?id=com.android.chrome">Chrome</a>.</div>').show();
        return;
    }

    wall.Ui.call(this);
    this.doPostHandlers = [];
    this.screenStack = [];
    this.postScreen = null;

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

    this.postScreen = new ns.PostScreen(this);
    this.showScreen(this.postScreen);
};

$.extend(ns.ClientUi.prototype, wall.Ui.prototype, {
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
            this.screenStack[this.screenStack.length - 1].elem.hide();
        }
        this.screenStack.push(screen);
        $("body").append(screen.elem);
    },

    popScreen: function() {
        var screen = this.screenStack.pop();
        screen.cleanup();
        screen.elem.remove();
        this.screenStack[this.screenStack.length - 1].elem.show();
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

    _postedMsg: function(msg) {
        this.currentPost = msg.data;
        this.postScreen.setPost(this.currentPost);
    },

    _erred: function(msg, url, line) {
        this.notify("fatal error: " + msg);
    }
});

/* ==== Screen ==== */

ns.Screen = function(ui) {
    this.ui = ui;
    this.title = null;
    this.actions = [];

    this.elem = $(
        '<div class="screen">                  ' +
        '    <header>                          ' +
        '        <h1></h1>                     ' +
        '        <ul class="menu"></ul>        ' +
        '    </header>                         ' +
        '    <div class="screen-content"></div>' +
        '</div>'
    );
    this.content = $(".screen-content", this.elem);

    this.addAction(new ns.GoBackAction(this.ui));
}

ns.Screen.prototype = {
    setTitle: function(title) {
        this.title = title;
        $("header h1", this.elem).text(this.title || "");
    },

    addAction: function(action) {
        this.actions.push(action);
        var li = $("<li>")
            .addClass(action.id + "-item")
            .prependTo($("header .menu", this.elem));
        $("<button>")
            .css("background-image", 'url("' + action.icon + '")')
            .click($.proxy(action.run, action))
            .appendTo(li);
    },

    removeAction: function(id) {
        // TODO: handle invalid id
        var action = this.actions.filter(function(a) { return a.id === id })[0];
        this.actions.splice(this.actions.indexOf(action), 1);
        $("." + action.id + "-item", this.elem).remove();
    },

    cleanup: function() {}
}

/* ==== Action ==== */

ns.Action = function(ui) {
    this.ui = ui;
    this.id = null;
    this.title = null;
    this.icon = null;
}

ns.Action.prototype = {
    run: function() {}
}

/* ==== GoBackAction ==== */

ns.GoBackAction = function(ui) {
    ns.Action.call(this, ui);
    this.id = "go-back";
    this.title = "Go Back";
    this.icon = "/static/images/go-back.svg";
}

$.extend(ns.GoBackAction.prototype, ns.Action.prototype, {
    run: function() {
        this.ui.popScreen();
    }
});

/* ==== PostScreen ==== */

ns.PostScreen = function(ui, post) {
    post = post || null;
    ns.Screen.call(this, ui);

    this.removeAction("go-back");

    $(
        '<div class="post"></div>     ' +
        '<div class="post-menu"></div>'
    ).appendTo(this.content);

    // build post menu
    for (var i = 0; i < this.ui.doPostHandlers.length; i++) {
        var handler = this.ui.doPostHandlers[i];
        $("<button>")
            .text(handler.title)
            .css("background-image", "url(" + handler.icon + ")")
            .data("handler", handler)
            .click($.proxy(this._postMenuItemClicked, this))
            .appendTo($(".post-menu", this.content));
    }

    this.setPost(post);
}

$.extend(ns.PostScreen.prototype, ns.Screen.prototype, {
    setPost: function(post) {
        // TODO: implement BasePostHandler

        if (this.post) {
            var handler = this.ui.postHandlers[this.post.__type__] || null;
            if (handler) {
                handler.cleanupPost();
            }
            $(".post", this.content).empty().hide();
        }

        this.post = post;
        if (this.post) {
            this.setTitle(post.title);
            var handler = this.ui.postHandlers[this.post.__type__] || null;
            if (handler) {
                handler.initPost($(".post", this.content).show(), this.post);
            }
        }
    },

    cleanup: function() {
        this.setPost(null);
    },

    _postMenuItemClicked: function(event) {
        var handler = $(event.currentTarget).data("handler");
        handler.post();
    }
});

/* ==== HistoryScreen ==== */

ns.HistoryScreen = function(ui) {
    ns.Screen.call(this, ui);

    this.setTitle("History");

    $(
        '<ul class="select"></ul>'
    ).appendTo(this.content);

    this.ui.call("get_history", {}, $.proxy(function(posts) {
        posts.forEach(function(post) {
            var li = $("<li>")
                .data("post", post)
                .click($.proxy(this._postClicked, this))
                .appendTo($("ul", this.content));
            $("<p>").text(post.title).appendTo(li);
        }, this);
    }, this));
}

$.extend(ns.HistoryScreen.prototype, ns.Screen.prototype, {
    _postClicked: function(event) {
        var post = $(event.currentTarget).data("post");
        this.ui.post(post.id, $.proxy(function(post) {
            // TODO: error handling
            this.ui.popScreen();
        }, this));
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
        this.ui.showScreen(new ns.HistoryScreen(this.ui));
    }
});

/* ==== */

ns._not_supported_html =
    '<div id="#not-supported-screen" class="screen">\n' +
    '    <h2>Not Supported</h2>\n' +
    '    <p>Unfortunately, your browser does not support <span id="not-supported-what"></span>. Please use a current browser.</p>\n' +
    '</div>\n';

}(wall.remote));

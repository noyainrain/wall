/*
 * Wall
 */

var wall = {};
(function(ns) {

/* ==== Ui ==== */

ns.Ui = function(bricks) {
    this.bricks       = [];
    this.postHandlers = {};
    this.msgHandlers  = {};
    this.currentPost  = null;
    this.currentBrick = null;
    this.socket       = null;
    
    // initialize bricks (inspired by server's wall.WallApp.__init__)
    for (var i = 0; i < bricks.length; i++) {
        var name = bricks[i];
        var module = name.split(".").reduce(
            function(o, n) { return o[n]; }, window);
        var brick = new module["Brick"](this);
        this.bricks.push(brick);
        this.postHandlers[brick.postType] = brick;
    }
    
    this._connect();
};

ns.Ui.prototype = {
    send: function(msg) {
        this.socket.send(JSON.stringify(msg));
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
        console.log("received: " + event.data);
        var msg = JSON.parse(event.data);
        this.msgHandlers[msg.type](msg);
    }
};

/* ==== DisplayUi ==== */

ns.DisplayUi = function(bricks) {
    ns.Ui.call(this, bricks);
    this.msgHandlers["posted"] = $.proxy(this._postedMsg, this);
};

$.extend(ns.DisplayUi.prototype, ns.Ui.prototype, {
    _postedMsg: function(msg) {
        if (this.currentBrick) {
            this.currentBrick.cleanupPost($("#content"));
            $("#content").empty();
        }
        this.currentPost = msg.data;
        this.currentBrick = this.postHandlers[this.currentPost.__type__];
        this.currentBrick.initPost($("#content"), this.currentPost);
    }
});

/* ==== ClientUi ==== */

ns.ClientUi = function(bricks) {
    
    if(!this.isBrowserSupported()){
        $('#main').html('<div id="browser_not_supported">Your browser is outdated. Please use a decent browser like <a href="https://play.google.com/store/apps/details?id=org.mozilla.firefox">Firefox</a> or <a href="https://play.google.com/store/apps/details?id=com.android.chrome">Chrome</a>.</div>').show();
        return;
    }

    ns.Ui.call(this, bricks);

    this.msgHandlers["posted"] = $.proxy(this._postedMsg, this);
    
    // initialize post menu
    for(var i = 0, length = this.bricks.length; i < length; i++) {
        var brick = this.bricks[i];
        $('<button>')
            .text(brick.postTitle)
            .click(brick, $.proxy(this._postMenuItemClicked, this))
            .css('background-image', "url(/static/" + brick.id + "/" + brick.id + ".svg)")
            .appendTo($("#post-menu"));
    }
        
    $("#post-new").click($.proxy(this._postNewClicked, this));
    
    this.currentScreen = null;
    this.showScreen($("#main"));
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
        if (this.currentScreen) {
            this.currentScreen.hide();
        }
        this.currentScreen = screen;
        this.currentScreen.show();
    },
    
    showPostNewScreen: function(brick) {
        $("#post-new").data("brick", brick);
        $("#post-new h2").text("Post " + brick.postTitle);
        $("#post-new .content").empty();
        brick.clientInitPostNewScreen($("#post-new .content"));
        this.showScreen($("#post-new"));
    },
    
    closePostNewScreen: function() {
        var brick = $("#post-new").data("brick");
        brick.clientCleanupPostNewScreen();
        this.showScreen($("#main"));
    },
    
    postNew: function(type, args, erred) {
        args = args || {};
        this.call("post_new", $.extend({"type": type}, args),
            $.proxy(function(error) {
                if (error) {
                    erred(error);
                } else {
                    this.closePostNewScreen();
                }
            }, this));
    },
    
    call: function(method, args, callback) {
        args = args || {};
        this.msgHandlers[method] = $.proxy(function(msg) {
            delete this.msgHandlers[method];
            callback(msg.data);
        }, this);
        this.send({"type": method, "data": args});
    },
    
    _postMenuItemClicked: function(event) {
        var brick = event.data;
        if (brick.postSingle) {
            this.postNew(brick.postType);
        } else {
            this.showPostNewScreen(brick);
        }
    },
    
    _postedMsg: function(msg) {
        if (this.currentBrick) {
            this.currentBrick.clientCleanupPost($("#post"));
            $("#post").empty().hide();
        }
        this.currentPost = msg.data;
        this.currentBrick = this.postHandlers[this.currentPost.__type__];
        this.currentBrick.clientInitPost($("#post").show(), this.currentPost);
    }
});

/* ==== Brick ==== */

ns.Brick = function(ui) {
    this.ui = ui;
};

ns.Brick.prototype = {
    id: null,
    postType: null,
    postTitle: null,
    postSingle: false,
    
    initPost: function(elem, post) {},
    
    cleanupPost: function() {},
    
    clientInitPost: function(elem, post) {},
    
    clientCleanupPost: function() {},
    
    clientInitPostNewScreen: function(elem) {},
    
    clientCleanupPostNewScreen: function() {}
};

}(wall));

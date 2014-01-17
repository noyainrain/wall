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
        this.socket = new WebSocket("ws://" + location.host + "/api/socket");
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

/* ==== */

$.fn.fitToParent = function() {
    return this.each(function(index, elem) {
        elem = $(elem);
        var parent = elem.parent();

        var ratio = elem.width() / elem.height();
        var parentRatio = parent.width() / parent.height();

        if (ratio <= parentRatio) {
            elem.css({
                "width": parent.height() * ratio,
                "height": parent.height()
            });
        } else {
            elem.css({
                "width": parent.width(),
                "height": parent.width() / ratio
            });
        }
    });
}

}(wall));

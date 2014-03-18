/*
 * Wall
 */

var wall = {};
wall.bricks = {};
(function(ns) {

/* ==== Ui ==== */

ns.Ui = function(bricks) {
    this.bricks = {};
    this.postElementTypes = {};
    this.msgHandlers = {};
    this.currentPostElement = null;
    this.socket = null;
    this.connectionState = "closed";
};

ns.Ui.prototype = {
    run: function() {
        this._connect();
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

    /**
     * Extension API: register a new post element type. `postElementType` is a
     * class (constructor) that extends `PostElement`.
     */
    addPostElementType: function(postElementType) {
        this.postElementTypes[postElementType.prototype.postType] =
            postElementType;
    },

    _connect: function() {
        console.log("connecting...");
        this.socket = new WebSocket("ws://" + location.host + "/api/socket");
        this.socket.addEventListener("open",    $.proxy(this._opened,   this));
        this.socket.addEventListener("close",   $.proxy(this._closed,   this));
        this.socket.addEventListener("message", $.proxy(this._received, this));
        this.connectionState = "connecting";
    },

    _opened: function(event) {
        console.log("connected");
        this.connectionState = "open";
    },

    _closed: function(event) {
        console.log("disconnected");
        if (this.connectionState == "connecting") {
            this.connectionState = "failed";
        } else if (this.connectionState == "open") {
            this.connectionState = "disconnected";
        } else {
            // unreachable
            throw new Error();
        }
        setTimeout(this._connect.bind(this), 5000);
    },

    _received: function(event) {
        var msg = JSON.parse(event.data);
        this.msgHandlers[msg.type] && this.msgHandlers[msg.type](msg);
    }
};

/* ==== Element ==== */

ns.Element = function(ui) {
    this.ui = ui;
    this.element = null;
};

ns.Element.prototype = {
    cleanup: function() {}
};

/* ==== PostElement ==== */

ns.PostElement = function(post, ui) {
    ns.Element.call(this, ui);
    this.post = post;
};

ns.PostElement.prototype = $.extend(Object.create(ns.Element.prototype), {
    postType: null
});

/* ==== Brick ==== */

ns.Brick = function(ui) {
    this.ui = ui;
};

ns.Brick.prototype = {
    id: null
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
};

ns.hyphenate = function(camelcased) {
    return camelcased.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
};

}(wall));

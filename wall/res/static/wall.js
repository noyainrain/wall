/*
 * Wall
 */

var wall = wall || {};
wall.bricks = wall.bricks || {};
(function(ns) {

/* ==== Ui ==== */

ns.Ui = function(bricks) {
    wall.util.EventTarget.call(this);

    this.bricks = {};
    this.postElementTypes = {};
    this.msgHandlers = {};
    this.socket = null;
    this.connectionState = "closed";

    this.msgHandlers["posted"] = this.eventMessage.bind(this);
};

ns.Ui.prototype = Object.create(wall.util.EventTarget.prototype, {
    run: {value: function() {
        this._connect();
    }},

    send: {value: function(msg) {
        this.socket.send(JSON.stringify(msg));
    }},

    call: {value: function(method, args, callback) {
        callback = callback || null;
        this.msgHandlers[method] = function(msg) {
            delete this.msgHandlers[method];
            if (callback) {
                callback(msg.data);
            }
        }.bind(this);
        this.send({"type": method, "data": args});
    }},

    loadBricks: {value: function(bricks, type) {
        // initialize bricks (inspired by server's wall.WallApp.__init__)
        for (var i = 0; i < bricks.length; i++) {
            var name = bricks[i];
            var module = name.split(".").reduce(
                function(o, n) { return o[n]; }, window);
            var brick = new module[type](this);
            this.bricks[brick.id] = brick;
        }
    }},

    /**
     * Extension API: register a new post element type. `postElementType` is a
     * class (constructor) that extends `PostElement`.
     */
    addPostElementType: {value: function(postElementType) {
        this.postElementTypes[postElementType.prototype.postType] =
            postElementType;
    }},

    eventMessage: {value: function(msg) {
        this.dispatchEvent(new wall.util.Event(msg.type, msg.data));
    }},

    _connect: {value: function() {
        console.log("connecting...");
        this.socket = new WebSocket("ws://" + location.host + "/api/socket");
        this.socket.addEventListener("open",    $.proxy(this._opened,   this));
        this.socket.addEventListener("close",   $.proxy(this._closed,   this));
        this.socket.addEventListener("message", $.proxy(this._received, this));
        this.connectionState = "connecting";
    }},

    _opened: {value: function(event) {
        console.log("connected");
        this.connectionState = "open";
    }},

    _closed: {value: function(event) {
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
    }},

    _received: {value: function(event) {
        var msg = JSON.parse(event.data);
        this.msgHandlers[msg.type] && this.msgHandlers[msg.type](msg);
    }}
});

/* ==== Element ==== */

ns.Element = function(ui) {
    this.ui = ui;
    this.element = null;
};

/**
 * UI element.
 *
 * Inspired by the custom elements specification (see
 * https://w3c.github.io/webcomponents/spec/custom/ ).
 */
ns.Element.prototype = Object.create(Object.prototype, {
    attachedCallback: {value: function() {}},

    detachedCallback: {value: function() {}}
});

/* ==== PostElement ==== */

ns.PostElement = function(post, ui) {
    ns.Element.call(this, ui);
    this.post = post;
};

ns.PostElement.prototype = Object.create(ns.Element.prototype, {
    postType: {value: null}
});

/* ==== Brick ==== */

ns.Brick = function(ui) {
    this.ui = ui;
};

ns.Brick.prototype = {
    id: null
};

/* ==== */

$.fn.fitToParent = function(options) {
    options =
        $.extend({method: "size", maxFontSize: null}, options);

    return this.each(function(index, elem) {
        var style = getComputedStyle(elem);
        var width = elem.offsetWidth;
        var height = elem.offsetHeight;
        var fontSize = parseFloat(style.fontSize);
        var ratio = width / height;

        var parent = elem.parentNode;
        var parentStyle = getComputedStyle(parent);
        var parentWidth = parent.clientWidth -
            parseFloat(parentStyle.paddingLeft) -
            parseFloat(parentStyle.paddingRight);
        var parentHeight = parent.clientHeight -
            parseFloat(parentStyle.paddingTop) -
            parseFloat(parentStyle.paddingBottom);
        var parentRatio = parentWidth / parentHeight;

        var scale;
        if (ratio <= parentRatio) {
            scale = parentHeight / height;
        } else {
            scale = parentWidth / width;
        }

        if (options.maxFontSize) {
            // get computed value (in pixels) for maxFontSize
            elem.style.fontSize = options.maxFontSize;
            // workaround for TODO: report and link bug
            elem.offsetWidth;
            var maxFontSize = parseFloat(style.fontSize);
            elem.style.fontSize = fontSize + "px";

            scale = Math.min(scale, maxFontSize / fontSize);
        }

        switch (options.method) {
        case "size":
            elem.style.width = (width * scale) + "px";
            elem.style.height = (height * scale) + "px";
            // Some text renderers draw text with the font size rounded to the
            // nearest integer. This may result in an exaggerated text scale,
            // thus always round down.
            elem.style.fontSize = Math.floor(fontSize * scale) + "px";
            break;
        case "transform":
            elem.style.transform = "scale(" + scale + ")";
            elem.style.webkitTransform = "scale(" + scale + ")";
            break;
        }

        return elem;
    });
};

ns.hyphenate = function(camelcased) {
    return camelcased.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
};

}(wall));

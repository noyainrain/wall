/*
 * Wall
 */

var wall = wall || {};
wall.bricks = wall.bricks || {};
(function(ns) {

/* ==== Ui ==== */

/**
 * Base for Wall user interfaces.
 *
 * Attributes:
 *
 * - `config`: TODO
 * - `socket`: TODO
 * - `connectionState`: TODO
 * - `postElementTypes`: TODO
 * - `msgHandlers`: TODO
 * - `bricks`: TODO
 * - `baseUrl`: TODO Must be set by subclass.
 * - `brickType`: TODO Must be set by subclass.
 *
 * Subclasses must set `baseUrl` and `brickType` and implement `init`.
 */
ns.Ui = function() {
    wall.util.EventTarget.call(this);

    this.config = null;
    this.socket = null;
    this.connectionState = "closed";
    this.postElementTypes = {};
    this.msgHandlers = {};
    this.bricks = {};

    this.baseUrl = "/static/remote/";
    this.brickType = null;
};

ns.Ui.prototype = Object.create(wall.util.EventTarget.prototype, {
    /**
     * Initialize the `Ui`. Returns a promise that is resolved when the
     * initialization is complete.
     *
     * Subclasses that implement this method must invoke the initialization
     * steps `loadConfig`, `initCommon`, `loadBricks` and `connect` (in this
     * order).
     */
    init: {value: function() {
        throw new TypeError();
    }},

    /**
     * TODO: document
     */
    initCommon: {value: function() {
        this.msgHandlers["posted"] = this.eventMessage.bind(this);
    }},

    /**
     * Load the configuration. This is an initialization step and may only be
     * called by subclasses from within `init`.
     */
    loadConfig: {value: function() {
        var requestQueue = [];

        var defaultsRequest = new XMLHttpRequest();
        defaultsRequest.open("GET", this.baseUrl + "config.default.json", true);
        defaultsRequest.responseType = "json";
        requestQueue.push(wall.util.send(defaultsRequest));

        var configRequest = new XMLHttpRequest();
        configRequest.open("GET", this.baseUrl + "config.json", true);
        configRequest.responseType = "json";
        requestQueue.push(wall.util.send(configRequest));

        return Promise.all(requestQueue).then(function() {
            this.config = defaultsRequest.response;
            for (var key in configRequest.response) {
                this.config[key] = configRequest.response[key];
            }
        }.bind(this));
    }},

    /**
     * Load the bricks as given by the configuration. This is an initialization
     * step and may only be called by subclasses from within `init`.
     */
    loadBricks: {value: function() {
        if (!wall.util.isArray(this.config.bricks, "string")) {
            throw new ConfigurationError("bricks_invalid_type");
        }
        var bricks = wall.util.createSet(this.config.bricks);

        // initialize bricks (inspired by server's wall.WallApp.__init__)
        bricks.forEach(function(name) {
            var module = name.split(".").reduce(
                function(o, n) { return o[n]; }, window);
            var brick = new module[this.brickType](this);
            this.bricks[brick.id] = brick;
        }, this);
    }},

    connect: {value: function() {
        console.log("connecting...");
        this.socket = new WebSocket("ws://" + location.host + "/api/socket");
        this.socket.addEventListener("open", this._opened.bind(this));
        this.socket.addEventListener("close", this._closed.bind(this));
        this.socket.addEventListener("message", this._received.bind(this));
        this.connectionState = "connecting";
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
        setTimeout(this.connect.bind(this), 5000);
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

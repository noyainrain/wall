/*
 * Wall
 */

var wall = wall || {};
wall.bricks = wall.bricks || {};
(function(ns) {

/* ==== Ui ==== */

/**
 * Base for Wall user interfaces.
 */
ns.Ui = function() {
    wall.util.EventTarget.call(this);

    this.config = null;
    this.socket = null;
    this.connectionState = "closed";
    this.postElementTypes = {};
    this.msgHandlers = {};
    this.bricks = {};
    this.baseUrl = null;
    this.brickType = null;
};

ns.Ui.prototype = Object.create(wall.util.EventTarget.prototype, {
    // TODO: document `ConfigurationError`
    /**
     * Initialize the `Ui`. Returns a promise that is resolved when the
     * initialization is complete.
     *
     * Subclass API: subclasses must implement this method and must invoke the
     * initialization steps `loadConfig`, `initCommon`, `loadBricks` and
     * `connect` (in this order).
     */
    init: {value: function() {
        throw new TypeError();
    }},

    /**
     * Subclass API: Initialize the connection after it has been established.
     * May return a promise. The default implementation does nothing.
     */
    initConnection: {value: function() {}},

    /**
     * Subclass API: initialize common `Ui` functionality.
     *
     * This is an initialization step and may only be called from within `init`.
     */
    initCommon: {value: function() {
        this.msgHandlers["post_edited"] = this.eventMessage.bind(this);
        this.msgHandlers["collection_posted"] = this.eventMessage.bind(this);
        this.msgHandlers["collection_item_removed"] =
            this.eventMessage.bind(this);
        this.msgHandlers["collection_item_activated"] =
            this.eventMessage.bind(this);
        this.msgHandlers["collection_item_deactivated"] =
            this.eventMessage.bind(this);
    }},

    /**
     * Subclass API: load the configuration. Returns a promise that is resolved
     * when the configuration is loaded.
     *
     * This is an initialization step and may only be called from within `init`.
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
     * Subclass API: Load the bricks as given by the configuration. Returns a
     * promise that is resolved when all bricks are loaded.
     *
     * This is an initialization step and may only be called from within `init`.
     */
    loadBricks: {value: function() {
        if (!wall.util.isArray(this.config.bricks, "string")) {
            throw new ConfigurationError("bricks_invalid_type");
        }
        var bricks = wall.util.createSet(this.config.bricks);

        var loadQueue = [];
        bricks.forEach(function(brick) {
            console.log('loading extension "' + brick + '"...');
            var link = document.createElement("link");
            loadQueue.push(wall.util.load(link, brick));
            link.rel = "import";
            document.head.appendChild(link);
        }, this);

        return Promise.all(loadQueue).then(function (links) {
            for (var i = 0; i < links.length; i++) {
                var link = links[i];
                // TODO: error if module is not given, module does not exist,
                // brick constructor does not exist, brick constructor fails or
                // brick's `id` is not set
                var module = link.import.querySelector('meta[name="module"]')
                    .content;

                // initialize brick (inspired by server's wall.WallApp.__init__)
                var module = module.split(".").reduce(
                    function(o, n) { return o[n]; }, window);
                var brick = new module[this.brickType](this, link.import);
                this.bricks[brick.id] = brick;
            }
        }.bind(this), function(link) {
            // TODO: better error type
            throw new Error('load_brick_failed("' + link.href + '")');
        });
    }},

    // TODO: document
    connect: {value: function() {
        console.log("connecting...");
        this.socket = new WebSocket("ws://" + location.host + "/api/socket");
        this.socket.addEventListener("open", this._opened.bind(this));
        this.socket.addEventListener("close", this._closed.bind(this));
        this.socket.addEventListener("message", this._received.bind(this));
        this.connectionState = "connecting";
    }},

    /**
     * Send a message to the server via *SJMP*. `msg` is the message to sent.
     */
    send: {value: function(msg) {
        this.socket.send(JSON.stringify(msg));
    }},

    /**
     * Call a Wall Web API method. `method` is the name of the method to call.
     * Arguments are passed as object `args`. A promise is returned that is
     * resolved to the result when the call is complete.
     *
     * See *api.md* for detailed documentation on the Wall Web API.
     */
    call: {value: function(method, args, callback) {
        // TODO: remove callback
        return new Promise(function(resolve, reject) {
            this.msgHandlers[method] = function(msg) {
                delete this.msgHandlers[method];
                resolve(msg.data);
                // backward compatibility
                if (callback) {
                    callback(msg.data);
                }
            }.bind(this);
            this.send({type: method, data: args});
        }.bind(this));
    }},

    // TODO: rename and move to display (see RemoteUi.registerPostElement)
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
        Promise.resolve(this.initConnection()).then(function() {
            console.log("connected");
            this.connectionState = "open";
        }.bind(this));
    }},

    _closed: {value: function(event) {
        console.log("disconnected");
        if (this.connectionState === "connecting") {
            this.connectionState = "failed";
        } else if (this.connectionState === "open") {
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

/**
 * An extension (plugin) for Wall.
 *
 * Static attributes:
 *
 *  - `id`: unqiue brick identifier. Must be set by subclass.
 *
 * Attributes:
 *
 *  - `html`: HTML component document.
 */
ns.Brick = function(ui, html) {
    this.ui = ui;
    this.html = html;
};

ns.Brick.prototype = Object.create(Object.prototype, {
    id: {value: null}
});

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

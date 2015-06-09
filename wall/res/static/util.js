/*
 * Wall
 */

var wall = wall || {};
wall.util = wall.util || {};
(function(ns) {

/* ==== EventTarget ==== */

ns.EventTarget = function() {
    this._eventListeners = {};
};

/**
 * Event target.
 *
 * Inspired by the DOM specification (see
 * http://dom.spec.whatwg.org/#interface-eventtarget ).
 */
ns.EventTarget.prototype = Object.create(Object.prototype, {
    addEventListener: {value: function(type, listener) {
        if (!this._eventListeners.hasOwnProperty(type)) {
            this._eventListeners[type] = [];
        }
        var listeners = this._eventListeners[type];
        if (listeners.indexOf(listener) === -1) {
            listeners.push(listener);
        }
    }},

    removeEventListener: {value: function(type, listener) {
        var listeners = this._eventListeners[type] || [];
        var index = listeners.indexOf(listener);
        if (index === -1) {
            throw new Error("listener_unknown");
        }
        listeners.splice(index, 1);
    }},

    dispatchEvent: {value: function(event) {
        event.target = this;
        var listeners = this._eventListeners[event.type] || [];
        for (var i = 0; i < listeners.length; i++) {
            var listener = listeners[i];
            if ("handleEvent" in listener) {
                listener.handleEvent(event);
            } else {
                listener.call(this, event);
            }
        }
    }}
});

/* ==== Event ==== */

ns.Event = function(type, args) {
    args = args || {};
    this.type = type;
    this.target = null;
    this.args = args;
};

/* ==== ConfigurationError ==== */

// TODO: document
ns.ConfigurationError = function(message) {
    this.message = message || null;
};

ns.ConfigurationError.prototype = Object.create(Error.prototype);

/* ==== */

ns.cloneChildNodes = function(node) {
    var fragment = document.createDocumentFragment();
    for (var i = 0; i < node.childNodes.length; i++) {
        fragment.appendChild(node.childNodes[i].cloneNode(true));
    }
    return fragment;
};

/**
 * Load a template into an element `elem`.
 *
 * The template is retrieved from the `document` via `selector`. If the template
 * is not found, an `Error("template_not_found")` is thrown.
 */
ns.loadTemplate = function(elem, selector) {
    var template = document.querySelector(selector);
    if (!template) {
        throw new Error("template_not_found");
    }
    elem.appendChild(ns.cloneChildNodes(template));
    // NOTE: with template tag:
    // elem.appendChild(document.importNode(template.content));
};

// TODO: document
ns.send = function(request, data) {
    return new Promise(function(resolve, reject) {
        request.onload = function() {
            resolve(request);
        };
        request.onerror = function() {
            reject(request);
        }
        request.send(data);
    });
};

// TODO: document
ns.load = function(link, href) {
    return new Promise(function(resolve, reject) {
        link.onload = function() {
            resolve(link);
        }
        link.onerror = function(event) {
            reject(link);
        }
        link.href = href;
    });
}

/**
 * Test if `object` is an `Array` with all items matching the specified
 * `itemType`. Item tests are performed with the `typeof` operator.
 */
ns.isArray = function(object, itemType) {
    return object instanceof Array &&
        object.every(function(i) { return typeof i === itemType });
};

// TODO: document
ns.createSet = function(array) {
    var set = new Set();
    for (var i = 0; i < array.length; i++) {
        set.add(array[i]);
    }
    return set;
};

}(wall.util));

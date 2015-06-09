/*
 * Wall
 */

wall.display = {};
(function(ns) {

/* ==== DisplayUi ==== */

/**
 * Wall display user interface.
 */
ns.DisplayUi = function() {
    wall.Ui.call(this);
    this._postSpace = null;
    this.baseUrl = "/static/display/";
    this.brickType = "DisplayBrick";
};

ns.DisplayUi.prototype = Object.create(wall.Ui.prototype, {
    init: {value: function() {
        return this.loadConfig().then(function() {
            this.initCommon();

            this.addEventListener("collection_item_activated",
                this._itemActivated.bind(this));
            this.addEventListener("collection_item_deactivated",
                this._itemDeactivated.bind(this));
            this.addPostElementType(ns.TextPostElement);
            this.addPostElementType(ns.ImagePostElement);
            this.addPostElementType(ns.GridPostElement);

            this._postSpace = new ns.PostSpace(this);
            document.body.appendChild(this._postSpace.element);
            this._postSpace.attachedCallback();

            return this.loadBricks();
        }.bind(this)).then(function() {
            this.connect();
        }.bind(this));
    }},

    _itemActivated: {value: function(event) {
        if (event.args.collection_id !== "wall") {
            return;
        }
        this._postSpace.post = event.args.post;
    }},

    _itemDeactivated: {value: function(event) {
        if (event.args.collection_id !== "wall") {
            return;
        }
        this._postSpace.post = null;
    }}
});

/**
 * Post element.
 *
 * Subclass API: subclasses should implement `updateContent()`.
 */
ns.PostElement = function(post, ui) {
    wall.PostElement.call(this, post, ui);

    this.content = document.createElement("div");
    this.content.classList.add("post-content");
    this.content.classList.add(wall.hyphenate(this.postType) + "-content");

    this.element = document.createElement("iframe");
    this.element.classList.add("post");
    this.element.classList.add(wall.hyphenate(this.postType));

    $(this.element).one("load", function(event) {
        var doc = this.element.contentDocument;
        doc.querySelector(".post-poster").textContent = this.post.poster.name;
        doc.querySelector(".post-posted").textContent =
            new Date(this.post.posted).toLocaleString();
        if (this.post.is_collection) {
            doc.querySelector(".post-meta").style.display = "none";
        }
        this.updateContent();
        doc.body.insertBefore(this.content, doc.body.firstElementChild);
        this.contentAttachedCallback();
    }.bind(this));
    this.element.src = "/display/post?id=" + this.post.id;
};

ns.PostElement.prototype = Object.create(wall.PostElement.prototype, {
    attachedCallback: {value: function() {
        ui.addEventListener("post_edited", this);
    }},

    detachedCallback: {value: function() {
        ui.removeEventListener("post_edited", this);
    }},

    contentAttachedCallback: {value: function() {}},

    /**
     * Subclass API: update the content UI.
     *
     * Called when `post` is set or edited. The default implementation does
     * nothing.
     */
    updateContent: {value: function() {}},

    handleEvent: {value: function(event) {
        if (event.target === ui && event.type === "post_edited") {
            if (event.args.post.id !== this.post.id) {
                return;
            }
            this.post = event.args.post;
            this.updateContent();
        }
    }}
});

/* ==== TextPostElement ==== */

ns.TextPostElement = function(post, ui) {
    ns.PostElement.call(this, post, ui);
    this.content.appendChild(document.createElement("pre"));
};

ns.TextPostElement.prototype = Object.create(ns.PostElement.prototype, {
    postType: {value: "TextPost"},

    contentAttachedCallback: {value: function() {
        this.element.contentWindow.addEventListener("resize", this);
        this._layout();
    }},

    detachedCallback: {value: function() {
        ns.PostElement.prototype.detachedCallback.call(this);
        this.element.contentWindow.removeEventListener("resize", this);
    }},

    updateContent: {value: function() {
        this.content.querySelector("pre").textContent = this.post.content;
        this._layout();
    }},

    _layout: {value: function() {
        // First layout the text by rendering it (with a fixed font size) into
        // an element with a fixed maximum width. Then fit this element to the
        // post element (scaling the text accordingly).
        var pre = this.content.querySelector("pre");
        pre.style.width = "";
        pre.style.height = "";
        pre.style.fontSize = "16px";
        pre.style.maxWidth = "70ch";
        $(pre).fitToParent({maxFontSize: (20 / 1.5) + "vh"});
    }},

    handleEvent: {value: function(event) {
        ns.PostElement.prototype.handleEvent.call(this, event);
        if (event.currentTarget === this.element.contentWindow
                && event.type === "resize") {
            this._layout();
        }
    }}
});

/* ==== ImagePostElement ==== */

ns.ImagePostElement = function(post, ui) {
    ns.PostElement.call(this, post, ui);
    this.content.style.backgroundImage = "url(" + this.post.url + ")";
};

ns.ImagePostElement.prototype = Object.create(ns.PostElement.prototype, {
    postType: {value: "ImagePost"}
});

/* ==== GridPostElement ==== */

ns.GridPostElement = function(post, ui) {
    ns.PostElement.call(this, post, ui);
    this._postedHandler = this._posted.bind(this);
    this._itemRemovedHandler = this._itemRemoved.bind(this);
};

/**
 * View for grid posts.
 */
ns.GridPostElement.prototype = Object.create(ns.PostElement.prototype, {
    postType: {value: "GridPost"},

    contentAttachedCallback: {value: function() {
        this.ui.call("collection_get_items", {collection_id: this.post.id},
            function(posts) {
                this.ui.addEventListener("collection_posted",
                    this._postedHandler);
                this.ui.addEventListener("collection_item_removed",
                    this._itemRemovedHandler);

                for (var i = 0; i < posts.length; i++) {
                    this._addItem(posts[i]);
                }
            }.bind(this));
    }},

    detachedCallback: {value: function() {
        this.ui.removeEventListener("collection_posted", this._postedHandler);
        this.ui.removeEventListener("collection_item_removed",
            this._itemRemovedHandler);
    }},

    _addItem: {value: function(post) {
        var postSpace = new ns.PostSpace(this.ui);
        this.content.appendChild(postSpace.element);
        postSpace.attachedCallback();
        postSpace.element.object = postSpace;
        this._layout();
        postSpace.post = post;
    }},

    _removeItem: {value: function(index, post) {
        var postSpace = this.content.children[index].object;
        this.content.removeChild(postSpace.element);
        postSpace.detachedCallback();
        this._layout();
    }},

    _layout: {value: function() {
        // NOTE: improvement: insert CSS rule instead of applying the style to
        // each element
        // NOTE: improvement: query / compute margin size from CSS
        var size = 100 / Math.ceil(Math.sqrt(this.content.children.length));
        for (var i = 0; i < this.content.children.length; i++) {
            var element = this.content.children[i];
            // - 1px to prevent wrap due to rounding errors
            element.style.width = "calc(" + size + "% - 0.25rem - 1px)";
            element.style.height = "calc(" + size + "% - 0.25rem)";
        }
    }},

    _posted: {value: function(event) {
        if (event.args.collection_id !== this.post.id) {
            return;
        }
        this._addItem(event.args.post);
    }},

    _itemRemoved: {value: function(event) {
        if (event.args.collection_id !== this.post.id) {
            return;
        }
        this._removeItem(event.args.index, event.args.post);
    }}
});

/* ==== PostSpace ==== */

ns.PostSpace = function(ui) {
    wall.Element.call(this, ui);
    this._post = null;
    this._postElement = null;
    this.element = document.createElement("div");
    this.element.classList.add("post-space");
};

/**
 * Space for a `PostElement`.
 *
 * Attributes:
 *
 *  - post: post for which the `PostSpace` holds a `PostElement` or `null` if
 *    the `PostSpace` is currently empty. Setting this constructs a
 *    `PostElement` inside the `PostSpace` or empties the `PostSpace` if the
 *    value is `null`.
 */
ns.PostSpace.prototype = Object.create(wall.Element.prototype, {
    post: {
        set: function(value) {
            if (this._post) {
                this.element.removeChild(this._postElement.element);
                this._postElement.detachedCallback();
                this._postElement = null;
                this._post = null;
            }

            this._post = value;

            if (this._post) {
                var postElementType =
                    this.ui.postElementTypes[this._post.__type__];
                this._postElement = new postElementType(this._post, this.ui);
                this.element.appendChild(this._postElement.element);
                this._postElement.attachedCallback();
            }
        },
        get: function() {
            return this._post;
        }
    }
});

}(wall.display));

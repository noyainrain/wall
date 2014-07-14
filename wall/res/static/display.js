/*
 * Wall
 */

wall.display = {};
(function(ns) {

/* ==== DisplayUi ==== */

ns.DisplayUi = function(bricks) {
    wall.Ui.call(this, bricks);
    this.currentPostElement = null;

    this.addPostElementType(ns.TextPostElement);
    this.addPostElementType(ns.ImagePostElement);
    this.addEventListener("posted", this._posted.bind(this));

    this.loadBricks(bricks, "DisplayBrick");
};

ns.DisplayUi.prototype = Object.create(wall.Ui.prototype, {
    _post: {value: function(post) {
        if (this.currentPostElement) {
            document.body.removeChild(this.currentPostElement.element);
            this.currentPostElement.detachedCallback();
            this.currentPostElement = null;
        }

        var postElementType = this.postElementTypes[post.__type__];
        this.currentPostElement = new postElementType(post, this);
        document.body.appendChild(this.currentPostElement.element);
        this.currentPostElement.attachedCallback();
    }},

    _posted: {value: function(event) {
        this._post(event.args.post);
    }}
});

/* ==== PostElement ==== */

ns.PostElement = function(post, ui) {
    wall.PostElement.call(this, post, ui);

    this.content = document.createElement("div");
    this.content.classList.add("post-content");
    this.content.classList.add(wall.hyphenate(this.postType) + "-content");

    this.element = document.createElement("iframe");
    this.element.classList.add("post");
    this.element.classList.add(wall.hyphenate(this.postType));

    $(this.element).one("load", function(event) {
        this.element.contentDocument.body.appendChild(this.content);
        this.contentAttachedCallback();
    }.bind(this));
    this.element.src = "/display/post";
};

ns.PostElement.prototype = Object.create(wall.PostElement.prototype, {
    contentAttachedCallback: {value: function() {}}
});

/* ==== TextPostElement ==== */

ns.TextPostElement = function(post, ui) {
    ns.PostElement.call(this, post, ui);
    var pre = document.createElement("pre");
    pre.textContent = this.post.content;
    this.content.appendChild(pre);
};

ns.TextPostElement.prototype = Object.create(ns.PostElement.prototype, {
    postType: {value: "TextPost"},

    contentAttachedCallback: {value: function() {
        // First layout the text by rendering it (with a fixed font size) into
        // an element with a fixed maximum width. Then fit this element to the
        // post element (scaling the text accordingly).
        var pre = this.content.querySelector("pre");
        pre.style.fontSize = "16px";
        pre.style.maxWidth = "70ch";
        $(pre).fitToParent({maxFontSize: (20 / 1.5) + "vh"});
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

}(wall.display));

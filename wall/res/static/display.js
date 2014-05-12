/*
 * Wall
 */

wall.display = {};
(function(ns) {

/* ==== DisplayUi ==== */

ns.DisplayUi = function(bricks) {
    wall.Ui.call(this, bricks);
    this.currentPostElement = null;
    this.loadBricks(bricks, "DisplayBrick");
    this.msgHandlers["posted"] = $.proxy(this._postedMsg, this);
    this.addPostElementType(ns.TextPostElement);
    this.addPostElementType(ns.ImagePostElement);
};

$.extend(ns.DisplayUi.prototype, wall.Ui.prototype, {
    _postedMsg: function(msg) {
        if (this.currentPostElement) {
            this.currentPostElement.element.remove();
            this.currentPostElement.detachedCallback();
            this.currentPostElement = null;
        }

        var post = msg.data;
        var postElementType = this.postElementTypes[post.__type__];
        this.currentPostElement = new postElementType(post, this);
        $("body").append(this.currentPostElement.element);
        this.currentPostElement.attachedCallback();
    }
});

/* ==== PostElement ==== */

ns.PostElement = function(post, ui) {
    wall.PostElement.call(this, post, ui);

    this.content = $('<div class="post-content"></div>').addClass(
            wall.hyphenate(this.postType) + "-content");

    this.element = $('<iframe class="post"></iframe>').addClass(
        wall.hyphenate(this.postType));
    this.element.load(function(event) {
        $("body", this.element[0].contentDocument).append(this.content);
        this.contentAttachedCallback();
    }.bind(this));
    this.element.attr("src", "/display/post");
};

ns.PostElement.prototype = Object.create(wall.PostElement.prototype, {
    contentAttachedCallback: {value: function() {}}
});

/* ==== TextPostElement ==== */

ns.TextPostElement = function(post, ui) {
    ns.PostElement.call(this, post, ui);
    $("<pre>").text(post.content).appendTo(this.content);
};

ns.TextPostElement.prototype = Object.create(ns.PostElement.prototype, {
    postType: {value: "TextPost"},

    contentAttachedCallback: {value: function() {
        // First layout the text by rendering it (with a fixed font size) into
        // an element with a fixed maximum width. Then fit this element to the
        // post element (scaling the text accordingly).
        var pre = this.content[0].querySelector("pre");
        pre.style.fontSize = "16px";
        pre.style.maxWidth = "70ch";
        $(pre).fitToParent({maxFontSize: (20 / 1.5) + "vh"});
    }}
});

/* ==== ImagePostElement ==== */

ns.ImagePostElement = function(post, ui) {
    ns.PostElement.call(this, post, ui);
    this.content.css("background-image", "url(" + this.post.url + ")");
};

ns.ImagePostElement.prototype = Object.create(ns.PostElement.prototype, {
    postType: {value: "ImagePost"}
});

}(wall.display));

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

    // First layout the post content by rendering it (with a fixed font
    // size) into a container of fixed width. Then fit this container to the
    // screen (scaling the text accordingly).
    //
    // Because font rendering is a rather complex process, the layout (e.g.
    // word wrapping) of the scaled text may not exactly match the
    // pre-rendered. We want to avoid the scaled version to be not as
    // compact, since then the text may overflow its container.

    // use a floating point font size to avoid a pixel perfect and thus
    // possibly compact layout
    var fontSize = 16.5;
    var lineHeight = fontSize * 1.5;
    // a line should hold about 70 characters (assuming a character ratio of
    // about 3/1)
    var lineWidth = lineHeight * (70 / 3);

    var pre = $("<pre>").addClass("text-post").text(post.content)
        .appendTo(this.content);
    pre.css({
        "font-size": fontSize + "px",
        "width": lineWidth + "px"
    });

    // add an additional line to counter a possible compact layout
    var lineCount = Math.round(pre.height() / lineHeight) + 1;
    pre.css({"height": lineCount * lineHeight + "px"});

    pre.fitToParent();
    pre.css({"font-size": pre.height() / lineCount / 1.5 + "px"});
};

$.extend(ns.TextPostElement.prototype, ns.PostElement.prototype, {
    postType: "TextPost"
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

/*
 * Wall
 */

wall.display = {};
(function(ns) {

/* ==== DisplayUi ==== */

ns.DisplayUi = function(bricks) {
    wall.Ui.call(this, bricks);
    this.loadBricks(bricks, "DisplayBrick");
    this.msgHandlers["posted"] = $.proxy(this._postedMsg, this);
    this.addPostHandler(new wall.display.ImagePostHandler());
    this.addPostHandler(new wall.display.TextPostHandler());
};

$.extend(ns.DisplayUi.prototype, wall.Ui.prototype, {
    _postedMsg: function(msg) {
        if (this.currentPost) {
            this.currentPostHandler.cleanupPost();
            $(".post-frame").remove();
        }

        this.currentPost = msg.data;
        this.currentPostHandler = this.postHandlers[this.currentPost.__type__];

        var iframe = $("<iframe>").addClass("post-frame").appendTo($("body"));
        iframe.load(function(event) {
            var elem = $("body", $(".post-frame").get(0).contentDocument);
            elem.addClass(wall.hyphenate(this.currentPost.__type__));
            this.currentPostHandler.initPost(elem, this.currentPost);
        }.bind(this));
        iframe.attr("src", "/display/post");
    }
});

/* ==== ImagePostHandler ==== */

ns.ImagePostHandler = function() {
    wall.PostHandler.call(this);
};

$.extend(ns.ImagePostHandler.prototype, wall.PostHandler.prototype, {
    type: "ImagePost",

    _html: '<img class="image-post" src="" />',

    initPost: function(elem, post) {
        elem.append($(this._html));
        var img = $(".image-post", elem);
        img.load(function() {
            img.fitToParent();
        });
        img.attr("src", post.url);
    }
});

/* ==== TextPostHandler ==== */

ns.TextPostHandler = function() {
    wall.PostHandler.call(this);
};

$.extend(ns.TextPostHandler.prototype, wall.PostHandler.prototype, {
    type: "TextPost",
    
    initPost: function(elem, post) {
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
            .appendTo(elem);
        pre.css({
            "font-size": fontSize + "px",
            "width": lineWidth + "px"
        });
        
        // add an additional line to counter a possible compact layout
        var lineCount = Math.round(pre.height() / lineHeight) + 1;
        pre.css({"height": lineCount * lineHeight + "px"});
        
        pre.fitToParent();
        pre.css({"font-size": pre.height() / lineCount / 1.5 + "px"});
    }
});

}(wall.display));

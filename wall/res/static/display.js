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

    initPost: function(elem, post) {
        var img = $('<img src="" />').appendTo(elem);
        img.load(function() {
            img.fitToParent();
        });
        img.attr("src", post.url);
    }
});

}(wall.display));

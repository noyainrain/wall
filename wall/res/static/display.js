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
            $("#content").empty();
        }
        this.currentPost = msg.data;
        this.currentPostHandler = this.postHandlers[this.currentPost.__type__];
        this.currentPostHandler.initPost($("#content"), this.currentPost);
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
        var img = $(".image-post");
        img.load(function() {
            img.fitToParent();
        });
        img.attr("src", post.url);
    }
});

}(wall.display));

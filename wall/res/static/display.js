/*
 * Wall
 */

wall.display = {};
(function(ns) {

/* ==== ImagePostHandler ==== */

ns.ImagePostHandler = function() {
    wall.PostHandler.call(this);
};

$.extend(ns.ImagePostHandler.prototype, wall.PostHandler.prototype, {
    type: "ImagePost",

    _html: '<img id="image-post" src="" />',

    initPost: function(elem, post) {
        elem.append($(this._html));
        var img = $("#image-post");
        img.attr("src", post.url)
        img.load(function() {
            img.fitToParent();
        });
    }
});

}(wall.display));

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

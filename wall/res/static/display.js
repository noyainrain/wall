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

    initPost: function(elem, post) {
        // TODO: render
        elem.text("ImagePost (display)");
    }
});

}(wall.display));

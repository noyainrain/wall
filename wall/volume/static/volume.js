/*
 * Wall
 */

wall.volume = {};
(function(ns) {

ns.Brick = function(ui) {
    wall.Brick.call(this, ui);
    this.window = null;
};

$.extend(ns.Brick.prototype, wall.Brick.prototype, {
    id:         "volume",
    postType:   "VolumePost",
    postTitle:  "Volume",
    postSingle: true

    initPost: function(elem, post) {
        $("<h3>Volume:</h3><h1> " + post.volume + "</h1>").appendTo(elem);
    },

    clientInitPost: function(elem, post) {
        $("<p>Volume: " + post.volume + "</p>").appendTo(elem);
    }
});

}(wall.volume))

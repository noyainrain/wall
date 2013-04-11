/*
 * Wall
 */

wall.tagesschau = {};
(function(ns) {

ns.Brick = function(ui) {
    wall.Brick.call(this, ui);
};

$.extend(ns.Brick.prototype, wall.Brick.prototype, {
    id:        "tagesschau",
    postType:  "TagesschauPost",
    postTitle: "Tagesschau",
    postSingle: true,
    
    initPost: function(elem, post) {
		elem.html("<video style=\"display: block; margin: 0 auto;\" id=\"tagesschau-video-tag\" autoplay>" + "<source src=\"" + post.url + "\" type=\'video/mp4; codecs=\"avc1.42E01E, mp4a.40.2\"\' />" + "<video>");
        // vertical align
        $('#tagesschau-video-tag').on('loadedmetadata', function() {
            $(this).css('margin-top', -($(this).height() / 2));
        });


    },
    
    clientInitPost: function(elem, post) {
		$("<p>").text("Tagesschau").appendTo(elem);
    }
});

}(wall.tagesschau))

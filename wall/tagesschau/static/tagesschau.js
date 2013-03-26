/*
 * Wall
 */

wall.tagesschau = {};
(function(ns) {

ns.Brick = function(ui) {
    this.ui     = ui;
    this.window = null;
};

ns.Brick.prototype = {
    postType:  "TagesschauPost",
    postTitle: "Tagesschau",
    id:        "tagesschau",
    
    initPost: function(elem, post) {
		elem.html("<video style=\"display: block; margin: 0 auto;\" id=\"video1\" autoplay>" + "<source src=\"" + post.url + "\" type=\'video/mp4; codecs=\"avc1.42E01E, mp4a.40.2\"\' />" + "<video>");
    },
    
    cleanupPost: function() {
		this.window && this.window.close();
    },
    
    clientInitPost: function(elem, post) {
		$("<p>").text("Tagesschau").appendTo(elem);
    },
    
    clientCleanupPost: function() {},
    
    clientInitPostNewPanel: function(elem) {
    },
    
    clientCleanupPostNewPanel: function() {},
    
    clientQueryPostNewPanel: function() {
    },
    
    clientPostedNew: function(error) {
    }
};

}(wall.tagesschau))

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
    
    initPost: function(elem, post) {
		foo = "<center><video id=\"video1\" autoplay>" + "<source src=\"" + post.url + "\" type=\'video/mp4; codecs=\"avc1.42E01E, mp4a.40.2\"\' />" + "<video></center>";
		elem.html(foo);
    },
    
    cleanupPost: function() {
		if (this.window) {
        	this.window.close();
		}
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

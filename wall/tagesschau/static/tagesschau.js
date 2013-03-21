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
		console.log(post.status)
		if(post.status != "") {
			elem.text("Could not connect to tagesschau.de");		
		} else {
			this.window = open(post.url, "browser");
		}
    },
    
    cleanupPost: function() {
		if (this.window) {
        	this.window.close();
		}
    },
    
    clientInitPost: function(elem, post) {
        $("<a>").attr("href", "http://www.tagesschau.de/multimedia/livestreams/index.html").text("Tagesschau Livestream").appendTo(elem);
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

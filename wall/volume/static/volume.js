/*
 * Wall
 */

wall.volume = {};
(function(ns) {

ns.Brick = function(ui) {
    this.ui     = ui;
    this.window = null;
};

ns.Brick.prototype = {
    postType:  "VolumePost",
    postTitle: "Volume",
   
    initPost: function(elem, post) {
        $("<p><h3>Volume:</h3><h1> " + post.volume + "</h1></p>").appendTo(elem);
    },
    
    cleanupPost: function() {
    },
    
    clientInitPost: function(elem, post) {
        $("<p>Volume: " + post.volume + "</p>").appendTo(elem);
    },

    clientCleanupPost: function() {
	},
    
    clientInitPostNewPanel: function(elem) {
    },
    
    clientCleanupPostNewPanel: function() {
	},
    
    clientQueryPostNewPanel: function() {
    },
    
    clientPostedNew: function(error) {
    }
};

}(wall.volume))

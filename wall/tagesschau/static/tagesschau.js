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
        this.window = open("http://www.tagesschau.de/multimedia/livestreams/index.html", "browser");
    },
    
    cleanupPost: function() {
        this.window.close();
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

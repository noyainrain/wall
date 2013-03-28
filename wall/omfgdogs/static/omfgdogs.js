/*
 * Wall
 */

wall.omfgdogs = {};
(function(ns) {

ns.Brick = function(ui) {
    this.ui     = ui;
    this.window = null;
};

ns.Brick.prototype = {
    postType:  "OmfgDogsPost",
    postTitle: "OMFGDogs",
    id:        "omfgdogs",
    
    initPost: function(elem, post) {
        this.window = open('http://www.omfgdogs.com', "browser");
    },
    
    cleanupPost: function() {
        this.window.close();
    },
    
    clientInitPost: function(elem, post) {
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

}(wall.omfgdogs))

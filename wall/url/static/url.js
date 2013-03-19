/*
 * Wall
 */

wall.url = {};
(function(ns) {

ns.Brick = function(ui) {
    this.ui     = ui;
    this.window = null;
};

ns.Brick.prototype = {
    postType:  "UrlPost",
    postTitle: "URL",
    
    initPost: function(elem, post) {
        this.window = open(post.url, "browser");
    },
    
    cleanupPost: function() {
        this.window.close();
    },
    
    clientInitPost: function(elem, post) {
        $("<a>").attr("href", post.url).text(post.url).appendTo(elem);
    },
    
    clientCleanupPost: function() {},
    
    clientInitPostNewPanel: function(elem) {
        $('<input id="url-url" type="text">').appendTo(elem);
    },
    
    clientCleanupPostNewPanel: function() {},
    
    clientQueryPostNewPanel: function() {
        return {"url": $("#url-url").val()};
    },
    
    clientPostedNew: function(error) {
        if (error && error.__type__ == "ValueError") {
            this.ui.notify("URL missing.");
        }
    }
};

}(wall.url))

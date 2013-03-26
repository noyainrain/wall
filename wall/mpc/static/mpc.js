/*
 * Wall
 */

wall.mpc = {};
(function(ns) {

ns.Brick = function(ui) {
    this.ui     = ui;
    this.window = null;
    this.artist = null;
    this.album = null;
    this.title = null;
};

ns.Brick.prototype = {
    postType:  "MpcPost",
    postTitle: "MPC",
    id:        "mpc",
   
    initPost: function(elem, post) {
    if (post.currentsong.status === "offline") {
        $("<p>Could not connect to mpd</p>").appendTo(elem);
        return;
    }

    var artist = post.currentsong.artist;
    var album = post.currentsong.album;
    var title = post.currentsong.title;
        $("<p><h4>Artist:</h4><h1> " + artist + "</h1></p>").appendTo(elem);
        $("<p><h4>Title:</h4><h1> " + title + "</h2></p>").appendTo(elem);
        $("<p><h4>From Album:</h4><h1> " + album + "</h1></p>").appendTo(elem);

    },
    
    cleanupPost: function() {
    },
    
    clientInitPost: function(elem, post) {
    if (post.currentsong.status === "offline") {
        $("<p>Could not connect to mpd</p>").appendTo(elem);
        return;
    }


    var artist = post.currentsong.artist;
    var title = post.currentsong.title;
        $("<p><small>Now playing:<small></p>").appendTo(elem);
        $("<p>" + artist + "</p>").appendTo(elem);
        $("<p>" + title + "</p>").appendTo(elem);
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

}(wall.mpc))

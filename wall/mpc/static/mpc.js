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
   
    initPost: function(elem, post) {
    if (post.currentsong.status === "offline") {
        $("<p>Could not connect to mpd</p>").appendTo(elem);
        return;
    }

    artist = post.currentsong.artist;
    album = post.currentsong.album;
    title = post.currentsong.title;
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
        $("<p>Now playing: " + artist + "-" + title + "</p>").appendTo(elem);
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

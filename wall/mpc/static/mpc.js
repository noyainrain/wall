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
        $("<p>Artist:" + artist + "</p>").appendTo(elem);
        $("<p>Title:" + title + "</p>").appendTo(elem);
        $("<p>From Album: " + album + "</p>").appendTo(elem);

    },
    
    cleanupPost: function() {
    },
    
    clientInitPost: function(elem, post) {
	if (post.currentsong.status === "offline") {
        	$("<p>Could not connect to mpd</p>").appendTo(elem);
		return;
        }


	artist = post.currentsong.artist;
	title = post.currentsong.title;
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

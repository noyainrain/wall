/*
 * Wall
 */

wall.youtube = {};
(function(ns) {

ns.Brick = function(ui) {
    wall.Brick.call(this, ui);
    this.window = null;
};

$.extend(ns.Brick.prototype, wall.Brick.prototype, {
    id:        "youtube",
    postType:  "YoutubePost",
    postTitle: "YouTube",
 
    initPlayer: function(elem, post) {
        $("#youtube-player-container").tubeplayer({
            initialVideo: post.videoid, // the video that is loaded into the player
            width: "100%", // the width of the player
            height: $(window).height(), // the height of the player
            autoPlay: true, // whether the player should autoplay the video, 0 or 1
            allowFullScreen: "true", // true by default, allow user to go full screen
            showControls: 0, // whether the player should have the controls visible, 0 or 1
            showRelated: 0, // show the related videos when the player ends, 0 or 1 
            preferredQuality: "default",// preferred quality: default, small, medium, large, hd720
            onPlay: function(id){}, // after the play method is called
            onPause: function(){}, // after the pause method is called
            onStop: function(){}, // after the player is stopped
            onSeek: function(time){}, // after the video has been seeked to a defined point
            onMute: function(){}, // after the player is muted
            onUnMute: function(){} // after the player is unmuted
        });
        console.log(this.id + ': jQuery Tubeplayer initialized.');

        $("#youtube-player-container").tubeplayer("play");
        console.log(this.id + ': playback started.');
    },
   
    initPost: function(elem, post) {
        $('<div id="youtube-player-container" />').appendTo(elem);
        if(!$.fn.tubeplayer){
            $.getScript("/static/youtube/lib/jQuery.tubeplayer.js", $.proxy(function(data, textStatus, jqxhr) {
                console.log("youtube: loading TubePlayer API: " + textStatus);
                this.initPlayer(elem, post);
            }, this));
        } else {
            this.initPlayer(elem, post);
        } 
    },

    cleanupPost: function() {
        console.log(this.id + ": cleanup.");
        $("#youtube-player-container").tubeplayer("destroy").remove();
    },

    clientInitPost: function(elem, post) {
        $("<p>").text(post.title).appendTo(elem);
    },

    clientInitPostNewScreen: function(elem) {
        $(
                '<section>                                      ' +
                '    <h3 style="display: inline;">Search</h3>   ' +
                '    <small>Youtube</small>                     ' +
                '    <input id="url-query" type="search">       ' +
                '    <p class="buttons">                        ' +
                '        <button id="url-search">Search</button>' +
                '    </p>                                       ' +
                '    <ul class="select" id="url-results"></ul>  ' +
                '</section>                                     '
         ).appendTo(elem);

        $("#url-search").click($.proxy(this._searchClicked, this));
        $("#url-query").keydown($.proxy(function(e){ if(e.which == '13'){ this._searchClicked();} }, this));
    },

    _searchClicked: function(event) {
        this.ui.notify("Searching...");
        this.ui.call("youtube.search", {"query": $("#url-query").val()},
                $.proxy(function(results) {
                    this.ui.closeNotification();
                    $("#url-results").empty();
                    for (var i = 0; i < results.length; i++) {
                        var result = results[i];
                        var li = $("<li>")
                                 .data("result", result)
                                 .click($.proxy(this._resultClicked, this))
                                 .appendTo($("#url-results"));
                        if (result.thumbnail) {
                            $("<img>").attr("src", result.thumbnail).appendTo(li);
                        }
                        $("<p>").text(result.title).appendTo(li);
                    }
                }, this));
    },

    _resultClicked: function(event) {
        var result = $(event.currentTarget).data("result");
        this.ui.postNew(this.postType, {videoid: result.videoid, url: result.url, title: result.title});
    }
});

}(wall.youtube));

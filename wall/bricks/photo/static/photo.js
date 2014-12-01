/*
 * Wall
 */

wall.bricks = wall.bricks || {};
wall.bricks.photo = {};
(function(ns) {

/* ==== ClientPhotoBrick ==== */

ns.ClientPhotoBrick = function(ui, html) {
    wall.Brick.call(this, ui, html);
    this.ui.addDoPostHandler(new ns.DoPostPhotoHandler(this.ui));

    navigator.getUserMedia = navigator.getUserMedia ||
        navigator.mozGetUserMedia || navigator.webkitGetUserMedia;
    URL = window.URL || window.webkitURL;
}

ns.ClientPhotoBrick.prototype = Object.create(wall.Brick.prototype, {
    id: {value: "photo"}
});

/* ==== DoPostPhotoHandler ==== */

ns.DoPostPhotoHandler = function(ui) {
    wall.remote.DoPostHandler.call(this, ui);
    this.title = "Photo";
    this.icon = "/static/bricks/photo/photo.svg";
    this.collectionId = null;
    this._stream = null;
};

$.extend(ns.DoPostPhotoHandler.prototype, wall.remote.DoPostHandler.prototype, {
    post: function(collectionId) {
        if (!navigator.getUserMedia || !window.URL) {
            this.ui.showScreen(
                new wall.remote.NotSupportedScreen("camera access", this.ui));
            return;
        }
        this._init(collectionId);
    },

    _init: function(collectionId) {
        this.ui.showScreen($(ns._html));
        this.collectionId = collectionId;
        $("#photo-take").click($.proxy(this._takeClicked, this));
        $("#photo-video-back").click($.proxy(this._videoBackClicked, this));
        $("#photo-post").click($.proxy(this._postClicked, this));
        $("#photo-image-back").click($.proxy(this._imageBackClicked, this));
        $("#photo-screen video").click($.proxy(this._videoClicked, this));

        navigator.getUserMedia(
            {"video": true},
            $.proxy(function(stream) {
                // cancel if the user has meanwhile left the screen
                if ($("#photo-screen").length == 0) {
                    stream.stop();
                    return;
                }

                this._stream = stream;
                var video = $("#photo-screen video");
                video.attr("src", URL.createObjectURL(this._stream));
                video.get(0).play();
            }, this),
            function(error) {
                // The error handling part of the specification isn't stable
                // yet (as of November 2013). For now, assume that the error was
                // caused by the user denying camera access - and do nothing.
            }
        );
    },

    _cleanup: function() {
        if (this._stream) {
            this._stream.stop();
            this._stream = null;
        }
        this.ui.popScreen();
    },

    _takePhoto: function() {
        // TODO: enable clicking li and video once the video is initialized
        if (!this._stream) {
            return;
        }

        var video = $("#photo-screen video");
        var canvas = $("#photo-screen canvas");

        canvas.get(0).width = video.get(0).videoWidth;
        canvas.get(0).height = video.get(0).videoHeight;
        canvas.get(0).getContext("2d").drawImage(video.get(0), 0, 0);

        $("#photo-screen video, #photo-video-menu").hide();
        $("#photo-screen canvas, #photo-image-menu").show();

        canvas.css({width: "auto", height: "auto"});
        canvas.fitToParent();
    },

    _takeClicked: function(event) {
        this._takePhoto();
    },

    _videoBackClicked: function(event) {
        this._cleanup();
    },

    _postClicked: function(event) {
        this.ui.notify("Posting...");
        this.ui.postNew(this.collectionId, "ImagePost",
            {"url": $("#photo-screen canvas").get(0).toDataURL()},
            function (post) {
                this.ui.closeNotification();
                this._cleanup();
            }.bind(this)
        );
    },

    _imageBackClicked: function(event) {
        $("#photo-screen canvas, #photo-image-menu").hide();
        $("#photo-screen video, #photo-video-menu").show();
    },

    _videoClicked: function(event) {
        this._takePhoto();
    }
});

/* ==== */

ns._html =
    '<div id="photo-screen" class="screen fullscreen">                          ' +
    '    <video></video>                                                        ' +
    '    <canvas></canvas>                                                      ' +
    '    <ul id="photo-video-menu" class="overlay-menu">                        ' +
    '        <li id="photo-take">Take Photo</li><li id="photo-video-back">←</li>' +
    '    </ul>                                                                  ' +
    '    <ul id="photo-image-menu" class="overlay-menu">                        ' +
    '        <li id="photo-post">Post</li><li id="photo-image-back">←</li>      ' +
    '    </ul>                                                                  ' +
    '</div>                                                                     ';

ns.ClientBrick = ns.ClientPhotoBrick;

}(wall.bricks.photo));

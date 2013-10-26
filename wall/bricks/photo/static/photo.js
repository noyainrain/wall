/*
 * Wall
 */

wall.bricks = wall.bricks || {};
wall.bricks.photo = {};
(function(ns) {

/* ==== DisplayPhotoBrick ==== */

ns.DisplayPhotoBrick = function(ui) {
    wall.Brick.call(this, ui);
};

$.extend(ns.DisplayPhotoBrick.prototype, wall.Brick.prototype, {
    id: "photo"
});

/* ==== ClientPhotoBrick ==== */

ns.ClientPhotoBrick = function(ui) {
    wall.Brick.call(this, ui);
    this.ui.addDoPostHandler(new ns.DoPostPhotoHandler(this.ui));

    // experimental technology requires prefix normalization
    navigator.getUserMedia = navigator.getUserMedia ||
        navigator.mozGetUserMedia || navigator.webkitGetUserMedia;
    URL = window.URL || window.webkitURL ||
        {createObjectURL: function(blob) { return blob; }};
}

$.extend(ns.ClientPhotoBrick.prototype, wall.Brick.prototype, {
    id: "photo"
});

/* ==== DoPostPhotoHandler ==== */

ns.DoPostPhotoHandler = function(ui) {
    wall.DoPostHandler.call(this, ui);
    this._stream = null;
};

$.extend(ns.DoPostPhotoHandler.prototype, wall.DoPostHandler.prototype, {
    title: "Photo",
    icon: "/static/photo/photo.svg",

    post: function() {
        this._init();
    },

    _init: function() {
        this.ui.showScreen($(ns._html));
        $("#photo-take").click($.proxy(this._takeClicked, this));
        $("#photo-video-back").click($.proxy(this._videoBackClicked, this));
        $("#photo-post").click($.proxy(this._postClicked, this));
        $("#photo-image-back").click($.proxy(this._imageBackClicked, this));
        $("#photo-screen video").click($.proxy(this._videoClicked, this));

        navigator.getUserMedia(
            {"video": true},
            $.proxy(function(stream) {
                this._stream = stream;
                var video = $("#photo-screen video");
                // TODO: why prop (this is an attr)? (fails on Opera)
                video.prop("src", URL.createObjectURL(stream));
                video.get(0).play();
            }, this),
            function(code) {
                // TODO: handle errors
                console.log(code);
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
        var video = $("#photo-screen video");
        var canvas = $("#photo-screen canvas");

        canvas.get(0).width = video.get(0).videoWidth;
        canvas.get(0).height = video.get(0).videoHeight;
        canvas.get(0).getContext("2d").drawImage(video.get(0), 0, 0);

        $("#photo-screen video, #photo-video-menu").hide();
        $("#photo-screen canvas, #photo-image-menu").show();

        // TODO is this needed if we use width(), height() in fitToParent
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
        // TODO
        this._cleanup();
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

ns.DisplayBrick = ns.DisplayPhotoBrick;
ns.ClientBrick = ns.ClientPhotoBrick;

}(wall.bricks.photo));

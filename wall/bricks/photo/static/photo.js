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
}

$.extend(ns.ClientPhotoBrick.prototype, wall.Brick.prototype, {
    id: "photo"
});

/* ==== DoPostPhotoHandler ==== */

ns.DoPostPhotoHandler = function(ui) {
    wall.DoPostHandler.call(this, ui);
};

$.extend(ns.DoPostPhotoHandler.prototype, wall.DoPostHandler.prototype, {
    title: "Photo",
    icon: "/static/photo/photo.svg",

    post: function() {
        // experimental technology requires prefix normalization
        navigator.getUserMedia = navigator.getUserMedia ||
            navigator.mozGetUserMedia || navigator.webkitGetUserMedia;
        URL = window.URL || window.webkitURL ||
            {"createObjectURL": function(blob) { return blob; }};

        this.ui.showScreen($(ns._html));
        $("#photo-preview video").click($.proxy(this._videoClicked, this));
        $("#photo-post").click($.proxy(this._postClicked, this));
        $("#photo-retry").click($.proxy(this._retryClicked, this));

        navigator.getUserMedia(
            {"video": true},
            function(stream) {
                var video = document.querySelector("#photo-preview video");
                video.src = URL.createObjectURL(stream);
                video.play();
            },
            function(code) {
                // TODO: handle errors
                console.log(code);
            }
        );
    },

    _postClicked: function(event) {
        // TODO
    },

    _videoClicked: function(event) {
        // TODO: make size adjustment only once
        var video = document.querySelector("#photo-preview video");
        var canvas = document.querySelector("#photo-preview canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext("2d").drawImage(video, 0, 0);
        $("#photo-preview video, #photo-video-menu").hide();
        $("#photo-preview canvas, #photo-image-menu").show();
    },

    _retryClicked: function(event) {
        $("#photo-preview canvas, #photo-image-menu").hide();
        $("#photo-preview video, #photo-video-menu").show();
    }
});

ns._html =
    '<div id="photo-preview" class="screen">                             ' +
    '    <video></video>                                                 ' +
    '    <canvas></canvas>                                               ' +
    '    <ul id="photo-video-menu" class="overlay-menu">                 ' +
    '        <li id="photo-back">←</li>                                  ' +
    '    </ul>                                                           ' +
    '    <ul id="photo-image-menu" class="overlay-menu">                 ' +
    '        <li id="photo-post">Post</li><li id="photo-retry">Retry</li>' +
    '    </ul>                                                           ' +
    '</div>                                                              ';

ns.DisplayBrick = ns.DisplayPhotoBrick;
ns.ClientBrick = ns.ClientPhotoBrick;

}(wall.bricks.photo));

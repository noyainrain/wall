/*
 * Wall
 *
 * author: krmnn <thomas@krmnn.de>
 *
 */

wall.volume = {};
(function(ns) {

ns.Brick = function(ui) {
    this.ui     = ui;
    this.ui.msgHandlers["volume.update"] = this.updateVolume;
};

ns.Brick.prototype = {
    postType:  "VolumePost",
    postTitle: "Volume",
    id:        "volume",

    updateVolume: function(msg) {
        // update client
        $("#volume-client-label").text(msg.data.volume);

        // update display
        $("#volume-display-label").text(msg.data.volume);
    },

    setVolume: function(event) {
        // send msg to server
        if ($(event.target).attr("id") == "volume-up") {
            this.ui.send({type: "volume.set", data: "up"}); 
        } else {
            this.ui.send({type: "volume.set", data: "down"}); 
        }
    },

    initPost: function(elem, post) {
        // display interface
        $("<small>Volume:</small><p id=\"volume-display-label\">" + post.volume + "</p>").appendTo(elem);
    },

    cleanupPost: function() {
    },

    clientInitPost: function(elem, post) {
        // client interface
        //
        var x = $("<div id=\"volume-box\">");

        $("<button id=\"volume-down\">")
            .click($.proxy(this.setVolume, this))
            .css('background-image', "url(/static/" + this.id + "/" + "down.svg)")
            .addClass("volume_button")
            .appendTo(x);

        $("<span id=\"volume-client-label\">" + post.volume + "</span>").appendTo(x);

        $("<button id=\"volume-up\">")
            .click($.proxy(this.setVolume, this))
            .css('background-image', "url(/static/" + this.id + "/" + "up.svg)")
            .addClass("volume_button")
            .appendTo(x);

        x.appendTo(elem);
    },

    clientCleanupPost: function() {
    },

    clientInitPostNewPanel: function(elem) {
    },

    clientCleanupPostNewPanel: function() {
    },

    clientQueryPostNewPanel: function() {
    },

    clientPostedNew: function(error) {
    }
    };

}(wall.volume))

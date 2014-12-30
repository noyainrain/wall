/*
 * Wall
 */

wall = wall || {};
wall.bricks = wall.bricks || {};
wall.bricks.mix = wall.bricks.mix || {};
wall.bricks.mix.display = {};
(function(ns) {

/* ==== DisplayBrick ==== */

ns.DisplayBrick = function(ui, html) {
    wall.Brick.call(this, ui, html);
    ui.msgHandlers["mix_post_track_added"] = ui.eventMessage.bind(ui);
    ui.msgHandlers["mix_post_track_removed"] = ui.eventMessage.bind(ui);
    ui.msgHandlers["mix_post_track_updated"] = ui.eventMessage.bind(ui);
    ui.addPostElementType(ns.MixPostElement);
};

ns.DisplayBrick.prototype = Object.create(wall.Brick.prototype, {
    id: {value: "mix"}
});

/* ==== MixPostElement ==== */

ns.MixPostElement = function(post) {
    wall.display.PostElement.call(this, post, ui);
    this._tracks = {};

    var span = document.createElement("span");
    span.classList.add("fa");
    span.classList.add("fa-music");
    this.content.appendChild(span);

    ui.addEventListener("mix_post_track_added", this._trackUpdated.bind(this));
    ui.addEventListener("mix_post_track_removed",
        this._trackRemoved.bind(this));
    ui.addEventListener("mix_post_track_updated",
        this._trackUpdated.bind(this));
};

ns.MixPostElement.prototype = Object.create(wall.display.PostElement.prototype, {
    postType: {value: "MixPost"},

    _trackUpdated: {value: function(event) {
        this._tracks[event.args.track.user_id] = event.args.track.values;
        console.log(this._tracks);
    }},

    _trackRemoved: {value: function(event) {
        delete this._tracks[event.args.track.user_id];
        console.log(this._tracks);
    }}
});

}(wall.bricks.mix.display));

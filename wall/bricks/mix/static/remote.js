/*
 * Wall
 */

wall = wall || {};
wall.bricks = wall.bricks || {};
wall.bricks.mix = wall.bricks.mix || {};
wall.bricks.mix.remote = {};
(function(ns) {

/* ==== ClientBrick ==== */

ns.ClientBrick = function(ui, html) {
    wall.Brick.call(this, ui, html);
    ui.addPostElementType(ns.MixPostElement);
    ui.addDoPostHandler(new ns.MixDoPostHandler());
};

ns.ClientBrick.prototype = Object.create(wall.Brick.prototype, {
    id: {value: "mix"}
});

/* ==== MixPostElement ==== */

ns.MixPostElement = function(post) {
    wall.PostElement.call(this, post, ui);
    this._track = [];
    for (var i = 0; i < 16; i++) { this._track.push(null); }

    this.element = document.createElement("div");
    this.element.classList.add("post");
    this.element.classList.add("mix-post");
    this.element.addEventListener("click", this._clicked.bind(this));

    for (var y = 0; y < 12; y++) {
        for (var x = 0; x < 16; x++) {
            var field = document.createElement("div");
            field.classList.add("mix-post-field");
            field.style.left = (x * 2) + "ch";
            field.style.top = (y * 2) + "ch";
            field.t = x;
            field.freq = y;
            this.element.appendChild(field);
        }
    }
};

ns.MixPostElement.prototype = Object.create(wall.PostElement.prototype, {
    postType: {value: "MixPost"},

    _clicked: {value: function(event) {
        var field = event.target;
        if (field === this.element) {
            return;
        }

        var prev = null;
        var prefFreq = this._track[field.t];
        if (prefFreq) {
            prev = this.element.children[prefFreq * 16 + field.t];
            this._track[field.t] = null;
            prev.classList.remove("mix-post-on");
        }

        if (field !== prev) {
            this._track[field.t] = field.freq;
            field.classList.add("mix-post-on");
        }

        ui.call("mix_post_update_track",
            {post_id: this.post.id, values: this._track});
    }}
});

/* ==== MixDoPostHandler ==== */

ns.MixDoPostHandler = function() {
    wall.remote.DoPostHandler.call(this, ui);
    this.title = "Mix";
    this.icon = "fa fa-music fa-fw";
};

ns.MixDoPostHandler.prototype = Object.create(wall.remote.DoPostHandler.prototype, {
    post: {value: function(collectionId) {
        this.ui.postNew(collectionId, "MixPost", {});
    }}
})

}(wall.bricks.mix.remote));

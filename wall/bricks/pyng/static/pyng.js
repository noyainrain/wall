/*
 * Wall
 */

wall.bricks = wall.bricks || {};
wall.bricks.pyng = {};
(function(ns) {

/* ==== DisplayPyngBrick ==== */

ns.DisplayPyngBrick = function(ui) {
    wall.Brick.call(this, ui);
    this.ui.addPostHandler(new ns.DisplayPyngPostHandler(this.ui));
};

$.extend(ns.DisplayPyngBrick.prototype, wall.Brick.prototype, {
    id: "pyng"
});

/* ==== DisplayPyngPostHandler ==== */

ns.DisplayPyngPostHandler = function(ui) {
    this.ui = ui;
};

$.extend(ns.DisplayPyngPostHandler.prototype, wall.PostHandler.prototype, {
    type: "PyngPost",

    initPost: function(elem, post) {
        this.elem = elem;

        this.players = {};
        this.ball = null;

        this.ui.msgHandlers["pyng.joined"] = $.proxy(this._joinedMsg, this);
        this.ui.msgHandlers["pyng.scored"] = $.proxy(this._scoredMsg, this);
        this.ui.msgHandlers["pyng.game_over"] =
            $.proxy(this._gameOverMsg, this);
        this.ui.msgHandlers["pyng.update"] = $.proxy(this._updateMsg, this);

        this.elem.append($(ns._html));

        this.ui.call("pyng.subscribe", {}, $.proxy(function(players) {
            this.players = {};
            for (var i = 0; i < players.length; i++) {
                var player = players[i];
                this.players[player.id] = new ns.Player(player, this);
            }
            this.ball = new ns.Ball(this);
        }, this));
    },

    _joinedMsg: function(msg) {
        player = new ns.Player(msg.data, this);
        this.players[player.id] = player;
        $("#pyng-info", this.elem).hide();
    },

    _scoredMsg: function(msg) {
        var event = msg.data;
        var player = this.players[event.player];
        player.setScore(event.score);
    },

    _gameOverMsg: function(msg) {
        for (var id in this.players) {
            this.players[id].destroy();
        }
        this.players = {};
        this.ball.destroy();
        this.ball = new ns.Ball(this);
        $("#pyng-info", this.elem).text("Game Over!").show();
    },

    _updateMsg: function(msg) {
        var state = msg.data;
        this.ball.update(state.ball.x, state.ball.y);
        for (var i = 0; i < state.players.length; i++) {
            var player_state = state.players[i];
            var player = this.players[player_state.id];
            player.update(player_state.x, player_state.y);
        }
    },
});

/* ==== ClientPyngBrick ==== */

ns.ClientPyngBrick = function(ui) {
    wall.Brick.call(this, ui);
    this.ui.addPostHandler(new ns.ClientPyngPostHandler(this.ui));
    this.ui.addDoPostHandler(
        new wall.remote.DoPostSingleHandler(this.ui, "PyngPost", "Pyng", null));
};

$.extend(ns.ClientPyngBrick.prototype, wall.Brick.prototype, {
    id: "pyng"
});

/* ==== ClientPyngPostHandler ==== */

ns.ClientPyngPostHandler = function(ui) {
    this.ui = ui;
};

$.extend(ns.ClientPyngPostHandler.prototype, wall.PostHandler.prototype, {
    type: "PyngPost",

    initPost: function(elem, post) {
        this.tps = 30;
        this.angleRange = 60;
        this.beta = null;
        this.pos = 0;
        this._clock = null;

        this._clock = setInterval($.proxy(this._tick, this), 1000 / this.tps);

        // TODO: stop when post is removed from the wall
        window.addEventListener("deviceorientation",
                $.proxy(this._deviceOrientationUpdated, this));
        //// simulate device orientation events
        //ns.addDeviceOrientationListener(
        //    $.proxy(this._orientationUpdated, this));

        this.ui.call("pyng.join", {}, $.proxy(function(error) {
            if (error && error.__type__ == "ValueError"
                && error.args[0] == "mode") {
                elem.text("Ongoing match, please wait.");
                return;
            }
            elem.text("Joined match.");
        }, this));
    },

    cleanupPost: function() {
        clearInterval(this._clock);
    },

    _tick: function() {
        this.ui.send({"type": "pyng.update", "data": this.pos});
    },

    _deviceOrientationUpdated: function(event) {
        // workaround for https://bugzilla.mozilla.org/show_bug.cgi?id=878067
        if (navigator.userAgent.indexOf("Gecko") != -1) {
            event = {"beta": -event.beta};
        }

        if (this.beta == null) {
            this.beta = event.beta;
        }
        var db = event.beta - this.beta;
        this.beta = event.beta;
        this.pos = Math.min(Math.max(this.pos - (db / this.angleRange), 0), 1);
    }
});

/* ==== Player ==== */

ns.Player = function(attrs, pyng) {
    this.pyng = pyng;
    $.extend(this, attrs);

    this.elem = $('<div class="pyng-player pyng-object"></div>')
        .appendTo($("#pyng-playground", this.pyng.elem));
    this.label = $('<div class="pyng-player-label pyng-object"></div>')
        .appendTo($("#pyng-playground", this.pyng.elem));

    this.update(this.x, this.y);
    this.setScore(this.score);
};

ns.Player.prototype = {
    destroy: function() {
        this.elem.remove();
        this.label.remove();
    },

    update: function(x, y) {
        this.x = x;
        this.y = y;
        this.elem.css({"left": x + "%", "top": y + "%"});
        this.label.css({"left": x + "%", "top": (y - 10) + "%"});
    },

    setScore: function(score) {
        this.score = score;
        this.label.text(this.score);
    }
};

/* ==== Ball ==== */

ns.Ball = function(pyng) {
    this.pyng = pyng;
    this.x = 0;
    this.y = 0;
    this.elem = $('<div class="pyng-ball pyng-object"></div>')
        .appendTo($("#pyng-playground", this.pyng.elem));
    this.update(this.x, this.y);
};

ns.Ball.prototype = {
    destroy: function() {
        this.elem.remove();
    },

    update: function(x, y) {
        this.x = x;
        this.y = y;
        this.elem.css({"left": x + "%", "top": y + "%"});
    }
};

/* ==== */

ns.addDeviceOrientationListener = function(listener) {
    var t0 = Date.now() / 1000;
    setInterval($.proxy(function() {
        var t = (Date.now() / 1000) - t0;
        listener({
            "absolute": false,
            "alpha": 0,
            "beta": ns.constRotation(t),
            "gamma": 0
        });
    }, this), 40);
};

ns.constRotation = function(t) {
    var min = -25;
    var max = 25;
    var range = max - min;
    var period = 2;
    var p2 = period / 2;

    t = t % period;
    if (t < p2) {
        var x = t / p2;
        return range * x + min;
    } else {
        var x = (t - p2) / p2;
        return -range * x + max;
    }
};

ns._html =
    '<div id="pyng-playground">       ' +
    '    <div id="pyng-divider"></div>' +
    '</div>                           ' +
    '<div id="pyng-info"></div>       ';

ns.DisplayBrick = ns.DisplayPyngBrick;
ns.ClientBrick = ns.ClientPyngBrick;

}(wall.bricks.pyng));

/*
 * Wall
 */

wall.bricks = wall.bricks || {};
wall.bricks.pyng = {};
(function(ns) {

/* ==== DisplayPyngBrick ==== */

ns.DisplayPyngBrick = function(ui) {
    wall.Brick.call(this, ui);
    this.ui.addPostElementType(ns.DisplayPyngPostElement);
};

$.extend(ns.DisplayPyngBrick.prototype, wall.Brick.prototype, {
    id: "pyng"
});

/* ==== DisplayPyngPostElement ==== */

ns.DisplayPyngPostElement = function(post, ui) {
    wall.display.PostElement.call(this, post, ui);
    this.players = {};
    this.ball = null;

    this.ui.msgHandlers["pyng.joined"] = $.proxy(this._joinedMsg, this);
    this.ui.msgHandlers["pyng.scored"] = $.proxy(this._scoredMsg, this);
    this.ui.msgHandlers["pyng.game_over"] =
        $.proxy(this._gameOverMsg, this);
    this.ui.msgHandlers["pyng.update"] = $.proxy(this._updateMsg, this);

    $(
        '<div id="pyng-playground">       ' +
        '    <div id="pyng-divider"></div>' +
        '</div>                           ' +
        '<div id="pyng-info"></div>       '
    ).appendTo(this.content);

    this.ui.call("pyng.subscribe", {}, $.proxy(function(players) {
        this.players = {};
        for (var i = 0; i < players.length; i++) {
            var player = players[i];
            this.players[player.id] = new ns.Player(player, this);
        }
        this.ball = new ns.Ball(this);
    }, this));
};

ns.DisplayPyngPostElement.prototype =
    Object.create(wall.display.PostElement.prototype,
{
    postType: {value: "PyngPost"},

    _joinedMsg: {value: function(msg) {
        player = new ns.Player(msg.data, this);
        this.players[player.id] = player;
        $("#pyng-info", this.content).hide();
    }},

    _scoredMsg: {value: function(msg) {
        var event = msg.data;
        var player = this.players[event.player];
        player.setScore(event.score);
    }},

    _gameOverMsg: {value: function(msg) {
        for (var id in this.players) {
            this.players[id].destroy();
        }
        this.players = {};
        this.ball.destroy();
        this.ball = new ns.Ball(this);
        $("#pyng-info", this.content).text("Game Over!").show();
    }},

    _updateMsg: {value: function(msg) {
        var state = msg.data;
        this.ball.update(state.ball.x, state.ball.y);
        for (var i = 0; i < state.players.length; i++) {
            var player_state = state.players[i];
            var player = this.players[player_state.id];
            player.update(player_state.x, player_state.y);
        }
    }}
});

/* ==== RemotePyngBrick ==== */

ns.ClientPyngBrick = function(ui) {
    wall.Brick.call(this, ui);
    this.ui.addPostElementType(ns.RemotePyngPostElement);
    this.ui.addDoPostHandler(new wall.remote.SingleDoPostHandler(
        "PyngPost", "Pyng", "static/pyng/pyng.svg", this.ui));
};

$.extend(ns.ClientPyngBrick.prototype, wall.Brick.prototype, {
    id: "pyng"
});

/* ==== RemotePyngPostElement ==== */

ns.RemotePyngPostElement = function(post, ui) {
    wall.PostElement.call(this, post, ui);
    this.tps = 30;
    this.angleRange = 60;
    this.beta = null;
    this.pos = 0;
    this._clock = null;

    this.element = $('<p class="post pyng-post">...</p>');
    this.element = document.createElement("p");
    this.element.classList.add("post");
    this.element.classList.add("pyng-post");
    this.element.textContent = "…";

    this._clock = setInterval(this._tick.bind(this), 1000 / this.tps);

    // TODO: stop when post is removed from the wall
    window.addEventListener("deviceorientation",
        this._deviceOrientationUpdated.bind(this));
    //// simulate device orientation events
    //ns.addDeviceOrientationListener(
    //    $.proxy(this._orientationUpdated, this));

    this.ui.call("pyng.join", {}, function(error) {
        if (error && error.__type__ == "ValueError"
            && error.args[0] == "mode")
        {
            this.element.textContent = "Ongoing match, please wait.";
            return;
        }
        this.element.textContent = "Joined match.";
    }.bind(this));
};

ns.RemotePyngPostElement.prototype = Object.create(wall.PostElement.prototype, {
    postType: {value: "PyngPost"},

    detachedCallback: {value: function() {
        clearInterval(this._clock);
    }},

    _tick: {value: function() {
        this.ui.send({"type": "pyng.update", "data": this.pos});
    }},

    _deviceOrientationUpdated: {value: function(event) {
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
    }}
});

/* ==== Player ==== */

ns.Player = function(attrs, pyng) {
    this.pyng = pyng;
    $.extend(this, attrs);

    this.elem = $('<div class="pyng-player pyng-object"></div>')
        .appendTo($("#pyng-playground", this.pyng.content));
    this.label = $('<div class="pyng-player-label pyng-object"></div>')
        .appendTo($("#pyng-playground", this.pyng.content));

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
        .appendTo($("#pyng-playground", this.pyng.content));
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
    setInterval(function() {
        var t = (Date.now() / 1000) - t0;
        listener({
            "absolute": false,
            "alpha": 0,
            "beta": ns.constRotation(t),
            "gamma": 0
        });
    }.bind(this), 40);
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

ns.DisplayBrick = ns.DisplayPyngBrick;
ns.ClientBrick = ns.ClientPyngBrick;

}(wall.bricks.pyng));

/*
 * Wall
 */

var wall = {};
(function(ns) {

/* ==== Ui ==== */

ns.Ui = function(bricks) {
    this.bricks       = [];
    this.postHandlers = {};
    this.msgHandlers  = {};
    this.currentPost  = null;
    this.currentBrick = null;
    
    // initialize bricks (inspired by server's wall.WallApp.__init__)
    for (var i = 0; i < bricks.length; i++) {
        var name = bricks[i];
        var module = name.split(".").reduce(
            function(o, n) { return o[n]; }, window);
        var brick = new module["Brick"](this);
        this.bricks.push(brick);
        this.postHandlers[brick.postType] = brick;
    }
    
    this.socket = new WebSocket("ws://" + location.host + "/api/socket/");
    this.socket.addEventListener("open",    $.proxy(this._opened,   this));
    this.socket.addEventListener("close",   $.proxy(this._closed,   this));
    this.socket.addEventListener("message", $.proxy(this._received, this));
};

ns.Ui.prototype = {
    send: function(msg) {
        this.socket.send(JSON.stringify(msg));
    },
    
    _opened: function(event) {
        console.debug("connected");
    },
    
    _closed: function(event) {
        console.debug("disconnected");
        this.notify("Disconnected.");
    },
    
    _received: function(event) {
        console.debug("received: " + event.data);
        var msg = JSON.parse(event.data);
        this.msgHandlers[msg.type](msg);
    }
};

/* ==== DisplayUi ==== */

ns.DisplayUi = function(bricks) {
    ns.Ui.call(this, bricks);
    this.msgHandlers["posted"] = $.proxy(this._postedMsg, this);
};

$.extend(ns.DisplayUi.prototype, ns.Ui.prototype, {
    _postedMsg: function(msg) {
        if (this.currentBrick) {
            this.currentBrick.cleanupPost($("#content"));
            $("#content").empty();
        }
        this.currentPost = msg.data;
        this.currentBrick = this.postHandlers[this.currentPost.__type__];
        this.currentBrick.initPost($("#content"), this.currentPost);
    }
});

/* ==== ClientUi ==== */

ns.ClientUi = function(bricks) {
    
    if(!this.isBrowserSupported()){
        $('#content').html('<div id="browser_not_supported">Your browser is outdated. Please use a decent browser like <a href="https://play.google.com/store/apps/details?id=org.mozilla.firefox">Firefox</a> or <a href="https://play.google.com/store/apps/details?id=com.android.chrome">Chrome</a>.</div>');
        return;
    }

    ns.Ui.call(this, bricks);

    this.msgHandlers["posted"] = $.proxy(this._postedMsg, this);
    this.msgHandlers["post_new"] = $.proxy(this._postNewMsg, this);
    
    // initialize post menu
    for(var i = 0, length = this.bricks.length; i < length; i++) {
        var brick = this.bricks[i];
        $('<button>')
            .text(brick.postTitle)
            .click(brick, $.proxy(this._showPostNewPanelClicked, this))
            .css('background-image', "url(/static/" + brick.id + "/" + brick.id + ".svg)")
            .appendTo($("#post-menu"));
    }
        
    $("#post-new").click($.proxy(this._postNewClicked, this));
};

$.extend(ns.ClientUi.prototype, ns.Ui.prototype, {
    isBrowserSupported: function(){
        return 'WebSocket' in window;
    },

    notify: function(msg) {
        $("#notification").text(msg).show();
    },
    
    closeNotification: function() {
        $("#notification").hide();
    },
    
    showPostNewPanel: function(brick) {
        if ($("#post-new-panel").is(":visible")) {
            this.closePostNewPanel();
        }
        $("#post-new-panel").data("brick", brick);
        brick.clientInitPostNewPanel($("#post-new-panel-content"));
        $("#post-new-panel").show();
    },
    
    closePostNewPanel: function() {
        $("#post-new-panel").data("brick").clientCleanupPostNewPanel();
        $("#post-new-panel-content").empty();
        $("#post-new-panel").data("brick", null).hide();
    },
    
    _showPostNewPanelClicked: function(event) {
        this.showPostNewPanel(event.data);
    },
    
    _postNewClicked: function(event) {
        var brick = $("#post-new-panel").data("brick");
        var args = $.extend({'type': brick.postType},
            brick.clientQueryPostNewPanel());
        this.send({type: "post_new", data: args});
    },
    
    _postedMsg: function(msg) {
        if (this.currentBrick) {
            this.currentBrick.clientCleanupPost($("#post"));
            $("#post").empty().hide();
        }
        this.currentPost = msg.data;
        this.currentBrick = this.postHandlers[this.currentPost.__type__];
        this.currentBrick.clientInitPost($("#post").show(), this.currentPost);
    },
    
    _postNewMsg: function(msg) {
        var error = msg.data;
        $("#post-new-panel").data("brick").clientPostedNew(error);
        if (!error) {
            this.closePostNewPanel();
        }
    }
});

}(wall));

/*
 * Wall
 */

wall.bricks = wall.bricks || {};
wall.bricks.url = {};
(function(ns) {

/* ==== DisplayBrick ==== */

ns.DisplayBrick = function(ui) {
    wall.Brick.call(this, ui);
    this.ui.addPostHandler(new ns.DisplayUrlPostHandler(this));
};

$.extend(ns.DisplayBrick.prototype, wall.Brick.prototype, {
    id: "url"
});

/* ==== DisplayUrlPostHandler ==== */

ns.DisplayUrlPostHandler = function() {
    wall.PostHandler.call(this);
    this._window = null;
};

$.extend(ns.DisplayUrlPostHandler.prototype, wall.PostHandler.prototype, {
    type: "UrlPost",
    
    initPost: function(elem, post) {
        this._window = open(post.url, "browser");
    },

    cleanupPost: function() {
        this._window.close();
    }
});

/* ==== ClientBrick ==== */

ns.ClientBrick = function(ui) {
    wall.Brick.call(this, ui);
    this.ui.addPostHandler(new ns.ClientUrlPostHandler());
    this.ui.addDoPostHandler(new ns.DoPostUrlHandler(this));
};

$.extend(ns.ClientBrick.prototype, wall.Brick.prototype, {
    id: "url"
});

/* ==== ClientUrlPostHandler ==== */

ns.ClientUrlPostHandler = function() {
    wall.PostHandler.call(this);
};

$.extend(ns.ClientUrlPostHandler.prototype, wall.PostHandler.prototype, {
    type: "UrlPost",
    
    initPost: function(elem, post) {
        $("<a>").attr("href", post.url).text(post.url).appendTo(elem);
    }
});

/* ==== DoPostUrlHandler ==== */

ns.DoPostUrlHandler = function(brick) {
    this.brick = brick;
    this.ui = brick.ui;
};

$.extend(ns.DoPostUrlHandler.prototype, wall.DoPostHandler.prototype, {
    title: "URL",
    icon: "/static/url/url.svg",

    post: function() {
        this.ui.call(
            "url.get_search_handlers",
            {},
            $.proxy(function(handlers) {
                this.ui.showScreen($(ns._html));
                handlers = handlers.map(function(h) { return h.title; });
                $("#url-handlers").text(handlers.join(", "));
                $("#url-post").click($.proxy(this._postClicked, this));
                $("#url-search").click($.proxy(this._searchClicked, this));
            }, this)
        );
    },

    _postClicked: function(event) {
        this.ui.postNew(
            "UrlPost",
            {"url": $("#url-url").val()},
            $.proxy(function(post) {
                if (post.__type__ == "ValueError" && post.args[0] == "url") {
                    this.ui.notify("URL missing.");
                    return;
                }
                this.ui.popScreen();
            }, this)
        );
    },

    _searchClicked: function(event) {
        this.ui.notify("Searching...");
        this.ui.call(
            "url.search",
            {"query": $("#url-query").val()},
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
            }, this)
        );
    },
    
    _resultClicked: function(event) {
        var result = $(event.currentTarget).data("result");
        this.ui.postNew("UrlPost", {"url": result.url}, $.proxy(function(post) {
            this.ui.popScreen();
        }, this));
    }
});

ns._html =
    '<div class="screen">                               ' +
    '    <h2>Post URL</h2>                              ' +
    '    <input id="url-url" type="url">                ' +
    '    <p class="buttons">                            ' +
    '        <button id="url-post">Post</button>        ' +
    '    </p>                                           ' +
    '    <section>                                      ' +
    '        <h3 style="display: inline;">Search</h3>   ' +
    '        <small id="url-handlers"></small>          ' +
    '        <input id="url-query" type="search">       ' +
    '        <p class="buttons">                        ' +
    '            <button id="url-search">Search</button>' +
    '        </p>                                       ' +
    '        <ul class="select" id="url-results"></ul>  ' +
    '    </section>                                     ' +
    '</div>                                             ';

}(wall.bricks.url));

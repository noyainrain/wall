/*
 * Wall
 */

wall.bricks = wall.bricks || {};
wall.bricks.url = {};
(function(ns) {

/* ==== DisplayBrick ==== */

ns.DisplayBrick = function(ui, html) {
    wall.Brick.call(this, ui, html);
    this.ui.addPostElementType(ns.DisplayUrlPostElement);
};

ns.DisplayBrick.prototype = Object.create(wall.Brick.prototype, {
    id: {value: "url"}
});

/* ==== DisplayUrlPostElement ==== */

ns.DisplayUrlPostElement = function(post, ui) {
    wall.display.PostElement.call(this, post, ui);

    $(
        '<p class="url-post-state">                                   ' +
        '    Loading <span class="url-post-url"></span> ...           ' +
        '</p>                                                         ' +
        '<p class="url-post-embedding">                               ' +
        '    Some websites don\'t allow them being embedded by other  ' +
        '    applications like Wall. If this website fails to load, it' +
        '    might be one of them. Sorry :/ !                         ' +
        '</p>                                                         ' +
        '<iframe class="url-post-frame" sandbox="allow-same-origin allow-scripts"></iframe>'
    ).appendTo(this.content);
    $(".url-post-url", this.content).text(post.url);
    $(".url-post-frame", this.content).attr("src", post.url);

    this._timeout = setTimeout(function() {
        $(".url-post-embedding", this.content).show();
        this._timeout = null;
    }.bind(this), 10000);
};

ns.DisplayUrlPostElement.prototype =
    Object.create(wall.display.PostElement.prototype,
{
    postType: {value: "UrlPost"},

    detachedCallback: {value: function() {
        clearTimeout(this._timeout);
    }}
});

/* ==== ClientBrick ==== */

ns.ClientBrick = function(ui, html) {
    wall.Brick.call(this, ui, html);
    this.ui.addPostElementType(ns.RemoteUrlPostElement);
    this.ui.addDoPostHandler(new wall.remote.ScreenDoPostHandler(
        ns.PostUrlScreen, "URL", "/static/bricks/url/url.svg", this.ui));
};

ns.ClientBrick.prototype = Object.create(wall.Brick.prototype, {
    id: {value: "url"}
});

/* ==== RemoteUrlPostElement ==== */

ns.RemoteUrlPostElement = function(post, ui) {
    wall.PostElement.call(this, post, ui);
    this.element = $('<p class="post url-post"></p>').text(post.url);
};

ns.RemoteUrlPostElement.prototype = $.extend(
    Object.create(wall.PostElement.prototype),
{
    postType: "UrlPost"
});

/* ==== PostUrlScreen ==== */

ns.PostUrlScreen = function(ui) {
    wall.remote.Screen.call(this, ui);
    this.title = "Post URL";

    var template = ui.bricks["url"].html.querySelector(
        ".url-post-url-screen-content-template");
    this.content.appendChild(wall.util.cloneChildNodes(template));
    $(".url-post", this.content).submit(this._postSubmitted.bind(this));
    $(".url-search", this.content).submit(this._searchSubmitted.bind(this));

    this.ui.call(
        "url.get_search_handlers",
        {},
        function(handlers) {
            handlers = handlers.map(function(h) { return h.title; });
            $(".url-handlers", this.content).text(handlers.join(", "));
        }.bind(this)
    );
};

ns.PostUrlScreen.prototype = Object.create(wall.remote.Screen.prototype, {
    _postSubmitted: {value: function(event) {
        event.preventDefault();
        this.ui.postNew(
            "UrlPost",
            {"url": $(".url-url", this.content).val()},
            function(post) {
                if (post.__type__ == "ValueError" && post.args[0] == "url") {
                    this.ui.notify("URL missing.");
                    return;
                }
                this.ui.popScreen();
            }.bind(this)
        );
    }},

    _searchSubmitted: {value: function(event) {
        event.preventDefault();
        this.ui.notify("Searching...");
        this.ui.call(
            "url.search",
            {"query": $(".url-query", this.content).val()},
            function(results) {
                this.ui.closeNotification();
                $(".url-results", this.content).empty();
                for (var i = 0; i < results.length; i++) {
                    var result = results[i];
                    var li = $("<li>")
                        .data("result", result)
                        .click(this._resultClicked.bind(this))
                        .appendTo($(".url-results", this.content));
                    if (result.thumbnail) {
                        $("<img>").attr("src", result.thumbnail).appendTo(li);
                    }
                    $("<p>").text(result.title).appendTo(li);
                }
            }.bind(this)
        );
    }},

    _resultClicked: {value: function(event) {
        var result = $(event.currentTarget).data("result");
        this.ui.postNew("UrlPost", {"url": result.url}, function(post) {
            this.ui.popScreen();
        }.bind(this));
    }}
});

}(wall.bricks.url));

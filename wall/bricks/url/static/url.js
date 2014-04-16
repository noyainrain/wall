/*
 * Wall
 */

wall.bricks = wall.bricks || {};
wall.bricks.url = {};
(function(ns) {

/* ==== DisplayBrick ==== */

ns.DisplayBrick = function(ui) {
    wall.Brick.call(this, ui);
    this.ui.addPostElementType(ns.DisplayUrlPostElement);
};

$.extend(ns.DisplayBrick.prototype, wall.Brick.prototype, {
    id: "url"
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

ns.DisplayUrlPostElement.prototype = $.extend(
    Object.create(wall.display.PostElement.prototype),
{
    postType: "UrlPost",

    cleanup: function() {
        clearTimeout(this._timeout);
    }
});

/* ==== ClientBrick ==== */

ns.ClientBrick = function(ui) {
    wall.Brick.call(this, ui);
    this.ui.addPostElementType(ns.RemoteUrlPostElement);
    this.ui.addDoPostHandler(new ns.DoPostUrlHandler(this.ui));
};

$.extend(ns.ClientBrick.prototype, wall.Brick.prototype, {
    id: "url"
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

/* ==== DoPostUrlHandler ==== */

ns.DoPostUrlHandler = function(ui) {
    wall.remote.DoPostHandler.call(this, ui);
    this.title = "URL";
    this.icon = "/static/url/url.svg";
};

$.extend(ns.DoPostUrlHandler.prototype, wall.remote.DoPostHandler.prototype, {
    post: function() {
        this.ui.call(
            "url.get_search_handlers",
            {},
            $.proxy(function(handlers) {
                // TODO: port to PostUrlScreen
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
    '<div class="screen post-url-screen">               ' +
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

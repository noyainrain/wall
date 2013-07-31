/*
 * Wall
 */

wall.url = {};
(function(ns) {

ns.Brick = function(ui) {
    wall.Brick.call(this, ui);
    this.window = null;
};

$.extend(ns.Brick.prototype, wall.Brick.prototype, {
    id:        "url",
    postType:  "UrlPost",
    postTitle: "URL",
    
    initPost: function(elem, post) {
        this.window = open(post.url, "browser");
    },
    
    cleanupPost: function() {
        this.window.close();
    },
    
    clientInitPost: function(elem, post) {
        $("<a>").attr("href", post.url).text(post.url).appendTo(elem);
    },
    
    clientInitPostNewScreen: function(elem) {
        this.ui.call(
            "url.get_search_handlers",
            {},
            $.proxy(function(handlers) {
                elem.append($(ns._html));
                handlers = handlers.map(function(h) { return h.title; });
                $("#url-handlers").text(handlers.join(", "));
                
                $("#url-post").click($.proxy(this._postClicked, this));
                $("#url-search").click($.proxy(this._searchClicked, this));
            }, this)
        );
    },
    
    _postClicked: function(event) {
        this.ui.postNew(this.postType, {"url": $("#url-url").val()},
            $.proxy(function(error) {
                if (error.args[0] == "url") {
                    this.ui.notify("URL missing.");
                }
            }, this));
    },
    
    _searchClicked: function(event) {
        this.ui.notify("Searching...");
        this.ui.call("url.search", {"query": $("#url-query").val()},
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
            }, this));
    },
    
    _resultClicked: function(event) {
        var result = $(event.currentTarget).data("result");
        this.ui.postNew(this.postType, {"url": result.url});
    }
});

ns._html =
    '<input id="url-url" type="url">                ' +
    '<p class="buttons">                            ' +
    '    <button id="url-post">Post</button>        ' +
    '</p>                                           ' +
    '<section>                                      ' +
    '    <h3 style="display: inline;">Search</h3>   ' +
    '    <small id="url-handlers"></small>          ' +
    '    <input id="url-query" type="search">       ' +
    '    <p class="buttons">                        ' +
    '        <button id="url-search">Search</button>' +
    '    </p>                                       ' +
    '    <ul class="select" id="url-results"></ul>  ' +
    '</section>                                     '

}(wall.url));

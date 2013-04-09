/*
 * Wall
 */

wall.youtube = {};
(function(ns) {

ns.Brick = function(ui) {
    wall.Brick.call(this, ui);
    this.window = null;
};

$.extend(ns.Brick.prototype, wall.Brick.prototype, {
    id:        "youtube",
    postType:  "YoutubePost",
    postTitle: "YouTube",
    
    initPost: function(elem, post) {
        this.window = open(post.url, "browser");
    },
    
    cleanupPost: function() {
        this.window.close();
    },
    
    clientInitPost: function(elem, post) {
        $("<p>").text(post.title).appendTo(elem);
    },
    
    clientInitPostNewScreen: function(elem) {
        $(
            '<section>                                      ' +
            '    <h3 style="display: inline;">Search</h3>   ' +
            '    <small>Youtube</small>                     ' +
            '    <input id="url-query" type="search">       ' +
            '    <p class="buttons">                        ' +
            '        <button id="url-search">Search</button>' +
            '    </p>                                       ' +
            '    <ul class="select" id="url-results"></ul>  ' +
            '</section>                                     '
        ).appendTo(elem);
        $("#url-search").click($.proxy(this._searchClicked, this));
        $("#url-query").keydown($.proxy(function(e){ if(e.which == '13'){ this._searchClicked(); return false } }, this));
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
        this.ui.postNew(this.postType, {url: result.url, title: result.title});
    }
});

}(wall.youtube));

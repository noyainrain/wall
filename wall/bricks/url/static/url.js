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

ns.RemoteUrlPostElement = function() {
    wall.remote.PostElement.call(this);
    this.element.classList.add("url-post");
};

ns.RemoteUrlPostElement.prototype = Object.create(
        wall.remote.PostElement.prototype, {
    postType: {value: "UrlPost"},

    updateContent: {value: function() {
        this.element.querySelector(".post-content").textContent = this.post.url;
    }}
});

/* ==== PostUrlScreen ==== */

ns.PostUrlScreen = function(ui) {
    wall.remote.DoPostScreen.call(this, ui);
    this._resultList = null;
    this.title = "Post URL";

    var template = ui.bricks["url"].html.querySelector(
        ".url-post-url-screen-content-template");
    this.content.appendChild(wall.util.cloneChildNodes(template));
    $(".url-post", this.content).submit(this._postSubmitted.bind(this));
    $(".url-search", this.content).submit(this._searchSubmitted.bind(this));

    this._resultList = new wall.remote.ListElement();
    this._resultList.element.addEventListener("select",
        this._resultSelected.bind(this));
    this.content.querySelector("section").appendChild(this._resultList.element);
    this._resultList.attachedCallback();

    this.ui.call(
        "url.get_search_handlers",
        {},
        function(handlers) {
            handlers = handlers.map(function(h) { return h.title; });
            $(".url-handlers", this.content).text(handlers.join(", "));
        }.bind(this)
    );
};

ns.PostUrlScreen.prototype = Object.create(wall.remote.DoPostScreen.prototype, {
    _postSubmitted: {value: function(event) {
        event.preventDefault();
        this.ui.postNew(this.collectionId, "UrlPost",
            {"url": $(".url-url", this.content).val()},
            function(post) {
                if (post.__type__ == "ValueError" && post.args[0] == "url") {
                    this.ui.notify("URL missing.");
                    return;
                }
                this.ui.popScreen();
            }.bind(this));
    }},

    _searchSubmitted: {value: function(event) {
        event.preventDefault();
        var query = this.content.querySelector(".url-query").value;

        this.ui.notify("Searching...");
        this.ui.call("url.search", {"query": query},
            function(results) {
                this.ui.closeNotification();
                this._resultList.element.innerHTML = ""; // clear
                for (var i = 0; i < results.length; i++) {
                    var result = results[i];
                    var li = document.createElement("li");
                    li._result = result;
                    if (result.thumbnail) {
                        var img = document.createElement("img");
                        img.src = result.thumbnail;
                        li.appendChild(img);
                    }
                    var p = document.createElement("p");
                    p.textContent = result.title;
                    li.appendChild(p);
                    this._resultList.element.appendChild(li);
                }
            }.bind(this)
        );
    }},

    _resultSelected: {value: function(event) {
        var result = event.detail.li._result;
        this.ui.postNew(this.collectionId, "UrlPost", {"url": result.url},
            function(post) {
                this.ui.popScreen();
            }.bind(this));
    }}
});

}(wall.bricks.url));

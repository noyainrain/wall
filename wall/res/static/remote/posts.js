/*
 * Wall
 */

wall.remote.posts = {};
(function(ns) {

/**
 * Screen for editing a `Post`.
 *
 * Provides an UI for editing all common post attributes. Content can be added
 * to the `.edit-post-screen-content` element.
 *
 * Properties:
 *
 * - `post`: post to edit.
 *
 * Subclass API: subclasses should add form fields to the content area for any
 * post attribute that can be modified. They should implement `updateContent()`
 * and may implement `getContentAttributes()`.
 *
 * Prototype properties:
 *
 * - `contentErrorMsgs`: object which maps `ValueError` codes to UI error
 *   messages specific to the post type. Defaults to `{}`.
 */
ns.EditPostScreen = function() {
    wall.remote.Screen.call(this);
    this._post = null;
    wall.util.loadTemplate(this.element.querySelector(".screen-content"),
                           ".edit-post-screen-template");
    this.element.querySelector(".edit-post-screen-edit").addEventListener(
        "submit", this);
};

ns.EditPostScreen.prototype = Object.create(wall.remote.Screen.prototype, {
    contentErrorMsgs: {},

    post: {
        get: function() {
            return this._post;
        },
        set: function(value) {
            this._post = value;
            this.title = "Edit " + this._post.title;
            this.element.querySelector('.edit-post-screen-edit [name="title"]')
                .value = this._post.title;
            this.updateContent();
        }
    },

    /**
     * Subclass API: retrieve attributes to edit from the content form fields.
     *
     * The default implementation simply returns `name` and `value` for any
     * `input` and `textarea` element.
     */
    getContentAttributes: {value: function() {
        var attrs = {};
        Array.forEach(this.element.querySelectorAll('input, textarea'),
            function(input) {
                attrs[input.name] = input.value;
            },
            this);
        return attrs;
    }},

    /**
     * Subclass API: update the content UI.
     *
     * Called when `post` is set. The default implementation does nothing.
     */
    updateContent: {value: function() {}},

    handleEvent: {value: function(event) {
        var form = this.element.querySelector(".edit-post-screen-edit");
        if (event.currentTarget === form && event.type === "submit") {
            event.preventDefault();

            var args = {
                post_id: this._post.id,
                title: this.element
                    .querySelector('.edit-post-screen-edit [name="title"]')
                    .value
            };
            var contentAttrs = this.getContentAttributes();
            for (var name in contentAttrs) {
                args[name] = contentAttrs[name];
            }

            var errorMsgs = {title_empty: "Title is missing."};
            for (var code in this.contentErrorMsgs) {
                errorMsgs[code] = this.contentErrorMsgs[code];
            }

            ui.notify("Editing...");
            ui.call("post_edit", args).then(function(error) {
                ui.closeNotification();
                if (error) {
                    if (error.__type__ === "ValueError") {
                        ui.notify(errorMsgs[error.args[0]]);
                        return;
                    } else {
                        throw Error(); // unreachable
                    }
                }
                ui.popScreen(); // EditPostScreen
            }.bind(this));
        }
    }}
});

/**
 * Screen for editing a `TextPost`.
 */
ns.EditTextPostScreen = function() {
    ns.EditPostScreen.call(this);
    wall.util.loadTemplate(
        this.element.querySelector(".edit-post-screen-content"),
        ".edit-text-post-screen-template")
};

ns.EditTextPostScreen.prototype = Object.create(ns.EditPostScreen.prototype, {
    updateContent: {value: function() {
        this.element.querySelector('.edit-post-screen-content [name="content"]')
            .value = this.post.content;
    }}
});

}(wall.remote.posts));

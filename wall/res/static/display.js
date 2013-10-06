/*
 * Wall
 */

wall.display = {};
(function(ns) {

/* ==== TextPostHandler ==== */

ns.TextPostHandler = function() {
    wall.PostHandler.call(this);
};

$.extend(ns.TextPostHandler.prototype, wall.PostHandler.prototype, {
    type: "TextPost",
    
    initPost: function(elem, post) {
        // First layout the post content by rendering it (with a fixed font
        // size) into a container of fixed width. Then fit this container to the
        // screen (scaling the text accordingly).
        //
        // Because font rendering is a rather complex process, the layout (e.g.
        // word wrapping) of the scaled text may not exactly match the
        // pre-rendered. We want to avoid the scaled version to be not as
        // compact, since then the text may overflow its container.
        
        // use a floating point font size to avoid a pixel perfect and thus
        // possibly compact layout
        var fontSize = 16.5;
        var lineHeight = fontSize * 1.5;
        // a line should hold about 70 characters (assuming a character ratio of
        // about 3/1)
        var lineWidth = lineHeight * (70 / 3);
        
        var pre = $("<pre>").addClass("text-post").text(post.content)
            .appendTo(elem);
        pre.css({
            "font-size": fontSize + "px",
            "width": lineWidth + "px"
        });
        
        // add an additional line to counter a possible compact layout
        var lineCount = Math.round(pre.height() / lineHeight) + 1;
        pre.css({"height": lineCount * lineHeight + "px"});
        
        pre.fitToParent();
        pre.css({"font-size": pre.height() / lineCount / 1.5 + "px"});
    }
});

}(wall.display));

/*
 * Wall
 */

wall.omfgdogs = {};
(function(ns) {

ns.Brick = function(ui) {
    wall.Brick.call(this, ui);
    this.window = null;
};

$.extend(ns.Brick.prototype, wall.Brick.prototype, {
    id:         "omfgdogs",
    postType:   "OmfgDogsPost",
    postTitle:  "OMFGDogs",
    postSingle: true,
    
    initPost: function(elem, post) {
        this.window = open("http://www.omfgdogs.com", "browser");
    },
    
    cleanupPost: function() {
        this.window.close();
    },
    
    clientInitPost: function(elem, post) {
        elem.text("OMFG! Dogs!");
    }
});

}(wall.omfgdogs))

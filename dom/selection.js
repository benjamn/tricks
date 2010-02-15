var Base = require("../lang/class").Base,
    extend = require("../lang/obj").extend,
    Location = require("./location").Location,
    dom = require("./util"),
    isTxt = dom.isTextNode,
    succ = dom.successor,
    cmp = dom.compareNodes,
    scrollTo = dom.scrollTo;

var Selection = Base.derive({

    leaves: function() {
        var leaves = [];
        for (var last = this.closing.cut()[1],
                 leaf = this.opening.cut()[1];
             leaf && leaf !== last;
             leaf = succ(leaf))
            leaves.push(leaf);
        return leaves;
    },

    map: function(iter) {
        var leaves = this.leaves();
        if (iter)
            for (var i = 0; leaf = leaves[i]; ++i)
                leaves[i] = iter(leaf);
        return leaves;
    },

    getText: function() {
        return this.map(function(leaf) {
            return isTxt(leaf) ? leaf.nodeValue : '';
        }).join('');
    },

    scrollTo: function(padding_opt) {
        scrollTo(this.opening.ground().node,
                 padding_opt);
    },

    deselect: function() {},
    reselect: function() {},

    toString: function() {
        return [this.opening, this.closing].join(",");
    }

});

function chooseSubclass() {
    if (document.selection)
        return IESelection;
    else return W3CSelection;
};

Selection.getCurrent = function() {
    return chooseSubclass().getCurrent();
};

Selection.fromString = function(s) {
    var splat = s.split(",");
    if (splat.length != 2)
        return null;
    return new (chooseSubclass())({
        opening: Location.fromString(splat[0]),
        closing: Location.fromString(splat[1])
    });
};
    
var W3CSelection = Selection.derive({
    deselect: function() {
        var sel = window.getSelection();
        if (sel)
            sel.removeAllRanges();
        return sel;
    },
    reselect: function() {
        var sel = this.deselect(),
            range = document.createRange(),
            opening = this.opening.cut()[1],
            closing = this.closing.cut()[1];
        range.setStart(opening, 0);
        range.setEnd(closing, 0);
        if (sel)
            sel.addRange(range);
    }
});

W3CSelection.getCurrent = function() {
    var range = window.getSelection();
    if (range.isCollapsed)
        return null
    var anchor = Location.fromNodeOffset(range.anchorNode,
                                         range.anchorOffset),
        focus = Location.fromNodeOffset(range.focusNode,
                                        range.focusOffset);
    var order = cmp(anchor.node, focus.node);
    if (order == 0)
        order = focus.offset - anchor.offset;
    return new W3CSelection({
        opening: (order < 0) ? focus : anchor,
        closing: (order < 0) ? anchor : focus
    });
};


var IESelection = Selection.derive({
    reselect: function() {
        alert("Selection not yet implemented in IE.");
    }
});

IESelection.rangeToLoc = function(range) {
    range.move('Character', 1);
    range.move('Character', -1);
    var id = 'ierange' + Math.random();
    range.pasteHTML("<span id='" + id + "'></span>");
    var span = document.getElementById(id),
        parent = range.parentElement(),
        loc = Location.fromNodeOffset(span, 0).lift(function(node) {
            return node === parent;
        });
    parent.removeChild(span);
    return loc;
};
    
IESelection.getCurrent = function() {
    var range = document.selection.createRange();
    if (!range.htmlText)
        return null;
    var copy = range.duplicate();
    range.collapse(true);
    copy.collapse(false);
    return new IESelection({
        opening: this.rangeToLoc(range),
        closing: this.rangeToLoc(copy)        
    });
};

exports.Selection = Selection;

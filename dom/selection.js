var Base = require("../lang/class").Base,
    extend = require("../lang/obj").extend,
    Location = require("./location").Location,
    dom = require("./util"),
    isTxt = dom.isTextNode,
    succ = dom.successor,
    cmp = dom.compareNodes,
    gsel;

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

    normalize: function() {
        return new (chooseSubclass())({
            opening: this.opening.normalize(),
            closing: this.closing.normalize()
        });
    },
    
    map: function(iter) {
        var leaves = this.normalize().leaves();
        this.reselect();
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
    var sel = chooseSubclass().getCurrent();
    return sel && sel.normalize();
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
    reselect: function() {
        var selection = window.getSelection();
        selection.removeAllRanges();
        var range = document.createRange(),
            opening = this.opening.ground(),
            closing = this.closing.ground();
        range.setStart(opening.node,
                       opening.offset);
        range.setEnd(closing.node,
                     closing.offset);
        selection.addRange(range);
    }
});

W3CSelection.getCurrent = function() {
    var range = window.getSelection();
    if (range.isCollapsed)
        return null
    var anchor = new Location({
        node:   range.anchorNode,
        offset: range.anchorOffset
    }), focus = new Location({
        node:   range.focusNode,
        offset: range.focusOffset
    });
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
        // TODO
    }
});

IESelection.rangeToLoc = function(range) {
    range.move('Character', 1);
    range.move('Character', -1);
    var id = 'ierange' + Math.random();
    range.pasteHTML("<span id='" + id + "'></span>");
    var span = document.getElementById(id),
        parent = range.parentElement(),
        loc = new Location({ node: span, offset: 0 }).lift(parent);
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

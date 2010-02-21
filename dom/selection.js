var Base = require("../lang/class").Base,
    extend = require("../lang/obj").extend,
    Location = require("./location").Location,
    Set = require("../util/set").Set,
    dom = require("./util"),
    isTxt = dom.isTextNode,
    succ = dom.successor,
    scrollTo = dom.scrollTo;

var selections = new Set,
    Selection = Base.derive({

    initialize: function() {
        this.sup(arguments);
        this.wrappers = new Set;
        selections.add(this);
    },

    leaves: function() {
        var leaves = [];
        // N.B., this.opening must not be cut before this.closing.
        for (var last = this.closing.cut()[1],
                 leaf = this.opening.cut()[1];
             leaf && leaf !== last;
             leaf = succ(leaf))
            leaves.push(leaf);
        return leaves;
    },

    mapLeaves: function(iter) {
        var leaves = this.leaves();
        if (iter)
            for (var i = 0; leaf = leaves[i]; ++i)
                leaves[i] = iter.call(this, leaf);
        return leaves;
    },

    unwrap: function() {
        this.deselect();
        var ws = [];
        // Precompute so that removal cannot cause problems.
        this.wrappers.each(function(w) { ws[ws.length] = w });
        for (var i = 0, w, parent, child; w = ws[i]; i++) {
            if ((parent = w.parentNode)) {
                while ((child = w.firstChild))
                    parent.insertBefore(w.removeChild(child), w);
                parent.removeChild(w);
            }
            this.wrappers.remove(w);
        }
    },
    
    wrap: function(styles) {
        this.unwrap();
        this.mapLeaves(function(leaf) {
            var parent = leaf.parentNode,
                sib = leaf.nextSibling,
                wrapper = document.createElement("span");
            for (var p in styles)
                wrapper.style[p] = styles[p];
            wrapper.appendChild(parent.removeChild(leaf));
            parent.insertBefore(wrapper, sib);
            this.wrappers.add(wrapper);
        });
    },

    getText: function() {
        return this.mapLeaves(function(leaf) {
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

Selection.each = function(callback, context) {
    return selections.each(callback, context);
};

function chooseSubclass() {
    if (document.selection)
        return IESelection;
    else return W3CSelection;
};

Selection.getCurrent = function() {
    return chooseSubclass().getCurrent();
};

Selection.fromString = function(s) {
    var splat = s.split(","),
        args = {};
    if (splat.length != 2)
        return null;
    args.opening = Location.fromString(splat[0]);
    args.closing = Location.fromString(splat[1]).normalize(args.opening);
    args.opening = args.opening.normalize(args.closing);
    return new (chooseSubclass())(args);
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
            closing = this.closing.cut()[1],
            opening = this.opening.cut()[1];
        range.setStart(opening, 0);
        range.setEnd(closing, 0);
        if (sel)
            sel.addRange(range);
    }
});

W3CSelection.getCurrent = function() {
    var range = window.getSelection();
    if (range.isCollapsed)
        return null;
    var an = range.anchorNode, ao = range.anchorOffset,
        fn = range.focusNode, fo = range.focusOffset,
        anchor = Location.fromNodeOffset(an, ao),
        focus = Location.fromNodeOffset(fn, fo).normalize(anchor);
    anchor = anchor.normalize(focus);
    var swap = anchor.compareTo(focus) < 0;
    return new W3CSelection({
        opening: swap ? focus : anchor,
        closing: swap ? anchor : focus
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
    var copy = range.duplicate(),
        args = {};
    range.collapse(true);
    copy.collapse(false);
    args.opening = this.rangeToLoc(range);
    args.closing = this.rangeToLoc(copy).normalize(args.opening);
    args.opening = args.opening.normalize(args.closing);
    return new IESelection(args);
};

exports.Selection = Selection;

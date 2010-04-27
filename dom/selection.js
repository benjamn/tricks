var Base = require("../lang/class").Base,
    extend = require("../lang/obj").extend,
    Location = require("./location").Location,
    Set = require("../util/set").Set,
    dom = require("./util"),
    isTxt = dom.isTextNode,
    nextLeaf = dom.nextLeaf,
    canParent = dom.canParent,
    scroll = dom.scrollToY,
    separator = ",";

var allSelections = new Set,
    allWrappers = new Set,
    Selection = Base.derive({

    initialize: function() {
        this.sup(arguments);
        this.wrappers = new Set;
        allSelections.add(this);
    },

    leaves: function() {
        var leaves = [],
            // N.B., this.opening must not be cut before this.closing.
            last = this.closing.cut()[1],
            leaf = this.opening.cut()[1];
        while (leaf && leaf !== last)
            leaf = nextLeaf(leaves[leaves.length] = leaf);
        return leaves;
    },

    mapLeaves: function(iter) {
        var leaves = this.leaves(), thrown;
        if (iter)
            for (var i = 0; leaf = leaves[i]; ++i)
                try { leaves[i] = iter.call(this, leaf) }
                catch (x) { thrown = thrown || [x] }
        if (thrown)
            throw thrown[0];
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
            allWrappers.remove(w);
        }
    },
    
    wrap: function(styles, unwrapAll) {
        if (unwrapAll)
            allSelections.each(function(s) { s.unwrap() });
        else
            this.unwrap();
        this.mapLeaves(function(leaf) {
            var parent = leaf.parentNode,
                sib = leaf.nextSibling,
                wrapper = document.createElement("span");
            if (!canParent(parent, wrapper))
                return;
            for (var p in styles)
                wrapper.style[p] = styles[p];
            wrapper.appendChild(parent.removeChild(leaf));
            parent.insertBefore(wrapper, sib);
            this.wrappers.add(wrapper);
            allWrappers.add(wrapper);
        });
    },

    getText: function() {
        return this.mapLeaves(function(leaf) {
            return isTxt(leaf) ? leaf.nodeValue : '';
        }).join('');
    },

    scrollTo: function(padding_opt) {
        scroll(this.opening.toLeafPos().leaf,
               padding_opt);
    },

    deselect: function() {},
    reselect: function() {},

    toString: function() {
        return "SEL(" + [this.opening,
                         this.closing].join(",") + ")";
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

function wrapperTest(n) { return !allWrappers.contains(n) }
function endpoints(opening, closing) {
    if (opening.compareTo(closing) < 0) {
        var temp = opening;
        opening = closing;
        closing = temp;
    }
    //opening = opening.normalize(closing);
    //closing = closing.normalize(opening);
    return { opening: opening,
             closing: closing };
}
    
Selection.fromString = function(s) {
    // TODO!
    var match = /^SEL\(([A-Z]+\(.*?\)),([A-Z]+\(.*?\))\)$/.exec(s);
    if (match.length != 3)
        return null;
    return new (chooseSubclass())(endpoints(Location.fromString(match[1]),
                                            Location.fromString(match[2])));
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
        fn = range.focusNode, fo = range.focusOffset;
    return new W3CSelection(endpoints(Location.fromLeafPos(an, ao),
                                      Location.fromLeafPos(fn, fo)));
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
        leaf = nextLeaf(span),
        parent = range.parentElement();
    parent.removeChild(span);
    return Location.fromLeafPos(leaf, 0);
};

IESelection.getCurrent = function() {
    var range = document.selection.createRange();
    if (!range.htmlText)
        return null;
    var copy = range.duplicate();
    range.collapse(true);
    copy.collapse(false);
    return new IESelection(endpoints(this.rangeToLoc(range),
                                     this.rangeToLoc(copy)));
};

exports.Selection = Selection;

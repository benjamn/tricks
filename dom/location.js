var Base = require("../lang/class").Base,
    dom = require("./util"),
    prev = dom.prevLeaf,
    next = dom.nextLeaf,
    cmp = dom.compareNodes,
    isTxt = dom.isTextNode,
    wsPres = dom.whiteSpacePreserved,
    infertile = dom.infertile,
    getStyle = dom.getStyle,
    xpath = require("./xpath");

function isBlockDisplay(node) {
    // TODO This function might be a big bottleneck.
    return /block/i.test(getStyle(node, "display"));
}

// Returns the first leaf along the given node's fringe.
// Sets ignore.spaces to true if any block-display parent is encountered
// along the way.
function firstIgnore(node, ignore) {
    while (node && node.firstChild) {
        if (ignore && isBlockDisplay(node))
            ignore.spaces = true;
        node = node.firstChild;
    }
    return node;
}
    
// Returns the leaf subsequent to the given leaf.
// Sets ignore.spaces to true if the given leaf was the last leaf along
// the fringe of a block-display element.
function nextIgnore(leaf, ignore) {
    while (leaf && !leaf.nextSibling) {
        leaf = leaf.parentNode;
        if (leaf === document.body)
            return null;
        if (ignore && isBlockDisplay(leaf))
            ignore.spaces = true;
    }  
    return leaf && firstIgnore(leaf.nextSibling, ignore);
}

function count_atoms_loop(node, callback, look_for) {
    var ignore = { spaces: false },
        leaf = firstIgnore(node, ignore),
        seen; // Set to true when look_for encountered.
    while (leaf) {
        if (leaf === look_for)
            seen = true;
        if (isTxt(leaf)) {
            var text = leaf.nodeValue,
                pos = 0;
            if (wsPres(leaf)) {
                while (pos <= text.length)
                    callback(leaf, pos++, seen);
                ignore.spaces = false;
            } else while (text)
                text = text.replace(/^(\s+|\S)/m, function(_, atom) {
                    if (!ignore.spaces || /^\S/.test(atom))
                        callback(leaf, pos, seen);
                    pos += atom.length;
                    ignore.spaces = /\s$/.test(atom);
                    return "";
                });
        } else if (infertile(leaf)) {
            callback(leaf, 0, seen);
            callback(leaf, 1, seen);
            // Infertile leaves can be display: block, e.g. <hr>.
            ignore.spaces = isBlockDisplay(leaf);
        }
        leaf = nextIgnore(leaf, ignore);
    }
}

function count_atoms(leaf, callback, look_for) {
    try { count_atoms_loop(leaf, callback, look_for) }
    catch (x) { return x }
}

var Location = Base.derive({

    toLeafPos: function() {
        var offset = this.offset;
        return count_atoms(this.node, function(leaf, pos) {
            if (offset <= 0)
                // Caught and returned by count_atoms.
                throw { leaf: leaf, pos: pos };
            offset--;
        });
    },

    cut: function() {
        var lp = this.toLeafPos(),
            leaf = lp.leaf,
            pos = lp.pos;

        // Avoid creating zero-length text nodes.
        if (pos == 0)
            return [prev(leaf), leaf];

        if (isTxt(leaf)) {
            // Avoid creating zero-length text nodes.
            if (pos == leaf.nodeValue.length)
                return [leaf, next(leaf)];

            // Note that this operation is destructive, so existing
            // node/offset pairs may be invalidated afterwards.
            var text = leaf.nodeValue,
                preText = text.slice(0, pos),
                preNode = document.createTextNode(preText);
            leaf.parentNode.insertBefore(preNode, leaf);
            leaf.nodeValue = text.slice(pos);

            return [preNode, leaf];
        } else if (infertile(leaf))
            // Assume offset == 1, by deduction.
            return [leaf, next(leaf)];

        // This might be a lousy fallback, but I don't know any better.
        return [leaf];
    },

    compareTo: function(that) {
        var this_lp = this.toLeafPos(),
            that_lp = that.toLeafPos();
        return (cmp(this_lp.leaf, that_lp.leaf) ||
                that_lp.pos - this_lp.pos);
    },

    toString: function() {
        return [xpath.toXPath(this.node),
                this.offset].join(":");
    }

});

Location.fromString = function(s) {
    var splat = s.split(":");
    return new Location({
        node: xpath.toNode(splat[0]),
        offset: +splat[1]
    });
};

Location.fromLeafPos = function(leaf, pos, test) {
    var ancestor = leaf;
    if (isTxt(ancestor))
        ancestor = ancestor.parentNode;
    while (ancestor && !isBlockDisplay(ancestor))
        ancestor = ancestor.parentNode;

    // Internet Explorer will sometimes give a range endpoint whose node
    // is not a leaf, and whose offset is an index into the childNodes
    // array.  Cope with that before proceeding.
    while (leaf.firstChild) {
        leaf = leaf.childNodes[pos];
        pos = 0;
    }

    var offset = 0;
    return new Location(count_atoms(ancestor, function(l, p, seen) {
        var same_leaf = l === leaf;
        if ((same_leaf && p >= pos) ||
            (!same_leaf && seen))
            throw { node: ancestor, offset: offset };
        offset++;
    }, leaf));
};

exports.Location = Location;

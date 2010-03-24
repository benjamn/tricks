var Base = require("../lang/class").Base,
    dom = require("./util"),
    first = dom.firstLeaf,
    prev = dom.prevLeaf,
    succ = dom.nextLeaf,
    cmp = dom.compareNodes,
    isTxt = dom.isTextNode,
    wsPres = dom.whiteSpacePreserved,
    infertile = dom.infertile,
    xpath = require("./xpath");

function count_atoms_loop(leaf, callback) {
    var ignore_spaces = true;
    for (leaf = first(leaf); leaf; leaf = succ(leaf))
        if (isTxt(leaf)) {
            var text = leaf.nodeValue,
                pos = 0;
            if (wsPres(leaf)) {
                while (pos <= text.length)
                    callback(leaf, pos++);
                ignore_spaces = false;
            } else while (text)
                text = text.replace(/^(\s+|\S)/m, function(_, atom) {
                    if (!ignore_spaces || /^\S/.test(atom))
                        callback(leaf, pos);
                    pos += atom.length;
                    ignore_spaces = /\s$/.test(atom);
                    return "";
                });
        } else if (infertile(leaf)) {
            callback(leaf, 0);
            callback(leaf, 1);
            ignore_spaces = false;
        }
}

function count_atoms(leaf, callback) {
    try { count_atoms_loop(leaf, callback) }
    catch (x) { return x }
}

function roundToNextPosition(leaf, pos) {
    leaf = first(leaf); // Potential source of bugs: if the first argument
    // to count_atoms is not a leaf, then it will never be passed to the
    // callback function, so referring to that value in the callback
    // function is probably a mistake, unless leafhood is ensured.
    return count_atoms(leaf, function(new_leaf, new_pos) {
        if (new_leaf !== leaf || new_pos >= pos)
            throw { leaf: new_leaf, pos: new_pos };
    });
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
                return [leaf, succ(leaf)];

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
            return [leaf, succ(leaf)];

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

function isNotTxt(node) {
    return !isTxt(node);
}

Location.fromLeafPos = function(leaf, pos, test) {
    // Internet Explorer will sometimes give a range endpoint whose node
    // is not a leaf, and whose offset is an index into the childNodes
    // array.  Cope with that before proceeding.
    while (leaf.firstChild) {
        leaf = leaf.childNodes[pos];
        pos = 0;
    }

    // By default, use the first non-text parent node.
    test = test || isNotTxt;

    var ancestor = leaf;
    // Find a suitable reference node.
    while (ancestor &&
           ancestor.parentNode &&
           ancestor != document.body &&
           !test(ancestor))
        ancestor = ancestor.parentNode;

    // Make sure we encounter the node/offset while iterating.
    var rounded = roundToNextPosition(leaf, pos),
        offset = 0; // Incremented once with every callback.

    // Iterate until we encounter the rounded node/offset.
    var tuple = count_atoms(ancestor, function(leaf, pos) {
        if (leaf === rounded.leaf && pos >= rounded.pos)
            throw { node: ancestor, offset: offset };
        offset++;
    });

    // Make a Location out of that.
    return tuple && new Location(tuple);
};

window.Location = Location;
exports.Location = Location;

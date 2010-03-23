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
            throw { node: new_leaf, offset: new_pos };
    });
}
    
var Location = Base.derive({

    toNodeOffset: function() {
        var offset = this.offset;
        return count_atoms(this.node, function(leaf, pos) {
            if (offset <= 0)
                // Becomes the return value of count_atoms.
                throw { node: leaf, offset: pos };
            offset--;
        });
    },

    cut: function() {
        var no = this.toNodeOffset(),
            node = no.node,
            offset = no.offset;

        // Avoid creating zero-length text nodes.
        if (offset == 0)
            return [prev(node), node];

        if (isTxt(node)) {
            // Avoid creating zero-length text nodes.
            if (offset == node.nodeValue.length)
                return [node, succ(node)];

            // Note that this operation is destructive, so existing
            // node/offset pairs may be invalidated afterwards.
            var text = node.nodeValue,
                preText = text.slice(0, offset),
                preNode = document.createTextNode(preText);
            node.parentNode.insertBefore(preNode, node);
            node.nodeValue = text.slice(offset);
            return [preNode, node];
        } else if (infertile(no.node))
            // Assume offset == 1, by deduction.
            return [no.node, succ(no.node)];

        // This might be a lousy fallback, but I don't know any better.
        return [no.node];
    },

    compareTo: function(that) {
        var gthis = this.ground(),
            gthat = that.ground();
        return (cmp(gthis.node, gthat.node) ||
                gthat.offset - gthis.offset);
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

Location.fromNodeOffset = function(node, offset, test) {
    // By default, use the first non-text parent node.
    test = test || isNotTxt;

    var ancestor = node,
        atom_offset = 0;

    // Find a suitable reference node.
    while (ancestor &&
           ancestor.parentNode &&
           ancestor != document.body &&
           !test(ancestor))
        ancestor = ancestor.parentNode;

    // Make sure we encounter the node/offset while iterating.
    var rounded = roundToNextPosition(node, offset);
    node = rounded.node;
    offset = rounded.offset;

    // Iterate until we encounter the rounded node/offset.
    var tuple = count_atoms(ancestor, function(leaf, pos) {
        if (leaf === node && pos >= offset)
            throw { node: ancestor, offset: atom_offset };
        atom_offset++;
    });

    // Make a Location out of that.
    return tuple && new Location(tuple);
};

window.Location = Location;
exports.Location = Location;

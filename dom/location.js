var Base = require("../lang/class").Base,
    dom = require("./util"),
    succ = dom.successor,
    pred = dom.predecessor,
    fore = dom.foreshadow,
    first = dom.firstLeaf,
    isTxt = dom.isTextNode,
    infertile = dom.infertile;

function str_atom_count(str, right_strip) {
    if (right_strip)
        str = str.replace(/\s*$/m, '');
    return str.replace(/\s+/gm, " ").length;
}
function leaf_atom_count(leaf, right_strip) {
    return (isTxt(leaf)
            ? str_atom_count(leaf.nodeValue, right_strip)
            : (infertile(leaf) ? 1 : 0));
}

function starts_with_space(node) {
    var leaf = first(node);
    while (leaf && leaf_atom_count(leaf) < 1)
        leaf = succ(leaf);
    return (leaf &&
            isTxt(leaf) &&
            /^\s/.test(leaf.nodeValue));
}

function sum(arr, right_strip) {
    var result = 0,
        i = arr.length,
        leaf, count;
    while (i --> 0) {
        leaf = arr[i];
        count = leaf_atom_count(leaf, right_strip);
        if (count < 1)
            continue;
        result += count;
        right_strip = starts_with_space(leaf);
    }
    return result;
}

function atom_offset_to_str_pos(text, offset) {
    var pos = offset;
    // The atom count is always an underestimate of the real position, so
    // this loop will indeed terminate.
    while (str_atom_count(text.slice(0, pos)) < offset)
        pos++;
    return pos;
}
    
var Location = Base.derive({
    
    /* Initialization example:
     * var loc1 = new Location({ node: $$('li')[1], offset: 3 });
     * var loc2 = new Location(loc1);
     */

    lift: function(predicate) {
        var node = this.node,
            offset = this.offset;
        while (node.parentNode &&
               node != document.body &&
               !predicate(node))
        {
            offset += sum(fore(node), starts_with_space(node));
            node = node.parentNode;
        }
        return new Location({ node: node, offset: offset });
    },

    ground: function() {
        var offset = this.offset,
            leaf = first(this.node),
            nextLeaf = succ(leaf);
        while (leaf) {
            var loss = leaf_atom_count(leaf, starts_with_space(nextLeaf));
            if (loss > offset) break;
            else offset -= loss;
            nextLeaf = succ(leaf = nextLeaf);
        }
        return new Location({ node: leaf, offset: offset });
    },

    cut: function() {
        var loc = this.ground(),
            node = loc.node,
            offset = loc.offset;
        if (offset == 0)
            return [pred(node), node];
        // Strict > should never happen if this.ground() did its job.
        if (offset >= leaf_atom_count(node, true))
            return [node, succ(node)];
        if (isTxt(node)) {
            var text = node.nodeValue,
                pos = atom_offset_to_str_pos(text, offset),
                preText = text.slice(0, pos),
                preNode = document.createTextNode(preText);
            node.parentNode.insertBefore(preNode, node);
            node.nodeValue = text.slice(pos);
            return [preNode, node];
        }
        return [node];
    },

    insert: function(what) {
        var post = this.ground().cut()[1];
        post.parentNode.insertBefore(what, post);
    },

    toString: function() {
        function id_or_root(node) {
            return document.getElementById(node.id) === node;
        }   
        var lifted = this.lift(id_or_root);
        return (id_or_root(lifted.node)
                ? lifted.node.id + ":"
                : "") + lifted.offset;
    },

    normalize: function() {
        return this.ground().lift(function(node) {
            return !isTxt(node);
        });
    }

});

Location.fromString = function(s) {
    var splat = s.split(":"),
        args = { offset: +splat.pop() };
    switch (splat.length) {
    case 0:
        args.node = document.body;
        break;
    case 1:
        args.node = document.getElementById(splat.pop());
        break;
    default:
        return null;
    }
    return new Location(args).normalize();
};

exports.Location = Location;

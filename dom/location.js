var Base = require("../lang/class").Base,
    dom = require("./util"),
    succ = dom.successor,
    pred = dom.predecessor,
    fore = dom.foreshadow,
    first = dom.firstLeaf,
    isTxt = dom.isTextNode,
    infertile = dom.infertile,
    getStyle = dom.getStyle;

function str_atom_count(str, right_strip) {
    if (right_strip)
        str = str.replace(/\s*$/m, "");
    return str.replace(/\s+/gm, " ").length;
}

function leaf_atom_count(leaf, right_strip) {
    if (!isTxt(leaf))
        return infertile(leaf) ? 1 : 0;
    var text = leaf.nodeValue;
    if (getStyle(leaf, "whiteSpace") == "pre")
        return text.length;
    return str_atom_count(text, right_strip);
}

function atom_offset_to_str_pos(leaf, offset) {
    if (!isTxt(leaf) || getStyle(leaf, "whiteSpace") == "pre")
        return offset;
    // The atom count is always an underestimate of the real position, so
    // this loop will terminate.
    var pos = offset,
        text = leaf.nodeValue;
    while (str_atom_count(text.slice(0, pos)) < offset)
        pos += 1;
    return pos;
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

var Location = Base.derive({
    
    lift: function(predicate) {
        var node = this.node,
            offset = this.offset;
        while (node &&
               node.parentNode &&
               node != document.body &&
               !predicate(node))
        {
            offset += sum(fore(node), starts_with_space(node));
            node = node.parentNode;
        }
        return node && new Location({
            node: node,
            offset: offset
        });
    },

    isGrounded: function() {
        return isTxt(this.node);
    },

    ground: function() {
        if (this.isGrounded(this.node))
            return this;
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

    // N.B., the result of a cut is invalidated if either of the returned
    // nodes are moved or removed.
    cut: function() {
        var grounded = this.ground(),
            node = grounded.node,
            offset = grounded.offset;
        if (offset == 0)
            return [pred(node), node];
        // Strict > should never happen if this.ground() did its job.
        if (offset >= leaf_atom_count(node, true))
            return [node, succ(node)];
        if (isTxt(node)) {
            var text = node.nodeValue,
                pos = atom_offset_to_str_pos(node, offset),
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
            return document.getElementById(node.id || "") === node;
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

    if (splat.length == 0)
        args.node = document.body;

    if (splat.length == 1)
        args.node = document.getElementById(splat.pop());

    if (!args.node)
        return null;

    return new Location(args).normalize();
};

Location.fromNodeOffset = function(node, offset) {
    if (isTxt(node)) {
        // TODO Destructive modification of the DOM invalidates selection
        // ranges, so we should really use str_atom_count instead.
        var saved = node.nodeValue;
        node.nodeValue = saved.slice(0, offset);
        offset = leaf_atom_count(node);
        node.nodeValue = saved;
    } else {
        // When offset is already 0, it can't get any smaller.
        offset = offset && sum(fore(node.childNodes[offset]));
    }
    return new Location({
        node: node,
        offset: offset
    }).normalize();
};

exports.Location = Location;

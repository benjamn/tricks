var Base = require("../lang/class").Base,
    dom = require("./util"),
    first = dom.firstLeaf,
    last = dom.lastLeaf,
    prev = dom.prevLeaf,
    next = dom.nextLeaf,
    cmp = dom.compareNodes,
    isTxt = dom.isTextNode,
    wsPres = dom.whiteSpacePreserved,
    infertile = dom.infertile,
    getStyle = dom.getStyle,
    xpath = require("./xpath"),
    encode = encodeURIComponent,
    decode = decodeURIComponent,
    NCHARS = 10,
    separator = ",",
    wsExp = /\s+/gm;

var Location = Base.derive({

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
            // leaf/pos pairs may be invalidated afterwards.
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
    }

});

var shortNames = {};
function shortenTo(shortName, cls) {
    return shortNames[cls.shortName = shortName] = cls;
}
    
var NodeOffsetLocation = shortenTo("NOL", Location.derive({

    toLeafPos: function() {
        return { leaf: node, pos: this.offset };
    },

    toString: function() {
        return NodeOffsetLocation.shortName + "(" +
            [xpath.toXPath(node),
             this.offset].join(separator) + ")";
    }

}));

NodeOffsetLocation.fromString = function(s) {
    var splat = s.split(separator);
    return new NodeOffsetLocation({
        node: xpath.toNode(splat[0]),
        offset: +splat[1]
    });
};

NodeOffsetLocation.fromLeafPos = function(leaf, pos) {
    if (isTxt(leaf) || !infertile(leaf))
        return null;
    return new NodeOffsetLocation({
        node: leaf,
        offset: pos
    });
};

function startsAt(slug, leaf, pos) {
    var text = leaf.nodeValue.slice(pos);
    if (!text || /^\s/.test(text))
        return false;
    while (leaf) {
        text = leaf.nodeValue.slice(pos).replace(wsExp, "");
        if (slug.length <= text.length)
            return text.indexOf(slug) == 0;
        else if (slug.indexOf(text) != 0)
            return false;
        slug = slug.slice(text.length);
        do leaf = next(leaf);
        while (leaf && !isTxt(leaf));
        pos = 0;
    }
    return false;
}

function endsAt(slug, leaf, pos) {
    var text = leaf.nodeValue.slice(0, pos);
    if (!text || /\s$/.test(text))
        return false;
    while (leaf) {
        text = leaf.nodeValue.slice(0, pos).replace(wsExp, "");
        if (slug.length <= text.length)
            return text.indexOf(slug) + slug.length == text.length;
        else if ((slug.indexOf(text) || slug.length) +
                 text.length != slug.length)
            return false;
        slug = slug.slice(0, slug.length - text.length);
        do leaf = prev(leaf);
        while (leaf && !isTxt(leaf));
        pos = leaf.nodeValue.length;
    }
    return false;
}
    
var OrdinalSlugLocation = shortenTo("OSL", Location.derive({

    toLeafPos: function() {
        var ord = this.ordinal;
        if (ord < 0) {
            for (var leaf = last(this.node); leaf; leaf = prev(leaf)) {
                if (!isTxt(leaf))
                    continue;
                for (var pos = leaf.nodeValue.length; pos >= 0; --pos)
                    if (endsAt(this.slug, leaf, pos))
                        return { leaf: leaf, pos: pos };
            }
        } else if (ord > 0) {
            for (var leaf = first(this.node); leaf; leaf = next(leaf)) {
                if (!isTxt(leaf))
                    continue;
                for (var pos = 0; pos <= leaf.nodeValue.length; ++pos)
                    if (startsAt(this.slug, leaf, pos))
                        return { leaf: leaf, pos: pos };
            }
        }
    },

    toString: function() {
        return OrdinalSlugLocation.shortName + "(" +
            [xpath.toXPath(this.node),
             this.ordinal,
             encode(this.slug)].join(separator) + ")";
    }

}));

OrdinalSlugLocation.fromString = function(s) {
    var splat = s.split(separator);
    return new OrdinalSlugLocation({
        node: xpath.toNode(splat[0]),
        ordinal: +splat[1],
        slug: decode(splat[2])
    });
};

function getSlugForth(leaf, pos) {
    var slug = "";
    while (leaf) {
        slug = slug + leaf.nodeValue.slice(pos).replace(wsExp, "");
        if (slug.length >= NCHARS)
            break;
        do leaf = next(leaf);
        while (leaf && !isTxt(leaf));
        pos = 0;
    }
    return slug.slice(0, NCHARS);
};

function getSlugBack(leaf, pos) {
    var slug = "";
    while (leaf) {
        slug = leaf.nodeValue.slice(0, pos).replace(wsExp, "") + slug;
        if (slug.length >= NCHARS)
            break;
        do leaf = prev(leaf);
        while (leaf && !isTxt(leaf));
        pos = leaf.nodeValue.length;
    }
    return slug.slice(slug.length - NCHARS,
                       slug.length);
}
    
OrdinalSlugLocation.fromLeafPos = function(leaf, pos) {
    if (!isTxt(leaf) || wsPres(leaf))
        return null;
    
    var ancestor = leaf;
    if (isTxt(ancestor))
        ancestor = ancestor.parentNode;
    while (ancestor && !/block/i.test(getStyle(ancestor, "display")))
        ancestor = ancestor.parentNode;

    var info = { node: ancestor };
    if (/^\s/.test(leaf.nodeValue.slice(pos))) {
        info.slug = getSlugBack(leaf, pos);
        info.ordinal = -1; // TODO
    } else {
        info.slug = getSlugForth(leaf, pos);
        info.ordinal = 1; // TODO
    }

    return new OrdinalSlugLocation(info);
};
    
var PreOffsetLocation = shortenTo("POL", Location.derive({

    toLeafPos: function() {
        var offset = this.preOffset;
        for (var leaf = first(this.node); leaf; leaf = next(leaf)) {
            if (!wsPres(leaf))
                continue;
            var text = leaf.nodeValue;
            if (offset <= text.length)
                return { leaf: leaf, pos: offset };
            offset -= text.length;
        }
    },

    toString: function() {
        return PreOffsetLocation.shortName + "(" +
            [xpath.toXPath(this.node),
             this.preOffset].join(separator) + ")";
    }

}));

PreOffsetLocation.fromString = function(s) {
    var splat = s.split(separator);
    return new PreOffsetLocation({
        node: xpath.toNode(splat[0]),
        preOffset: +splat[1]
    });
};

PreOffsetLocation.fromLeafPos = function(leaf, pos) {
    if (!isTxt(leaf) || !wsPres(leaf))
        return null;
    var ancestor = findReliableAncestor(leaf),
        offset = 0;
    for (var lf = first(ancestor); lf; lf = next(lf)) {
        if (!wsPres(lf))
            continue;
        if (lf === leaf)
            return new PreOffsetLocation({
                node: ancestor,
                preOffset: offset + pos
            });
        offset += leaf.nodeValue.length;
    }
};

Location.fromString = function(s) {
    var match = /^([A-Z]+)\((.*)\)$/.exec(s);
    return (match.length == 3 &&
            shortNames[match[1]].fromString(match[2]));
};

Location.fromLeafPos = function(leaf, pos) {
    // Internet Explorer will sometimes give a range endpoint whose node
    // is not a leaf, and whose offset is an index into the childNodes
    // array.  Cope with that before proceeding.
    while (leaf.firstChild) {
        leaf = leaf.childNodes[pos];
        pos = 0;
    }
    return (NodeOffsetLocation.fromLeafPos(leaf, pos) ||
            OrdinalSlugLocation.fromLeafPos(leaf, pos) ||
            PreOffsetLocation.fromLeafPos(leaf, pos));
};

window.Location = Location;
exports.Location = Location;

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

function iterTextNodes(node, callback, back) {
    var leaf = back ? last(node) : first(node),
        succ = back ? prev : next, rv;
    while (leaf) {
        if (isTxt(leaf) && (rv = callback(leaf)))
            return rv;
        leaf = succ(leaf);
    }
}

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

function findReliableAncestor(ancestor) {
    if (isTxt(ancestor))
        ancestor = ancestor.parentNode;
    while (ancestor && !/block/i.test(getStyle(ancestor, "display")))
        ancestor = ancestor.parentNode;
    return ancestor;
}

var OrdinalSlugLocation = shortenTo("OSL", Location.derive({

    toLeafPos: function() {
        var slug = this.slug,
            ord = this.ordinal;
        if (ord < 0)
            return iterTextNodes(this.node, function(tn) {
                for (var pos = tn.nodeValue.length; pos >= 0; --pos)
                    if (endsAt(slug, tn, pos) && ++ord == 0)
                        return { leaf: tn, pos: pos };
            }, true);
        else if (ord > 0)
            return iterTextNodes(this.node, function(tn) {
                var text = tn.nodeValue;
                for (var pos = 0; pos <= text.length; ++pos)
                    if (startsAt(slug, tn, pos) && --ord == 0)
                        return { leaf: tn, pos: pos };
            });
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
    iterTextNodes(leaf, function(tn) {
        slug = slug + tn.nodeValue.slice(pos).replace(wsExp, "");
        if (slug.length >= NCHARS)
            return true;
        pos = 0;
    });
    return slug.slice(0, NCHARS);
};

function getSlugBack(leaf, pos) {
    var slug = "", once;
    iterTextNodes(leaf, function(tn) {
        slug = (once ? tn.nodeValue
                     : tn.nodeValue.slice(0, pos)
               ).replace(wsExp, "") + slug;
        once = true;
        return slug.length >= NCHARS;
    }, true);
    return slug.slice(slug.length - NCHARS,
                      slug.length);
}
    
OrdinalSlugLocation.fromLeafPos = function(leaf, pos) {
    if (!isTxt(leaf) || wsPres(leaf))
        return null;

    var info = {
        node: findReliableAncestor(leaf),
        ordinal: 0
    };

    if (/^\s/.test(leaf.nodeValue.slice(pos))) {
        info.slug = getSlugBack(leaf, pos);
        iterTextNodes(info.node, function(tn) {
            for (var i = tn.nodeValue.length; i >= 0; --i) {
                if (endsAt(info.slug, tn, i))
                    info.ordinal--;
                if (tn === leaf && i <= pos)
                    return true;
            }
        }, true);
    } else {
        info.slug = getSlugForth(leaf, pos);
        iterTextNodes(info.node, function(tn) {
            var text = tn.nodeValue;
            for (var i = 0; i <= text.length; ++i) {
                if (startsAt(info.slug, tn, i))
                    info.ordinal++;
                if (tn === leaf && i >= pos)
                    return true;
            }
        });
    }

    return new OrdinalSlugLocation(info);
};
    
var PreOffsetLocation = shortenTo("POL", Location.derive({

    toLeafPos: function() {
        var offset = this.preOffset;
        return iterTextNodes(this.node, function(tn) {
            if (wsPres(tn)) {
                var len = tn.nodeValue.length;
                if (offset <= len)
                    return { leaf: tn, pos: offset };
                offset -= len;
            }
        });
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
    var info = {
        node: findReliableAncestor(leaf),
        offset: pos
    };
    return iterTextNodes(info.node, function(tn) {
        if (wsPres(tn)) {
            if (tn === leaf)
                return new PreOffsetLocation(info);
            info.offset += tn.nodeValue.length;
        }
    });
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

var Base = require("../lang/class").Base,
    dom = require("./util"),
    first = dom.firstLeaf,
    last = dom.lastLeaf,
    prev = dom.prevLeaf,
    next = dom.nextLeaf,
    cmp = dom.compareNodes,
    isTxt = dom.isTextNode,
    infertile = dom.infertile,
    getStyle = dom.getStyle,
    wsPres = dom.whiteSpacePreserved,
    findAncestor = dom.findAncestor,
    shadowPtEnd = dom.shadowPointFromEnd,
    isBlock = dom.isBlockDisplay,
    wsExp = /\s+/gm,
    xpath = require("./xpath"),
    encode = encodeURIComponent,
    decode = decodeURIComponent,
    NCHARS = 10,
    separator = ",";

function order(leaf1, pos1, leaf2, pos2) {
    return cmp(leaf1, leaf2) || (pos2 - pos1);
}

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
        return order(this_lp.leaf, this_lp.pos,
                     that_lp.leaf, that_lp.pos);
    }

});

var shortNames = {};
function shortenTo(shortName, cls) {
    return shortNames[cls.shortName = shortName] = cls;
}

var NodeOffsetLocation = shortenTo("NOL", Location.derive({

    toLeafPos: function() {
        return { leaf: this.node, pos: this.offset };
    },

    toString: function() {
        return NodeOffsetLocation.shortName + "(" +
            [xpath.toXPath(this.node),
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
        text = text.replace(wsExp, "");
        for (var tlen = text.length,
                 slen = slug.length,
                 i = 0; i < tlen && i < slen; ++i)
            if (text.charAt(i) !=
                slug.charAt(i))
                return false;
        if (i == slen)
            return true;
        slug = slug.slice(tlen);
        do leaf = next(leaf);
        while (leaf && !isTxt(leaf));
        text = leaf && leaf.nodeValue;
    }
    return false;
}

function endsAt(slug, leaf, pos) {
    var text = leaf.nodeValue.slice(0, pos);
    if (!text || /\s$/.test(text))
        return false;
    while (leaf) {
        text = text.replace(wsExp, "");
        for (var tlen = text.length,
                 slen = slug.length,
                 i = 0; i < tlen && i < slen; ++i)
            if (text.charAt(tlen - i - 1) !=
                slug.charAt(slen - i - 1))
                return false;
        if (i == slen)
            return true;
        slug = slug.slice(0, slen - tlen);
        do leaf = prev(leaf);
        while (leaf && !isTxt(leaf));
        text = leaf && leaf.nodeValue;
    }
    return false;
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

        if (ord > 0)
            return iterTextNodes(this.node, function(tn) {
                var text = tn.nodeValue;
                for (var pos = 0; pos <= text.length; ++pos)
                    if (startsAt(slug, tn, pos) && --ord == 0)
                        return { leaf: tn, pos: pos };
            });

        return null;
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

OrdinalSlugLocation.fromLeafPos = function(leaf, pos) {
    if (!isTxt(leaf) || wsPres(leaf))
        return null;
    
    var ancestor = findAncestor(leaf, isBlock),
        slug = "",
        ordinal = 0;

    if (affinity(leaf, pos) < 0) {
        // Collect the NCHARS or more non-space characters ending at
        // leaf/pos.
        iterTextNodes(leaf, function(tn) {
            slug = (tn === leaf ? tn.nodeValue.slice(0, pos)
                                : tn.nodeValue
                   ).replace(wsExp, "") + slug;
            return slug.length >= NCHARS;
        }, true);

        // Trim slug length to just NCHARS.
        slug = slug.slice(slug.length - NCHARS,
                          slug.length);

        // Decrement ordinal by the number of occurrences of this slug up
        // to and including the one ending at leaf/pos.
        iterTextNodes(ancestor, function(tn) {
            for (var i = tn.nodeValue.length; i >= 0; --i) {
                if (endsAt(slug, tn, i))
                    ordinal--;
                if (tn === leaf && i <= pos)
                    return true;
            }
        }, true);
    } else {
        // Collect the NCHARS or more non-space characters starting at
        // leaf/pos.
        iterTextNodes(leaf, function(tn) {
            slug = slug + (tn === leaf ? tn.nodeValue.slice(pos)
                                       : tn.nodeValue
                          ).replace(wsExp, "");
            return slug.length >= NCHARS;
        });

        // Trim slug length to just NCHARS.
        slug = slug.slice(0, NCHARS);

        // Increment ordinal by the number of occurrences of this slug up
        // to and including the one starting at leaf/pos.
        iterTextNodes(ancestor, function(tn) {
            var text = tn.nodeValue;
            for (var i = 0; i <= text.length; ++i) {
                if (startsAt(slug, tn, i))
                    ordinal++;
                if (tn === leaf && i >= pos)
                    return true;
            }
        });
    }

    return new OrdinalSlugLocation({
        node: ancestor,
        ordinal: ordinal,
        slug: slug
    });
};
    
var PreOffsetLocation = shortenTo("POL", Location.derive({

    toLeafPos: function() {
        var offset = this.offset;
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
             this.offset].join(separator) + ")";
    }

}));

PreOffsetLocation.fromString = function(s) {
    var splat = s.split(separator);
    return new PreOffsetLocation({
        node: xpath.toNode(splat[0]),
        offset: +splat[1]
    });
};

PreOffsetLocation.fromLeafPos = function(leaf, pos) {
    if (!isTxt(leaf) || !wsPres(leaf))
        return null;
    var info = {
        node: findAncestor(leaf, isBlock),
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

function affinity(leaf, pos) {
    var text = leaf.nodeValue,
        preText = text.slice(0, pos),
        postText = text.slice(pos);

    if (/^\S/.test(postText))
        return 1;
    
    if (/\S$/.test(preText))
        return -1;

    if (preText && !/\S/.test(preText))
        return 1;

    if (postText && !/\S/.test(postText))
        return -1;

    return 1;
}

function skipForward(leaf, pos, limit) {
    if (!leaf || leaf == limit)
        return null;

    var current = { leaf: leaf, pos: pos };
    if (!needsAdjustment(leaf, pos))
        return current;

    var postText = leaf.nodeValue.slice(pos);
    if (!postText)
        return skipForward(next(leaf), 0, limit) || current;

    pos += /^\s*/.exec(postText)[0].length;
    return skipForward(leaf, pos, limit) || current;
}

function len(leaf) {
    if (isTxt(leaf))
        return leaf.nodeValue.length;
    if (infertile(leaf))
        return 1;
    return 0;
}

function needsAdjustment(leaf, pos) {
    if (!isTxt(leaf) || wsPres(leaf))
        return false;
    var text = leaf.nodeValue,
        preText = text.slice(0, pos),
        postText = text.slice(pos);
    if (/^\S/.test(postText) ||
        /\S$/.test(preText))
        return false;
    return true;
}

function adjustToBoundary(leaf, pos) {
    var current = { leaf: leaf, pos: pos };
    if (!needsAdjustment(leaf, pos))
        return current;

    var pl;
    while (!pos && (pl = prev(leaf)))
        pos = len(leaf = pl);

    var sp = shadowPtEnd(leaf);
    if (order(leaf, pos, sp.leaf, sp.pos) < 0) {
        leaf = sp.leaf;
        pos = sp.pos;
    }

    var limit = next(last(findAncestor(leaf, isBlock)));
    return skipForward(leaf, pos, limit) || current;
}

Location.fromLeafPos = function(leaf, pos) {
    // Internet Explorer will sometimes give a range endpoint whose node
    // is not a leaf, and whose offset is an index into the childNodes
    // array.  Cope with that before proceeding.
    while (leaf.firstChild) {
        leaf = leaf.childNodes[pos];
        pos = 0;
    }

    var adjusted = adjustToBoundary(leaf, pos);
    leaf = adjusted.leaf;
    pos = adjusted.pos;

    return (NodeOffsetLocation.fromLeafPos(leaf, pos) ||
            OrdinalSlugLocation.fromLeafPos(leaf, pos) ||
            PreOffsetLocation.fromLeafPos(leaf, pos));
};

window.Location = Location;
exports.Location = Location;

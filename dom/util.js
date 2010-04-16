var each = require("../util/iter").each,
    camelize = require("../lang/str").camelize;

function firstLeaf(node) {
    while (node && node.firstChild)
        node = node.firstChild;
    return node;
}
exports.firstLeaf = firstLeaf;

function lastLeaf(node) {
    while (node && node.lastChild)
        node = node.lastChild;
    return node;
}
exports.lastLeaf = lastLeaf;

function nextLeaf(node) {
    return node && node != document.body &&
           firstLeaf(node.nextSibling ||
                     nextLeaf(node.parentNode));
}
exports.nextLeaf = nextLeaf;

function prevLeaf(node) {
    return node && node != document.body &&
           lastLeaf(node.previousSibling ||
                    prevLeaf(node.parentNode));
}
exports.prevLeaf = prevLeaf;

function leaves(node, until) {
    until = until || nextLeaf(lastLeaf(node));
    for (var rv = [], leaf = firstLeaf(node);
         leaf && leaf != until;
         leaf = nextLeaf(leaf))
        rv[rv.length] = leaf;
    return rv;
}
exports.leaves = leaves; 

exports.foreshadow = function(node, ancestor) {
    return leaves(node && (ancestor || node.parentNode),
                  firstLeaf(node));
};

function findAncestor(node, test) {
    while (node && !test(node))
        if (node === document.body)
            return null;
        else
            node = node.parentNode;
    return node;
};
exports.findAncestor = findAncestor;

function isBlockDisplay(node) {
    return !isTextNode(node) && /block/i.test(getStyle(node, "display"));
};
exports.isBlockDisplay = isBlockDisplay;

exports.shadowPointFromBegin = function(node) {
    for (var ancestor = findAncestor(node, isBlockDisplay),
             leaf = firstLeaf(ancestor),
             limit = nextLeaf(lastLeaf(ancestor));
         leaf && leaf != limit;
         leaf = nextLeaf(leaf)) {
        if (!isTextNode(leaf) || whiteSpacePreserved(leaf))
            return { leaf: leaf, pos: 0 };
        var text = leaf.nodeValue;
        if (/\S/.test(text))
            return { leaf: leaf, pos: /^\s*/.exec(text)[0].length };
    }
};

exports.shadowPointFromEnd = function(node) {
    for (var ancestor = findAncestor(node, isBlockDisplay),
             leaf = lastLeaf(ancestor),
             limit = prevLeaf(firstLeaf(ancestor));
         leaf && leaf != limit;
         leaf = prevLeaf(leaf)) {
        if (!isTextNode(leaf))
            return { leaf: leaf, pos: 1 };
        var text = leaf.nodeValue;
        if (whiteSpacePreserved(leaf))
            return { leaf: leaf, pos: text.length };
        if (/\S/.test(text))
            return { leaf: leaf, pos: /\s*$/.exec(text).index };
    }
};

function ancestors(node, inclusive) {
    var rv = [];
    if (inclusive)
        rv[rv.length] = node;
    while (node.parentNode && node !== document.body)
        rv[rv.length] = node = node.parentNode;
    return rv;
}
exports.ancestors = ancestors;

function removeNode(node) {
    var parent = node && node.parentNode;
    if (parent)
        parent.removeChild(node);
    return node;
}
exports.removeNode = removeNode;

// Paste together adjacent text nodes:
function normalize(node, recursive) {
    var sib, child = node && node.firstChild;
    while (child) {
        if (child.nodeType == 3)
            while ((sib = child.nextSibling) && sib.nodeType == 3)
                child.nodeValue += removeNode(sib).nodeValue;
        else if (recursive)
            normalize(child, recursive);
        child = child.nextSibling;
    }
}
exports.normalize = normalize;

function whiteSpacePreserved(node) {
    if (isTextNode(node))
        node = node.parentNode;
    var wstyle = getStyle(node, "whiteSpace");
    return (wstyle == "pre" ||
            wstyle == "pre-wrap");
};
exports.whiteSpacePreserved = whiteSpacePreserved;

/* Returns
 *
 *     -1 iff succ precedes pred
 *      0 iff pred and succ are identical
 *      1 iff pred precedes succ
 *
 * according to a PRE-ORDER traversal of the DOM tree.  Note that, if both
 * nodes are leaves, the PRE- modifier is inconsequential.
 */
exports.compareNodes = function(pred, succ) {
    if (pred === succ)
        return 0;
    var pas = ancestors(pred, true),
        sas = ancestors(succ, true);
    while (pas.length && sas.length) {
        var pa = pas.pop(),
            sa = sas.pop();
        if (pa !== sa)
            while ((pa = pa.nextSibling))
                if (pa === sa)
                    return 1;
        if (!pa) return -1;
    }
    // one of the nodes must be a direct ancestor of the other
    return (pas.length > sas.length) ? -1 : 1;
}

var infertile_pattern =
    /^(script|area|base|basefont|br|col|frame|hr|img|input|isindex|link|meta|param)$/i,
    infertile = exports.infertile = function(node) {
        return !!(node && infertile_pattern.test(node.nodeName));
    };
    
exports.canParent = function(parent, child) {
    if (infertile(parent))
        return false;

    var pn = parent.nodeName,
        cn = child.nodeName;

    // TODO Make these cases more exhaustive.
    
    if (/^(table|tbody|thead)$/i.test(pn) &&
        !/^(th|tr)$/i.test(cn))
        return false;

    if (/^tr$/i.test(pn) &&
        !/^td$/i.test(cn))
        return false;

    return true;
};

exports.ELEMENT_NODE = 1;
exports.ATTRIBUTE_NODE = 2;
exports.TEXT_NODE = 3;
exports.DOCUMENT_NODE = 9;

exports.isElementNode = function(node) {
    return !!(node && node.nodeType == 1)
};
function isTextNode(node) {
    return !!(node && node.nodeType == 3);
};
exports.isTextNode = isTextNode;
exports.isDocumentNode = function(node) {
    return !!(node && node.nodeType == 9);
};

var nativeScrollTo = window.scrollTo,
    offsetOf = exports.offsetOf = function(node) {
        var d = { x: 0, y: 0 };
        while (node && !node.offsetParent)
            node = node.parentNode;
        while (node) {
            d.x += node.offsetLeft || 0;
            d.y += node.offsetTop || 0;
            node = node.offsetParent;
        }
        return d;
    };
exports.scrollTo = function(node, padding_opt) {
    padding_opt = -(padding_opt || 0);
    var offset = offsetOf(node);
    nativeScrollTo(offset.x + padding_opt,
                   offset.y + padding_opt);
};
exports.scrollToY = function(node, padding_opt) {
    nativeScrollTo(0, offsetOf(node).y - (padding_opt || 0));
};

// From prototype.js
function getStyle(node, style) {
    if (isTextNode(node))
        return getStyle(node.parentNode, style);
    style = style == 'float' ? 'cssFloat' : camelize(style);
    var value = (node.currentStyle || node.style)[style];
    if (!value || value == 'auto') {
        var css = document.defaultView.getComputedStyle(node, null);
        value = css ? css[style] : null;
    }
    if (style == 'opacity')
        return value ? parseFloat(value) : 1.0;
    return value == 'auto' ? null : value;
}
exports.getStyle = getStyle;

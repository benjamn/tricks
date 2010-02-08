var Base = require("../lang/class").Base,
    isFun = require("../lang/fun").isFunction,
    dom = require("./util"),
    succ = dom.successor,
    pred = dom.predecessor,
    fore = dom.foreshadow,
    first = dom.firstLeaf,
    isTxt = dom.isTextNode,
    infertile = dom.infertile;
    
function len(leaf) {
    if (isTxt(leaf))
        return leaf.nodeValue.length;
    return infertile(leaf) ? 1 : 0;
}

function sum(arr, fn) {
    var result = 0, len = arr.length;
    for (var i = 0; i < len; ++i)
        result += fn(arr[i]);
    return result;
}

function testify(test) {
    if (isFun(test))
        return test;
    return function(x) {
        return test === x;
    };
}

var Location = Base.derive({
    
    /* Initialization example:
     * var loc1 = new Location({ node: $$('li')[1], offset: 3 });
     * var loc2 = new Location(loc1);
     */

    lift: function(test) {
        test = testify(test);
        var node = this.node, offset = this.offset;
        while (node.parentNode &&
               node != document.body &&
               !test(node))
        {
            offset += sum(fore(node), len);
            node = node.parentNode;
        }
        return new Location({ node: node, offset: offset });
    },

    ground: function() {
        var offset = this.offset,
            leaf = first(this.node);
        while (leaf) {
            var loss = len(leaf);
            if (loss > offset) break;
            else offset -= loss;
            leaf = succ(leaf);
        }
        return new Location({ node: leaf, offset: offset });
    },

    cut: function() {
        var loc = this.ground(),
            node = loc.node,
            offset = loc.offset;
        if (offset == 0)
            return [pred(node), node];
        if (offset >= len(node))
            return [node, succ(node)];
        if (isTxt(node)) {
            var text = node.nodeValue,
                preText = text.slice(0, offset),
                preNode = document.createTextNode(preText);
            node.parentNode.insertBefore(preNode, node);
            node.nodeValue = text.slice(offset);
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

var escRE = require("../lang/str").escapeRegExp,
    dom = require("./util"),
    first = dom.firstLeaf,
    next = dom.nextLeaf,
    isTxt = dom.isTextNode,
    Location = require("./location").Location,
    Selection = require("./selection").Selection,
    xpath = require("./xpath");
    
function findNth(node, str, n) {
    var exp = new RegExp(escRE(str), "gm");
    for (var leaf = first(node); leaf; leaf = next(leaf)) {
        if (!isTxt(leaf))
            continue;
        exp.lastIndex = 0;
        var match,
            text = leaf.nodeValue;
        while ((match = exp.exec(text)))
            if (!n--)
                return { leaf: leaf, pos: match.index };
    }
}

function testOneLocConv(str, n, path, offset) {
    var leafPos, loc, back;
    this.assertTrue(!!(leafPos = findNth(document.body, str, n)));
    this.assertTrue(!!(loc = Location.fromLeafPos(leafPos.leaf,
                                                  leafPos.pos)));
    this.assertIdentical(xpath.toNode(path), loc.node);
    this.assertEqual(loc.offset, offset);
    back = loc.toLeafPos();
    this.assertEqual(leafPos.leaf, back.leaf);
    this.assertEqual(leafPos.pos, back.pos);
}

exports.testLocationConversion = function() {
    testOneLocConv.call(this, "to be", 0, "#ancestor/li", 0);
    testOneLocConv.call(this, "to be", 1, "#ancestor/li[1]", 4);
    testOneLocConv.call(this, "bold", 0, "#ancestor/div[1]/p[1]", 34);
    testOneLocConv.call(this, "inside span with leading", 0, "#pspan", 29);
    testOneLocConv.call(this, "leading", 0, "#pspan", 29+17);
    testOneLocConv.call(this, "asdf", 0, "#asdiv", 0);
    testOneLocConv.call(this, "fdsa", 0, "#asdiv", 5);
    testOneLocConv.call(this, "dsfa", 0, "#asdiv", 10);
    testOneLocConv.call(this, "div, span", 0, "#lastdiv", 7);
    testOneLocConv.call(this, "after div", 0, "body", 452);
};

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

var isIE = "\v" == "v";
function ie(n) {
    return isIE ? n : 0;
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
    testOneLocConv.call(this, "at the very top", 0, "body", 0 + ie(0));
    testOneLocConv.call(this, "just below title", 0, "body", 43 + ie(0));
    testOneLocConv.call(this, "before parent_div", 0, "body", 328 + ie(2));
    testOneLocConv.call(this, "just before p", 0, "body", 396 + ie(2));
    testOneLocConv.call(this, "outside div", 0, "body", 489 + ie(2));
};

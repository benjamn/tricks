var infertile = require("./util").infertile;

var safeComponent = exports.safeComponent = function(node) {
    return (node &&
            !infertile(node) && // Huh?
            // TODO Expand this list of unsafe node names.
            !/^(thead|tbody)$/i.test(node.nodeName));
}

exports.toXPath = function(node) {
    var components = [],
        ancestor;

    while (node && node != document.body) {
        if (document.getElementById(node.id || "") === node) {
            components[components.length] = "_" + node.id;
            break;
        }

        ancestor = node.parentNode;
        while (ancestor && !safeComponent(ancestor))
            ancestor = ancestor.parentNode;
        ancestor = ancestor || document.body;

        var nodeName = node.nodeName.toLowerCase(),
            sib, sibs = ancestor.getElementsByTagName(nodeName);

        for (var i = 0; sib = sibs[i]; ++i)
            if (sib === node) {
                components[components.length] =
                    nodeName + (i ? "[" + i + "]" : "");
                break;
            }

        node = ancestor;
    }

    components.reverse();
    return components.join("/");
};

exports.toNode = function(xpath) {
    var component, components = xpath.split("/"),
        node = document,
        match;
    while (node && (component = components.shift())) {
        if ((match = /^_(.*)$/.exec(component)))
            node = document.getElementById(match[1]);
        else if ((match = /^(\w+)(?:\[(\d+)\])?$/.exec(component)))
            node = node.getElementsByTagName(match[1])[match[2] || 0];
        else throw component;
    }
    return node;
};

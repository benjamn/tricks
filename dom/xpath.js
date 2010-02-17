exports.toXPath = function(node) {
    var components = [];
    while (node && node != document.body) {
        if (document.getElementById(node.id || "") === node) {
            components[components.length] = "_" + node.id;
            break;
        }
        var nodeName = node.nodeName.toLowerCase(),
            sibs = node.parentNode.getElementsByTagName(nodeName);
        for (var i = 0, sib; sib = sibs[i]; ++i)
            if (sib === node) {
                components[components.length] = nodeName + (i ? "[" + i + "]" : "");
                break;
            }
        node = node.parentNode;
    }
    components.reverse();
    return components.join("/");
};

exports.toNode = function(xpath) {
    var component, components = xpath.split("/"),
        node = document.body,
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

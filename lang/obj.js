var hasOwnProperty = require("./hasOwnProperty").hasOwnProperty,
    natives = ["toString",
               "valueOf",
               "constructor",
               "propertyIsEnumerable",
               "isPrototypeOf",
               "hasOwnProperty",
               "toLocaleString"];

function keys(obj) {
    var seen = {},
        k, ks = [],
        n, i = 0;
    for (k in obj)
        if (!hasOwnProperty(seen, k))
            seen[k] = obj[ks[ks.length] = k];
    while ((n = natives[i++]))
        // Not strictly correct when obj[n] === Object.prototype[n] and n
        // is defined in obj's prototype chain before Object.prototype.
        if (obj[n] !== seen[n] ||
            hasOwnProperty(obj, n))
            ks[ks.length] = n;
    return ks;
}
exports.keys = keys;

var empty = function() {};
exports.clone = function(obj) {
    empty.prototype = obj || null;
    return new empty;
};

exports.foreach = function(obj, fn) {
    each(keys(obj), function(k) { fn(k, obj[k]) });
    return obj;
};

exports.extend = function(dst, src) {
    var k, ks = keys(src), dv, sv;
    for (var i = 0; k = ks[i]; i++)
        if ((dv = dst[k]) !==
            (sv = src[k]))
            try { dst[k] = sv }
            catch (_) {}
    return dst;
};

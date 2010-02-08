var natives = ['toString',
               'valueOf',
               'constructor',
               'propertyIsEnumerable',
               'isPrototypeOf',
               'hasOwnProperty',
               'toLocaleString'],
    op = Object.prototype,
    hasOwnProperty = op.hasOwnProperty || function(name) {
        var hasOwn, proto = this.__proto__;
        if (proto) {
            this.__proto__ = null;
            hasOwn = name in this;
            this.__proto__ = proto;
        } else hasOwn = name in this;
        return hasOwn;
    };

// No pollution because browsers requiring this fix ignore user-defined
// Object.prototype.hasOwnProperty values.
op.hasOwnProperty = hasOwnProperty;

function keys(obj, includeNatives) {
    var seen = {}, ks = [];
    if (typeof obj == 'object') {
        for (var k in obj)
            if (!seen.hasOwnProperty(k)) {
                seen[k] = obj[k];
                ks[ks.length] = k;
            }
        if (includeNatives)
            for (var n, i = 0; n = natives[i]; i++)
                if (obj[n] !== seen[n])
                    ks[ks.length] = n;
    }
    return ks;
}
exports.keys = keys;

var empty = function() {};
exports.clone = function(obj) {
    empty.prototype = obj || null;
    return new empty;
};

exports.foreach = function(obj, fn, includeNatives) {
    each(keys(obj, includeNatives),
         function(k) { fn(k, obj[k]) });
    return obj;
};

exports.extend = function(dst, src, includeNatives) {
    var k, ks = keys(src, includeNatives), dv, sv;
    for (var i = 0; k = ks[i]; i++)
        if ((dv = dst[k]) !==
            (sv = src[k]))
            try { dst[k] = sv }
            catch (_) {}
    return dst;
};

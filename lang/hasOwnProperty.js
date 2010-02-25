var op = Object.prototype,
    hasOwnProperty = op.hasOwnProperty || function(name) {
        var hasOwn, proto = this.__proto__;
        if (proto) {
            this.__proto__ = null;
            hasOwn = name in this;
            this.__proto__ = proto;
        } else hasOwn = name in this;
        return hasOwn;
    };

exports.hasOwnProperty = function(obj, name) {
    try { return hasOwnProperty.call(obj, name) }
    catch (x) { return false }
};

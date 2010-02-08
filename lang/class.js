var fun = require("./fun"),
    iter = require("../util/iter"),
    obj = require("../lang/obj"),
    isFun = fun.isFunction,
    each = iter.each,
    keys = obj.keys,
    extend = obj.extend,
    clone = obj.clone;

function Class(arg) {
    var proto = clone(arg), i = 1;
    while ((arg = arguments[i++]))
        extend(proto, arg);
    return proto.constructor = extend(function() {
        this.initialize.apply(this, arguments);
    }, { prototype: proto, derive: derive });
}

function derive() {
    var args = [this.prototype].concat([].slice.call(arguments));
    return inherit(Class.apply(null, args), this);
}

function inherit(child, parent) {
    var cp =  child.prototype,
        pp = parent.prototype;
    each(keys(cp), function(k) {
        var cv = cp[k], pv = pp[k];
        if (cv !== pv && isFun(cv))
            cv._super = pv;
    });
    return child;
}

exports.Base = Class({
    initialize: function(props) { extend(this, props) },
    sup: function(argobj, args) {
        return argobj.callee._super.apply(this, args || argobj);
    }
});

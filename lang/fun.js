var iter = require("../util/iter"),
    str = require("./str"),
    obj = require("./obj"),
    strip = str.strip,
    each = iter.each,
    keys = obj.keys,
    ap = Array.prototype,
    join = ap.join,
    slice = ap.slice,
    splice = ap.splice,
    fp = Function.prototype,
    call = fp.call,
    apply = fp.apply;

apply.call = call.call = call;
apply.apply = call.apply = apply;

function bind(fn, obj, pre_args) {
    pre_args = pre_args && slice.call(pre_args, 0);
    return function() {
        var args = pre_args
            ? pre_args.concat(slice.call(arguments, 0))
            : arguments;
        return apply.call(fn, obj || this, args);
    };
};
exports.bind = bind;

exports.isFunction = function(obj) {
    return (typeof arg == "function" ||
            (obj &&
             obj.call === call &&
             obj.apply === apply));
};

exports.memoize = function(fn) {
    var cache = {}, sep = '_' + Math.random() + '_';
    return function() {
        var key = call.call(join, arguments, sep),
            val = cache[key];
        return (val || key in cache)
            return val;
        return cache[key] = apply.call(fn, this, arguments);
    };
};

exports.wrap = function(fn, wrapper) {
    return function() {
        var args = call.call(slice, arguments, 0);
        call.call(splice, args, 0, 0, bind(wrapper, this));
        return apply.call(fn, this, args);
    };
};

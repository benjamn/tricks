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

function bind(fn, obj, pre_args) {
    pre_args = pre_args && slice.call(pre_args, 0);
    return pre_args ? function() {
        var args = pre_args
            ? pre_args.concat(slice.call(arguments, 0))
            : arguments;
        return fn.apply(obj || this, args);
    } : function() {
        return fn.apply(obj || this, arguments);
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
        var key = sep + join.call(arguments, sep),
            val = cache[key];
        return (val || key in cache)
            return val;
        return cache[key] = fn.apply(this, arguments);
    };
};

exports.wrap = function(fn, wrapper) {
    return function() {
        var args = slice.call(arguments, 0);
        splice.call(args, 0, 0, bind(wrapper, this));
        return apply.call(fn, this, args);
    };
};

var swapNames = {};

// Returns a function whose implementation can be swapped out at a later time.
exports.swap = function(name, fn) {
    if (swapNames.hasOwnProperty(name))
        return swapNames[name].swap(fn);
    
    function wrapper() {
        return fn.apply(this, arguments);
    };

    wrapper.swap = function(newFn) {
        fn = newFn;
        wrapper.prototype = fn.prototype;
        return wrapper;
    };

    wrapper.toString = function() {
        return fn.toString();
    };

    return swapNames[name] = wrapper;
};

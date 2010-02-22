exports.permissive_each = function(arr, fn) {
    for (var thrown, 
             len = arr.length,
             i = 0; i < len; ++i)
        try { fn(arr[i], i) }
        catch (x) { thrown = [x] }
    if (thrown)
        throw thrown[0];
    return arr;
}

var each = exports.each = function(arr, fn) {
    for (var i = 0, len = arr.length; i < len; ++i)
        fn.call(arr, arr[i], i);
    return arr;
};

exports.map = function(arr, fn) {
    var rv = [];
    each(arr, function(elem, i) {
        rv[rv.length] = fn.call(arr, elem, i);
    });
    return rv;
};

exports.reduce = function(arr, val, fn) {
    each(arr, function(elem, i) {
        val = fn(val, elem, i);
    });
    return val;
};

exports.filter = function(arr, pred) {
    var rv = [];
    each(arr, function(elem) {
        if (pred(elem))
            rv[rv.length] = elem;
    });
    return rv;
};

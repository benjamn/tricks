function each(arr, fn) {
    for (var thrown, 
             len = arr.length,
             i = 0; i < len; ++i)
        try { fn(arr[i], i) }
        catch (x) { thrown = [x] }
    if (thrown)
        throw thrown[0];
    return arr;
}
exports.each = each;

exports.map = function(arr, fn) {
    var rv = [];
    each(arr, function(elem, i) {
        rv[rv.length] = fn(elem, i);
    });
    return rv;
};

exports.reduce = function(arr, val, fn) {
    each(arr, function(elem, i) {
        val = fn(val, elem, i);
    });
    return val;
};

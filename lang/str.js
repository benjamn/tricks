var excess_pattern = /^\s+|\s+$/g,
    regexp_pattern = /([.*+?^=!:${}()|[\]\/\\])/g,
    camel_pattern = /-(\w)/g;

exports.escapeRegExp = function(str) {
    return (str+"").replace(regexp_pattern, "\\$1");
};

exports.strip = function(str) {
    return (str+"").replace(excess_pattern, "");
};

function hump(_, c) { return c.toUpperCase() }
exports.camelize = function(str) {
    return str.replace(camel_pattern, hump);
};

exports.countOccurrencesAllowingOverlap = function(str, sub) {
    var last = -1,
        count = 0;
    while ((last = str.indexOf(sub, last + 1)) > -1)
        count += 1;
    return count;
};

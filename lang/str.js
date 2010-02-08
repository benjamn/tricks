var excess_pattern = /^\s+|\s+$/g,
    regexp_pattern = /([.*+?^=!:${}()|[\]\/\\])/g;
exports.escapeRegExp = function(str) {
    return (str+"").replace(regexp_pattern, "\\$1");
};
exports.strip = function(str) {
    return (str+"").replace(excess_pattern, "");
};

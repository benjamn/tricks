// Ensure Object.prototype.hasOwnProperty.
require("../lang/obj");

var decompile = Function.prototype.toString;

exports.Set = function() {

    var obj_tag = "<aegis/util/set " + Math.random() + ">";
        elems_by_type = {};

    this.add = function(elem) {
        if (this.contains(elem))
            return false;
        var type = typeof elem,
            same_type = elems_by_type[type];
        switch (type) {
        case "object":
            while (same_type[elem[obj_tag]] !== elem)
                if (!((elem[obj_tag] = Math.random()) in same_type))
                    same_type[elem[obj_tag]] = elem;
            break;
        case "function":
            var str = decompile.call(elem),
                fns = (same_type[str] || (same_type[str] = []));
            fns[fns.length] = elem;
            break;
        default:
            same_type[elem] = elem;
        }
        return true;
    };

    this.contains = function(elem) {
        var type = typeof elem,
            same_type = elems_by_type[type];
        if (!same_type)
            return false;
        switch (type) {
        case "object":
            return same_type[elem[obj_tag]] === elem;
        case "function":
            var fns = same_type[decompile.call(elem)];
            if (!fns)
                return false;
            for (var i = fns.length - 1; i >= 0; --i)
                if (fns[i] === elem)
                    return true;
            return false;
        default:
            return same_type.hasOwnProperty(elem);
        }
    };

    this.remove = function(elem) {
        if (!this.contains(elem))
            return false;
        var type = typeof elem,
            same_type = elems_by_type[type];
        switch (type) {
        case "object":
            var key = elem[obj_tag];
            if (same_type[key] === elem) {
                delete same_type[key];
                delete elem[obj_tag];
            }
            break;
        case "function":
            var str = decompile.call(elem),
                fn, fns = same_type[str],
                new_fns = same_type[str] = [];
            while (fns.length)
                if ((fn = fns.pop()) !== elem)
                    new_fns[new_fns.length] = fn;
            break;
        default:
            delete same_type[elem];
        }
        return true;
    };

    this.each = function(callback) {
        for (var type in elems_by_type) {
            var same_type = elems_by_type[type];
            switch (type) {
            case "object":
                for (var key in same_type)
                    callback(same_type[key]);
                break;
            case "function":
                for (var str in same_type)
                    for (var fns = same_type[str],
                             i = fns.length - 1;
                         i >= 0; --i)
                        callback(fns[i]);
                break;
            default:
                for (var str in same_type)
                    callback(same_type[str]);
                break;
            }
        }
    };

};

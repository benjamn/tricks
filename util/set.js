// Ensure Object.prototype.hasOwnProperty.
require("../lang/hasOwnProperty");

function isTaggable(obj, tag) {
    var orig = obj[tag],
        needToReplace = obj.hasOwnProperty(tag),
        temp = {};
    try {
        obj[tag] = temp;
        return obj[tag] === temp;
    } catch (x) {
        return false;
    } finally {
        if (needToReplace)
            obj[tag] = orig;
        else delete obj[tag];
    }
}

function TaggingSet() {

    var tag = "<aegis/util/set " + Math.random() + ">",
        tagged = {};

    this.add = function(obj) {
        if (!isTaggable(obj, tag) ||
            this.contains(obj))
            return false;
        while (tagged[obj[tag]] !== obj)
            if (!((obj[tag] = Math.random().toString()) in tagged))
                tagged[obj[tag]] = obj;
        return true;
    };

    this.contains = function(obj) {
        try { if (!(tag in obj)) throw obj }
        catch (x) { return false }
        return tagged[obj[tag]] === obj;
    };

    this.remove = function(obj) {
        if (!this.contains(obj))
            return false;
        delete tagged[obj[tag]];
        delete obj[tag];
        return true;
    };

    this.each = function(callback, context) {
        for (var ref in tagged)
            if (tagged[ref][tag] === ref)
                callback.call(context, tagged[ref]);
    };

}

function OneToStringSet() {

    var elems = {};

    this.add = function(elem) {
        if (this.contains(elem))
            return false;
        elems[elem] = elem;
        return true;
    };

    this.contains = function(elem) {
        return elems.hasOwnProperty(elem);
    };

    this.remove = function(elem) {
        if (!this.contains(elem))
            return false;
        delete elems[elem];
        return true;
    };

    this.each = function(callback, context) {
        for (var str in elems)
            callback.call(context, elems[str]);
    };

}

function ManyToStringSet() {

    var lists = {};

    this.add = function(elem) {
        if (this.contains(elem))
            return false;
        var str = elem + "",
            list = (lists[str] || (lists[str] = []));
        list[list.length] = elem;
        return true;
    };

    this.contains = function(elem) {
        var str = elem + "",
            list = lists[str];
        if (!list)
            return false;
        for (var i = list.length - 1; i >= 0; --i)
            if (list[i] === elem)
                return true;
        return false;
    };

    this.remove = function(elem) {
        if (!this.contains(elem))
            return false;
        var str = elem + "",
            other, list = lists[str],
            new_list = lists[str] = [];
        while (list.length)
            if ((other = list.pop()) !== elem)
                new_list[new_list.length] = other;
        return true;
    };

    this.each = function(callback, context) {
        for (var str in lists)
            for (var list = lists[str],
                     i = list.length - 1;
                 i >= 0; --i)
                callback.call(context, list[i]);
    };

}

exports.Set = function() {

    var subsets = {
        "object": TaggingSet,
        "function": ManyToStringSet,
        "string": OneToStringSet,
        "number": OneToStringSet,
        "undefined": OneToStringSet,
        "boolean": OneToStringSet
    };

    function getSubset(elem) {
        var type = typeof elem,
            subset = subsets[type];
        if (typeof subset == "function")
            subsets[type] = new subset;
        return subsets[type];
    }

    this.add = function(elem) {
        return getSubset(elem).add(elem);
    };

    this.contains = function(elem) {
        return getSubset(elem).contains(elem);
    };

    this.remove = function(elem) {
        return getSubset(elem).remove(elem);
    };

    this.each = function(callback, context) {
        for (var type in subsets)
            if (typeof subsets[type] == "object")
                subsets[type].each(callback, context);
    };

    // TODO Track size intelligently.
    this.size = function() {
        var count = 0;
        this.each(function() { count += 1 });
        return count;
    };

};

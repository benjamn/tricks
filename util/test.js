var Set = require("./set").Set,
    s1 = new Set;

s1.add("oyez");
s1.add("asdf");
s1.add({
    toString: function() {
        return "oyez";
    }
});

s1.each(function(elem) {
    alert(elem);
});

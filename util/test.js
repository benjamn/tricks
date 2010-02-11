var Evidence = require("../test/evidence").Evidence,
    whenReady = require("../dom/ready").whenReady,
    Set = require("./set").Set;

Evidence.TestCase.extend({

    testObjMistakenForString: function() {
        var s1 = new Set;
        this.assertTrue(s1.add("oyez"));
        this.assertTrue(s1.add("asdf"));
        this.assertTrue(s1.add({
            toString: function() {
                return "oyez";
            }
        }));
        var count = 0;
        s1.each(function(elem) { count += 1 });
        this.assertEqual(count, 3);
    },

    testCommonAncestor: function() {
        var ancestors = new Set,
            desc1 = document.getElementById("desc1"),
            desc2 = document.getElementById("desc2");
        do ancestors.add(desc1);
        while ((desc1 = desc1.parentNode));
        while (desc2 && !ancestors.contains(desc2))
            desc2 = desc2.parentNode;
        this.assertTrue(!!desc2);
        this.assertEqual(desc2.id, "ancestor");
    },

    testIdenticalFunctions: function() {
        var set = new Set;
        function makeFn(val) {
            return function() {
                return val;
            };
        }
        var fn1 = makeFn(1),
            fn2 = makeFn(2),
            sum = 0;
        this.assertEqual(fn1.toString(),
                         fn2.toString());
        this.assertTrue(set.add(fn1));
        this.assertTrue(set.add(fn2));
        this.assertFalse(set.add(fn1));
        this.assertEqual(set.size(), 2);
        set.each(function(fn) { sum += fn() });
        this.assertEqual(sum, 3);
    },

    testTextNode: function() {
        var set = new Set,
            textNode = document.createTextNode("oyez");
        this.assertTrue(set.add(textNode));
        this.assertEqual(set.size(), 1);
        set.each(function(node) {
            this.assertEqual(node.nodeValue, "oyez");
        }, this);
        this.assertTrue(set.remove(textNode));
        this.assertEqual(set.size(), 0);
    }

});

whenReady(function() {
    Evidence.AutoRunner.run();
});

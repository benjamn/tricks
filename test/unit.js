var Evidence = require("./evidence").Evidence;

Evidence.TestCase.extend("Sanity", {
    setUp: function() {},
    testEqual: function() {
        this.assertEqual(1, 1);
    },
    testBogus: function() {
        this.assertEqual(2, 3);
    }
});

Evidence.AutoRunner.run();

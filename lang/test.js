var Evidence = require("../test/evidence").Evidence,
    whenReady = require("../dom/ready").whenReady,
    Base = require("./class").Base;

Evidence.TestCase.extend({

    testClassWithToStringMethod: function() {
        var Num = Base.derive({
            initialize: function(val) {
                this.val = val;
            },
            toString: function() {
                return this.val + "";
            }
        });
        Num.fromString = function(s) {
            return new Num(+s);
        };
        this.assertEqual(Num.fromString(new Num(2).toString()).val, 2);
        this.assertEqual(Num.fromString(new Num(3) + "").val, 3);
    }

});
    
whenReady(function() {
    Evidence.AutoRunner.run();
});

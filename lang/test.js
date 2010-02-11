var Evidence = require("../test/evidence").Evidence,
    Base = require("./class").Base;

Evidence({

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

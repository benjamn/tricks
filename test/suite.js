// TODO Drop the dependency on evidence.js and move to a more
// CommonJS-compliant test harness.

var Evidence = require("./evidence").Evidence;

exports.testDom = require("../dom/test");
exports.testLang = require("../lang/test");
exports.testUtil = require("../util/test");

Evidence("dom", exports.testDom);
Evidence("lang", exports.testLang);
Evidence("util", exports.testUtil);

Evidence.AutoRunner.run();

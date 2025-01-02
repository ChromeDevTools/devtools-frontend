"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.matches = void 0;
var match_1 = require("../match");
function matches(modifier) {
    return function (node, selector, ancestry) {
        return selector.selectors[modifier](function (childSelector) {
            return (0, match_1.findMatches)(node, childSelector, ancestry);
        });
    };
}
exports.matches = matches;
//# sourceMappingURL=matches.js.map
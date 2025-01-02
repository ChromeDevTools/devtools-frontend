"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.not = void 0;
var match_1 = require("../match");
function not(node, selector, ancestry) {
    return !selector.selectors.some(function (childSelector) {
        return (0, match_1.findMatches)(node, childSelector, ancestry);
    });
}
exports.not = not;
//# sourceMappingURL=not.js.map
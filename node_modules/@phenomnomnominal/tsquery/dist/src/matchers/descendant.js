"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.descendant = void 0;
var match_1 = require("../match");
function descendant(node, selector, ancestry) {
    if ((0, match_1.findMatches)(node, selector.right, ancestry)) {
        return ancestry.some(function (ancestor, index) {
            return (0, match_1.findMatches)(ancestor, selector.left, ancestry.slice(index + 1));
        });
    }
    return false;
}
exports.descendant = descendant;
//# sourceMappingURL=descendant.js.map
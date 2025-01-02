"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.child = void 0;
var match_1 = require("../match");
function child(node, selector, ancestry) {
    if ((0, match_1.findMatches)(node, selector.right, ancestry)) {
        return (0, match_1.findMatches)(ancestry[0], selector.left, ancestry.slice(1));
    }
    return false;
}
exports.child = child;
//# sourceMappingURL=child.js.map
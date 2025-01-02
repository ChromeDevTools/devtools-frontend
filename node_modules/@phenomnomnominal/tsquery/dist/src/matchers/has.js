"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.has = void 0;
var match_1 = require("../match");
var traverse_1 = require("../traverse");
function has(node, selector, _, options) {
    var collector = [];
    selector.selectors.forEach(function (childSelector) {
        (0, traverse_1.traverseChildren)(node, function (childNode, ancestry) {
            if ((0, match_1.findMatches)(childNode, childSelector, ancestry)) {
                collector.push(childNode);
            }
        }, options);
    });
    return collector.length > 0;
}
exports.has = has;
//# sourceMappingURL=has.js.map
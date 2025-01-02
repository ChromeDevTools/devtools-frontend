"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.replace = void 0;
// Dependencies:
var query_1 = require("./query");
function replace(source, selector, stringTransformer, options) {
    if (options === void 0) { options = {}; }
    var matches = (0, query_1.query)(source, selector, options);
    var replacements = matches.map(function (node) { return stringTransformer(node); });
    var reversedMatches = matches.reverse();
    var reversedReplacements = replacements.reverse();
    var result = source;
    reversedReplacements.forEach(function (replacement, index) {
        if (replacement != null) {
            var match = reversedMatches[index];
            result = "".concat(result.substring(0, match.getStart())).concat(replacement).concat(result.substring(match.getEnd()));
        }
    });
    return result;
}
exports.replace = replace;
//# sourceMappingURL=replace.js.map
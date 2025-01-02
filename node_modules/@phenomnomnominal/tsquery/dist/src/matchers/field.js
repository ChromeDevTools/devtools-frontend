"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.field = void 0;
var utils_1 = require("../utils");
function field(node, selector, ancestry) {
    var path = selector.name.split('.');
    var ancestor = ancestry[path.length - 1];
    return (0, utils_1.inPath)(node, ancestor, path);
}
exports.field = field;
//# sourceMappingURL=field.js.map
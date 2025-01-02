"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.identifier = void 0;
var syntax_kind_1 = require("../syntax-kind");
function identifier(node, selector) {
    return (0, syntax_kind_1.syntaxKindName)(node.kind).toLowerCase() === selector.value.toLowerCase();
}
exports.identifier = identifier;
//# sourceMappingURL=identifier.js.map
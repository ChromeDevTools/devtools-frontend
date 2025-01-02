"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.query = void 0;
var ast_1 = require("./ast");
var match_1 = require("./match");
var parse_1 = require("./parse");
function query(ast, selector, options) {
    if (options === void 0) { options = {}; }
    if (typeof ast === 'string') {
        ast = (0, ast_1.createAST)(ast);
    }
    return (0, match_1.match)(ast, (0, parse_1.parse)(selector), options);
}
exports.query = query;
//# sourceMappingURL=query.js.map
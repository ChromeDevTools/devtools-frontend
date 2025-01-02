"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parse = void 0;
// Dependencies:
var esquery = require("esquery");
var typescript_1 = require("typescript");
// Constants:
var IDENTIFIER_QUERY = 'identifier';
function parse(selector) {
    var cleanSelector = stripComments(stripNewLines(selector));
    return validateParse(esquery.parse(cleanSelector));
}
exports.parse = parse;
function stripComments(selector) {
    return selector.replace(/\/\*[\w\W]*\*\//g, '');
}
function stripNewLines(selector) {
    return selector.replace(/\n/g, '');
}
function validateParse(selector) {
    if (!selector) {
        return selector;
    }
    if (selector.selectors) {
        selector.selectors.map(validateParse);
    }
    if (selector.left) {
        validateParse(selector.left);
    }
    if (selector.right) {
        validateParse(selector.right);
    }
    if (selector.type === IDENTIFIER_QUERY) {
        if (typescript_1.SyntaxKind[selector.value] == null) {
            throw SyntaxError("\"".concat(selector.value, "\" is not a valid TypeScript Node kind."));
        }
    }
    return selector;
}
//# sourceMappingURL=parse.js.map
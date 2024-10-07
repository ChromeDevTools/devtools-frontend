"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.definitionForHtmlNode = void 0;
var ast_util_js_1 = require("../../../util/ast-util.js");
var range_util_js_1 = require("../../../util/range-util.js");
function definitionForHtmlNode(htmlNode, _a) {
    var htmlStore = _a.htmlStore, ts = _a.ts;
    var tag = htmlStore.getHtmlTag(htmlNode);
    if (tag == null || tag.declaration == null)
        return undefined;
    var node = tag.declaration.node;
    return {
        fromRange: (0, range_util_js_1.rangeFromHtmlNode)(htmlNode),
        targets: [
            {
                kind: "node",
                node: (0, ast_util_js_1.getNodeIdentifier)(node, ts) || node
            }
        ]
    };
}
exports.definitionForHtmlNode = definitionForHtmlNode;

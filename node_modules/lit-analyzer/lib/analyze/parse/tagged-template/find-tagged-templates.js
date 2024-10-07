"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.visitTaggedTemplateNodes = exports.findTaggedTemplates = void 0;
var ts_module_js_1 = require("../../ts-module.js");
var ast_util_js_1 = require("../../util/ast-util.js");
function findTaggedTemplates(sourceFile, templateTags, position) {
    if (position != null) {
        var token = (0, ast_util_js_1.getNodeAtPosition)(sourceFile, position);
        var node = (0, ast_util_js_1.findParent)(token, ts_module_js_1.tsModule.ts.isTaggedTemplateExpression);
        if (node != null && ts_module_js_1.tsModule.ts.isTaggedTemplateExpression(node)) {
            if (templateTags.includes(node.tag.getText())) {
                return node;
            }
        }
        return undefined;
    }
    else {
        var taggedTemplates_1 = [];
        visitTaggedTemplateNodes(sourceFile, {
            shouldCheckTemplateTag: function (templateTag) {
                return templateTags.includes(templateTag);
            },
            emitTaggedTemplateNode: function (node) {
                taggedTemplates_1.push(node);
            }
        });
        return taggedTemplates_1;
    }
}
exports.findTaggedTemplates = findTaggedTemplates;
function visitTaggedTemplateNodes(astNode, context) {
    var newContext = __assign({}, context);
    if (ts_module_js_1.tsModule.ts.isTaggedTemplateExpression(astNode) && context.shouldCheckTemplateTag(astNode.tag.getText())) {
        // Only visit the template expression if the leading comments does not include the ts-ignore flag.
        //if (!leadingCommentsIncludes(astNode.getSourceFile().getText(), astNode.getFullStart(), TS_IGNORE_FLAG)) {
        newContext.parent = astNode;
        context.emitTaggedTemplateNode(astNode);
    }
    astNode.forEachChild(function (child) { return visitTaggedTemplateNodes(child, context); });
}
exports.visitTaggedTemplateNodes = visitTaggedTemplateNodes;

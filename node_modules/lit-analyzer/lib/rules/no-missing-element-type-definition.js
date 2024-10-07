"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var ast_util_js_1 = require("../analyze/util/ast-util.js");
var iterable_util_js_1 = require("../analyze/util/iterable-util.js");
var range_util_js_1 = require("../analyze/util/range-util.js");
/**
 * This rule validates that legacy Polymer attribute bindings are not used.
 */
var rule = {
    id: "no-missing-element-type-definition",
    meta: {
        priority: "low"
    },
    visitComponentDefinition: function (definition, context) {
        // Don't run this rule on non-typescript files and declaration files
        if (context.file.isDeclarationFile || !context.file.fileName.endsWith(".ts")) {
            return;
        }
        // Try to find the tag name node on "interface HTMLElementTagNameMap"
        var htmlElementTagNameMapTagNameNode = (0, iterable_util_js_1.iterableFind)(definition.tagNameNodes, function (node) {
            return (0, ast_util_js_1.findParent)(node, function (node) { return context.ts.isInterfaceDeclaration(node) && context.ts.isModuleBlock(node.parent) && node.name.getText() === "HTMLElementTagNameMap"; }) != null;
        });
        // Don't continue if the node was found
        if (htmlElementTagNameMapTagNameNode != null) {
            return;
        }
        // Find the identifier node
        var declarationIdentifier = definition.declaration != null ? (0, ast_util_js_1.getNodeIdentifier)(definition.declaration.node, context.ts) : undefined;
        if (declarationIdentifier == null) {
            return;
        }
        // Only report diagnostic if the tag is not built in,
        var tag = context.htmlStore.getHtmlTag(definition.tagName);
        if (!(tag === null || tag === void 0 ? void 0 : tag.builtIn)) {
            context.report({
                location: (0, range_util_js_1.rangeFromNode)(declarationIdentifier),
                message: "'".concat(definition.tagName, "' has not been registered on HTMLElementTagNameMap"),
                fix: function () {
                    return {
                        message: "Register '".concat(definition.tagName, "' on HTMLElementTagNameMap"),
                        actions: [
                            {
                                kind: "extendGlobalDeclaration",
                                file: context.file,
                                name: "HTMLElementTagNameMap",
                                newMembers: ["\"".concat(definition.tagName, "\": ").concat(declarationIdentifier.text)]
                            }
                        ]
                    };
                }
            });
        }
    }
};
exports.default = rule;

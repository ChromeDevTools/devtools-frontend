"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const experimental_utils_1 = require("@typescript-eslint/experimental-utils");
const util_1 = require("../util");
exports.default = util_1.createRule({
    name: 'prefer-regexp-exec',
    defaultOptions: [],
    meta: {
        type: 'suggestion',
        fixable: 'code',
        docs: {
            description: 'Enforce that `RegExp#exec` is used instead of `String#match` if no global flag is provided',
            category: 'Best Practices',
            recommended: 'error',
            requiresTypeChecking: true,
        },
        messages: {
            regExpExecOverStringMatch: 'Use the `RegExp#exec()` method instead.',
        },
        schema: [],
    },
    create(context) {
        const globalScope = context.getScope();
        const parserServices = util_1.getParserServices(context);
        const typeChecker = parserServices.program.getTypeChecker();
        const sourceCode = context.getSourceCode();
        /**
         * Check if a given node is a string.
         * @param node The node to check.
         */
        function isStringType(node) {
            const objectType = typeChecker.getTypeAtLocation(parserServices.esTreeNodeToTSNodeMap.get(node));
            return util_1.getTypeName(typeChecker, objectType) === 'string';
        }
        /**
         * Check if a given node is a RegExp.
         * @param node The node to check.
         */
        function isRegExpType(node) {
            const objectType = typeChecker.getTypeAtLocation(parserServices.esTreeNodeToTSNodeMap.get(node));
            return util_1.getTypeName(typeChecker, objectType) === 'RegExp';
        }
        return {
            "CallExpression[arguments.length=1] > MemberExpression.callee[property.name='match'][computed=false]"(memberNode) {
                const objectNode = memberNode.object;
                const callNode = memberNode.parent;
                const argumentNode = callNode.arguments[0];
                const argumentValue = util_1.getStaticValue(argumentNode, globalScope);
                if (!isStringType(objectNode)) {
                    return;
                }
                // Don't report regular expressions with global flag.
                if (argumentValue &&
                    argumentValue.value instanceof RegExp &&
                    argumentValue.value.flags.includes('g')) {
                    return;
                }
                if (argumentNode.type === experimental_utils_1.AST_NODE_TYPES.Literal &&
                    typeof argumentNode.value == 'string') {
                    const regExp = RegExp(argumentNode.value);
                    return context.report({
                        node: memberNode.property,
                        messageId: 'regExpExecOverStringMatch',
                        fix: util_1.getWrappingFixer({
                            sourceCode,
                            node: callNode,
                            innerNode: [objectNode],
                            wrap: objectCode => `${regExp.toString()}.exec(${objectCode})`,
                        }),
                    });
                }
                if (isRegExpType(argumentNode)) {
                    return context.report({
                        node: memberNode.property,
                        messageId: 'regExpExecOverStringMatch',
                        fix: util_1.getWrappingFixer({
                            sourceCode,
                            node: callNode,
                            innerNode: [objectNode, argumentNode],
                            wrap: (objectCode, argumentCode) => `${argumentCode}.exec(${objectCode})`,
                        }),
                    });
                }
                if (isStringType(argumentNode)) {
                    return context.report({
                        node: memberNode.property,
                        messageId: 'regExpExecOverStringMatch',
                        fix: util_1.getWrappingFixer({
                            sourceCode,
                            node: callNode,
                            innerNode: [objectNode, argumentNode],
                            wrap: (objectCode, argumentCode) => `RegExp(${argumentCode}).exec(${objectCode})`,
                        }),
                    });
                }
                return context.report({
                    node: memberNode.property,
                    messageId: 'regExpExecOverStringMatch',
                });
            },
        };
    },
});
//# sourceMappingURL=prefer-regexp-exec.js.map
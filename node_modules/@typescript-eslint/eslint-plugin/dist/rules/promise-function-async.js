"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const experimental_utils_1 = require("@typescript-eslint/experimental-utils");
const ts = __importStar(require("typescript"));
const util = __importStar(require("../util"));
exports.default = util.createRule({
    name: 'promise-function-async',
    meta: {
        type: 'suggestion',
        fixable: 'code',
        docs: {
            description: 'Requires any function or method that returns a Promise to be marked async',
            category: 'Best Practices',
            recommended: false,
            requiresTypeChecking: true,
        },
        messages: {
            missingAsync: 'Functions that return promises must be async.',
        },
        schema: [
            {
                type: 'object',
                properties: {
                    allowAny: {
                        type: 'boolean',
                    },
                    allowedPromiseNames: {
                        type: 'array',
                        items: {
                            type: 'string',
                        },
                    },
                    checkArrowFunctions: {
                        type: 'boolean',
                    },
                    checkFunctionDeclarations: {
                        type: 'boolean',
                    },
                    checkFunctionExpressions: {
                        type: 'boolean',
                    },
                    checkMethodDeclarations: {
                        type: 'boolean',
                    },
                },
                additionalProperties: false,
            },
        ],
    },
    defaultOptions: [
        {
            allowAny: true,
            allowedPromiseNames: [],
            checkArrowFunctions: true,
            checkFunctionDeclarations: true,
            checkFunctionExpressions: true,
            checkMethodDeclarations: true,
        },
    ],
    create(context, [{ allowAny, allowedPromiseNames, checkArrowFunctions, checkFunctionDeclarations, checkFunctionExpressions, checkMethodDeclarations, },]) {
        const allAllowedPromiseNames = new Set([
            'Promise',
            ...allowedPromiseNames,
        ]);
        const parserServices = util.getParserServices(context);
        const checker = parserServices.program.getTypeChecker();
        function validateNode(node) {
            var _a;
            const originalNode = parserServices.esTreeNodeToTSNodeMap.get(node);
            const signatures = checker
                .getTypeAtLocation(originalNode)
                .getCallSignatures();
            if (!signatures.length) {
                return;
            }
            const returnType = checker.getReturnTypeOfSignature(signatures[0]);
            if (!util.containsAllTypesByName(returnType, allowAny, allAllowedPromiseNames)) {
                // Return type is not a promise
                return;
            }
            if (((_a = node.parent) === null || _a === void 0 ? void 0 : _a.type) === experimental_utils_1.AST_NODE_TYPES.TSAbstractMethodDefinition) {
                // Abstract method can't be async
                return;
            }
            if (node.parent &&
                (node.parent.type === experimental_utils_1.AST_NODE_TYPES.Property ||
                    node.parent.type === experimental_utils_1.AST_NODE_TYPES.MethodDefinition) &&
                (node.parent.kind === 'get' || node.parent.kind === 'set')) {
                // Getters and setters can't be async
                return;
            }
            if (util.isTypeFlagSet(returnType, ts.TypeFlags.Any | ts.TypeFlags.Unknown)) {
                // Report without auto fixer because the return type is unknown
                return context.report({
                    messageId: 'missingAsync',
                    node,
                });
            }
            context.report({
                messageId: 'missingAsync',
                node,
                fix: fixer => {
                    if (node.parent &&
                        (node.parent.type === experimental_utils_1.AST_NODE_TYPES.MethodDefinition ||
                            (node.parent.type === experimental_utils_1.AST_NODE_TYPES.Property &&
                                node.parent.method))) {
                        return fixer.insertTextBefore(node.parent.key, 'async ');
                    }
                    return fixer.insertTextBefore(node, 'async ');
                },
            });
        }
        return {
            'ArrowFunctionExpression[async = false]'(node) {
                if (checkArrowFunctions) {
                    validateNode(node);
                }
            },
            'FunctionDeclaration[async = false]'(node) {
                if (checkFunctionDeclarations) {
                    validateNode(node);
                }
            },
            'FunctionExpression[async = false]'(node) {
                if (node.parent &&
                    node.parent.type === experimental_utils_1.AST_NODE_TYPES.MethodDefinition &&
                    node.parent.kind === 'method') {
                    if (checkMethodDeclarations) {
                        validateNode(node);
                    }
                    return;
                }
                if (checkFunctionExpressions) {
                    validateNode(node);
                }
            },
        };
    },
});
//# sourceMappingURL=promise-function-async.js.map
"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const experimental_utils_1 = require("@typescript-eslint/experimental-utils");
const tsutils = __importStar(require("tsutils"));
const ts = __importStar(require("typescript"));
const util = __importStar(require("../util"));
exports.default = util.createRule({
    name: 'return-await',
    meta: {
        docs: {
            description: 'Enforces consistent returning of awaited values',
            category: 'Best Practices',
            recommended: false,
            requiresTypeChecking: true,
        },
        type: 'problem',
        messages: {
            nonPromiseAwait: 'returning an awaited value that is not a promise is not allowed',
            disallowedPromiseAwait: 'returning an awaited promise is not allowed in this context',
            requiredPromiseAwait: 'returning an awaited promise is required in this context',
        },
        schema: [
            {
                enum: ['in-try-catch', 'always', 'never'],
            },
        ],
    },
    defaultOptions: ['in-try-catch'],
    create(context, [option]) {
        const parserServices = util.getParserServices(context);
        const checker = parserServices.program.getTypeChecker();
        function inTryCatch(node) {
            let ancestor = node.parent;
            while (ancestor && !ts.isFunctionLike(ancestor)) {
                if (tsutils.isTryStatement(ancestor) ||
                    tsutils.isCatchClause(ancestor)) {
                    return true;
                }
                ancestor = ancestor.parent;
            }
            return false;
        }
        function test(node, expression) {
            let child;
            const isAwait = expression.kind === ts.SyntaxKind.AwaitExpression;
            if (isAwait) {
                child = expression.getChildAt(1);
            }
            else {
                child = expression;
            }
            const type = checker.getTypeAtLocation(child);
            const isThenable = tsutils.isThenableType(checker, expression, type);
            if (!isAwait && !isThenable) {
                return;
            }
            if (isAwait && !isThenable) {
                context.report({
                    messageId: 'nonPromiseAwait',
                    node,
                });
                return;
            }
            if (option === 'always') {
                if (!isAwait && isThenable) {
                    context.report({
                        messageId: 'requiredPromiseAwait',
                        node,
                    });
                }
                return;
            }
            if (option === 'never') {
                if (isAwait) {
                    context.report({
                        messageId: 'disallowedPromiseAwait',
                        node,
                    });
                }
                return;
            }
            if (option === 'in-try-catch') {
                const isInTryCatch = inTryCatch(expression);
                if (isAwait && !isInTryCatch) {
                    context.report({
                        messageId: 'disallowedPromiseAwait',
                        node,
                    });
                }
                else if (!isAwait && isInTryCatch) {
                    context.report({
                        messageId: 'requiredPromiseAwait',
                        node,
                    });
                }
                return;
            }
        }
        return {
            'ArrowFunctionExpression[async = true]:exit'(node) {
                if (node.body.type !== experimental_utils_1.AST_NODE_TYPES.BlockStatement) {
                    const expression = parserServices.esTreeNodeToTSNodeMap.get(node.body);
                    test(node, expression);
                }
            },
            ReturnStatement(node) {
                const originalNode = parserServices.esTreeNodeToTSNodeMap.get(node);
                const { expression } = originalNode;
                if (!expression) {
                    return;
                }
                test(node, expression);
            },
        };
    },
});
//# sourceMappingURL=return-await.js.map
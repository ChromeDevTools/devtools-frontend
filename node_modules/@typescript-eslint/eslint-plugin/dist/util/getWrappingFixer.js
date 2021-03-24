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
exports.getWrappingFixer = void 0;
const experimental_utils_1 = require("@typescript-eslint/experimental-utils");
const util = __importStar(require("../util"));
/**
 * Wraps node with some code. Adds parenthesis as necessary.
 * @returns Fixer which adds the specified code and parens if necessary.
 */
function getWrappingFixer(params) {
    const { sourceCode, node, innerNode = node, wrap } = params;
    return (fixer) => {
        let code = sourceCode.getText(innerNode);
        // check the inner expression's precedence
        if (innerNode.type !== experimental_utils_1.AST_NODE_TYPES.Literal &&
            innerNode.type !== experimental_utils_1.AST_NODE_TYPES.Identifier &&
            innerNode.type !== experimental_utils_1.AST_NODE_TYPES.MemberExpression &&
            innerNode.type !== experimental_utils_1.AST_NODE_TYPES.CallExpression) {
            // we are wrapping something else than a simple variable or function call
            // the code we are adding might have stronger precedence than our wrapped node
            // let's wrap our node in parens in case it has a weaker precedence than the code we are wrapping it in
            code = `(${code})`;
        }
        // do the wrapping
        code = wrap(code);
        let parent = util.nullThrows(node.parent, util.NullThrowsReasons.MissingParent);
        // check the outer expression's precedence
        if (parent.type !== experimental_utils_1.AST_NODE_TYPES.IfStatement &&
            parent.type !== experimental_utils_1.AST_NODE_TYPES.ForStatement &&
            parent.type !== experimental_utils_1.AST_NODE_TYPES.WhileStatement &&
            parent.type !== experimental_utils_1.AST_NODE_TYPES.DoWhileStatement) {
            // the whole expression's parent is something else than condition of if/for/while
            // we wrapped the node in some expression which very likely has a different precedence than original wrapped node
            // let's wrap the whole expression in parens just in case
            if (!util.isParenthesized(node, sourceCode)) {
                code = `(${code})`;
            }
        }
        // check if we need to insert semicolon
        for (;;) {
            const prevParent = parent;
            parent = parent.parent;
            if (parent.type === experimental_utils_1.AST_NODE_TYPES.LogicalExpression ||
                parent.type === experimental_utils_1.AST_NODE_TYPES.BinaryExpression) {
                if (parent.left === prevParent) {
                    // the next parent is a binary expression and current node is on the left
                    continue;
                }
            }
            if (parent.type === experimental_utils_1.AST_NODE_TYPES.ExpressionStatement) {
                const block = parent.parent;
                if (block.type === experimental_utils_1.AST_NODE_TYPES.Program ||
                    block.type === experimental_utils_1.AST_NODE_TYPES.BlockStatement) {
                    // the next parent is an expression in a block
                    const statementIndex = block.body.indexOf(parent);
                    const previousStatement = block.body[statementIndex - 1];
                    if (statementIndex > 0 &&
                        sourceCode.getLastToken(previousStatement).value !== ';') {
                        // the previous statement in a block doesn't end with a semicolon
                        code = `;${code}`;
                    }
                }
            }
            break;
        }
        return fixer.replaceText(node, code);
    };
}
exports.getWrappingFixer = getWrappingFixer;
//# sourceMappingURL=getWrappingFixer.js.map
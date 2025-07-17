import { __esmMin } from "../rolldown-runtime.js";
import { ast_exports, createRule, getStaticPropertyName, init_ast, init_create_rule, isParenthesised, skipChainExpression } from "../utils.js";
/**
* Check if the given node is callee of a `NewExpression` node
* @param node node to check
* @returns True if the node is callee of a `NewExpression` node
* @private
*/
function isCalleeOfNewExpression(node) {
	const maybeCallee = node.parent?.type === "ChainExpression" ? node.parent : node;
	return maybeCallee.parent?.type === "NewExpression" && maybeCallee.parent.callee === maybeCallee;
}
var wrap_iife_default;
var init_wrap_iife = __esmMin(() => {
	init_ast();
	init_create_rule();
	wrap_iife_default = createRule({
		name: "wrap-iife",
		meta: {
			type: "layout",
			docs: { description: "Require parentheses around immediate `function` invocations" },
			schema: [{
				type: "string",
				enum: [
					"outside",
					"inside",
					"any"
				]
			}, {
				type: "object",
				properties: { functionPrototypeMethods: {
					type: "boolean",
					default: false
				} },
				additionalProperties: false
			}],
			fixable: "code",
			messages: {
				wrapInvocation: "Wrap an immediate function invocation in parentheses.",
				wrapExpression: "Wrap only the function expression in parens.",
				moveInvocation: "Move the invocation into the parens that contain the function."
			}
		},
		create(context) {
			const style = context.options[0] || "outside";
			const includeFunctionPrototypeMethods = context.options[1] && context.options[1].functionPrototypeMethods;
			const sourceCode = context.sourceCode;
			/**
			* Check if the node is wrapped in any (). All parens count: grouping parens and parens for constructs such as if()
			* @param node node to evaluate
			* @returns True if it is wrapped in any parens
			* @private
			*/
			function isWrappedInAnyParens(node) {
				return isParenthesised(sourceCode, node);
			}
			/**
			* Check if the node is wrapped in grouping (). Parens for constructs such as if() don't count
			* @param node node to evaluate
			* @returns True if it is wrapped in grouping parens
			* @private
			*/
			function isWrappedInGroupingParens(node) {
				return (0, ast_exports.isParenthesized)(node, sourceCode);
			}
			/**
			* Get the function node from an IIFE
			* @param node node to evaluate
			* @returns node that is the function expression of the given IIFE, or null if none exist
			*/
			function getFunctionNodeFromIIFE(node) {
				const callee = skipChainExpression(node.callee);
				if (callee.type === "FunctionExpression") return callee;
				if (includeFunctionPrototypeMethods && callee.type === "MemberExpression" && callee.object.type === "FunctionExpression" && (getStaticPropertyName(callee) === "call" || getStaticPropertyName(callee) === "apply")) return callee.object;
				return null;
			}
			return { CallExpression(node) {
				const innerNode = getFunctionNodeFromIIFE(node);
				if (!innerNode) return;
				const isCallExpressionWrapped = isWrappedInAnyParens(node);
				const isFunctionExpressionWrapped = isWrappedInAnyParens(innerNode);
				if (!isCallExpressionWrapped && !isFunctionExpressionWrapped) context.report({
					node,
					messageId: "wrapInvocation",
					fix(fixer) {
						const nodeToSurround = style === "inside" ? innerNode : node;
						return fixer.replaceText(nodeToSurround, `(${sourceCode.getText(nodeToSurround)})`);
					}
				});
				else if (style === "inside" && !isFunctionExpressionWrapped) context.report({
					node,
					messageId: "wrapExpression",
					fix(fixer) {
						if (isWrappedInGroupingParens(node) && !isCalleeOfNewExpression(node)) {
							/**
							* Parenthesize the function expression and remove unnecessary grouping parens around the call expression.
							* Replace the range between the end of the function expression and the end of the call expression.
							* for example, in `(function(foo) {}(bar))`, the range `(bar))` should get replaced with `)(bar)`.
							*/
							const parenAfter = sourceCode.getTokenAfter(node);
							return fixer.replaceTextRange([innerNode.range[1], parenAfter.range[1]], `)${sourceCode.getText().slice(innerNode.range[1], parenAfter.range[0])}`);
						}
						/**
						* Call expression is wrapped in mandatory parens such as if(), or in necessary grouping parens.
						* These parens cannot be removed, so just parenthesize the function expression.
						*/
						return fixer.replaceText(innerNode, `(${sourceCode.getText(innerNode)})`);
					}
				});
				else if (style === "outside" && !isCallExpressionWrapped) context.report({
					node,
					messageId: "moveInvocation",
					fix(fixer) {
						/**
						* The inner function expression will always be wrapped at this point.
						* It's only necessary to replace the range between the end of the function expression
						* and the call expression. For example, in `(function(foo) {})(bar)`, the range `)(bar)`
						* should get replaced with `(bar))`.
						*/
						const parenAfter = sourceCode.getTokenAfter(innerNode);
						return fixer.replaceTextRange([parenAfter.range[0], node.range[1]], `${sourceCode.getText().slice(parenAfter.range[1], node.range[1])})`);
					}
				});
			} };
		}
	});
});
export { init_wrap_iife, wrap_iife_default };

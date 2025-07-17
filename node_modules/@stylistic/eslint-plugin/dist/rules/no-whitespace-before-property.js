import { __esmMin } from "../rolldown-runtime.js";
import { ast_exports, createRule, init_ast, init_create_rule, isDecimalInteger } from "../utils.js";
var no_whitespace_before_property_default;
var init_no_whitespace_before_property = __esmMin(() => {
	init_ast();
	init_create_rule();
	no_whitespace_before_property_default = createRule({
		name: "no-whitespace-before-property",
		meta: {
			type: "layout",
			docs: { description: "Disallow whitespace before properties" },
			fixable: "whitespace",
			schema: [],
			messages: { unexpectedWhitespace: "Unexpected whitespace before property {{propName}}." }
		},
		create(context) {
			const sourceCode = context.sourceCode;
			/**
			* Reports whitespace before property token
			* @param node the node to report in the event of an error
			* @param leftToken the left token
			* @param rightToken the right token
			* @private
			*/
			function reportError(node, leftToken, rightToken) {
				context.report({
					node,
					messageId: "unexpectedWhitespace",
					data: { propName: sourceCode.getText(node.property) },
					fix(fixer) {
						let replacementText = "";
						if (!node.computed && !node.optional && isDecimalInteger(node.object))
 /**
						* If the object is a number literal, fixing it to something like 5.toString() would cause a SyntaxError.
						* Don't fix this case.
						*/
						return null;
						if (sourceCode.commentsExistBetween(leftToken, rightToken)) return null;
						if (node.optional) replacementText = "?.";
						else if (!node.computed) replacementText = ".";
						return fixer.replaceTextRange([leftToken.range[1], rightToken.range[0]], replacementText);
					}
				});
			}
			return { MemberExpression(node) {
				let rightToken;
				let leftToken;
				if (!(0, ast_exports.isTokenOnSameLine)(node.object, node.property)) return;
				if (node.computed) {
					rightToken = sourceCode.getTokenBefore(node.property, ast_exports.isOpeningBracketToken);
					leftToken = sourceCode.getTokenBefore(rightToken, node.optional ? 1 : 0);
				} else {
					rightToken = sourceCode.getFirstToken(node.property);
					leftToken = sourceCode.getTokenBefore(rightToken, 1);
				}
				if (sourceCode.isSpaceBetween(leftToken, rightToken)) reportError(node, leftToken, rightToken);
			} };
		}
	});
});
export { init_no_whitespace_before_property, no_whitespace_before_property_default };

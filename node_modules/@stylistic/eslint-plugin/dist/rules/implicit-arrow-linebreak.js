import { ast_exports, createRule, hasCommentsBetween } from "../utils.js";
var implicit_arrow_linebreak_default = createRule({
	name: "implicit-arrow-linebreak",
	meta: {
		type: "layout",
		docs: { description: "Enforce the location of arrow function bodies" },
		fixable: "whitespace",
		schema: [{
			type: "string",
			enum: ["beside", "below"]
		}],
		messages: {
			expected: "Expected a linebreak before this expression.",
			unexpected: "Expected no linebreak before this expression."
		}
	},
	create(context) {
		const sourceCode = context.sourceCode;
		const option = context.options[0] || "beside";
		function validateExpression(node) {
			if (node.body.type === "BlockStatement") return;
			const arrowToken = sourceCode.getTokenBefore(node.body, ast_exports.isNotOpeningParenToken);
			const firstTokenOfBody = sourceCode.getTokenAfter(arrowToken);
			const onSameLine = (0, ast_exports.isTokenOnSameLine)(arrowToken, firstTokenOfBody);
			if (onSameLine && option === "below") context.report({
				node: firstTokenOfBody,
				messageId: "expected",
				fix: (fixer) => fixer.insertTextBefore(firstTokenOfBody, "\n")
			});
			else if (!onSameLine && option === "beside") context.report({
				node: firstTokenOfBody,
				messageId: "unexpected",
				fix(fixer) {
					if (hasCommentsBetween(sourceCode, arrowToken, firstTokenOfBody)) return null;
					return fixer.replaceTextRange([arrowToken.range[1], firstTokenOfBody.range[0]], " ");
				}
			});
		}
		return { ArrowFunctionExpression: (node) => validateExpression(node) };
	}
});
export { implicit_arrow_linebreak_default };

import { ast_exports, createRule, isSingleLine } from "../utils.js";
function getNormalizedOption(context) {
	const rawOption = context.options[0] || "consistent";
	if (rawOption === "consistent") return {
		multiline: "consistent",
		singleline: "consistent"
	};
	if (rawOption === "never") return {
		multiline: "forbid",
		singleline: "forbid"
	};
	return {
		multiline: rawOption.multiline || "consistent",
		singleline: rawOption.singleline || "consistent"
	};
}
var jsx_curly_newline_default = createRule({
	name: "jsx-curly-newline",
	meta: {
		type: "layout",
		docs: { description: "Enforce consistent linebreaks in curly braces in JSX attributes and expressions" },
		fixable: "whitespace",
		schema: [{ anyOf: [{
			type: "string",
			enum: ["consistent", "never"]
		}, {
			type: "object",
			properties: {
				singleline: {
					type: "string",
					enum: [
						"consistent",
						"require",
						"forbid"
					]
				},
				multiline: {
					type: "string",
					enum: [
						"consistent",
						"require",
						"forbid"
					]
				}
			},
			additionalProperties: false
		}] }],
		messages: {
			expectedBefore: "Expected newline before '}'.",
			expectedAfter: "Expected newline after '{'.",
			unexpectedBefore: "Unexpected newline before '}'.",
			unexpectedAfter: "Unexpected newline after '{'."
		}
	},
	create(context) {
		const sourceCode = context.sourceCode;
		const option = getNormalizedOption(context);
		function shouldHaveNewlines(expression, hasLeftNewline) {
			switch (!isSingleLine(expression) ? option.multiline : option.singleline) {
				case "forbid": return false;
				case "require": return true;
				case "consistent":
				default: return hasLeftNewline;
			}
		}
		function validateCurlys(curlys, expression) {
			const leftCurly = curlys.leftCurly;
			const rightCurly = curlys.rightCurly;
			const tokenAfterLeftCurly = sourceCode.getTokenAfter(leftCurly);
			const tokenBeforeRightCurly = sourceCode.getTokenBefore(rightCurly);
			const hasLeftNewline = !(0, ast_exports.isTokenOnSameLine)(leftCurly, tokenAfterLeftCurly);
			const hasRightNewline = !(0, ast_exports.isTokenOnSameLine)(tokenBeforeRightCurly, rightCurly);
			const needsNewlines = shouldHaveNewlines(expression, hasLeftNewline);
			if (hasLeftNewline && !needsNewlines) context.report({
				node: leftCurly,
				messageId: "unexpectedAfter",
				fix(fixer) {
					return sourceCode.getText().slice(leftCurly.range[1], tokenAfterLeftCurly?.range[0]).trim() ? null : fixer.removeRange([leftCurly.range[1], tokenAfterLeftCurly.range[0]]);
				}
			});
			else if (!hasLeftNewline && needsNewlines) context.report({
				node: leftCurly,
				messageId: "expectedAfter",
				fix: (fixer) => fixer.insertTextAfter(leftCurly, "\n")
			});
			if (hasRightNewline && !needsNewlines) context.report({
				node: rightCurly,
				messageId: "unexpectedBefore",
				fix(fixer) {
					return sourceCode.getText().slice(tokenBeforeRightCurly.range[1], rightCurly.range[0]).trim() ? null : fixer.removeRange([tokenBeforeRightCurly.range[1], rightCurly.range[0]]);
				}
			});
			else if (!hasRightNewline && needsNewlines) context.report({
				node: rightCurly,
				messageId: "expectedBefore",
				fix: (fixer) => fixer.insertTextBefore(rightCurly, "\n")
			});
		}
		return { JSXExpressionContainer(node) {
			validateCurlys({
				leftCurly: sourceCode.getFirstToken(node),
				rightCurly: sourceCode.getLastToken(node)
			}, node.expression);
		} };
	}
});
export { jsx_curly_newline_default };

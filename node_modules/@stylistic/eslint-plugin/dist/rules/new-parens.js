import { ast_exports, createRule } from "../utils.js";
var new_parens_default = createRule({
	name: "new-parens",
	meta: {
		type: "layout",
		docs: { description: "Enforce or disallow parentheses when invoking a constructor with no arguments" },
		fixable: "code",
		schema: [{
			type: "string",
			enum: ["always", "never"]
		}],
		messages: {
			missing: "Missing '()' invoking a constructor.",
			unnecessary: "Unnecessary '()' invoking a constructor with no arguments."
		}
	},
	create(context) {
		const always = context.options[0] !== "never";
		const sourceCode = context.sourceCode;
		return { NewExpression(node) {
			if (node.arguments.length !== 0) return;
			const lastToken = sourceCode.getLastToken(node);
			const hasLastParen = lastToken && (0, ast_exports.isClosingParenToken)(lastToken);
			const tokenBeforeLastToken = sourceCode.getTokenBefore(lastToken);
			const hasParens = hasLastParen && (0, ast_exports.isOpeningParenToken)(tokenBeforeLastToken) && node.callee.range[1] < node.range[1];
			if (always) {
				if (!hasParens) context.report({
					node,
					messageId: "missing",
					fix: (fixer) => fixer.insertTextAfter(node, "()")
				});
			} else if (hasParens) context.report({
				node,
				messageId: "unnecessary",
				fix: (fixer) => [
					fixer.remove(tokenBeforeLastToken),
					fixer.remove(lastToken),
					fixer.insertTextBefore(node, "("),
					fixer.insertTextAfter(node, ")")
				]
			});
		} };
	}
});
export { new_parens_default };

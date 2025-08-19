import { __esmMin } from "../rolldown-runtime.js";
import { ast_exports, createRule, getSwitchCaseColonToken, hasCommentsBetween, init_ast, init_create_rule } from "../utils.js";
var switch_colon_spacing_default;
var init_switch_colon_spacing = __esmMin(() => {
	init_ast();
	init_create_rule();
	switch_colon_spacing_default = createRule({
		name: "switch-colon-spacing",
		meta: {
			type: "layout",
			docs: { description: "Enforce spacing around colons of switch statements" },
			schema: [{
				type: "object",
				properties: {
					before: {
						type: "boolean",
						default: false
					},
					after: {
						type: "boolean",
						default: true
					}
				},
				additionalProperties: false
			}],
			fixable: "whitespace",
			messages: {
				expectedBefore: "Expected space(s) before this colon.",
				expectedAfter: "Expected space(s) after this colon.",
				unexpectedBefore: "Unexpected space(s) before this colon.",
				unexpectedAfter: "Unexpected space(s) after this colon."
			}
		},
		create(context) {
			const sourceCode = context.sourceCode;
			const options = context.options[0] || {};
			const beforeSpacing = options.before === true;
			const afterSpacing = options.after !== false;
			function isValidSpacing(left, right, expected) {
				return (0, ast_exports.isClosingBraceToken)(right) || !(0, ast_exports.isTokenOnSameLine)(left, right) || sourceCode.isSpaceBetween(left, right) === expected;
			}
			function fix(fixer, left, right, spacing) {
				if (hasCommentsBetween(sourceCode, left, right)) return null;
				if (spacing) return fixer.insertTextAfter(left, " ");
				return fixer.removeRange([left.range[1], right.range[0]]);
			}
			return { SwitchCase(node) {
				const colonToken = getSwitchCaseColonToken(node, sourceCode);
				const beforeToken = sourceCode.getTokenBefore(colonToken);
				const afterToken = sourceCode.getTokenAfter(colonToken);
				if (!isValidSpacing(beforeToken, colonToken, beforeSpacing)) context.report({
					node,
					loc: colonToken.loc,
					messageId: beforeSpacing ? "expectedBefore" : "unexpectedBefore",
					fix: (fixer) => fix(fixer, beforeToken, colonToken, beforeSpacing)
				});
				if (!isValidSpacing(colonToken, afterToken, afterSpacing)) context.report({
					node,
					loc: colonToken.loc,
					messageId: afterSpacing ? "expectedAfter" : "unexpectedAfter",
					fix: (fixer) => fix(fixer, colonToken, afterToken, afterSpacing)
				});
			} };
		}
	});
});
export { init_switch_colon_spacing, switch_colon_spacing_default };

import { __esmMin } from "../rolldown-runtime.js";
import { ast_exports, createRule, init_ast, init_create_rule } from "../utils.js";
var arrow_spacing_default;
var init_arrow_spacing = __esmMin(() => {
	init_ast();
	init_create_rule();
	arrow_spacing_default = createRule({
		name: "arrow-spacing",
		meta: {
			type: "layout",
			docs: { description: "Enforce consistent spacing before and after the arrow in arrow functions" },
			fixable: "whitespace",
			schema: [{
				type: "object",
				properties: {
					before: {
						type: "boolean",
						default: true
					},
					after: {
						type: "boolean",
						default: true
					}
				},
				additionalProperties: false
			}],
			messages: {
				expectedBefore: "Missing space before =>.",
				unexpectedBefore: "Unexpected space before =>.",
				expectedAfter: "Missing space after =>.",
				unexpectedAfter: "Unexpected space after =>."
			}
		},
		create(context) {
			const rule = Object.assign({}, context.options[0]);
			rule.before = rule.before !== false;
			rule.after = rule.after !== false;
			const sourceCode = context.sourceCode;
			/**
			* Get tokens of arrow(`=>`) and before/after arrow.
			* @param node The arrow function node.
			* @returns Tokens of arrow and before/after arrow.
			*/
			function getTokens(node) {
				const arrow = sourceCode.getTokenBefore(node.body, ast_exports.isArrowToken);
				return {
					before: sourceCode.getTokenBefore(arrow),
					arrow,
					after: sourceCode.getTokenAfter(arrow)
				};
			}
			/**
			* Count spaces before/after arrow(`=>`) token.
			* @param tokens Tokens before/after arrow.
			* @returns count of space before/after arrow.
			*/
			function countSpaces(tokens) {
				const before = tokens.arrow.range[0] - tokens.before.range[1];
				const after = tokens.after.range[0] - tokens.arrow.range[1];
				return {
					before,
					after
				};
			}
			/**
			* Determines whether space(s) before after arrow(`=>`) is satisfy rule.
			* if before/after value is `true`, there should be space(s).
			* if before/after value is `false`, there should be no space.
			* @param node The arrow function node.
			*/
			function spaces(node) {
				const tokens = getTokens(node);
				const countSpace = countSpaces(tokens);
				if (rule.before) {
					if (countSpace.before === 0) context.report({
						node: tokens.before,
						messageId: "expectedBefore",
						fix(fixer) {
							return fixer.insertTextBefore(tokens.arrow, " ");
						}
					});
				} else if (countSpace.before > 0) context.report({
					node: tokens.before,
					messageId: "unexpectedBefore",
					fix(fixer) {
						return fixer.removeRange([tokens.before.range[1], tokens.arrow.range[0]]);
					}
				});
				if (rule.after) {
					if (countSpace.after === 0) context.report({
						node: tokens.after,
						messageId: "expectedAfter",
						fix(fixer) {
							return fixer.insertTextAfter(tokens.arrow, " ");
						}
					});
				} else if (countSpace.after > 0) context.report({
					node: tokens.after,
					messageId: "unexpectedAfter",
					fix(fixer) {
						return fixer.removeRange([tokens.arrow.range[1], tokens.after.range[0]]);
					}
				});
			}
			return { ArrowFunctionExpression: spaces };
		}
	});
});
export { arrow_spacing_default, init_arrow_spacing };

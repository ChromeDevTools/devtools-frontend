import { __esmMin } from "../rolldown-runtime.js";
import { createRule, init_create_rule } from "../utils.js";
var wrap_regex_default;
var init_wrap_regex = __esmMin(() => {
	init_create_rule();
	wrap_regex_default = createRule({
		name: "wrap-regex",
		meta: {
			type: "layout",
			docs: { description: "Require parenthesis around regex literals" },
			schema: [],
			fixable: "code",
			messages: { requireParens: "Wrap the regexp literal in parens to disambiguate the slash." }
		},
		create(context) {
			const sourceCode = context.sourceCode;
			return { Literal(node) {
				const token = sourceCode.getFirstToken(node);
				const nodeType = token.type;
				if (nodeType === "RegularExpression") {
					const beforeToken = sourceCode.getTokenBefore(node);
					const afterToken = sourceCode.getTokenAfter(node);
					const { parent } = node;
					if (parent.type === "MemberExpression" && parent.object === node && !(beforeToken && beforeToken.value === "(" && afterToken && afterToken.value === ")")) context.report({
						node,
						messageId: "requireParens",
						fix: (fixer) => fixer.replaceText(node, `(${sourceCode.getText(node)})`)
					});
				}
			} };
		}
	});
});
export { init_wrap_regex, wrap_regex_default };

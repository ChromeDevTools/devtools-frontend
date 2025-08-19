import { __esmMin } from "../rolldown-runtime.js";
import { createRule, init_ast, init_create_rule, isStringLiteral, isSurroundedBy } from "../utils.js";
var QUOTE_SETTINGS, jsx_quotes_default;
var init_jsx_quotes = __esmMin(() => {
	init_ast();
	init_create_rule();
	QUOTE_SETTINGS = {
		"prefer-double": {
			quote: "\"",
			description: "singlequote",
			convert(str) {
				return str.replace(/'/gu, "\"");
			}
		},
		"prefer-single": {
			quote: "'",
			description: "doublequote",
			convert(str) {
				return str.replace(/"/gu, "'");
			}
		}
	};
	jsx_quotes_default = createRule({
		name: "jsx-quotes",
		meta: {
			type: "layout",
			docs: { description: "Enforce the consistent use of either double or single quotes in JSX attributes" },
			fixable: "whitespace",
			schema: [{
				type: "string",
				enum: ["prefer-single", "prefer-double"]
			}],
			messages: { unexpected: "Unexpected usage of {{description}}." }
		},
		create(context) {
			const quoteOption = context.options[0] || "prefer-double";
			const setting = QUOTE_SETTINGS[quoteOption];
			function usesExpectedQuotes(node) {
				return node.value.includes(setting.quote) || isSurroundedBy(node.raw, setting.quote);
			}
			return { JSXAttribute(node) {
				const attributeValue = node.value;
				if (attributeValue && isStringLiteral(attributeValue) && !usesExpectedQuotes(attributeValue)) context.report({
					node: attributeValue,
					messageId: "unexpected",
					data: { description: setting.description },
					fix(fixer) {
						return fixer.replaceText(attributeValue, setting.convert(attributeValue.raw));
					}
				});
			} };
		}
	});
});
export { init_jsx_quotes, jsx_quotes_default };

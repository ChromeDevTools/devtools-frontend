import { ast_exports, createRule } from "../utils.js";
var object_property_newline_default = createRule({
	name: "object-property-newline",
	meta: {
		type: "layout",
		docs: { description: "Enforce placing object properties on separate lines" },
		schema: [{
			type: "object",
			properties: { allowAllPropertiesOnSameLine: {
				type: "boolean",
				default: false
			} },
			additionalProperties: false
		}],
		fixable: "whitespace",
		messages: {
			propertiesOnNewlineAll: "Object properties must go on a new line if they aren't all on the same line.",
			propertiesOnNewline: "Object properties must go on a new line."
		}
	},
	defaultOptions: [{ allowAllPropertiesOnSameLine: false }],
	create(context) {
		const allowSameLine = context.options[0] && context.options[0].allowAllPropertiesOnSameLine;
		const messageId = allowSameLine ? "propertiesOnNewlineAll" : "propertiesOnNewline";
		const sourceCode = context.sourceCode;
		function check(node, children) {
			if (allowSameLine) {
				if (children.length > 1) {
					if ((0, ast_exports.isTokenOnSameLine)(sourceCode.getFirstToken(children[0]), sourceCode.getLastToken(children[children.length - 1]))) return;
				}
			}
			for (let i = 1; i < children.length; i++) {
				const lastTokenOfPreviousProperty = sourceCode.getLastToken(children[i - 1]);
				const firstTokenOfCurrentProperty = sourceCode.getFirstToken(children[i]);
				if ((0, ast_exports.isTokenOnSameLine)(lastTokenOfPreviousProperty, firstTokenOfCurrentProperty)) context.report({
					node,
					loc: firstTokenOfCurrentProperty.loc,
					messageId,
					fix(fixer) {
						const rangeAfterComma = [sourceCode.getTokenBefore(firstTokenOfCurrentProperty).range[1], firstTokenOfCurrentProperty.range[0]];
						if (sourceCode.text.slice(rangeAfterComma[0], rangeAfterComma[1]).trim()) return null;
						return fixer.replaceTextRange(rangeAfterComma, "\n");
					}
				});
			}
		}
		return {
			ObjectExpression(node) {
				check(node, node.properties);
			},
			TSTypeLiteral(node) {
				check(node, node.members);
			},
			TSInterfaceBody(node) {
				check(node, node.body);
			}
		};
	}
});
export { object_property_newline_default };

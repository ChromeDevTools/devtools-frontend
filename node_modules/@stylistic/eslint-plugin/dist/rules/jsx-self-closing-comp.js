import { __esmMin } from "../rolldown-runtime.js";
import { createRule, init_create_rule, init_jsx, isDOMComponent } from "../utils.js";
var optionDefaults, messages, jsx_self_closing_comp_default;
var init_jsx_self_closing_comp = __esmMin(() => {
	init_jsx();
	init_create_rule();
	optionDefaults = {
		component: true,
		html: true
	};
	messages = { notSelfClosing: "Empty components are self-closing" };
	jsx_self_closing_comp_default = createRule({
		name: "jsx-self-closing-comp",
		meta: {
			type: "layout",
			docs: { description: "Disallow extra closing tags for components without children" },
			fixable: "code",
			messages,
			schema: [{
				type: "object",
				properties: {
					component: {
						default: optionDefaults.component,
						type: "boolean"
					},
					html: {
						default: optionDefaults.html,
						type: "boolean"
					}
				},
				additionalProperties: false
			}]
		},
		create(context) {
			function isComponent(node) {
				return node.name && (node.name.type === "JSXIdentifier" || node.name.type === "JSXMemberExpression") && !isDOMComponent(node);
			}
			function childrenIsEmpty(node) {
				return node.parent.children.length === 0;
			}
			function childrenIsMultilineSpaces(node) {
				const childrens = node.parent.children;
				return childrens.length === 1 && childrens[0].type === "JSXText" && childrens[0].value.includes("\n") && childrens[0].value.replace(/(?!\xA0)\s/g, "") === "";
			}
			function isShouldBeSelfClosed(node) {
				const configuration = Object.assign({}, optionDefaults, context.options[0]);
				return (configuration.component && isComponent(node) || configuration.html && isDOMComponent(node)) && !node.selfClosing && (childrenIsEmpty(node) || childrenIsMultilineSpaces(node));
			}
			return { JSXOpeningElement(node) {
				if (!isShouldBeSelfClosed(node)) return;
				context.report({
					messageId: "notSelfClosing",
					node,
					fix(fixer) {
						const openingElementEnding = node.range[1] - 1;
						const closingElementEnding = node.parent.closingElement?.range[1] ?? NaN;
						const range = [openingElementEnding, closingElementEnding];
						return fixer.replaceTextRange(range, " />");
					}
				});
			} };
		}
	});
});
export { init_jsx_self_closing_comp, jsx_self_closing_comp_default };

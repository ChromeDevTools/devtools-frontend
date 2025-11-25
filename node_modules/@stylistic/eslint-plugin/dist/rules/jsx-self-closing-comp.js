import { createRule, isDOMComponent } from "../utils.js";
const optionDefaults = {
	component: true,
	html: true
};
var jsx_self_closing_comp_default = createRule({
	name: "jsx-self-closing-comp",
	meta: {
		type: "layout",
		docs: { description: "Disallow extra closing tags for components without children" },
		fixable: "code",
		messages: { notSelfClosing: "Empty components are self-closing" },
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
					const range = [node.range[1] - 1, node.parent.closingElement?.range[1] ?? NaN];
					return fixer.replaceTextRange(range, " />");
				}
			});
		} };
	}
});
export { jsx_self_closing_comp_default };

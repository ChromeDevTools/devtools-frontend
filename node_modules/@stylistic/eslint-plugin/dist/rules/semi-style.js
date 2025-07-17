import { __esmMin } from "../rolldown-runtime.js";
import { ast_exports, createRule, init_ast, init_create_rule } from "../utils.js";
/**
* Get the child node list of a given node.
* This returns `BlockStatement#body`, `StaticBlock#body`, `Program#body`,
* `ClassBody#body`, or `SwitchCase#consequent`.
* This is used to check whether a node is the first/last child.
* @param node A node to get child node list.
* @returns The child node list.
*/
function getChildren(node) {
	const t = node.type;
	if (t === "BlockStatement" || t === "StaticBlock" || t === "Program" || t === "ClassBody") return node.body;
	if (t === "SwitchCase") return node.consequent;
	return null;
}
/**
* Check whether a given node is the last statement in the parent block.
* @param node A node to check.
* @returns `true` if the node is the last statement in the parent block.
*/
function isLastChild(node) {
	if (!node.parent) return true;
	const t = node.parent.type;
	if (t === "IfStatement" && node.parent.consequent === node && node.parent.alternate) return true;
	if (t === "DoWhileStatement") return true;
	const nodeList = getChildren(node.parent);
	return nodeList !== null && nodeList[nodeList.length - 1] === node;
}
var SELECTOR, semi_style_default;
var init_semi_style = __esmMin(() => {
	init_ast();
	init_create_rule();
	SELECTOR = [
		"BreakStatement",
		"ContinueStatement",
		"DebuggerStatement",
		"DoWhileStatement",
		"ExportAllDeclaration",
		"ExportDefaultDeclaration",
		"ExportNamedDeclaration",
		"ExpressionStatement",
		"ImportDeclaration",
		"ReturnStatement",
		"ThrowStatement",
		"VariableDeclaration",
		"PropertyDefinition"
	].join(",");
	semi_style_default = createRule({
		name: "semi-style",
		meta: {
			type: "layout",
			docs: { description: "Enforce location of semicolons" },
			schema: [{
				type: "string",
				enum: ["last", "first"]
			}],
			fixable: "whitespace",
			messages: { expectedSemiColon: "Expected this semicolon to be at {{pos}}." }
		},
		create(context) {
			const sourceCode = context.sourceCode;
			const option = context.options[0] || "last";
			/**
			* Check the given semicolon token.
			* @param semiToken The semicolon token to check.
			* @param expected The expected location to check.
			*/
			function check(semiToken, expected) {
				const prevToken = sourceCode.getTokenBefore(semiToken);
				const nextToken = sourceCode.getTokenAfter(semiToken);
				const prevIsSameLine = !prevToken || (0, ast_exports.isTokenOnSameLine)(prevToken, semiToken);
				const nextIsSameLine = !nextToken || (0, ast_exports.isTokenOnSameLine)(semiToken, nextToken);
				if (expected === "last" && !prevIsSameLine || expected === "first" && !nextIsSameLine) context.report({
					loc: semiToken.loc,
					messageId: "expectedSemiColon",
					data: { pos: expected === "last" ? "the end of the previous line" : "the beginning of the next line" },
					fix(fixer) {
						if (prevToken && nextToken && sourceCode.commentsExistBetween(prevToken, nextToken)) return null;
						const start = prevToken ? prevToken.range[1] : semiToken.range[0];
						const end = nextToken ? nextToken.range[0] : semiToken.range[1];
						const text = expected === "last" ? ";\n" : "\n;";
						return fixer.replaceTextRange([start, end], text);
					}
				});
			}
			return {
				[SELECTOR](node) {
					if (option === "first" && isLastChild(node)) return;
					const lastToken = sourceCode.getLastToken(node);
					if ((0, ast_exports.isSemicolonToken)(lastToken)) check(lastToken, option);
				},
				ForStatement(node) {
					const firstSemi = node.init && sourceCode.getTokenAfter(node.init, ast_exports.isSemicolonToken);
					const secondSemi = node.test && sourceCode.getTokenAfter(node.test, ast_exports.isSemicolonToken);
					if (firstSemi) check(firstSemi, "last");
					if (secondSemi) check(secondSemi, "last");
				}
			};
		}
	});
});
export { init_semi_style, semi_style_default };

import { __esmMin } from "../rolldown-runtime.js";
import { ast_exports, createRule, init_ast, init_create_rule } from "../utils.js";
var listeningNodes, max_statements_per_line_default;
var init_max_statements_per_line = __esmMin(() => {
	init_ast();
	init_create_rule();
	listeningNodes = [
		"BreakStatement",
		"ClassDeclaration",
		"ContinueStatement",
		"DebuggerStatement",
		"DoWhileStatement",
		"ExpressionStatement",
		"ForInStatement",
		"ForOfStatement",
		"ForStatement",
		"FunctionDeclaration",
		"IfStatement",
		"ImportDeclaration",
		"LabeledStatement",
		"ReturnStatement",
		"SwitchStatement",
		"ThrowStatement",
		"TryStatement",
		"VariableDeclaration",
		"WhileStatement",
		"WithStatement",
		"ExportNamedDeclaration",
		"ExportDefaultDeclaration",
		"ExportAllDeclaration"
	];
	max_statements_per_line_default = createRule({
		name: "max-statements-per-line",
		meta: {
			type: "layout",
			docs: { description: "Enforce a maximum number of statements allowed per line" },
			schema: [{
				type: "object",
				properties: {
					max: {
						type: "integer",
						minimum: 1,
						default: 1
					},
					ignoredNodes: {
						type: "array",
						items: {
							type: "string",
							enum: listeningNodes
						}
					}
				},
				additionalProperties: false
			}],
			messages: { exceed: "This line has {{numberOfStatementsOnThisLine}} {{statements}}. Maximum allowed is {{maxStatementsPerLine}}." }
		},
		create(context) {
			const sourceCode = context.sourceCode;
			const options = context.options[0] || {};
			const maxStatementsPerLine = typeof options.max !== "undefined" ? options.max : 1;
			const ignoredNodes = options.ignoredNodes || [];
			let lastStatementLine = 0;
			let numberOfStatementsOnThisLine = 0;
			let firstExtraStatement = null;
			const SINGLE_CHILD_ALLOWED = /^(?:(?:DoWhile|For|ForIn|ForOf|If|Labeled|While)Statement|Export(?:Default|Named)Declaration)$/u;
			/**
			* Reports with the first extra statement, and clears it.
			*/
			function reportFirstExtraStatementAndClear() {
				if (firstExtraStatement) context.report({
					node: firstExtraStatement,
					messageId: "exceed",
					data: {
						numberOfStatementsOnThisLine,
						maxStatementsPerLine,
						statements: numberOfStatementsOnThisLine === 1 ? "statement" : "statements"
					}
				});
				firstExtraStatement = null;
			}
			/**
			* Gets the actual last token of a given node.
			* @param node A node to get. This is a node except EmptyStatement.
			* @returns The actual last token.
			*/
			function getActualLastToken(node) {
				return sourceCode.getLastToken(node, ast_exports.isNotSemicolonToken);
			}
			/**
			* Addresses a given node.
			* It updates the state of this rule, then reports the node if the node violated this rule.
			* @param node A node to check.
			*/
			function enterStatement(node) {
				const line = node.loc.start.line;
				/**
				* Skip to allow non-block statements if this is direct child of control statements.
				* `if (a) foo();` is counted as 1.
				* But `if (a) foo(); else foo();` should be counted as 2.
				*/
				if (node.parent && SINGLE_CHILD_ALLOWED.test(node.parent.type) && (!("alternate" in node.parent) || node.parent.alternate !== node)) return;
				if (line === lastStatementLine) numberOfStatementsOnThisLine += 1;
				else {
					reportFirstExtraStatementAndClear();
					numberOfStatementsOnThisLine = 1;
					lastStatementLine = line;
				}
				if (numberOfStatementsOnThisLine === maxStatementsPerLine + 1) firstExtraStatement = firstExtraStatement || node;
			}
			/**
			* Updates the state of this rule with the end line of leaving node to check with the next statement.
			* @param node A node to check.
			*/
			function leaveStatement(node) {
				const line = getActualLastToken(node).loc.end.line;
				if (line !== lastStatementLine) {
					reportFirstExtraStatementAndClear();
					numberOfStatementsOnThisLine = 1;
					lastStatementLine = line;
				}
			}
			const listeners = { "Program:exit": reportFirstExtraStatementAndClear };
			for (const node of listeningNodes) {
				if (ignoredNodes.includes(node)) continue;
				listeners[node] = enterStatement;
				listeners[`${node}:exit`] = leaveStatement;
			}
			return listeners;
		}
	});
});
export { init_max_statements_per_line, max_statements_per_line_default };

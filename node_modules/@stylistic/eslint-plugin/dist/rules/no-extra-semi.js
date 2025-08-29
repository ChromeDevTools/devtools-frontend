import { __esmMin } from "../rolldown-runtime.js";
import { FixTracker, ast_exports, createRule, init_ast, init_create_rule, init_fix_tracker, isTopLevelExpressionStatement } from "../utils.js";
var no_extra_semi_default;
var init_no_extra_semi = __esmMin(() => {
	init_ast();
	init_create_rule();
	init_fix_tracker();
	no_extra_semi_default = createRule({
		name: "no-extra-semi",
		meta: {
			type: "layout",
			docs: { description: "Disallow unnecessary semicolons" },
			fixable: "code",
			schema: [],
			messages: { unexpected: "Unnecessary semicolon." }
		},
		defaultOptions: [],
		create(context) {
			const sourceCode = context.sourceCode;
			function isFixable(nodeOrToken) {
				const nextToken = sourceCode.getTokenAfter(nodeOrToken);
				if (!nextToken || nextToken.type !== "String") return true;
				const stringNode = sourceCode.getNodeByRangeIndex(nextToken.range[0]);
				return !isTopLevelExpressionStatement(stringNode.parent);
			}
			function report(nodeOrToken) {
				context.report({
					node: nodeOrToken,
					messageId: "unexpected",
					fix: isFixable(nodeOrToken) ? (fixer) => new FixTracker(fixer, context.sourceCode).retainSurroundingTokens(nodeOrToken).remove(nodeOrToken) : null
				});
			}
			function checkForPartOfClassBody(firstToken) {
				for (let token = firstToken; token.type === "Punctuator" && !(0, ast_exports.isClosingBraceToken)(token); token = sourceCode.getTokenAfter(token)) if ((0, ast_exports.isSemicolonToken)(token)) report(token);
			}
			return {
				EmptyStatement(node) {
					const parent = node.parent;
					const allowedParentTypes = [
						"ForStatement",
						"ForInStatement",
						"ForOfStatement",
						"WhileStatement",
						"DoWhileStatement",
						"IfStatement",
						"LabeledStatement",
						"WithStatement"
					];
					if (!allowedParentTypes.includes(parent.type)) report(node);
				},
				ClassBody(node) {
					checkForPartOfClassBody(sourceCode.getFirstToken(node, 1));
				},
				MethodDefinition(node) {
					checkForPartOfClassBody(sourceCode.getTokenAfter(node));
				},
				PropertyDefinition(node) {
					checkForPartOfClassBody(sourceCode.getTokenAfter(node));
				},
				AccessorProperty(node) {
					checkForPartOfClassBody(sourceCode.getTokenAfter(node));
				},
				StaticBlock(node) {
					checkForPartOfClassBody(sourceCode.getTokenAfter(node));
				},
				TSAbstractMethodDefinition(node) {
					checkForPartOfClassBody(sourceCode.getTokenAfter(node));
				},
				TSAbstractPropertyDefinition(node) {
					checkForPartOfClassBody(sourceCode.getTokenAfter(node));
				}
			};
		}
	});
});
export { init_no_extra_semi, no_extra_semi_default };

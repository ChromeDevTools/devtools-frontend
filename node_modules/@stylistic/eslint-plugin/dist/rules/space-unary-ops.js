import { __esmMin } from "../rolldown-runtime.js";
import { canTokensBeAdjacent, createRule, init_ast, init_create_rule, isKeywordToken } from "../utils.js";
var space_unary_ops_default;
var init_space_unary_ops = __esmMin(() => {
	init_ast();
	init_create_rule();
	space_unary_ops_default = createRule({
		name: "space-unary-ops",
		meta: {
			type: "layout",
			docs: { description: "Enforce consistent spacing before or after unary operators" },
			fixable: "whitespace",
			schema: [{
				type: "object",
				properties: {
					words: {
						type: "boolean",
						default: true
					},
					nonwords: {
						type: "boolean",
						default: false
					},
					overrides: {
						type: "object",
						additionalProperties: { type: "boolean" }
					}
				},
				additionalProperties: false
			}],
			messages: {
				unexpectedBefore: "Unexpected space before unary operator '{{operator}}'.",
				unexpectedAfter: "Unexpected space after unary operator '{{operator}}'.",
				unexpectedAfterWord: "Unexpected space after unary word operator '{{word}}'.",
				wordOperator: "Unary word operator '{{word}}' must be followed by whitespace.",
				operator: "Unary operator '{{operator}}' must be followed by whitespace.",
				beforeUnaryExpressions: "Space is required before unary expressions '{{token}}'."
			}
		},
		create(context) {
			const options = context.options[0] || {
				words: true,
				nonwords: false
			};
			const sourceCode = context.sourceCode;
			/**
			* Check if the node is the first "!" in a "!!" convert to Boolean expression
			* @param node AST node
			* @returns Whether or not the node is first "!" in "!!"
			*/
			function isFirstBangInBangBangExpression(node) {
				return node && node.type === "UnaryExpression" && node.argument && node.argument.type === "UnaryExpression" && node.argument.operator === "!";
			}
			/**
			* Checks if an override exists for a given operator.
			* @param operator Operator
			* @returns Whether or not an override has been provided for the operator
			*/
			function overrideExistsForOperator(operator) {
				return options.overrides && Object.prototype.hasOwnProperty.call(options.overrides, operator);
			}
			/**
			* Gets the value that the override was set to for this operator
			* @param operator Operator
			* @returns Whether or not an override enforces a space with this operator
			*/
			function overrideEnforcesSpaces(operator) {
				return options.overrides?.[operator];
			}
			/**
			* Verify Unary Word Operator has spaces after the word operator
			* @param node AST node
			* @param firstToken first token from the AST node
			* @param secondToken second token from the AST node
			* @param word The word to be used for reporting
			*/
			function verifyWordHasSpaces(node, firstToken, secondToken, word) {
				if (secondToken.range[0] === firstToken.range[1]) context.report({
					node,
					messageId: "wordOperator",
					data: { word },
					fix(fixer) {
						return fixer.insertTextAfter(firstToken, " ");
					}
				});
			}
			/**
			* Verify Unary Word Operator doesn't have spaces after the word operator
			* @param node AST node
			* @param firstToken first token from the AST node
			* @param secondToken second token from the AST node
			* @param word The word to be used for reporting
			*/
			function verifyWordDoesntHaveSpaces(node, firstToken, secondToken, word) {
				if (canTokensBeAdjacent(firstToken, secondToken)) {
					if (secondToken.range[0] > firstToken.range[1]) context.report({
						node,
						messageId: "unexpectedAfterWord",
						data: { word },
						fix(fixer) {
							return fixer.removeRange([firstToken.range[1], secondToken.range[0]]);
						}
					});
				}
			}
			/**
			* Check Unary Word Operators for spaces after the word operator
			* @param node AST node
			* @param firstToken first token from the AST node
			* @param secondToken second token from the AST node
			* @param word The word to be used for reporting
			*/
			function checkUnaryWordOperatorForSpaces(node, firstToken, secondToken, word) {
				if (overrideExistsForOperator(word)) if (overrideEnforcesSpaces(word)) verifyWordHasSpaces(node, firstToken, secondToken, word);
				else verifyWordDoesntHaveSpaces(node, firstToken, secondToken, word);
				else if (options.words) verifyWordHasSpaces(node, firstToken, secondToken, word);
				else verifyWordDoesntHaveSpaces(node, firstToken, secondToken, word);
			}
			/**
			* Verifies YieldExpressions satisfy spacing requirements
			* @param node AST node
			*/
			function checkForSpacesAfterYield(node) {
				const tokens = sourceCode.getFirstTokens(node, 3);
				const word = "yield";
				if (!node.argument || node.delegate) return;
				checkUnaryWordOperatorForSpaces(node, tokens[0], tokens[1], word);
			}
			/**
			* Verifies AwaitExpressions satisfy spacing requirements
			* @param node AwaitExpression AST node
			*/
			function checkForSpacesAfterAwait(node) {
				const tokens = sourceCode.getFirstTokens(node, 3);
				checkUnaryWordOperatorForSpaces(node, tokens[0], tokens[1], "await");
			}
			/**
			* Verifies UnaryExpression, UpdateExpression and NewExpression have spaces before or after the operator
			* @param node AST node
			* @param firstToken First token in the expression
			* @param secondToken Second token in the expression
			*/
			function verifyNonWordsHaveSpaces(node, firstToken, secondToken) {
				if ("prefix" in node && node.prefix) {
					if (isFirstBangInBangBangExpression(node)) return;
					if (firstToken.range[1] === secondToken.range[0]) context.report({
						node,
						messageId: "operator",
						data: { operator: firstToken.value },
						fix(fixer) {
							return fixer.insertTextAfter(firstToken, " ");
						}
					});
				} else if (firstToken.range[1] === secondToken.range[0]) context.report({
					node,
					messageId: "beforeUnaryExpressions",
					data: { token: secondToken.value },
					fix(fixer) {
						return fixer.insertTextBefore(secondToken, " ");
					}
				});
			}
			/**
			* Verifies UnaryExpression, UpdateExpression and NewExpression don't have spaces before or after the operator
			* @param node AST node
			* @param firstToken First token in the expression
			* @param secondToken Second token in the expression
			*/
			function verifyNonWordsDontHaveSpaces(node, firstToken, secondToken) {
				if ("prefix" in node && node.prefix) {
					if (secondToken.range[0] > firstToken.range[1]) context.report({
						node,
						messageId: "unexpectedAfter",
						data: { operator: firstToken.value },
						fix(fixer) {
							if (canTokensBeAdjacent(firstToken, secondToken)) return fixer.removeRange([firstToken.range[1], secondToken.range[0]]);
							return null;
						}
					});
				} else if (secondToken.range[0] > firstToken.range[1]) context.report({
					node,
					messageId: "unexpectedBefore",
					data: { operator: secondToken.value },
					fix(fixer) {
						return fixer.removeRange([firstToken.range[1], secondToken.range[0]]);
					}
				});
			}
			/**
			* Verifies UnaryExpression, UpdateExpression and NewExpression satisfy spacing requirements
			* @param node AST node
			*/
			function checkForSpaces(node) {
				const tokens = node.type === "UpdateExpression" && !node.prefix ? sourceCode.getLastTokens(node, 2) : sourceCode.getFirstTokens(node, 2);
				const firstToken = tokens[0];
				const secondToken = tokens[1];
				if ((node.type === "NewExpression" || node.prefix) && isKeywordToken(firstToken)) {
					checkUnaryWordOperatorForSpaces(node, firstToken, secondToken, firstToken.value);
					return;
				}
				const operator = "prefix" in node && node.prefix ? tokens[0].value : tokens[1].value;
				if (overrideExistsForOperator(operator)) if (overrideEnforcesSpaces(operator)) verifyNonWordsHaveSpaces(node, firstToken, secondToken);
				else verifyNonWordsDontHaveSpaces(node, firstToken, secondToken);
				else if (options.nonwords) verifyNonWordsHaveSpaces(node, firstToken, secondToken);
				else verifyNonWordsDontHaveSpaces(node, firstToken, secondToken);
			}
			return {
				UnaryExpression: checkForSpaces,
				UpdateExpression: checkForSpaces,
				NewExpression: checkForSpaces,
				YieldExpression: checkForSpacesAfterYield,
				AwaitExpression: checkForSpacesAfterAwait
			};
		}
	});
});
export { init_space_unary_ops, space_unary_ops_default };

import { __esmMin } from "../rolldown-runtime.js";
import { ast_exports, createRule, init_ast, init_create_rule } from "../utils.js";
var OPTION_ENUMS, padded_blocks_default;
var init_padded_blocks = __esmMin(() => {
	init_ast();
	init_create_rule();
	OPTION_ENUMS = [
		"always",
		"never",
		"start",
		"end"
	];
	padded_blocks_default = createRule({
		name: "padded-blocks",
		meta: {
			type: "layout",
			docs: { description: "Require or disallow padding within blocks" },
			fixable: "whitespace",
			schema: [{ oneOf: [{
				type: "string",
				enum: OPTION_ENUMS
			}, {
				type: "object",
				properties: {
					blocks: {
						type: "string",
						enum: OPTION_ENUMS
					},
					switches: {
						type: "string",
						enum: OPTION_ENUMS
					},
					classes: {
						type: "string",
						enum: OPTION_ENUMS
					}
				},
				additionalProperties: false,
				minProperties: 1
			}] }, {
				type: "object",
				properties: { allowSingleLineBlocks: { type: "boolean" } },
				additionalProperties: false
			}],
			messages: {
				missingPadBlock: "Block must be padded by blank lines.",
				extraPadBlock: "Block must not be padded by blank lines."
			}
		},
		create(context) {
			const options = {};
			const typeOptions = context.options[0] || "always";
			const exceptOptions = context.options[1] || {};
			if (typeof typeOptions === "string") {
				options.blocks = typeOptions;
				options.switches = typeOptions;
				options.classes = typeOptions;
			} else Object.assign(options, typeOptions);
			exceptOptions.allowSingleLineBlocks ??= false;
			const sourceCode = context.sourceCode;
			/**
			* Gets the open brace token from a given node.
			* @param node A BlockStatement or SwitchStatement node from which to get the open brace.
			* @returns The token of the open brace.
			*/
			function getOpenBrace(node) {
				if (node.type === "SwitchStatement") return sourceCode.getTokenBefore(node.cases[0]);
				if (node.type === "StaticBlock") return sourceCode.getFirstToken(node, { skip: 1 });
				return sourceCode.getFirstToken(node);
			}
			/**
			* Checks if the given parameter is a comment node
			* @param node An AST node or token
			* @returns True if node is a comment
			*/
			function isComment(node) {
				return node.type === "Line" || node.type === "Block";
			}
			/**
			* Checks if there is padding between two tokens
			* @param first The first token
			* @param second The second token
			* @returns True if there is at least a line between the tokens
			*/
			function isPaddingBetweenTokens(first, second) {
				return second.loc.start.line - first.loc.end.line >= 2;
			}
			/**
			* Checks if the given token has a blank line after it.
			* @param token The token to check.
			* @returns Whether or not the token is followed by a blank line.
			*/
			function getFirstBlockToken(token) {
				let prev;
				let first = token;
				do {
					prev = first;
					first = sourceCode.getTokenAfter(first, { includeComments: true });
				} while (isComment(first) && (0, ast_exports.isTokenOnSameLine)(prev, first));
				return first;
			}
			/**
			* Checks if the given token is preceded by a blank line.
			* @param token The token to check
			* @returns Whether or not the token is preceded by a blank line
			*/
			function getLastBlockToken(token) {
				let last = token;
				let next;
				do {
					next = last;
					last = sourceCode.getTokenBefore(last, { includeComments: true });
				} while (isComment(last) && (0, ast_exports.isTokenOnSameLine)(last, next));
				return last;
			}
			/**
			* Checks if a node should be padded, according to the rule config.
			* @param node The AST node to check.
			* @throws {Error} (Unreachable)
			* @returns True if the node should be padded, false otherwise.
			*/
			function requirePaddingFor(node) {
				switch (node.type) {
					case "BlockStatement":
					case "StaticBlock": return options.blocks;
					case "SwitchStatement": return options.switches;
					case "ClassBody": return options.classes;
					default: throw new Error("unreachable");
				}
			}
			/**
			* Checks the given BlockStatement node to be padded if the block is not empty.
			* @param node The AST node of a BlockStatement.
			*/
			function checkPadding(node) {
				const openBrace = getOpenBrace(node);
				const firstBlockToken = getFirstBlockToken(openBrace);
				const tokenBeforeFirst = sourceCode.getTokenBefore(firstBlockToken, { includeComments: true });
				const closeBrace = sourceCode.getLastToken(node);
				const lastBlockToken = getLastBlockToken(closeBrace);
				const tokenAfterLast = sourceCode.getTokenAfter(lastBlockToken, { includeComments: true });
				const blockHasTopPadding = isPaddingBetweenTokens(tokenBeforeFirst, firstBlockToken);
				const blockHasBottomPadding = isPaddingBetweenTokens(lastBlockToken, tokenAfterLast);
				if (exceptOptions.allowSingleLineBlocks && (0, ast_exports.isTokenOnSameLine)(tokenBeforeFirst, tokenAfterLast)) return;
				const requiredPadding = requirePaddingFor(node);
				if (blockHasTopPadding) {
					if (requiredPadding === "never" || requiredPadding === "end") context.report({
						node,
						loc: {
							start: tokenBeforeFirst.loc.start,
							end: firstBlockToken.loc.start
						},
						fix(fixer) {
							return fixer.replaceTextRange([tokenBeforeFirst.range[1], firstBlockToken.range[0] - firstBlockToken.loc.start.column], "\n");
						},
						messageId: "extraPadBlock"
					});
				} else if (requiredPadding === "always" || requiredPadding === "start") context.report({
					node,
					loc: {
						start: tokenBeforeFirst.loc.start,
						end: firstBlockToken.loc.start
					},
					fix(fixer) {
						return fixer.insertTextAfter(tokenBeforeFirst, "\n");
					},
					messageId: "missingPadBlock"
				});
				if (blockHasBottomPadding) {
					if (requiredPadding === "never" || requiredPadding === "start") context.report({
						node,
						loc: {
							end: tokenAfterLast.loc.start,
							start: lastBlockToken.loc.end
						},
						messageId: "extraPadBlock",
						fix(fixer) {
							return fixer.replaceTextRange([lastBlockToken.range[1], tokenAfterLast.range[0] - tokenAfterLast.loc.start.column], "\n");
						}
					});
				} else if (requiredPadding === "always" || requiredPadding === "end") context.report({
					node,
					loc: {
						end: tokenAfterLast.loc.start,
						start: lastBlockToken.loc.end
					},
					fix(fixer) {
						return fixer.insertTextBefore(tokenAfterLast, "\n");
					},
					messageId: "missingPadBlock"
				});
			}
			const rule = {};
			if (Object.prototype.hasOwnProperty.call(options, "switches")) rule.SwitchStatement = function(node) {
				if (node.cases.length === 0) return;
				checkPadding(node);
			};
			if (Object.prototype.hasOwnProperty.call(options, "blocks")) {
				rule.BlockStatement = function(node) {
					if (node.body.length === 0) return;
					checkPadding(node);
				};
				rule.StaticBlock = rule.BlockStatement;
			}
			if (Object.prototype.hasOwnProperty.call(options, "classes")) rule.ClassBody = function(node) {
				if (node.body.length === 0) return;
				checkPadding(node);
			};
			return rule;
		}
	});
});
export { init_padded_blocks, padded_blocks_default };

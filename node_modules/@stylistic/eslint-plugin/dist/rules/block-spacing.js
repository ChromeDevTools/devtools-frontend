import { __esmMin } from "../rolldown-runtime.js";
import { AST_TOKEN_TYPES, ast_exports, createRule, init_ast, init_create_rule } from "../utils.js";
var block_spacing_default;
var init_block_spacing = __esmMin(() => {
	init_ast();
	init_create_rule();
	block_spacing_default = createRule({
		name: "block-spacing",
		meta: {
			type: "layout",
			docs: { description: "Disallow or enforce spaces inside of blocks after opening block and before closing block" },
			fixable: "whitespace",
			schema: [{
				type: "string",
				enum: ["always", "never"]
			}],
			messages: {
				missing: "Requires a space {{location}} '{{token}}'.",
				extra: "Unexpected space(s) {{location}} '{{token}}'."
			}
		},
		defaultOptions: ["always"],
		create(context, [whenToApplyOption]) {
			const sourceCode = context.sourceCode;
			const always = whenToApplyOption !== "never";
			const messageId = always ? "missing" : "extra";
			/**
			* Gets the open brace token from a given node.
			* @returns The token of the open brace.
			*/
			function getOpenBrace(node) {
				return sourceCode.getFirstToken(node, { filter: (token) => (0, ast_exports.isOpeningBraceToken)(token) });
			}
			/**
			* Checks whether or not:
			*   - given tokens are on same line.
			*   - there is/isn't a space between given tokens.
			* @param left A token to check.
			* @param right The token which is next to `left`.
			* @returns
			*    When the option is `"always"`, `true` if there are one or more spaces between given tokens.
			*    When the option is `"never"`, `true` if there are not any spaces between given tokens.
			*    If given tokens are not on same line, it's always `true`.
			*/
			function isValid(left, right) {
				return !(0, ast_exports.isTokenOnSameLine)(left, right) || sourceCode.isSpaceBetween(left, right) === always;
			}
			/**
			* Checks and reports invalid spacing style inside braces.
			*/
			function checkSpacingInsideBraces(node) {
				const openBrace = getOpenBrace(node);
				const closeBrace = sourceCode.getLastToken(node);
				const firstToken = sourceCode.getTokenAfter(openBrace, { includeComments: true });
				const lastToken = sourceCode.getTokenBefore(closeBrace, { includeComments: true });
				if (!(0, ast_exports.isOpeningBraceToken)(openBrace) || !(0, ast_exports.isClosingBraceToken)(closeBrace) || firstToken === closeBrace) return;
				if (!always && firstToken.type === AST_TOKEN_TYPES.Line) return;
				if (!isValid(openBrace, firstToken)) {
					let loc = openBrace.loc;
					if (messageId === "extra") loc = {
						start: openBrace.loc.end,
						end: firstToken.loc.start
					};
					context.report({
						node,
						loc,
						messageId,
						data: {
							location: "after",
							token: openBrace.value
						},
						fix(fixer) {
							if (always) return fixer.insertTextBefore(firstToken, " ");
							return fixer.removeRange([openBrace.range[1], firstToken.range[0]]);
						}
					});
				}
				if (!isValid(lastToken, closeBrace)) {
					let loc = closeBrace.loc;
					if (messageId === "extra") loc = {
						start: lastToken.loc.end,
						end: closeBrace.loc.start
					};
					context.report({
						node,
						loc,
						messageId,
						data: {
							location: "before",
							token: closeBrace.value
						},
						fix(fixer) {
							if (always) return fixer.insertTextAfter(lastToken, " ");
							return fixer.removeRange([lastToken.range[1], closeBrace.range[0]]);
						}
					});
				}
			}
			return {
				BlockStatement: checkSpacingInsideBraces,
				StaticBlock: checkSpacingInsideBraces,
				SwitchStatement: checkSpacingInsideBraces
			};
		}
	});
});
export { block_spacing_default, init_block_spacing };

import { __esmMin } from "../rolldown-runtime.js";
import { ast_exports, createRule, init_ast, init_create_rule } from "../utils.js";
var computed_property_spacing_default;
var init_computed_property_spacing = __esmMin(() => {
	init_ast();
	init_create_rule();
	computed_property_spacing_default = createRule({
		name: "computed-property-spacing",
		meta: {
			type: "layout",
			docs: { description: "Enforce consistent spacing inside computed property brackets" },
			fixable: "whitespace",
			schema: [{
				type: "string",
				enum: ["always", "never"]
			}, {
				type: "object",
				properties: { enforceForClassMembers: {
					type: "boolean",
					default: true
				} },
				additionalProperties: false
			}],
			messages: {
				unexpectedSpaceBefore: "There should be no space before '{{tokenValue}}'.",
				unexpectedSpaceAfter: "There should be no space after '{{tokenValue}}'.",
				missingSpaceBefore: "A space is required before '{{tokenValue}}'.",
				missingSpaceAfter: "A space is required after '{{tokenValue}}'."
			}
		},
		create(context) {
			const sourceCode = context.sourceCode;
			const propertyNameMustBeSpaced = context.options[0] === "always";
			const enforceForClassMembers = !context.options[1] || context.options[1].enforceForClassMembers;
			/**
			* Reports that there shouldn't be a space after the first token
			* @param node The node to report in the event of an error.
			* @param token The token to use for the report.
			* @param tokenAfter The token after `token`.
			*/
			function reportNoBeginningSpace(node, token, tokenAfter) {
				context.report({
					node,
					loc: {
						start: token.loc.end,
						end: tokenAfter.loc.start
					},
					messageId: "unexpectedSpaceAfter",
					data: { tokenValue: token.value },
					fix(fixer) {
						return fixer.removeRange([token.range[1], tokenAfter.range[0]]);
					}
				});
			}
			/**
			* Reports that there shouldn't be a space before the last token
			* @param node The node to report in the event of an error.
			* @param token The token to use for the report.
			* @param tokenBefore The token before `token`.
			*/
			function reportNoEndingSpace(node, token, tokenBefore) {
				context.report({
					node,
					loc: {
						start: tokenBefore.loc.end,
						end: token.loc.start
					},
					messageId: "unexpectedSpaceBefore",
					data: { tokenValue: token.value },
					fix(fixer) {
						return fixer.removeRange([tokenBefore.range[1], token.range[0]]);
					}
				});
			}
			/**
			* Reports that there should be a space after the first token
			* @param node The node to report in the event of an error.
			* @param token The token to use for the report.
			*/
			function reportRequiredBeginningSpace(node, token) {
				context.report({
					node,
					loc: token.loc,
					messageId: "missingSpaceAfter",
					data: { tokenValue: token.value },
					fix(fixer) {
						return fixer.insertTextAfter(token, " ");
					}
				});
			}
			/**
			* Reports that there should be a space before the last token
			* @param node The node to report in the event of an error.
			* @param token The token to use for the report.
			*/
			function reportRequiredEndingSpace(node, token) {
				context.report({
					node,
					loc: token.loc,
					messageId: "missingSpaceBefore",
					data: { tokenValue: token.value },
					fix(fixer) {
						return fixer.insertTextBefore(token, " ");
					}
				});
			}
			/**
			* Returns a function that checks the spacing of a node on the property name
			* that was passed in.
			* @param propertyName The property on the node to check for spacing
			* @returns A function that will check spacing on a node
			*/
			function checkSpacing(propertyName) {
				return function(node) {
					if (!node.computed) return;
					const property = node[propertyName];
					const before = sourceCode.getTokenBefore(property, ast_exports.isOpeningBracketToken);
					const first = sourceCode.getTokenAfter(before, { includeComments: true });
					const after = sourceCode.getTokenAfter(property, ast_exports.isClosingBracketToken);
					const last = sourceCode.getTokenBefore(after, { includeComments: true });
					if ((0, ast_exports.isTokenOnSameLine)(before, first)) {
						if (propertyNameMustBeSpaced) {
							if (!sourceCode.isSpaceBetween(before, first) && (0, ast_exports.isTokenOnSameLine)(before, first)) reportRequiredBeginningSpace(node, before);
						} else if (sourceCode.isSpaceBetween(before, first)) reportNoBeginningSpace(node, before, first);
					}
					if ((0, ast_exports.isTokenOnSameLine)(last, after)) {
						if (propertyNameMustBeSpaced) {
							if (!sourceCode.isSpaceBetween(last, after) && (0, ast_exports.isTokenOnSameLine)(last, after)) reportRequiredEndingSpace(node, after);
						} else if (sourceCode.isSpaceBetween(last, after)) reportNoEndingSpace(node, after, last);
					}
				};
			}
			const listeners = {
				Property: checkSpacing("key"),
				MemberExpression: checkSpacing("property")
			};
			if (enforceForClassMembers) {
				listeners.MethodDefinition = checkSpacing("key");
				listeners.PropertyDefinition = checkSpacing("key");
			}
			return listeners;
		}
	});
});
export { computed_property_spacing_default, init_computed_property_spacing };

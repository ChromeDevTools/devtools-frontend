import { __esmMin } from "../rolldown-runtime.js";
import { AST_NODE_TYPES, AST_TOKEN_TYPES, ast_exports, createRule, init_ast, init_create_rule } from "../utils.js";
var object_curly_spacing_default;
var init_object_curly_spacing = __esmMin(() => {
	init_ast();
	init_create_rule();
	object_curly_spacing_default = createRule({
		name: "object-curly-spacing",
		meta: {
			type: "layout",
			docs: { description: "Enforce consistent spacing inside braces" },
			fixable: "whitespace",
			schema: [{
				type: "string",
				enum: ["always", "never"]
			}, {
				type: "object",
				properties: {
					arraysInObjects: { type: "boolean" },
					objectsInObjects: { type: "boolean" }
				},
				additionalProperties: false
			}],
			messages: {
				requireSpaceBefore: "A space is required before '{{token}}'.",
				requireSpaceAfter: "A space is required after '{{token}}'.",
				unexpectedSpaceBefore: "There should be no space before '{{token}}'.",
				unexpectedSpaceAfter: "There should be no space after '{{token}}'."
			}
		},
		defaultOptions: ["never"],
		create(context) {
			const [firstOption, secondOption] = context.options;
			const spaced = firstOption === "always";
			const sourceCode = context.sourceCode;
			function isOptionSet(option) {
				return secondOption ? secondOption[option] === !spaced : false;
			}
			const options = {
				spaced,
				arraysInObjectsException: isOptionSet("arraysInObjects"),
				objectsInObjectsException: isOptionSet("objectsInObjects")
			};
			function reportNoBeginningSpace(node, token) {
				const nextToken = sourceCode.getTokenAfter(token, { includeComments: true });
				context.report({
					node,
					loc: {
						start: token.loc.end,
						end: nextToken.loc.start
					},
					messageId: "unexpectedSpaceAfter",
					data: { token: token.value },
					fix(fixer) {
						return fixer.removeRange([token.range[1], nextToken.range[0]]);
					}
				});
			}
			function reportNoEndingSpace(node, token) {
				const previousToken = sourceCode.getTokenBefore(token, { includeComments: true });
				context.report({
					node,
					loc: {
						start: previousToken.loc.end,
						end: token.loc.start
					},
					messageId: "unexpectedSpaceBefore",
					data: { token: token.value },
					fix(fixer) {
						return fixer.removeRange([previousToken.range[1], token.range[0]]);
					}
				});
			}
			function reportRequiredBeginningSpace(node, token) {
				context.report({
					node,
					loc: token.loc,
					messageId: "requireSpaceAfter",
					data: { token: token.value },
					fix(fixer) {
						return fixer.insertTextAfter(token, " ");
					}
				});
			}
			function reportRequiredEndingSpace(node, token) {
				context.report({
					node,
					loc: token.loc,
					messageId: "requireSpaceBefore",
					data: { token: token.value },
					fix(fixer) {
						return fixer.insertTextBefore(token, " ");
					}
				});
			}
			function validateBraceSpacing(node, openingToken, closingToken) {
				const tokenAfterOpening = sourceCode.getTokenAfter(openingToken, { includeComments: true });
				if ((0, ast_exports.isTokenOnSameLine)(openingToken, tokenAfterOpening)) {
					const firstSpaced = sourceCode.isSpaceBetween(openingToken, tokenAfterOpening);
					const secondType = sourceCode.getNodeByRangeIndex(tokenAfterOpening.range[0]).type;
					const openingCurlyBraceMustBeSpaced = options.arraysInObjectsException && [AST_NODE_TYPES.TSMappedType, AST_NODE_TYPES.TSIndexSignature].includes(secondType) ? !options.spaced : options.spaced;
					if (openingCurlyBraceMustBeSpaced && !firstSpaced) reportRequiredBeginningSpace(node, openingToken);
					if (!openingCurlyBraceMustBeSpaced && firstSpaced && tokenAfterOpening.type !== AST_TOKEN_TYPES.Line) reportNoBeginningSpace(node, openingToken);
				}
				const tokenBeforeClosing = sourceCode.getTokenBefore(closingToken, { includeComments: true });
				if ((0, ast_exports.isTokenOnSameLine)(tokenBeforeClosing, closingToken)) {
					const shouldCheckPenultimate = options.arraysInObjectsException && (0, ast_exports.isClosingBracketToken)(tokenBeforeClosing) || options.objectsInObjectsException && (0, ast_exports.isClosingBraceToken)(tokenBeforeClosing);
					const penultimateType = shouldCheckPenultimate ? sourceCode.getNodeByRangeIndex(tokenBeforeClosing.range[0]).type : void 0;
					const closingCurlyBraceMustBeSpaced = options.arraysInObjectsException && [AST_NODE_TYPES.ArrayExpression, AST_NODE_TYPES.TSTupleType].includes(penultimateType) || options.objectsInObjectsException && penultimateType !== void 0 && [
						AST_NODE_TYPES.ObjectExpression,
						AST_NODE_TYPES.ObjectPattern,
						AST_NODE_TYPES.TSMappedType,
						AST_NODE_TYPES.TSTypeLiteral
					].includes(penultimateType) ? !options.spaced : options.spaced;
					const lastSpaced = sourceCode.isSpaceBetween(tokenBeforeClosing, closingToken);
					if (closingCurlyBraceMustBeSpaced && !lastSpaced) reportRequiredEndingSpace(node, closingToken);
					if (!closingCurlyBraceMustBeSpaced && lastSpaced) reportNoEndingSpace(node, closingToken);
				}
			}
			function checkForObjectLike(node, properties) {
				if (properties.length === 0) return;
				const openingToken = sourceCode.getTokenBefore(properties[0], ast_exports.isOpeningBraceToken);
				const closeToken = sourceCode.getTokenAfter(properties.at(-1), ast_exports.isClosingBraceToken);
				validateBraceSpacing(node, openingToken, closeToken);
			}
			return {
				ObjectPattern(node) {
					checkForObjectLike(node, node.properties);
				},
				ObjectExpression(node) {
					checkForObjectLike(node, node.properties);
				},
				ImportDeclaration(node) {
					if (node.attributes) checkForObjectLike(node, node.attributes);
					const firstSpecifierIndex = node.specifiers.findIndex((specifier) => specifier.type === "ImportSpecifier");
					if (firstSpecifierIndex === -1) return;
					checkForObjectLike(node, node.specifiers.slice(firstSpecifierIndex));
				},
				ExportNamedDeclaration(node) {
					checkForObjectLike(node, node.specifiers);
					if (node.attributes) checkForObjectLike(node, node.attributes);
				},
				ExportAllDeclaration(node) {
					if (node.attributes) checkForObjectLike(node, node.attributes);
				},
				TSMappedType(node) {
					const openingToken = sourceCode.getFirstToken(node);
					const closeToken = sourceCode.getLastToken(node);
					validateBraceSpacing(node, openingToken, closeToken);
				},
				TSTypeLiteral(node) {
					checkForObjectLike(node, node.members);
				},
				TSInterfaceBody(node) {
					checkForObjectLike(node, node.body);
				},
				TSEnumBody(node) {
					checkForObjectLike(node, node.members);
				}
			};
		}
	});
});
export { init_object_curly_spacing, object_curly_spacing_default };

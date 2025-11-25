import { AST_NODE_TYPES, ast_exports, createRule, hasCommentsBetween, isSingleLine } from "../utils.js";
var list_style_default = createRule({
	name: "list-style",
	meta: {
		type: "layout",
		docs: {
			description: "Enforce consistent spacing and line break styles inside brackets.",
			experimental: true
		},
		fixable: "whitespace",
		schema: [{
			$defs: {
				singleLineConfig: {
					type: "object",
					additionalProperties: false,
					properties: {
						spacing: {
							type: "string",
							enum: ["always", "never"]
						},
						maxItems: {
							type: "integer",
							minimum: 0
						}
					}
				},
				multiLineConfig: {
					type: "object",
					additionalProperties: false,
					properties: { minItems: {
						type: "integer",
						minimum: 0
					} }
				},
				baseConfig: {
					type: "object",
					additionalProperties: false,
					properties: {
						singleLine: { $ref: "#/items/0/$defs/singleLineConfig" },
						multiline: { $ref: "#/items/0/$defs/multiLineConfig" }
					}
				}
			},
			type: "object",
			additionalProperties: false,
			properties: {
				singleLine: { $ref: "#/items/0/$defs/singleLineConfig" },
				multiLine: { $ref: "#/items/0/$defs/multiLineConfig" },
				overrides: {
					type: "object",
					additionalProperties: false,
					properties: {
						"[]": { $ref: "#/items/0/$defs/baseConfig" },
						"{}": { $ref: "#/items/0/$defs/baseConfig" },
						"<>": { $ref: "#/items/0/$defs/baseConfig" },
						"()": { $ref: "#/items/0/$defs/baseConfig" },
						"ArrayExpression": { $ref: "#/items/0/$defs/baseConfig" },
						"ArrayPattern": { $ref: "#/items/0/$defs/baseConfig" },
						"ArrowFunctionExpression": { $ref: "#/items/0/$defs/baseConfig" },
						"CallExpression": { $ref: "#/items/0/$defs/baseConfig" },
						"ExportNamedDeclaration": { $ref: "#/items/0/$defs/baseConfig" },
						"FunctionDeclaration": { $ref: "#/items/0/$defs/baseConfig" },
						"FunctionExpression": { $ref: "#/items/0/$defs/baseConfig" },
						"ImportDeclaration": { $ref: "#/items/0/$defs/baseConfig" },
						"ImportAttributes": { $ref: "#/items/0/$defs/baseConfig" },
						"NewExpression": { $ref: "#/items/0/$defs/baseConfig" },
						"ObjectExpression": { $ref: "#/items/0/$defs/baseConfig" },
						"ObjectPattern": { $ref: "#/items/0/$defs/baseConfig" },
						"TSDeclareFunction": { $ref: "#/items/0/$defs/baseConfig" },
						"TSFunctionType": { $ref: "#/items/0/$defs/baseConfig" },
						"TSInterfaceBody": { $ref: "#/items/0/$defs/baseConfig" },
						"TSEnumBody": { $ref: "#/items/0/$defs/baseConfig" },
						"TSTupleType": { $ref: "#/items/0/$defs/baseConfig" },
						"TSTypeLiteral": { $ref: "#/items/0/$defs/baseConfig" },
						"TSTypeParameterDeclaration": { $ref: "#/items/0/$defs/baseConfig" },
						"TSTypeParameterInstantiation": { $ref: "#/items/0/$defs/baseConfig" },
						"JSONArrayExpression": { $ref: "#/items/0/$defs/baseConfig" },
						"JSONObjectExpression": { $ref: "#/items/0/$defs/baseConfig" }
					}
				}
			}
		}],
		messages: {
			shouldSpacing: `Should have space between '{{prev}}' and '{{next}}'`,
			shouldNotSpacing: `Should not have space(s) between '{{prev}}' and '{{next}}'`,
			shouldWrap: `Should have line break between '{{prev}}' and '{{next}}'`,
			shouldNotWrap: `Should not have line break(s) between '{{prev}}' and '{{next}}'`
		}
	},
	defaultOptions: [{
		singleLine: {
			spacing: "never",
			maxItems: Number.POSITIVE_INFINITY
		},
		multiLine: { minItems: 0 },
		overrides: { "{}": { singleLine: { spacing: "always" } } }
	}],
	create: (context, [options] = [{}]) => {
		const { sourceCode } = context;
		const { singleLine, multiLine, overrides } = options;
		const _resolvedOptions = {};
		function resolveOption(parenType, nodeType) {
			if (!_resolvedOptions[nodeType]) {
				const overridesByParen = overrides[parenType] ?? {};
				const overridesByNode = overrides[nodeType] ?? {};
				_resolvedOptions[nodeType] = {
					singleLine: {
						...singleLine,
						...overridesByParen.singleLine,
						...overridesByNode.singleLine
					},
					multiline: {
						...multiLine,
						...overridesByParen.multiline,
						...overridesByNode.multiline
					}
				};
			}
			return _resolvedOptions[nodeType];
		}
		function getDelimiter(root, current) {
			if (root.type !== "TSInterfaceBody" && root.type !== "TSTypeLiteral") return;
			return current.value.match(/(?:,|;)$/) ? void 0 : ",";
		}
		function checkSpacing(node, left, right, config) {
			const shouldSpace = config.singleLine.spacing === "always";
			const firstToken = sourceCode.getTokenAfter(left, { includeComments: true });
			const lastToken = sourceCode.getTokenBefore(right, { includeComments: true });
			function doCheck(prev, next) {
				const spaced = sourceCode.isSpaceBetween(prev, next);
				if (!spaced && shouldSpace) context.report({
					node,
					messageId: "shouldSpacing",
					loc: {
						start: prev.loc.end,
						end: next.loc.start
					},
					data: {
						prev: prev.value,
						next: next.value
					},
					fix(fixer) {
						return fixer.insertTextAfter(prev, " ");
					}
				});
				else if (spaced && !shouldSpace) context.report({
					node,
					messageId: "shouldNotSpacing",
					loc: {
						start: prev.loc.end,
						end: next.loc.start
					},
					data: {
						prev: prev.value,
						next: next.value
					},
					fix(fixer) {
						return fixer.removeRange([prev.range[1], next.range[0]]);
					}
				});
			}
			doCheck(left, firstToken);
			doCheck(lastToken, right);
		}
		function checkWrap(node, items, left, right, config) {
			const len = items.length;
			const needWrap = isSingleLine(node) ? len > config.singleLine.maxItems : len >= config.multiline.minItems && !(0, ast_exports.isTokenOnSameLine)(left, items[0] ?? sourceCode.getTokenAfter(left));
			function doCheck(prev, next) {
				if ((0, ast_exports.isTokenOnSameLine)(prev, next)) {
					if (!needWrap) return;
					context.report({
						node,
						messageId: "shouldWrap",
						loc: {
							start: prev.loc.end,
							end: next.loc.start
						},
						data: {
							prev: prev.value,
							next: next.value
						},
						fix(fixer) {
							if (hasCommentsBetween(sourceCode, prev, next)) return null;
							return fixer.insertTextBefore(next, "\n");
						}
					});
				} else {
					if (needWrap) return;
					context.report({
						node,
						messageId: "shouldNotWrap",
						loc: {
							start: prev.loc.end,
							end: next.loc.start
						},
						data: {
							prev: prev.value,
							next: next.value
						},
						fix(fixer) {
							if (hasCommentsBetween(sourceCode, prev, next)) return null;
							const range = [prev.range[1], next.range[0]];
							const code = sourceCode.text.slice(...range);
							const delimiter = items.length === 1 ? "" : getDelimiter(node, prev);
							return fixer.replaceTextRange(range, code.replaceAll(new RegExp(ast_exports.LINEBREAK_MATCHER, "g"), delimiter ?? ""));
						}
					});
				}
			}
			const tokenAfterLeft = sourceCode.getTokenAfter(left, { includeComments: false });
			doCheck(left, tokenAfterLeft);
			for (let i = 0; i < len; i++) {
				const currentItem = items[i];
				if (!currentItem) continue;
				const currentFirstToken = sourceCode.getFirstToken(currentItem);
				if (i === 0 && tokenAfterLeft === currentFirstToken) continue;
				doCheck(sourceCode.getTokenBefore(currentItem, {
					filter: (token) => (0, ast_exports.isNotOpeningParenToken)(token) || token === left,
					includeComments: false
				}), currentFirstToken);
			}
			doCheck(sourceCode.getTokenBefore(right, { includeComments: false }), right);
		}
		const parenMatchers = {
			"[]": {
				left: ast_exports.isOpeningBracketToken,
				right: ast_exports.isClosingBracketToken
			},
			"{}": {
				left: ast_exports.isOpeningBraceToken,
				right: ast_exports.isClosingBraceToken
			},
			"()": {
				left: ast_exports.isOpeningParenToken,
				right: ast_exports.isClosingParenToken
			},
			"<>": {
				left: (token) => token.value === "<",
				right: (token) => token.value === ">"
			}
		};
		function getLeftParen(node, items, type) {
			switch (node.type) {
				case AST_NODE_TYPES.CallExpression:
				case AST_NODE_TYPES.NewExpression: return sourceCode.getTokenAfter(node.typeArguments ?? node.callee);
				case AST_NODE_TYPES.ArrayExpression:
				case AST_NODE_TYPES.ArrayPattern: return sourceCode.getFirstToken(node);
				default: {
					const maybeLeft = sourceCode.getTokenBefore(items[0]);
					const { left: matcher } = parenMatchers[type];
					return maybeLeft && matcher(maybeLeft) ? maybeLeft : null;
				}
			}
		}
		function getRightParen(node, items, type) {
			switch (node.type) {
				case AST_NODE_TYPES.ArrayExpression:
				case AST_NODE_TYPES.ArrayPattern: return sourceCode.getLastToken(node);
				default: {
					const maybeRight = sourceCode.getTokenAfter(items.at(-1), ast_exports.isNotCommaToken);
					const { right: matcher } = parenMatchers[type];
					return maybeRight && matcher(maybeRight) ? maybeRight : null;
				}
			}
		}
		function check(parenType, node, items) {
			if (items.length === 0) return;
			const left = getLeftParen(node, items, parenType);
			const right = getRightParen(node, items, parenType);
			if (!left || !right) return;
			const config = resolveOption(parenType, items[0]?.type === "ImportAttribute" ? "ImportAttributes" : node.type);
			if ((0, ast_exports.isTokenOnSameLine)(left, right) && items.length <= config.singleLine.maxItems) checkSpacing(node, left, right, config);
			else checkWrap(node, items, left, right, config);
		}
		return {
			ArrayExpression(node) {
				check("[]", node, node.elements);
			},
			ArrayPattern(node) {
				check("[]", node, node.elements);
			},
			ObjectExpression(node) {
				check("{}", node, node.properties);
			},
			ObjectPattern(node) {
				check("{}", node, node.properties);
			},
			FunctionDeclaration(node) {
				check("()", node, node.params);
			},
			FunctionExpression(node) {
				check("()", node, node.params);
			},
			ArrowFunctionExpression(node) {
				check("()", node, node.params);
			},
			CallExpression(node) {
				check("()", node, node.arguments);
			},
			NewExpression(node) {
				check("()", node, node.arguments);
			},
			ImportDeclaration(node) {
				check("{}", node, node.specifiers.filter((specifier) => specifier.type === "ImportSpecifier"));
				if (node.attributes) check("{}", node, node.attributes);
			},
			ExportNamedDeclaration(node) {
				check("{}", node, node.specifiers);
				if (node.attributes) check("{}", node, node.attributes);
			},
			ExportAllDeclaration(node) {
				if (node.attributes) check("{}", node, node.attributes);
			},
			TSTupleType(node) {
				check("[]", node, node.elementTypes);
			},
			TSTypeLiteral(node) {
				check("{}", node, node.members);
			},
			TSInterfaceBody(node) {
				check("{}", node, node.body);
			},
			TSEnumBody(node) {
				check("{}", node, node.members);
			},
			TSDeclareFunction(node) {
				check("()", node, node.params);
			},
			TSFunctionType(node) {
				check("()", node, node.params);
			},
			TSTypeParameterDeclaration(node) {
				check("<>", node, node.params);
			},
			TSTypeParameterInstantiation(node) {
				check("<>", node, node.params);
			},
			JSONArrayExpression(node) {
				check("[]", node, node.elements);
			},
			JSONObjectExpression(node) {
				check("{}", node, node.properties);
			}
		};
	}
});
export { list_style_default };

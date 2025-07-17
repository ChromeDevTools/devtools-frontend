import { __esmMin } from "../rolldown-runtime.js";
import { AST_NODE_TYPES, ast_exports, createRule, getNextLocation, init_ast, init_create_rule } from "../utils.js";
var OPTION_VALUE_SCHEME, comma_dangle_default;
var init_comma_dangle = __esmMin(() => {
	init_ast();
	init_create_rule();
	OPTION_VALUE_SCHEME = [
		"always-multiline",
		"always",
		"never",
		"only-multiline"
	];
	comma_dangle_default = createRule({
		name: "comma-dangle",
		meta: {
			type: "layout",
			docs: { description: "Require or disallow trailing commas" },
			schema: {
				$defs: {
					value: {
						type: "string",
						enum: OPTION_VALUE_SCHEME
					},
					valueWithIgnore: {
						type: "string",
						enum: [...OPTION_VALUE_SCHEME, "ignore"]
					}
				},
				type: "array",
				items: [{ oneOf: [{ $ref: "#/$defs/value" }, {
					type: "object",
					properties: {
						arrays: { $ref: "#/$defs/valueWithIgnore" },
						objects: { $ref: "#/$defs/valueWithIgnore" },
						imports: { $ref: "#/$defs/valueWithIgnore" },
						exports: { $ref: "#/$defs/valueWithIgnore" },
						functions: { $ref: "#/$defs/valueWithIgnore" },
						importAttributes: { $ref: "#/$defs/valueWithIgnore" },
						dynamicImports: { $ref: "#/$defs/valueWithIgnore" },
						enums: { $ref: "#/$defs/valueWithIgnore" },
						generics: { $ref: "#/$defs/valueWithIgnore" },
						tuples: { $ref: "#/$defs/valueWithIgnore" }
					},
					additionalProperties: false
				}] }],
				additionalItems: false
			},
			fixable: "code",
			messages: {
				unexpected: "Unexpected trailing comma.",
				missing: "Missing trailing comma."
			}
		},
		defaultOptions: ["never"],
		create(context, [options]) {
			function normalizeOptions(options$1 = {}, ecmaVersion$1) {
				const DEFAULT_OPTION_VALUE = "never";
				if (typeof options$1 === "string") return {
					arrays: options$1,
					objects: options$1,
					imports: options$1,
					exports: options$1,
					functions: !ecmaVersion$1 || ecmaVersion$1 === "latest" ? options$1 : ecmaVersion$1 < 2017 ? "ignore" : options$1,
					importAttributes: options$1,
					dynamicImports: !ecmaVersion$1 || ecmaVersion$1 === "latest" ? options$1 : ecmaVersion$1 < 2025 ? "ignore" : options$1,
					enums: options$1,
					generics: options$1,
					tuples: options$1
				};
				return {
					arrays: options$1.arrays ?? DEFAULT_OPTION_VALUE,
					objects: options$1.objects ?? DEFAULT_OPTION_VALUE,
					imports: options$1.imports ?? DEFAULT_OPTION_VALUE,
					exports: options$1.exports ?? DEFAULT_OPTION_VALUE,
					functions: options$1.functions ?? DEFAULT_OPTION_VALUE,
					importAttributes: options$1.importAttributes ?? DEFAULT_OPTION_VALUE,
					dynamicImports: options$1.dynamicImports ?? DEFAULT_OPTION_VALUE,
					enums: options$1.enums ?? DEFAULT_OPTION_VALUE,
					generics: options$1.generics ?? DEFAULT_OPTION_VALUE,
					tuples: options$1.tuples ?? DEFAULT_OPTION_VALUE
				};
			}
			const ecmaVersion = context?.languageOptions?.ecmaVersion ?? context.parserOptions.ecmaVersion;
			const normalizedOptions = normalizeOptions(options, ecmaVersion);
			const isTSX = context.parserOptions?.ecmaFeatures?.jsx && context.filename?.endsWith(".tsx");
			const sourceCode = context.sourceCode;
			const closeBraces = [
				"}",
				"]",
				")",
				">"
			];
			const predicate = {
				"always": forceTrailingComma,
				"always-multiline": forceTrailingCommaIfMultiline,
				"only-multiline": allowTrailingCommaIfMultiline,
				"never": forbidTrailingComma,
				"ignore": () => {}
			};
			function last(nodes) {
				if (!nodes) return null;
				return nodes[nodes.length - 1] ?? null;
			}
			/**
			* Gets the trailing comma token of the given node.
			* If the trailing comma does not exist, this returns the token which is
			* the insertion point of the trailing comma token.
			* @param info The information to verify.
			* @returns The trailing comma token or the insertion point.
			*/
			function getTrailingToken(info) {
				switch (info.node.type) {
					case "ObjectExpression":
					case "ArrayExpression":
					case "CallExpression":
					case "NewExpression":
					case "ImportExpression": return sourceCode.getLastToken(info.node, 1);
					default: {
						const lastItem = info.lastItem;
						if (!lastItem) return null;
						const nextToken = sourceCode.getTokenAfter(lastItem);
						if ((0, ast_exports.isCommaToken)(nextToken)) return nextToken;
						return sourceCode.getLastToken(lastItem);
					}
				}
			}
			/**
			* Checks whether or not a given node is multiline.
			* This rule handles a given node as multiline when the closing parenthesis
			* and the last element are not on the same line.
			* @param info The information to verify.
			* @returns `true` if the node is multiline.
			*/
			function isMultiline(info) {
				const lastItem = info.lastItem;
				if (!lastItem) return false;
				const penultimateToken = getTrailingToken(info);
				if (!penultimateToken) return false;
				const lastToken = sourceCode.getTokenAfter(penultimateToken);
				if (!lastToken) return false;
				return lastToken.loc.end.line !== penultimateToken.loc.end.line;
			}
			/**
			* Checks whether or not a trailing comma is allowed in a given node.
			* If the `lastItem` is `RestElement` or `RestProperty`, it disallows trailing commas.
			* @param lastItem The node of the last element in the given node.
			* @returns `true` if a trailing comma is allowed.
			*/
			function isTrailingCommaAllowed(lastItem) {
				return lastItem.type !== "RestElement";
			}
			/**
			* Reports a trailing comma if it exists.
			* @param info The information to verify.
			*/
			function forbidTrailingComma(info) {
				/**
				* We allow tailing comma in TSTypeParameterDeclaration in TSX,
				* because it's used to differentiate JSX tags from generics.
				*
				* https://github.com/microsoft/TypeScript/issues/15713#issuecomment-499474386
				* https://github.com/eslint-stylistic/eslint-stylistic/issues/35
				*/
				if (isTSX && info.node.type === AST_NODE_TYPES.TSTypeParameterDeclaration && info.node.params.length === 1) return;
				const lastItem = info.lastItem;
				if (!lastItem) return;
				const trailingToken = getTrailingToken(info);
				if (trailingToken && (0, ast_exports.isCommaToken)(trailingToken)) context.report({
					node: lastItem,
					loc: trailingToken.loc,
					messageId: "unexpected",
					*fix(fixer) {
						yield fixer.remove(trailingToken);
						/**
						* Extend the range of the fix to include surrounding tokens to ensure
						* that the element after which the comma is removed stays _last_.
						* This intentionally makes conflicts in fix ranges with rules that may be
						* adding or removing elements in the same autofix pass.
						* https://github.com/eslint/eslint/issues/15660
						*/
						yield fixer.insertTextBefore(sourceCode.getTokenBefore(trailingToken), "");
						yield fixer.insertTextAfter(sourceCode.getTokenAfter(trailingToken), "");
					}
				});
			}
			/**
			* Reports the last element of a given node if it does not have a trailing
			* comma.
			*
			* If a given node is `ArrayPattern` which has `RestElement`, the trailing
			* comma is disallowed, so report if it exists.
			* @param info The information to verify.
			*/
			function forceTrailingComma(info) {
				const lastItem = info.lastItem;
				if (!lastItem) return;
				if (!isTrailingCommaAllowed(lastItem)) {
					forbidTrailingComma(info);
					return;
				}
				const trailingToken = getTrailingToken(info);
				if (!trailingToken || trailingToken.value === ",") return;
				const nextToken = sourceCode.getTokenAfter(trailingToken);
				if (!nextToken || !closeBraces.includes(nextToken.value)) return;
				context.report({
					node: lastItem,
					loc: {
						start: trailingToken.loc.end,
						end: getNextLocation(sourceCode, trailingToken.loc.end)
					},
					messageId: "missing",
					*fix(fixer) {
						yield fixer.insertTextAfter(trailingToken, ",");
						/**
						* Extend the range of the fix to include surrounding tokens to ensure
						* that the element after which the comma is inserted stays _last_.
						* This intentionally makes conflicts in fix ranges with rules that may be
						* adding or removing elements in the same autofix pass.
						* https://github.com/eslint/eslint/issues/15660
						*/
						yield fixer.insertTextBefore(trailingToken, "");
						yield fixer.insertTextAfter(sourceCode.getTokenAfter(trailingToken), "");
					}
				});
			}
			/**
			* Only if a given node is not multiline, reports the last element of a given node
			* when it does not have a trailing comma.
			* Otherwise, reports a trailing comma if it exists.
			* @param info The information to verify.
			*/
			function allowTrailingCommaIfMultiline(info) {
				if (!isMultiline(info)) forbidTrailingComma(info);
			}
			/**
			* If a given node is multiline, reports the last element of a given node
			* when it does not have a trailing comma.
			* Otherwise, reports a trailing comma if it exists.
			* @param info The information to verify.
			*/
			function forceTrailingCommaIfMultiline(info) {
				if (isMultiline(info)) forceTrailingComma(info);
				else forbidTrailingComma(info);
			}
			return {
				ObjectExpression: (node) => {
					predicate[normalizedOptions.objects]({
						node,
						lastItem: last(node.properties)
					});
				},
				ObjectPattern: (node) => {
					predicate[normalizedOptions.objects]({
						node,
						lastItem: last(node.properties)
					});
				},
				ArrayExpression: (node) => {
					predicate[normalizedOptions.arrays]({
						node,
						lastItem: last(node.elements)
					});
				},
				ArrayPattern: (node) => {
					predicate[normalizedOptions.arrays]({
						node,
						lastItem: last(node.elements)
					});
				},
				ImportDeclaration: (node) => {
					const lastSpecifier = last(node.specifiers);
					if (lastSpecifier?.type === "ImportSpecifier") predicate[normalizedOptions.imports]({
						node,
						lastItem: lastSpecifier
					});
					predicate[normalizedOptions.importAttributes]({
						node,
						lastItem: last(node.attributes)
					});
				},
				ExportNamedDeclaration: (node) => {
					predicate[normalizedOptions.exports]({
						node,
						lastItem: last(node.specifiers)
					});
					predicate[normalizedOptions.importAttributes]({
						node,
						lastItem: last(node.attributes)
					});
				},
				ExportAllDeclaration: (node) => {
					predicate[normalizedOptions.importAttributes]({
						node,
						lastItem: last(node.attributes)
					});
				},
				FunctionDeclaration: (node) => {
					predicate[normalizedOptions.functions]({
						node,
						lastItem: last(node.params)
					});
				},
				FunctionExpression: (node) => {
					predicate[normalizedOptions.functions]({
						node,
						lastItem: last(node.params)
					});
				},
				ArrowFunctionExpression: (node) => {
					predicate[normalizedOptions.functions]({
						node,
						lastItem: last(node.params)
					});
				},
				CallExpression: (node) => {
					predicate[normalizedOptions.functions]({
						node,
						lastItem: last(node.arguments)
					});
				},
				NewExpression: (node) => {
					predicate[normalizedOptions.functions]({
						node,
						lastItem: last(node.arguments)
					});
				},
				ImportExpression: (node) => {
					predicate[normalizedOptions.dynamicImports]({
						node,
						lastItem: node.options ?? node.source
					});
				},
				TSEnumDeclaration(node) {
					predicate[normalizedOptions.enums]({
						node,
						lastItem: last(node.body?.members ?? node.members)
					});
				},
				TSTypeParameterDeclaration(node) {
					predicate[normalizedOptions.generics]({
						node,
						lastItem: last(node.params)
					});
				},
				TSTupleType(node) {
					predicate[normalizedOptions.tuples]({
						node,
						lastItem: last(node.elementTypes)
					});
				}
			};
		}
	});
});
export { comma_dangle_default, init_comma_dangle };

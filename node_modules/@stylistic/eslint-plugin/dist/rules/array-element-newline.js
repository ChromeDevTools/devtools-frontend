import { __esmMin } from "../rolldown-runtime.js";
import { ast_exports, createRule, init_ast, init_create_rule, isSingleLine } from "../utils.js";
var array_element_newline_default;
var init_array_element_newline = __esmMin(() => {
	init_ast();
	init_create_rule();
	array_element_newline_default = createRule({
		name: "array-element-newline",
		meta: {
			type: "layout",
			docs: { description: "Enforce line breaks after each array element" },
			fixable: "whitespace",
			schema: {
				definitions: { basicConfig: { oneOf: [{
					type: "string",
					enum: [
						"always",
						"never",
						"consistent"
					]
				}, {
					type: "object",
					properties: {
						consistent: { type: "boolean" },
						multiline: { type: "boolean" },
						minItems: {
							type: ["integer", "null"],
							minimum: 0
						}
					},
					additionalProperties: false
				}] } },
				type: "array",
				items: [{ oneOf: [{ $ref: "#/definitions/basicConfig" }, {
					type: "object",
					properties: {
						ArrayExpression: { $ref: "#/definitions/basicConfig" },
						ArrayPattern: { $ref: "#/definitions/basicConfig" }
					},
					additionalProperties: false,
					minProperties: 1
				}] }]
			},
			messages: {
				unexpectedLineBreak: "There should be no linebreak here.",
				missingLineBreak: "There should be a linebreak after this element."
			}
		},
		create(context) {
			const sourceCode = context.sourceCode;
			/**
			* Normalizes a given option value.
			* @param providedOption An option value to parse.
			* @returns Normalized option object.
			*/
			function normalizeOptionValue(providedOption) {
				let consistent = false;
				let multiline = false;
				let minItems;
				const option = providedOption || "always";
				if (!option || option === "always" || typeof option === "object" && option.minItems === 0) minItems = 0;
				else if (option === "never") minItems = Number.POSITIVE_INFINITY;
				else if (option === "consistent") {
					consistent = true;
					minItems = Number.POSITIVE_INFINITY;
				} else {
					consistent = Boolean(option.consistent);
					multiline = Boolean(option.multiline);
					minItems = option.minItems || Number.POSITIVE_INFINITY;
				}
				return {
					consistent,
					multiline,
					minItems
				};
			}
			/**
			* Normalizes a given option value.
			* @param options An option value to parse.
			* @returns Normalized option object.
			*/
			function normalizeOptions(options) {
				if (options && (options.ArrayExpression || options.ArrayPattern)) {
					let expressionOptions, patternOptions;
					if (options.ArrayExpression) expressionOptions = normalizeOptionValue(options.ArrayExpression);
					if (options.ArrayPattern) patternOptions = normalizeOptionValue(options.ArrayPattern);
					return {
						ArrayExpression: expressionOptions,
						ArrayPattern: patternOptions
					};
				}
				const value = normalizeOptionValue(options);
				return {
					ArrayExpression: value,
					ArrayPattern: value
				};
			}
			/**
			* Reports that there shouldn't be a line break after the first token
			* @param token The token to use for the report.
			*/
			function reportNoLineBreak(token) {
				const tokenBefore = sourceCode.getTokenBefore(token, { includeComments: true });
				context.report({
					loc: {
						start: tokenBefore.loc.end,
						end: token.loc.start
					},
					messageId: "unexpectedLineBreak",
					fix(fixer) {
						if ((0, ast_exports.isCommentToken)(tokenBefore)) return null;
						if (!(0, ast_exports.isTokenOnSameLine)(tokenBefore, token)) return fixer.replaceTextRange([tokenBefore.range[1], token.range[0]], " ");
						/**
						* This will check if the comma is on the same line as the next element
						* Following array:
						* [
						*     1
						*     , 2
						*     , 3
						* ]
						*
						* will be fixed to:
						* [
						*     1, 2, 3
						* ]
						*/
						const twoTokensBefore = sourceCode.getTokenBefore(tokenBefore, { includeComments: true });
						if ((0, ast_exports.isCommentToken)(twoTokensBefore)) return null;
						return fixer.replaceTextRange([twoTokensBefore.range[1], tokenBefore.range[0]], "");
					}
				});
			}
			/**
			* Reports that there should be a line break after the first token
			* @param token The token to use for the report.
			*/
			function reportRequiredLineBreak(token) {
				const tokenBefore = sourceCode.getTokenBefore(token, { includeComments: true });
				context.report({
					loc: {
						start: tokenBefore.loc.end,
						end: token.loc.start
					},
					messageId: "missingLineBreak",
					fix(fixer) {
						return fixer.replaceTextRange([tokenBefore.range[1], token.range[0]], "\n");
					}
				});
			}
			/**
			* Reports a given node if it violated this rule.
			* @param node A node to check. This is an ObjectExpression node or an ObjectPattern node.
			*/
			function check(node) {
				const elements = node.elements;
				const normalizedOptions = normalizeOptions(context.options[0]);
				const options = normalizedOptions[node.type];
				if (!options) return;
				let elementBreak = false;
				/**
				* MULTILINE: true
				* loop through every element and check
				* if at least one element has linebreaks inside
				* this ensures that following is not valid (due to elements are on the same line):
				*
				* [
				*      1,
				*      2,
				*      3
				* ]
				*/
				if (options.multiline) elementBreak = elements.filter((element) => element !== null).some((element) => !isSingleLine(element));
				let linebreaksCount = 0;
				for (let i = 0; i < node.elements.length; i++) {
					const element = node.elements[i];
					const previousElement = elements[i - 1];
					if (i === 0 || element === null || previousElement === null) continue;
					const commaToken = sourceCode.getFirstTokenBetween(previousElement, element, ast_exports.isCommaToken);
					const lastTokenOfPreviousElement = sourceCode.getTokenBefore(commaToken);
					const firstTokenOfCurrentElement = sourceCode.getTokenAfter(commaToken);
					if (!(0, ast_exports.isTokenOnSameLine)(lastTokenOfPreviousElement, firstTokenOfCurrentElement)) linebreaksCount++;
				}
				const needsLinebreaks = elements.length >= options.minItems || options.multiline && elementBreak || options.consistent && linebreaksCount > 0 && linebreaksCount < node.elements.length;
				elements.forEach((element, i) => {
					const previousElement = elements[i - 1];
					if (i === 0 || element === null || previousElement === null) return;
					const commaToken = sourceCode.getFirstTokenBetween(previousElement, element, ast_exports.isCommaToken);
					const lastTokenOfPreviousElement = sourceCode.getTokenBefore(commaToken);
					const firstTokenOfCurrentElement = sourceCode.getTokenAfter(commaToken);
					if (needsLinebreaks) {
						if ((0, ast_exports.isTokenOnSameLine)(lastTokenOfPreviousElement, firstTokenOfCurrentElement)) reportRequiredLineBreak(firstTokenOfCurrentElement);
					} else if (!(0, ast_exports.isTokenOnSameLine)(lastTokenOfPreviousElement, firstTokenOfCurrentElement)) reportNoLineBreak(firstTokenOfCurrentElement);
				});
			}
			return {
				ArrayPattern: check,
				ArrayExpression: check
			};
		}
	});
});
export { array_element_newline_default, init_array_element_newline };

import { __esmMin } from "../rolldown-runtime.js";
import { createRule, init_create_rule } from "../utils.js";
var OVERRIDE_SCHEMA, generator_star_spacing_default;
var init_generator_star_spacing = __esmMin(() => {
	init_create_rule();
	OVERRIDE_SCHEMA = { oneOf: [{
		type: "string",
		enum: [
			"before",
			"after",
			"both",
			"neither"
		]
	}, {
		type: "object",
		properties: {
			before: { type: "boolean" },
			after: { type: "boolean" }
		},
		additionalProperties: false
	}] };
	generator_star_spacing_default = createRule({
		name: "generator-star-spacing",
		meta: {
			type: "layout",
			docs: { description: "Enforce consistent spacing around `*` operators in generator functions" },
			fixable: "whitespace",
			schema: [{ oneOf: [{
				type: "string",
				enum: [
					"before",
					"after",
					"both",
					"neither"
				]
			}, {
				type: "object",
				properties: {
					before: { type: "boolean" },
					after: { type: "boolean" },
					named: OVERRIDE_SCHEMA,
					anonymous: OVERRIDE_SCHEMA,
					method: OVERRIDE_SCHEMA
				},
				additionalProperties: false
			}] }],
			messages: {
				missingBefore: "Missing space before *.",
				missingAfter: "Missing space after *.",
				unexpectedBefore: "Unexpected space before *.",
				unexpectedAfter: "Unexpected space after *."
			}
		},
		create(context) {
			const optionDefinitions = {
				before: {
					before: true,
					after: false
				},
				after: {
					before: false,
					after: true
				},
				both: {
					before: true,
					after: true
				},
				neither: {
					before: false,
					after: false
				}
			};
			/**
			* Returns resolved option definitions based on an option and defaults
			* @param option The option object or string value
			* @param defaults The defaults to use if options are not present
			* @returns the resolved object definition
			*/
			function optionToDefinition(option, defaults) {
				if (!option) return defaults;
				return typeof option === "string" ? optionDefinitions[option] : Object.assign({}, defaults, option);
			}
			const modes = function(option) {
				const defaults = optionToDefinition(option, optionDefinitions.before);
				return {
					named: optionToDefinition(option.named, defaults),
					anonymous: optionToDefinition(option.anonymous, defaults),
					method: optionToDefinition(option.method, defaults)
				};
			}(context.options[0] || {});
			const sourceCode = context.sourceCode;
			/**
			* Checks if the given token is a star token or not.
			* @param token The token to check.
			* @returns `true` if the token is a star token.
			*/
			function isStarToken(token) {
				return token.value === "*" && token.type === "Punctuator";
			}
			/**
			* Gets the generator star token of the given function node.
			* @param node The function node to get.
			* @returns Found star token.
			*/
			function getStarToken(node) {
				return sourceCode.getFirstToken("method" in node.parent && node.parent.method || node.parent.type === "MethodDefinition" ? node.parent : node, isStarToken);
			}
			/**
			* capitalize a given string.
			* @param str the given string.
			* @returns the capitalized string.
			*/
			function capitalize(str) {
				return str[0].toUpperCase() + str.slice(1);
			}
			/**
			* Checks the spacing between two tokens before or after the star token.
			* @param kind Either "named", "anonymous", or "method"
			* @param side Either "before" or "after".
			* @param leftToken `function` keyword token if side is "before", or
			*     star token if side is "after".
			* @param rightToken Star token if side is "before", or identifier
			*     token if side is "after".
			*/
			function checkSpacing(kind, side, leftToken, rightToken) {
				if (!!(rightToken.range[0] - leftToken.range[1]) !== modes[kind][side]) {
					const after = leftToken.value === "*";
					const spaceRequired = modes[kind][side];
					const node = after ? leftToken : rightToken;
					const messageId = `${spaceRequired ? "missing" : "unexpected"}${capitalize(side)}`;
					context.report({
						node,
						messageId,
						fix(fixer) {
							if (spaceRequired) {
								if (after) return fixer.insertTextAfter(node, " ");
								return fixer.insertTextBefore(node, " ");
							}
							return fixer.removeRange([leftToken.range[1], rightToken.range[0]]);
						}
					});
				}
			}
			/**
			* Enforces the spacing around the star if node is a generator function.
			* @param node A function expression or declaration node.
			*/
			function checkFunction(node) {
				if (!node.generator) return;
				const starToken = getStarToken(node);
				const prevToken = sourceCode.getTokenBefore(starToken);
				const nextToken = sourceCode.getTokenAfter(starToken);
				let kind = "named";
				if (node.parent.type === "MethodDefinition" || node.parent.type === "Property" && node.parent.method) kind = "method";
				else if (!node.id) kind = "anonymous";
				if (!(kind === "method" && starToken === sourceCode.getFirstToken(node.parent))) checkSpacing(kind, "before", prevToken, starToken);
				checkSpacing(kind, "after", starToken, nextToken);
			}
			return {
				FunctionDeclaration: checkFunction,
				FunctionExpression: checkFunction
			};
		}
	});
});
export { generator_star_spacing_default, init_generator_star_spacing };

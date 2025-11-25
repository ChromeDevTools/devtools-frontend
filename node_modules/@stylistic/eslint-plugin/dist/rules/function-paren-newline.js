import { ast_exports, createRule } from "../utils.js";
var function_paren_newline_default = createRule({
	name: "function-paren-newline",
	meta: {
		type: "layout",
		docs: { description: "Enforce consistent line breaks inside function parentheses" },
		fixable: "whitespace",
		schema: [{ oneOf: [{
			type: "string",
			enum: [
				"always",
				"never",
				"consistent",
				"multiline",
				"multiline-arguments"
			]
		}, {
			type: "object",
			properties: { minItems: {
				type: "integer",
				minimum: 0
			} },
			additionalProperties: false
		}] }],
		messages: {
			expectedBefore: "Expected newline before ')'.",
			expectedAfter: "Expected newline after '('.",
			expectedBetween: "Expected newline between arguments/params.",
			unexpectedBefore: "Unexpected newline before ')'.",
			unexpectedAfter: "Unexpected newline after '('."
		}
	},
	create(context) {
		const sourceCode = context.sourceCode;
		const rawOption = context.options[0] || "multiline";
		const multilineOption = rawOption === "multiline";
		const multilineArgumentsOption = rawOption === "multiline-arguments";
		const consistentOption = rawOption === "consistent";
		let minItems;
		if (typeof rawOption === "object") minItems = rawOption.minItems;
		else if (rawOption === "always") minItems = 0;
		else if (rawOption === "never") minItems = Infinity;
		function shouldHaveNewlines(elements, hasLeftNewline) {
			if (multilineArgumentsOption && elements.length === 1) return hasLeftNewline;
			if (multilineOption || multilineArgumentsOption) return elements.some((element, index) => index !== elements.length - 1 && !(0, ast_exports.isTokenOnSameLine)(element, elements[index + 1]));
			if (consistentOption) return hasLeftNewline;
			return minItems == null || elements.length >= minItems;
		}
		function validateParens(parens, elements) {
			const leftParen = parens.leftParen;
			const rightParen = parens.rightParen;
			const tokenAfterLeftParen = sourceCode.getTokenAfter(leftParen);
			const tokenBeforeRightParen = sourceCode.getTokenBefore(rightParen);
			const hasLeftNewline = !(0, ast_exports.isTokenOnSameLine)(leftParen, tokenAfterLeftParen);
			const hasRightNewline = !(0, ast_exports.isTokenOnSameLine)(tokenBeforeRightParen, rightParen);
			const needsNewlines = shouldHaveNewlines(elements, hasLeftNewline);
			if (hasLeftNewline && !needsNewlines) context.report({
				node: leftParen,
				messageId: "unexpectedAfter",
				fix(fixer) {
					return sourceCode.getText().slice(leftParen.range[1], tokenAfterLeftParen.range[0]).trim() ? null : fixer.removeRange([leftParen.range[1], tokenAfterLeftParen.range[0]]);
				}
			});
			else if (!hasLeftNewline && needsNewlines) context.report({
				node: leftParen,
				messageId: "expectedAfter",
				fix: (fixer) => fixer.insertTextAfter(leftParen, "\n")
			});
			if (hasRightNewline && !needsNewlines) context.report({
				node: rightParen,
				messageId: "unexpectedBefore",
				fix(fixer) {
					return sourceCode.getText().slice(tokenBeforeRightParen.range[1], rightParen.range[0]).trim() ? null : fixer.removeRange([tokenBeforeRightParen.range[1], rightParen.range[0]]);
				}
			});
			else if (!hasRightNewline && needsNewlines) context.report({
				node: rightParen,
				messageId: "expectedBefore",
				fix: (fixer) => fixer.insertTextBefore(rightParen, "\n")
			});
		}
		function validateArguments(parens, elements) {
			const leftParen = parens.leftParen;
			const needsNewlines = shouldHaveNewlines(elements, !(0, ast_exports.isTokenOnSameLine)(leftParen, sourceCode.getTokenAfter(leftParen)));
			for (let i = 0; i <= elements.length - 2; i++) {
				const currentElement = elements[i];
				const nextElement = elements[i + 1];
				if (!!(0, ast_exports.isTokenOnSameLine)(currentElement, nextElement) && needsNewlines) context.report({
					node: currentElement,
					messageId: "expectedBetween",
					fix: (fixer) => fixer.insertTextBefore(nextElement, "\n")
				});
			}
		}
		function getParenTokens(node) {
			const isOpeningParenTokenOutsideTypeParameter = () => {
				let typeParameterOpeningLevel = 0;
				return (token) => {
					if (token.type === "Punctuator" && token.value === "<") typeParameterOpeningLevel += 1;
					if (token.type === "Punctuator" && token.value === ">") typeParameterOpeningLevel -= 1;
					return typeParameterOpeningLevel !== 0 ? false : (0, ast_exports.isOpeningParenToken)(token);
				};
			};
			switch (node.type) {
				case "NewExpression": if (!node.arguments.length && !((0, ast_exports.isOpeningParenToken)(sourceCode.getLastToken(node, { skip: 1 })) && (0, ast_exports.isClosingParenToken)(sourceCode.getLastToken(node)) && node.callee.range[1] < node.range[1])) return null;
				case "CallExpression": return {
					leftParen: sourceCode.getTokenAfter(node.callee, isOpeningParenTokenOutsideTypeParameter()),
					rightParen: sourceCode.getLastToken(node)
				};
				case "FunctionDeclaration":
				case "FunctionExpression": {
					const leftParen = sourceCode.getFirstToken(node, isOpeningParenTokenOutsideTypeParameter());
					return {
						leftParen,
						rightParen: node.params.length ? sourceCode.getTokenAfter(node.params[node.params.length - 1], ast_exports.isClosingParenToken) : sourceCode.getTokenAfter(leftParen)
					};
				}
				case "ArrowFunctionExpression": {
					const firstToken = sourceCode.getFirstToken(node, { skip: node.async ? 1 : 0 });
					if (!(0, ast_exports.isOpeningParenToken)(firstToken)) return null;
					return {
						leftParen: firstToken,
						rightParen: node.params.length ? sourceCode.getTokenAfter(node.params[node.params.length - 1], ast_exports.isClosingParenToken) : sourceCode.getTokenAfter(firstToken)
					};
				}
				case "ImportExpression": return {
					leftParen: sourceCode.getFirstToken(node, 1),
					rightParen: sourceCode.getLastToken(node)
				};
				default: throw new TypeError(`unexpected node with type ${node.type}`);
			}
		}
		return { [[
			"ArrowFunctionExpression",
			"CallExpression",
			"FunctionDeclaration",
			"FunctionExpression",
			"ImportExpression",
			"NewExpression"
		].join(", ")](node) {
			const parens = getParenTokens(node);
			let params;
			if (node.type === "ImportExpression") params = [node.source, ...node.options ? [node.options] : []];
			else if ((0, ast_exports.isFunction)(node)) params = node.params;
			else params = node.arguments;
			if (parens) {
				validateParens(parens, params);
				if (multilineArgumentsOption) validateArguments(parens, params);
			}
		} };
	}
});
export { function_paren_newline_default };

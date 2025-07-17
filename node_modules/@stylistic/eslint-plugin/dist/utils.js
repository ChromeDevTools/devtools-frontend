import { __esmMin, __export, __reExport, __toESM } from "./rolldown-runtime.js";
import { require_ast_utils } from "./vendor.js";
import { AST_NODE_TYPES, AST_TOKEN_TYPES } from "@typescript-eslint/types";
import { KEYS } from "eslint-visitor-keys";
import { latestEcmaVersion, tokenize } from "espree";
import { traverse } from "estraverse";
/**
* Generate sharable configs for all rules in a plugin
*
* @param plugin
* @param name
* @param flat
*/
function createAllConfigs(plugin, name, filter) {
	const rules = Object.fromEntries(Object.entries(plugin.rules).filter(([key, rule]) => rule.meta.fixable && !rule.meta.deprecated && key === rule.meta.docs.url.split("/").pop() && (!filter || filter(key, rule))).map(([key]) => [`${name}/${key}`, 2]));
	return {
		plugins: { [name]: plugin },
		rules
	};
}
var init_configs_all = __esmMin(() => {});
/**
* Creates a version of the `lineBreakPattern` regex with the global flag.
* Global regexes are mutable, so this needs to be a function instead of a constant.
* @returns A global regular expression that matches line terminators
*/
function createGlobalLinebreakMatcher() {
	return new RegExp(import_ast_utils.LINEBREAK_MATCHER.source, "gu");
}
/**
* Finds a function node from ancestors of a node.
* @param node A start node to find.
* @returns A found function node.
*/
function getUpperFunction(node) {
	for (let currentNode = node; currentNode; currentNode = currentNode.parent) if (anyFunctionPattern.test(currentNode.type)) return currentNode;
	return null;
}
/**
* Determines whether the given node is a `null` literal.
* @param node The node to check
* @returns `true` if the node is a `null` literal
*/
function isNullLiteral(node) {
	/**
	* Checking `node.value === null` does not guarantee that a literal is a null literal.
	* When parsing values that cannot be represented in the current environment (e.g. unicode
	* regexes in Node 4), `node.value` is set to `null` because it wouldn't be possible to
	* set `node.value` to a unicode regex. To make sure a literal is actually `null`, check
	* `node.regex` instead. Also see: https://github.com/eslint/eslint/issues/8020
	*/
	return node.type === "Literal" && node.value === null && !("regex" in node) && !("bigint" in node);
}
/**
* Returns the result of the string conversion applied to the evaluated value of the given expression node,
* if it can be determined statically.
*
* This function returns a `string` value for all `Literal` nodes and simple `TemplateLiteral` nodes only.
* In all other cases, this function returns `null`.
* @param node Expression node.
* @returns String value if it can be determined. Otherwise, `null`.
*/
function getStaticStringValue(node) {
	switch (node.type) {
		case "Literal":
			if (node.value === null) {
				if (isNullLiteral(node)) return String(node.value);
				if ("regex" in node && node.regex) return `/${node.regex.pattern}/${node.regex.flags}`;
				if ("bigint" in node && node.bigint) return node.bigint;
			} else return String(node.value);
			break;
		case "TemplateLiteral":
			if (node.expressions.length === 0 && node.quasis.length === 1) return node.quasis[0].value.cooked;
			break;
	}
	return null;
}
/**
* Gets the property name of a given node.
* The node can be a MemberExpression, a Property, or a MethodDefinition.
*
* If the name is dynamic, this returns `null`.
*
* For examples:
*
*     a.b           // => "b"
*     a["b"]        // => "b"
*     a['b']        // => "b"
*     a[`b`]        // => "b"
*     a[100]        // => "100"
*     a[b]          // => null
*     a["a" + "b"]  // => null
*     a[tag`b`]     // => null
*     a[`${b}`]     // => null
*
*     let a = {b: 1}            // => "b"
*     let a = {["b"]: 1}        // => "b"
*     let a = {['b']: 1}        // => "b"
*     let a = {[`b`]: 1}        // => "b"
*     let a = {[100]: 1}        // => "100"
*     let a = {[b]: 1}          // => null
*     let a = {["a" + "b"]: 1}  // => null
*     let a = {[tag`b`]: 1}     // => null
*     let a = {[`${b}`]: 1}     // => null
* @param node The node to get.
* @returns The property name if static. Otherwise, null.
*/
function getStaticPropertyName(node) {
	let prop;
	if (node) switch (node.type) {
		case "ChainExpression": return getStaticPropertyName(node.expression);
		case "Property":
		case "PropertyDefinition":
		case "MethodDefinition":
		case "ImportAttribute":
			prop = node.key;
			break;
		case "MemberExpression":
			prop = node.property;
			break;
	}
	if (prop) {
		if (prop.type === "Identifier" && !("computed" in node && node.computed)) return prop.name;
		return getStaticStringValue(prop);
	}
	return null;
}
/**
* Retrieve `ChainExpression#expression` value if the given node a `ChainExpression` node. Otherwise, pass through it.
* @param node The node to address.
* @returns The `ChainExpression#expression` value if the node is a `ChainExpression` node. Otherwise, the node.
*/
function skipChainExpression(node) {
	return node && node.type === "ChainExpression" ? node.expression : node;
}
/**
* Determines if a node is surrounded by parentheses.
* @param sourceCode The ESLint source code object
* @param node The node to be checked.
* @returns True if the node is parenthesised.
* @private
*/
function isParenthesised(sourceCode, node) {
	const previousToken = sourceCode.getTokenBefore(node);
	const nextToken = sourceCode.getTokenAfter(node);
	return !!previousToken && !!nextToken && (0, import_ast_utils.isOpeningParenToken)(previousToken) && previousToken.range[1] <= node.range[0] && (0, import_ast_utils.isClosingParenToken)(nextToken) && nextToken.range[0] >= node.range[1];
}
/**
* Checks if the given token is a `=` token or not.
* @param token The token to check.
* @returns `true` if the token is a `=` token.
*/
function isEqToken(token) {
	return token.value === "=" && token.type === "Punctuator";
}
/**
* Checks if the given token is a `?` token or not.
* @param token The token to check.
* @returns `true` if the token is a `?` token.
*/
function isQuestionToken(token) {
	return token.value === "?" && token.type === "Punctuator";
}
/**
* Checks if the given token is a keyword token or not.
* @param token The token to check.
* @returns `true` if the token is a keyword token.
*/
function isKeywordToken(token) {
	return token?.type === "Keyword";
}
/**
* example:
* #!/usr/bin/env node
* @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Lexical_grammar#hashbang_comments
*/
function isHashbangComment(comment) {
	return comment.type === "Shebang" || comment.type === "Hashbang";
}
/**
* Check if the given node is a true logical expression or not.
*
* The three binary expressions logical-or (`||`), logical-and (`&&`), and
* coalesce (`??`) are known as `ShortCircuitExpression`.
* But ESTree represents those by `LogicalExpression` node.
*
* This function rejects coalesce expressions of `LogicalExpression` node.
* @param node The node to check.
* @returns `true` if the node is `&&` or `||`.
* @see https://tc39.es/ecma262/#prod-ShortCircuitExpression
*/
function isLogicalExpression(node) {
	return node.type === "LogicalExpression" && (node.operator === "&&" || node.operator === "||");
}
/**
* Check if the given node is a nullish coalescing expression or not.
*
* The three binary expressions logical-or (`||`), logical-and (`&&`), and
* coalesce (`??`) are known as `ShortCircuitExpression`.
* But ESTree represents those by `LogicalExpression` node.
*
* This function finds only coalesce expressions of `LogicalExpression` node.
* @param node The node to check.
* @returns `true` if the node is `??`.
*/
function isCoalesceExpression(node) {
	return node.type === "LogicalExpression" && node.operator === "??";
}
/**
* Check if given two nodes are the pair of a logical expression and a coalesce expression.
* @param left A node to check.
* @param right Another node to check.
* @returns `true` if the two nodes are the pair of a logical expression and a coalesce expression.
*/
function isMixedLogicalAndCoalesceExpressions(left, right) {
	return isLogicalExpression(left) && isCoalesceExpression(right) || isCoalesceExpression(left) && isLogicalExpression(right);
}
/**
* Get the colon token of the given SwitchCase node.
* @param node The SwitchCase node to get.
* @param sourceCode The source code object to get tokens.
* @returns The colon token of the node.
*/
function getSwitchCaseColonToken(node, sourceCode) {
	if (node.test) return sourceCode.getTokenAfter(node.test, (token) => (0, import_ast_utils.isColonToken)(token));
	return sourceCode.getFirstToken(node, 1);
}
/**
* Checks whether a node is an ExpressionStatement at the top level of a file or function body.
* A top-level ExpressionStatement node is a directive if it contains a single unparenthesized
* string literal and if it occurs either as the first sibling or immediately after another
* directive.
* @param node The node to check.
* @returns Whether or not the node is an ExpressionStatement at the top level of a
* file or function body.
*/
function isTopLevelExpressionStatement(node) {
	if (node.type !== "ExpressionStatement") return false;
	const parent = node.parent;
	return parent.type === "Program" || parent.type === "BlockStatement" && (0, import_ast_utils.isFunction)(parent.parent);
}
/**
* Check whether the given node is a part of a directive prologue or not.
* @param node The node to check.
* @returns `true` if the node is a part of directive prologue.
*/
function isDirective(node) {
	return node.type === "ExpressionStatement" && typeof node.directive === "string";
}
/**
* Checks whether or not a given node is a string literal.
* @param node A node to check.
* @returns `true` if the node is a string literal.
*/
function isStringLiteral(node) {
	return node.type === "Literal" && typeof node.value === "string" || node.type === "TemplateLiteral";
}
/**
* Validate that a string passed in is surrounded by the specified character
* @param val The text to check.
* @param character The character to see if it's surrounded by.
* @returns True if the text is surrounded by the character, false if not.
* @private
*/
function isSurroundedBy(val, character) {
	return val[0] === character && val[val.length - 1] === character;
}
/**
* Get the precedence level based on the node type
* @param node node to evaluate
* @returns precedence level
* @private
*/
function getPrecedence(node) {
	switch (node.type) {
		case "SequenceExpression": return 0;
		case "AssignmentExpression":
		case "ArrowFunctionExpression":
		case "YieldExpression": return 1;
		case "ConditionalExpression": return 3;
		case "LogicalExpression": switch (node.operator) {
			case "||":
			case "??": return 4;
			case "&&": return 5;
		}
		case "BinaryExpression": switch (node.operator) {
			case "|": return 6;
			case "^": return 7;
			case "&": return 8;
			case "==":
			case "!=":
			case "===":
			case "!==": return 9;
			case "<":
			case "<=":
			case ">":
			case ">=":
			case "in":
			case "instanceof": return 10;
			case "<<":
			case ">>":
			case ">>>": return 11;
			case "+":
			case "-": return 12;
			case "*":
			case "/":
			case "%": return 13;
			case "**": return 15;
		}
		case "UnaryExpression":
		case "AwaitExpression": return 16;
		case "UpdateExpression": return 17;
		case "CallExpression":
		case "ChainExpression":
		case "ImportExpression": return 18;
		case "NewExpression": return 19;
		default:
			if (node.type in KEYS) return 20;
			/**
			* if the node is not a standard node that we know about, then assume it has the lowest precedence
			* this will mean that rules will wrap unknown nodes in parentheses where applicable instead of
			* unwrapping them and potentially changing the meaning of the code or introducing a syntax error.
			*/
			return -1;
	}
}
/**
* Determines whether this node is a decimal integer literal. If a node is a decimal integer literal, a dot added
* after the node will be parsed as a decimal point, rather than a property-access dot.
* @param node The node to check.
* @returns `true` if this node is a decimal integer.
* @example
*
* 0         // true
* 5         // true
* 50        // true
* 5_000     // true
* 1_234_56  // true
* 08        // true
* 0192      // true
* 5.        // false
* .5        // false
* 5.0       // false
* 5.00_00   // false
* 05        // false
* 0x5       // false
* 0b101     // false
* 0b11_01   // false
* 0o5       // false
* 5e0       // false
* 5e1_000   // false
* 5n        // false
* 1_000n    // false
* "5"       // false
*
*/
function isDecimalInteger(node) {
	return node.type === "Literal" && typeof node.value === "number" && DECIMAL_INTEGER_PATTERN.test(node.raw);
}
/**
* Determines whether this token is a decimal integer numeric token.
* This is similar to isDecimalInteger(), but for tokens.
* @param token The token to check.
* @returns `true` if this token is a decimal integer.
*/
function isDecimalIntegerNumericToken(token) {
	return token.type === "Numeric" && DECIMAL_INTEGER_PATTERN.test(token.value);
}
/**
* Gets next location when the result is not out of bound, otherwise returns null.
*
* Assumptions:
*
* - The given location represents a valid location in the given source code.
* - Columns are 0-based.
* - Lines are 1-based.
* - Column immediately after the last character in a line (not incl. linebreaks) is considered to be a valid location.
* - If the source code ends with a linebreak, `sourceCode.lines` array will have an extra element (empty string) at the end.
*   The start (column 0) of that extra line is considered to be a valid location.
*
* Examples of successive locations (line, column):
*
* code: foo
* locations: (1, 0) -> (1, 1) -> (1, 2) -> (1, 3) -> null
*
* code: foo<LF>
* locations: (1, 0) -> (1, 1) -> (1, 2) -> (1, 3) -> (2, 0) -> null
*
* code: foo<CR><LF>
* locations: (1, 0) -> (1, 1) -> (1, 2) -> (1, 3) -> (2, 0) -> null
*
* code: a<LF>b
* locations: (1, 0) -> (1, 1) -> (2, 0) -> (2, 1) -> null
*
* code: a<LF>b<LF>
* locations: (1, 0) -> (1, 1) -> (2, 0) -> (2, 1) -> (3, 0) -> null
*
* code: a<CR><LF>b<CR><LF>
* locations: (1, 0) -> (1, 1) -> (2, 0) -> (2, 1) -> (3, 0) -> null
*
* code: a<LF><LF>
* locations: (1, 0) -> (1, 1) -> (2, 0) -> (3, 0) -> null
*
* code: <LF>
* locations: (1, 0) -> (2, 0) -> null
*
* code:
* locations: (1, 0) -> null
* @param sourceCode The sourceCode
* @param location The location
* @returns Next location
*/
function getNextLocation(sourceCode, { column, line }) {
	if (column < sourceCode.lines[line - 1].length) return {
		column: column + 1,
		line
	};
	if (line < sourceCode.lines.length) return {
		column: 0,
		line: line + 1
	};
	return null;
}
/**
* Check if a given node is a numeric literal or not.
* @param node The node to check.
* @returns `true` if the node is a number or bigint literal.
*/
function isNumericLiteral(node) {
	return node.type === "Literal" && (typeof node.value === "number" || Boolean("bigint" in node && node.bigint));
}
/**
* Determines whether two tokens can safely be placed next to each other without merging into a single token
* @param leftValue The left token. If this is a string, it will be tokenized and the last token will be used.
* @param rightValue The right token. If this is a string, it will be tokenized and the first token will be used.
* @returns If the tokens cannot be safely placed next to each other, returns `false`. If the tokens can be placed
* next to each other, behavior is undefined (although it should return `true` in most cases).
*/
function canTokensBeAdjacent(leftValue, rightValue) {
	const espreeOptions = {
		comment: true,
		ecmaVersion: latestEcmaVersion,
		range: true
	};
	let leftToken;
	if (typeof leftValue === "string") {
		let tokens;
		try {
			tokens = tokenize(leftValue, espreeOptions);
		} catch {
			return false;
		}
		const comments = tokens.comments;
		leftToken = tokens[tokens.length - 1];
		if (comments.length) {
			const lastComment = comments[comments.length - 1];
			if (!leftToken || lastComment.range[0] > leftToken.range[0]) leftToken = lastComment;
		}
	} else leftToken = leftValue;
	if (isHashbangComment(leftToken)) return false;
	let rightToken;
	if (typeof rightValue === "string") {
		let tokens;
		try {
			tokens = tokenize(rightValue, espreeOptions);
		} catch {
			return false;
		}
		const comments = tokens.comments;
		rightToken = tokens[0];
		if (comments.length) {
			const firstComment = comments[0];
			if (!rightToken || firstComment.range[0] < rightToken.range[0]) rightToken = firstComment;
		}
	} else rightToken = rightValue;
	if (leftToken.type === "Punctuator" || rightToken.type === "Punctuator") {
		if (leftToken.type === "Punctuator" && rightToken.type === "Punctuator") {
			const PLUS_TOKENS = new Set(["+", "++"]);
			const MINUS_TOKENS = new Set(["-", "--"]);
			return !(PLUS_TOKENS.has(leftToken.value) && PLUS_TOKENS.has(rightToken.value) || MINUS_TOKENS.has(leftToken.value) && MINUS_TOKENS.has(rightToken.value));
		}
		if (leftToken.type === "Punctuator" && leftToken.value === "/") return ![
			"Block",
			"Line",
			"RegularExpression"
		].includes(rightToken.type);
		return true;
	}
	if (leftToken.type === "String" || rightToken.type === "String" || leftToken.type === "Template" || rightToken.type === "Template") return true;
	if (leftToken.type !== "Numeric" && rightToken.type === "Numeric" && rightToken.value.startsWith(".")) return true;
	if (leftToken.type === "Block" || rightToken.type === "Block" || rightToken.type === "Line") return true;
	if (rightToken.type === "PrivateIdentifier") return true;
	return false;
}
/**
* Determines whether the given raw string contains an octal escape sequence
* or a non-octal decimal escape sequence ("\8", "\9").
*
* "\1", "\2" ... "\7", "\8", "\9"
* "\00", "\01" ... "\07", "\08", "\09"
*
* "\0", when not followed by a digit, is not an octal escape sequence.
* @param rawString A string in its raw representation.
* @returns `true` if the string contains at least one octal escape sequence
* or at least one non-octal decimal escape sequence.
*/
function hasOctalOrNonOctalDecimalEscapeSequence(rawString) {
	return OCTAL_OR_NON_OCTAL_DECIMAL_ESCAPE_PATTERN.test(rawString);
}
/**
* Check if value has only whitespaces
* @param value
*/
function isWhiteSpaces(value) {
	return typeof value === "string" ? WHITE_SPACES_PATTERN.test(value) : false;
}
/**
* Gets the first node in a line from the initial node, excluding whitespace.
* @param context The node to check
* @param node The node to check
* @return the first node in the line
*/
function getFirstNodeInLine(context, node) {
	const sourceCode = context.sourceCode;
	let token = node;
	let lines = null;
	do {
		token = sourceCode.getTokenBefore(token);
		lines = token.type === "JSXText" ? token.value.split("\n") : null;
	} while (token.type === "JSXText" && lines && isWhiteSpaces(lines.at(-1)));
	return token;
}
/**
* Checks if the node is the first in its line, excluding whitespace.
* @param context The node to check
* @param node The node to check
* @return true if it's the first node in its line
*/
function isNodeFirstInLine(context, node) {
	const token = getFirstNodeInLine(context, node);
	if (!token) return false;
	return !(0, import_ast_utils.isTokenOnSameLine)(token, node);
}
/**
* Find the token before the closing bracket.
* @param node - The JSX element node.
* @returns The token before the closing bracket.
*/
function getTokenBeforeClosingBracket(node) {
	const attributes = "attributes" in node && node.attributes;
	if (!attributes || attributes.length === 0) return node.name;
	return attributes[attributes.length - 1];
}
/**
* Checks if the node is a single line.
* @param node - The node to check.
* @returns True if the node is a single line, false otherwise.
*/
function isSingleLine(node) {
	return node.loc.start.line === node.loc.end.line;
}
/**
* Check whether comments exist between the given 2 tokens.
* @param left The left token to check.
* @param right The right token to check.
* @returns `true` if comments exist between the given 2 tokens.
*/
function hasCommentsBetween(sourceCode, left, right) {
	return sourceCode.getFirstTokenBetween(left, right, {
		includeComments: true,
		filter: import_ast_utils.isCommentToken
	}) !== null;
}
/**
* Get comments exist between the given 2 tokens.
* @param sourceCode The source code object to get tokens.
* @param left The left token to check.
* @param right The right token to check.
* @returns The comments exist between the given 2 tokens.
*/
function getCommentsBetween(sourceCode, left, right) {
	return sourceCode.getTokensBetween(left, right, {
		includeComments: true,
		filter: import_ast_utils.isCommentToken
	});
}
var import_ast_utils, COMMENTS_IGNORE_PATTERN, LINEBREAKS, STATEMENT_LIST_PARENTS, DECIMAL_INTEGER_PATTERN, OCTAL_OR_NON_OCTAL_DECIMAL_ESCAPE_PATTERN, ASSIGNMENT_OPERATOR, KEYWORDS_JS, anyFunctionPattern, WHITE_SPACES_PATTERN;
var init_general = __esmMin(() => {
	import_ast_utils = __toESM(require_ast_utils(), 1);
	COMMENTS_IGNORE_PATTERN = /^\s*(?:eslint|jshint\s+|jslint\s+|istanbul\s+|globals?\s+|exported\s+|jscs)/u;
	LINEBREAKS = /* @__PURE__ */ new Set([
		"\r\n",
		"\r",
		"\n",
		"\u2028",
		"\u2029"
	]);
	STATEMENT_LIST_PARENTS = /* @__PURE__ */ new Set([
		"Program",
		"BlockStatement",
		"StaticBlock",
		"SwitchCase"
	]);
	DECIMAL_INTEGER_PATTERN = /^(?:0|0[0-7]*[89]\d*|[1-9](?:_?\d)*)$/u;
	OCTAL_OR_NON_OCTAL_DECIMAL_ESCAPE_PATTERN = /^(?:[^\\]|\\.)*\\(?:[1-9]|0\d)/su;
	ASSIGNMENT_OPERATOR = [
		"=",
		"+=",
		"-=",
		"*=",
		"/=",
		"%=",
		"<<=",
		">>=",
		">>>=",
		"|=",
		"^=",
		"&=",
		"**=",
		"||=",
		"&&=",
		"??="
	];
	KEYWORDS_JS = [
		"abstract",
		"boolean",
		"break",
		"byte",
		"case",
		"catch",
		"char",
		"class",
		"const",
		"continue",
		"debugger",
		"default",
		"delete",
		"do",
		"double",
		"else",
		"enum",
		"export",
		"extends",
		"false",
		"final",
		"finally",
		"float",
		"for",
		"function",
		"goto",
		"if",
		"implements",
		"import",
		"in",
		"instanceof",
		"int",
		"interface",
		"long",
		"native",
		"new",
		"null",
		"package",
		"private",
		"protected",
		"public",
		"return",
		"short",
		"static",
		"super",
		"switch",
		"synchronized",
		"this",
		"throw",
		"throws",
		"transient",
		"true",
		"try",
		"typeof",
		"var",
		"void",
		"volatile",
		"while",
		"with"
	];
	anyFunctionPattern = /^(?:Function(?:Declaration|Expression)|ArrowFunctionExpression)$/u;
	WHITE_SPACES_PATTERN = /^\s*$/u;
});
var ast_exports = {};
__export(ast_exports, {
	ASSIGNMENT_OPERATOR: () => ASSIGNMENT_OPERATOR,
	AST_NODE_TYPES: () => AST_NODE_TYPES,
	AST_TOKEN_TYPES: () => AST_TOKEN_TYPES,
	COMMENTS_IGNORE_PATTERN: () => COMMENTS_IGNORE_PATTERN,
	DECIMAL_INTEGER_PATTERN: () => DECIMAL_INTEGER_PATTERN,
	KEYWORDS_JS: () => KEYWORDS_JS,
	LINEBREAKS: () => LINEBREAKS,
	OCTAL_OR_NON_OCTAL_DECIMAL_ESCAPE_PATTERN: () => OCTAL_OR_NON_OCTAL_DECIMAL_ESCAPE_PATTERN,
	STATEMENT_LIST_PARENTS: () => STATEMENT_LIST_PARENTS,
	WHITE_SPACES_PATTERN: () => WHITE_SPACES_PATTERN,
	canTokensBeAdjacent: () => canTokensBeAdjacent,
	createGlobalLinebreakMatcher: () => createGlobalLinebreakMatcher,
	getCommentsBetween: () => getCommentsBetween,
	getFirstNodeInLine: () => getFirstNodeInLine,
	getNextLocation: () => getNextLocation,
	getPrecedence: () => getPrecedence,
	getStaticPropertyName: () => getStaticPropertyName,
	getStaticStringValue: () => getStaticStringValue,
	getSwitchCaseColonToken: () => getSwitchCaseColonToken,
	getTokenBeforeClosingBracket: () => getTokenBeforeClosingBracket,
	getUpperFunction: () => getUpperFunction,
	hasCommentsBetween: () => hasCommentsBetween,
	hasOctalOrNonOctalDecimalEscapeSequence: () => hasOctalOrNonOctalDecimalEscapeSequence,
	isCoalesceExpression: () => isCoalesceExpression,
	isDecimalInteger: () => isDecimalInteger,
	isDecimalIntegerNumericToken: () => isDecimalIntegerNumericToken,
	isDirective: () => isDirective,
	isEqToken: () => isEqToken,
	isHashbangComment: () => isHashbangComment,
	isKeywordToken: () => isKeywordToken,
	isLogicalExpression: () => isLogicalExpression,
	isMixedLogicalAndCoalesceExpressions: () => isMixedLogicalAndCoalesceExpressions,
	isNodeFirstInLine: () => isNodeFirstInLine,
	isNullLiteral: () => isNullLiteral,
	isNumericLiteral: () => isNumericLiteral,
	isParenthesised: () => isParenthesised,
	isQuestionToken: () => isQuestionToken,
	isSingleLine: () => isSingleLine,
	isStringLiteral: () => isStringLiteral,
	isSurroundedBy: () => isSurroundedBy,
	isTopLevelExpressionStatement: () => isTopLevelExpressionStatement,
	isWhiteSpaces: () => isWhiteSpaces,
	skipChainExpression: () => skipChainExpression
});
var init_ast = __esmMin(() => {
	init_general();
	__reExport(ast_exports, __toESM(require_ast_utils(), 1));
});
/**
* Check if the variable contains an object strictly rejecting arrays
* @returns `true` if obj is an object
*/
function isObjectNotArray(obj) {
	return typeof obj === "object" && obj != null && !Array.isArray(obj);
}
/**
* Pure function - doesn't mutate either parameter!
* Merges two objects together deeply, overwriting the properties in first with the properties in second
* @param first The first object
* @param second The second object
* @returns a new object
*/
function deepMerge(first = {}, second = {}) {
	const keys = new Set(Object.keys(first).concat(Object.keys(second)));
	return Array.from(keys).reduce((acc, key) => {
		const firstHasKey = key in first;
		const secondHasKey = key in second;
		const firstValue = first[key];
		const secondValue = second[key];
		if (firstHasKey && secondHasKey) if (isObjectNotArray(firstValue) && isObjectNotArray(secondValue)) acc[key] = deepMerge(firstValue, secondValue);
		else acc[key] = secondValue;
		else if (firstHasKey) acc[key] = firstValue;
		else acc[key] = secondValue;
		return acc;
	}, {});
}
var init_merge = __esmMin(() => {});
function createRule({ name, create, defaultOptions = [], meta }) {
	return {
		create: (context) => {
			const optionsCount = Math.max(context.options.length, defaultOptions.length);
			const optionsWithDefault = Array.from({ length: optionsCount }, (_, i) => {
				if (isObjectNotArray(context.options[i]) && isObjectNotArray(defaultOptions[i])) return deepMerge(defaultOptions[i], context.options[i]);
				return context.options[i] ?? defaultOptions[i];
			});
			return create(context, optionsWithDefault);
		},
		defaultOptions,
		meta: {
			...meta,
			docs: {
				...meta.docs,
				url: `https://eslint.style/rules/${name}`
			}
		}
	};
}
var init_create_rule = __esmMin(() => {
	init_merge();
});
/**
* Wrapper for estraverse.traverse
*
* @param ASTnode The AST node being checked
* @param visitor Visitor Object for estraverse
*/
function traverse$1(ASTnode, visitor) {
	const opts = Object.assign({}, { fallback(node) {
		return Object.keys(node).filter((key) => key === "children" || key === "argument");
	} }, visitor);
	opts.keys = Object.assign({}, visitor.keys, {
		JSXElement: ["children"],
		JSXFragment: ["children"]
	});
	traverse(ASTnode, opts);
}
/**
* Helper function for traversing "returns" (return statements or the
* returned expression in the case of an arrow function) of a function
*
* @param ASTNode The AST node being checked
* @param context The context of `ASTNode`.
* @param onReturn
*   Function to execute for each returnStatement found
*/
function traverseReturns(ASTNode, onReturn) {
	const nodeType = ASTNode.type;
	if (nodeType === "ReturnStatement") {
		onReturn(ASTNode.argument, () => {});
		return;
	}
	if (nodeType === "ArrowFunctionExpression" && ASTNode.expression) {
		onReturn(ASTNode.body, () => {});
		return;
	}
	if (nodeType !== "FunctionExpression" && nodeType !== "FunctionDeclaration" && nodeType !== "ArrowFunctionExpression" && nodeType !== "MethodDefinition") return;
	traverse$1(ASTNode.body, { enter(node) {
		const breakTraverse = () => {
			this.break();
		};
		switch (node.type) {
			case "ReturnStatement":
				this.skip();
				onReturn(node.argument, breakTraverse);
				return;
			case "BlockStatement":
			case "IfStatement":
			case "ForStatement":
			case "WhileStatement":
			case "SwitchStatement":
			case "SwitchCase": return;
			default: this.skip();
		}
	} });
}
var init_traverse = __esmMin(() => {});
/**
* Find and return a particular variable in a list
* @param variables The variables list.
* @param name The name of the variable to search.
* @returns Variable if the variable was found, null if not.
*/
function getVariable(variables, name) {
	return variables.find((variable) => variable.name === name);
}
/**
* List all variable in a given scope
*
* Contain a patch for babel-eslint to avoid https://github.com/babel/babel-eslint/issues/21
*
* @param context The current rule context.
* @returns The variables list
*/
function variablesInScope(context) {
	let scope = context.getScope();
	let variables = scope.variables;
	while (scope.type !== "global") {
		scope = scope.upper;
		variables = scope.variables.concat(variables);
	}
	if (scope.childScopes.length) {
		variables = scope.childScopes[0].variables.concat(variables);
		if (scope.childScopes[0].childScopes.length) variables = scope.childScopes[0].childScopes[0].variables.concat(variables);
	}
	variables.reverse();
	return variables;
}
/**
* Find a variable by name in the current scope.
* @param context The current rule context.
* @param  {string} name Name of the variable to look for.
* @returns Return null if the variable could not be found, ASTNode otherwise.
*/
function findVariableByName(context, name) {
	const variable = getVariable(variablesInScope(context), name);
	if (!variable || !variable.defs[0] || !variable.defs[0].node) return null;
	if (variable.defs[0].node.type === "TypeAlias") return variable.defs[0].node.right;
	if (variable.defs[0].type === "ImportBinding") return variable.defs[0].node;
	return variable.defs[0].node.init;
}
var init_variable = __esmMin(() => {});
/**
* Checks if a node represents a DOM element according to React.
* @param node - JSXOpeningElement to check.
* @returns Whether or not the node corresponds to a DOM element.
*/
function isDOMComponent(node) {
	const name = getElementType(node);
	return COMPAT_TAG_REGEX.test(name);
}
/**
* Checks if a node represents a JSX element or fragment.
* @param node - node to check.
* @returns Whether or not the node if a JSX element or fragment.
*/
function isJSX(node) {
	return node && ["JSXElement", "JSXFragment"].includes(node.type);
}
/**
* Check if the node is returning JSX or null
*
* @param ASTnode The AST node being checked
* @param context The context of `ASTNode`.
* @param [strict] If true, in a ternary condition the node must return JSX in both cases
* @param [ignoreNull] If true, null return values will be ignored
* @returns True if the node is returning JSX or null, false if not
*/
function isReturningJSX(ASTnode, context, strict = false, ignoreNull = false) {
	const isJSXValue = (node) => {
		if (!node) return false;
		switch (node.type) {
			case "ConditionalExpression":
				if (strict) return isJSXValue(node.consequent) && isJSXValue(node.alternate);
				return isJSXValue(node.consequent) || isJSXValue(node.alternate);
			case "LogicalExpression":
				if (strict) return isJSXValue(node.left) && isJSXValue(node.right);
				return isJSXValue(node.left) || isJSXValue(node.right);
			case "SequenceExpression": return isJSXValue(node.expressions[node.expressions.length - 1]);
			case "JSXElement":
			case "JSXFragment": return true;
			case "Literal":
				if (!ignoreNull && node.value === null) return true;
				return false;
			case "Identifier": {
				const variable = findVariableByName(context, node.name);
				return isJSX(variable);
			}
			default: return false;
		}
	};
	let found = false;
	traverseReturns(ASTnode, (node, breakTraverse) => {
		if (isJSXValue(node)) {
			found = true;
			breakTraverse();
		}
	});
	return found;
}
/**
* Returns the name of the prop given the JSXAttribute object.
*
* Ported from `jsx-ast-utils/propName` to reduce bundle size
* @see https://github.com/jsx-eslint/jsx-ast-utils/blob/main/src/propName.js
*/
function getPropName(prop) {
	if (!prop.type || prop.type !== "JSXAttribute") throw new Error("The prop must be a JSXAttribute collected by the AST parser.");
	if (prop.name.type === "JSXNamespacedName") return `${prop.name.namespace.name}:${prop.name.name.name}`;
	return prop.name.name;
}
function resolveMemberExpressions(object, property) {
	if (object.type === "JSXMemberExpression") return `${resolveMemberExpressions(object.object, object.property)}.${property.name}`;
	return `${object.name}.${property.name}`;
}
/**
* Returns the tagName associated with a JSXElement.
*
* Ported from `jsx-ast-utils/elementType` to reduce bundle size
* @see https://github.com/jsx-eslint/jsx-ast-utils/blob/main/src/elementType.js
*/
function getElementType(node) {
	if (node.type === "JSXOpeningFragment") return "<>";
	const { name } = node;
	if (!name) throw new Error("The argument provided is not a JSXElement node.");
	if (name.type === "JSXMemberExpression") {
		const { object, property } = name;
		return resolveMemberExpressions(object, property);
	}
	if (name.type === "JSXNamespacedName") return `${name.namespace.name}:${name.name.name}`;
	return node.name.name;
}
var COMPAT_TAG_REGEX;
var init_jsx = __esmMin(() => {
	init_traverse();
	init_variable();
	COMPAT_TAG_REGEX = /^[a-z]/;
});
function isASCII(value) {
	return /^[\u0020-\u007F]*$/u.test(value);
}
/**
* Counts graphemes in a given string.
* @param value A string to count graphemes.
* @returns The number of graphemes in `value`.
*/
function getStringLength(value) {
	if (isASCII(value)) return value.length;
	segmenter ??= new Intl.Segmenter();
	return [...segmenter.segment(value)].length;
}
var segmenter;
var init_string = __esmMin(() => {});
/**
* Assert that a value must not be null or undefined.
* This is a nice explicit alternative to the non-null assertion operator.
*/
function nullThrows(value, message) {
	if (value == null) throw new Error(`Non-null Assertion Failed: ${message}`);
	return value;
}
var NullThrowsReasons;
var init_assert = __esmMin(() => {
	NullThrowsReasons = {
		MissingParent: "Expected node to have a parent.",
		MissingToken: (token, thing) => `Expected to find a ${token} for the ${thing}.`
	};
});
var FixTracker;
var init_fix_tracker = __esmMin(() => {
	init_ast();
	FixTracker = class {
		retainedRange;
		/**
		* Create a new FixTracker.
		* @param fixer A ruleFixer instance.
		* @param sourceCode A SourceCode object for the current code.
		*/
		constructor(fixer, sourceCode) {
			this.fixer = fixer;
			this.sourceCode = sourceCode;
			this.retainedRange = null;
		}
		/**
		* Mark the given range as "retained", meaning that other fixes may not
		* may not modify this region in the same pass.
		* @param range The range to retain.
		* @returns The same RuleFixer, for chained calls.
		*/
		retainRange(range) {
			this.retainedRange = range;
			return this;
		}
		/**
		* Given a node, find the function containing it (or the entire program) and
		* mark it as retained, meaning that other fixes may not modify it in this
		* pass. This is useful for avoiding conflicts in fixes that modify control
		* flow.
		* @param node The node to use as a starting point.
		* @returns The same RuleFixer, for chained calls.
		*/
		retainEnclosingFunction(node) {
			const functionNode = getUpperFunction(node);
			return this.retainRange(functionNode ? functionNode.range : this.sourceCode.ast.range);
		}
		/**
		* Given a node or token, find the token before and afterward, and mark that
		* range as retained, meaning that other fixes may not modify it in this
		* pass. This is useful for avoiding conflicts in fixes that make a small
		* change to the code where the AST should not be changed.
		* @param nodeOrToken The node or token to use as a starting
		*      point. The token to the left and right are use in the range.
		* @returns The same RuleFixer, for chained calls.
		*/
		retainSurroundingTokens(nodeOrToken) {
			const tokenBefore = this.sourceCode.getTokenBefore(nodeOrToken) || nodeOrToken;
			const tokenAfter = this.sourceCode.getTokenAfter(nodeOrToken) || nodeOrToken;
			return this.retainRange([tokenBefore.range[0], tokenAfter.range[1]]);
		}
		/**
		* Create a fix command that replaces the given range with the given text,
		* accounting for any retained ranges.
		* @param range The range to remove in the fix.
		* @param text The text to insert in place of the range.
		* @returns The fix command.
		*/
		replaceTextRange(range, text) {
			let actualRange;
			if (this.retainedRange) actualRange = [Math.min(this.retainedRange[0], range[0]), Math.max(this.retainedRange[1], range[1])];
			else actualRange = range;
			return this.fixer.replaceTextRange(actualRange, this.sourceCode.text.slice(actualRange[0], range[0]) + text + this.sourceCode.text.slice(range[1], actualRange[1]));
		}
		/**
		* Create a fix command that removes the given node or token, accounting for
		* any retained ranges.
		* @param nodeOrToken The node or token to remove.
		* @returns The fix command.
		*/
		remove(nodeOrToken) {
			return this.replaceTextRange(nodeOrToken.range, "");
		}
	};
});
export { ASSIGNMENT_OPERATOR, AST_NODE_TYPES, AST_TOKEN_TYPES, COMMENTS_IGNORE_PATTERN, FixTracker, KEYWORDS_JS, LINEBREAKS, NullThrowsReasons, STATEMENT_LIST_PARENTS, WHITE_SPACES_PATTERN, ast_exports, canTokensBeAdjacent, createAllConfigs, createGlobalLinebreakMatcher, createRule, deepMerge, getCommentsBetween, getElementType, getFirstNodeInLine, getNextLocation, getPrecedence, getPropName, getStaticPropertyName, getStringLength, getSwitchCaseColonToken, getTokenBeforeClosingBracket, hasCommentsBetween, hasOctalOrNonOctalDecimalEscapeSequence, init_assert, init_ast, init_configs_all, init_create_rule, init_fix_tracker, init_jsx, init_merge, init_string, isDOMComponent, isDecimalInteger, isDecimalIntegerNumericToken, isEqToken, isHashbangComment, isJSX, isKeywordToken, isMixedLogicalAndCoalesceExpressions, isNodeFirstInLine, isNumericLiteral, isParenthesised, isQuestionToken, isReturningJSX, isSingleLine, isStringLiteral, isSurroundedBy, isTopLevelExpressionStatement, isWhiteSpaces, nullThrows, skipChainExpression };

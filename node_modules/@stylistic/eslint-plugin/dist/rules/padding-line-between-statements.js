import { __esmMin } from "../rolldown-runtime.js";
import { AST_NODE_TYPES, LINEBREAKS, ast_exports, createRule, init_ast, init_create_rule, isSingleLine, isTopLevelExpressionStatement, skipChainExpression } from "../utils.js";
/**
* Creates tester which check if a node starts with specific keyword with the
* appropriate AST_NODE_TYPES.
* @param keyword The keyword to test.
* @returns the created tester.
* @private
*/
function newKeywordTester(type, keyword) {
	return { test(node, sourceCode) {
		const isSameKeyword = sourceCode.getFirstToken(node)?.value === keyword;
		const isSameType = Array.isArray(type) ? type.includes(node.type) : type === node.type;
		return isSameKeyword && isSameType;
	} };
}
/**
* Creates tester which check if a node starts with specific keyword and spans a single line.
* @param keyword The keyword to test.
* @returns the created tester.
* @private
*/
function newSinglelineKeywordTester(keyword) {
	return { test(node, sourceCode) {
		return isSingleLine(node) && sourceCode.getFirstToken(node).value === keyword;
	} };
}
/**
* Creates tester which check if a node starts with specific keyword and spans multiple lines.
* @param keyword The keyword to test.
* @returns the created tester.
* @private
*/
function newMultilineKeywordTester(keyword) {
	return { test(node, sourceCode) {
		return !isSingleLine(node) && sourceCode.getFirstToken(node).value === keyword;
	} };
}
/**
* Creates tester which check if a node is specific type.
* @param type The node type to test.
* @returns the created tester.
* @private
*/
function newNodeTypeTester(type) {
	return { test: (node) => node.type === type };
}
/**
* Checks the given node is an expression statement of IIFE.
* @param node The node to check.
* @returns `true` if the node is an expression statement of IIFE.
* @private
*/
function isIIFEStatement(node) {
	if (node.type === AST_NODE_TYPES.ExpressionStatement) {
		let expression = skipChainExpression(node.expression);
		if (expression.type === AST_NODE_TYPES.UnaryExpression) expression = skipChainExpression(expression.argument);
		if (expression.type === AST_NODE_TYPES.CallExpression) {
			let node$1 = expression.callee;
			while (node$1.type === AST_NODE_TYPES.SequenceExpression) node$1 = node$1.expressions[node$1.expressions.length - 1];
			return (0, ast_exports.isFunction)(node$1);
		}
	}
	return false;
}
/**
* Checks the given node is a CommonJS require statement
* @param node The node to check.
* @returns `true` if the node is a CommonJS require statement.
* @private
*/
function isCJSRequire(node) {
	if (node.type === AST_NODE_TYPES.VariableDeclaration) {
		const declaration = node.declarations[0];
		if (declaration?.init) {
			let call = declaration?.init;
			while (call.type === AST_NODE_TYPES.MemberExpression) call = call.object;
			if (call.type === AST_NODE_TYPES.CallExpression && call.callee.type === AST_NODE_TYPES.Identifier) return call.callee.name === "require";
		}
	}
	return false;
}
/**
* Checks whether the given node is a block-like statement.
* This checks the last token of the node is the closing brace of a block.
* @param sourceCode The source code to get tokens.
* @param node The node to check.
* @returns `true` if the node is a block-like statement.
* @private
*/
function isBlockLikeStatement(node, sourceCode) {
	if (node.type === AST_NODE_TYPES.DoWhileStatement && node.body.type === AST_NODE_TYPES.BlockStatement) return true;
	/**
	* IIFE is a block-like statement specially from
	* JSCS#disallowPaddingNewLinesAfterBlocks.
	*/
	if (isIIFEStatement(node)) return true;
	const lastToken = sourceCode.getLastToken(node, ast_exports.isNotSemicolonToken);
	const belongingNode = lastToken && (0, ast_exports.isClosingBraceToken)(lastToken) ? sourceCode.getNodeByRangeIndex(lastToken.range[0]) : null;
	return !!belongingNode && (belongingNode.type === AST_NODE_TYPES.BlockStatement || belongingNode.type === AST_NODE_TYPES.SwitchStatement);
}
/**
* Check whether the given node is a directive or not.
* @param node The node to check.
* @param sourceCode The source code object to get tokens.
* @returns `true` if the node is a directive.
*/
function isDirective(node, sourceCode) {
	return isTopLevelExpressionStatement(node) && node.expression.type === AST_NODE_TYPES.Literal && typeof node.expression.value === "string" && !(0, ast_exports.isParenthesized)(node.expression, sourceCode);
}
/**
* Check whether the given node is a part of directive prologue or not.
* @param node The node to check.
* @param sourceCode The source code object to get tokens.
* @returns `true` if the node is a part of directive prologue.
*/
function isDirectivePrologue(node, sourceCode) {
	if (isDirective(node, sourceCode) && node.parent && "body" in node.parent && Array.isArray(node.parent.body)) {
		for (const sibling of node.parent.body) {
			if (sibling === node) break;
			if (!isDirective(sibling, sourceCode)) return false;
		}
		return true;
	}
	return false;
}
/**
* Checks the given node is a CommonJS export statement
* @param node The node to check.
* @returns `true` if the node is a CommonJS export statement.
* @private
*/
function isCJSExport(node) {
	if (node.type === AST_NODE_TYPES.ExpressionStatement) {
		const expression = node.expression;
		if (expression.type === AST_NODE_TYPES.AssignmentExpression) {
			let left = expression.left;
			if (left.type === AST_NODE_TYPES.MemberExpression) {
				while (left.object.type === AST_NODE_TYPES.MemberExpression) left = left.object;
				return left.object.type === AST_NODE_TYPES.Identifier && (left.object.name === "exports" || left.object.name === "module" && left.property.type === AST_NODE_TYPES.Identifier && left.property.name === "exports");
			}
		}
	}
	return false;
}
/**
* Check whether the given node is an expression
* @param node The node to check.
* @param sourceCode The source code object to get tokens.
* @returns `true` if the node is an expression
*/
function isExpression(node, sourceCode) {
	return node.type === AST_NODE_TYPES.ExpressionStatement && !isDirectivePrologue(node, sourceCode);
}
/**
* Gets the actual last token.
*
* If a semicolon is semicolon-less style's semicolon, this ignores it.
* For example:
*
*     foo()
*     ;[1, 2, 3].forEach(bar)
* @param sourceCode The source code to get tokens.
* @param node The node to get.
* @returns The actual last token.
* @private
*/
function getActualLastToken(node, sourceCode) {
	const semiToken = sourceCode.getLastToken(node);
	const prevToken = sourceCode.getTokenBefore(semiToken);
	const nextToken = sourceCode.getTokenAfter(semiToken);
	const isSemicolonLessStyle = prevToken && nextToken && prevToken.range[0] >= node.range[0] && (0, ast_exports.isSemicolonToken)(semiToken) && !(0, ast_exports.isTokenOnSameLine)(prevToken, semiToken) && (0, ast_exports.isTokenOnSameLine)(semiToken, nextToken);
	return isSemicolonLessStyle ? prevToken : semiToken;
}
/**
* This returns the concatenation of the first 2 captured strings.
* @param _ Unused. Whole matched string.
* @param trailingSpaces The trailing spaces of the first line.
* @param indentSpaces The indentation spaces of the last line.
* @returns The concatenation of trailingSpaces and indentSpaces.
* @private
*/
function replacerToRemovePaddingLines(_, trailingSpaces, indentSpaces) {
	return trailingSpaces + indentSpaces;
}
/**
* Check and report statements for `any` configuration.
* It does nothing.
*
* @private
*/
function verifyForAny() {}
/**
* Check and report statements for `never` configuration.
* This autofix removes blank lines between the given 2 statements.
* However, if comments exist between 2 blank lines, it does not remove those
* blank lines automatically.
* @param context The rule context to report.
* @param _ Unused. The previous node to check.
* @param nextNode The next node to check.
* @param paddingLines The array of token pairs that blank
* lines exist between the pair.
*
* @private
*/
function verifyForNever(context, _, nextNode, paddingLines) {
	if (paddingLines.length === 0) return;
	context.report({
		node: nextNode,
		messageId: "unexpectedBlankLine",
		fix(fixer) {
			if (paddingLines.length >= 2) return null;
			const prevToken = paddingLines[0][0];
			const nextToken = paddingLines[0][1];
			const start = prevToken.range[1];
			const end = nextToken.range[0];
			const text = context.getSourceCode().text.slice(start, end).replace(PADDING_LINE_SEQUENCE, replacerToRemovePaddingLines);
			return fixer.replaceTextRange([start, end], text);
		}
	});
}
/**
* Check and report statements for `always` configuration.
* This autofix inserts a blank line between the given 2 statements.
* If the `prevNode` has trailing comments, it inserts a blank line after the
* trailing comments.
* @param context The rule context to report.
* @param prevNode The previous node to check.
* @param nextNode The next node to check.
* @param paddingLines The array of token pairs that blank
* lines exist between the pair.
*
* @private
*/
function verifyForAlways(context, prevNode, nextNode, paddingLines) {
	if (paddingLines.length > 0) return;
	context.report({
		node: nextNode,
		messageId: "expectedBlankLine",
		fix(fixer) {
			const sourceCode = context.sourceCode;
			let prevToken = getActualLastToken(prevNode, sourceCode);
			const nextToken = sourceCode.getFirstTokenBetween(prevToken, nextNode, {
				includeComments: true,
				filter(token) {
					if ((0, ast_exports.isTokenOnSameLine)(prevToken, token)) {
						prevToken = token;
						return false;
					}
					return true;
				}
			}) || nextNode;
			const insertText = (0, ast_exports.isTokenOnSameLine)(prevToken, nextToken) ? "\n\n" : "\n";
			return fixer.insertTextAfter(prevToken, insertText);
		}
	});
}
var CJS_EXPORT, CJS_IMPORT, LT, PADDING_LINE_SEQUENCE, PaddingTypes, StatementTypes, padding_line_between_statements_default;
var init_padding_line_between_statements = __esmMin(() => {
	init_ast();
	init_create_rule();
	CJS_EXPORT = /^(?:module\s*\.\s*)?exports(?:\s*\.|\s*\[|$)/u;
	CJS_IMPORT = /^require\(/u;
	LT = `[${Array.from(LINEBREAKS).join("")}]`;
	PADDING_LINE_SEQUENCE = new RegExp(String.raw`^(\s*?${LT})\s*${LT}(\s*;?)$`, "u");
	PaddingTypes = {
		any: { verify: verifyForAny },
		never: { verify: verifyForNever },
		always: { verify: verifyForAlways }
	};
	StatementTypes = {
		"*": { test: () => true },
		"block-like": { test: isBlockLikeStatement },
		"exports": { test: isCJSExport },
		"require": { test: isCJSRequire },
		"directive": { test: isDirectivePrologue },
		"expression": { test: isExpression },
		"iife": { test: isIIFEStatement },
		"multiline-block-like": { test: (node, sourceCode) => !isSingleLine(node) && isBlockLikeStatement(node, sourceCode) },
		"multiline-expression": { test: (node, sourceCode) => !isSingleLine(node) && node.type === AST_NODE_TYPES.ExpressionStatement && !isDirectivePrologue(node, sourceCode) },
		"multiline-const": newMultilineKeywordTester("const"),
		"multiline-export": newMultilineKeywordTester("export"),
		"multiline-let": newMultilineKeywordTester("let"),
		"multiline-using": { test: (node) => node.loc.start.line !== node.loc.end.line && node.type === "VariableDeclaration" && (node.kind === "using" || node.kind === "await using") },
		"multiline-var": newMultilineKeywordTester("var"),
		"singleline-const": newSinglelineKeywordTester("const"),
		"singleline-export": newSinglelineKeywordTester("export"),
		"singleline-let": newSinglelineKeywordTester("let"),
		"singleline-using": { test: (node) => node.loc.start.line === node.loc.end.line && node.type === "VariableDeclaration" && (node.kind === "using" || node.kind === "await using") },
		"singleline-var": newSinglelineKeywordTester("var"),
		"block": newNodeTypeTester(AST_NODE_TYPES.BlockStatement),
		"empty": newNodeTypeTester(AST_NODE_TYPES.EmptyStatement),
		"function": newNodeTypeTester(AST_NODE_TYPES.FunctionDeclaration),
		"ts-method": newNodeTypeTester(AST_NODE_TYPES.TSMethodSignature),
		"break": newKeywordTester(AST_NODE_TYPES.BreakStatement, "break"),
		"case": newKeywordTester(AST_NODE_TYPES.SwitchCase, "case"),
		"class": newKeywordTester(AST_NODE_TYPES.ClassDeclaration, "class"),
		"const": newKeywordTester(AST_NODE_TYPES.VariableDeclaration, "const"),
		"continue": newKeywordTester(AST_NODE_TYPES.ContinueStatement, "continue"),
		"debugger": newKeywordTester(AST_NODE_TYPES.DebuggerStatement, "debugger"),
		"default": newKeywordTester([AST_NODE_TYPES.SwitchCase, AST_NODE_TYPES.ExportDefaultDeclaration], "default"),
		"do": newKeywordTester(AST_NODE_TYPES.DoWhileStatement, "do"),
		"export": newKeywordTester([
			AST_NODE_TYPES.ExportAllDeclaration,
			AST_NODE_TYPES.ExportDefaultDeclaration,
			AST_NODE_TYPES.ExportNamedDeclaration
		], "export"),
		"for": newKeywordTester([
			AST_NODE_TYPES.ForStatement,
			AST_NODE_TYPES.ForInStatement,
			AST_NODE_TYPES.ForOfStatement
		], "for"),
		"if": newKeywordTester(AST_NODE_TYPES.IfStatement, "if"),
		"import": newKeywordTester(AST_NODE_TYPES.ImportDeclaration, "import"),
		"let": newKeywordTester(AST_NODE_TYPES.VariableDeclaration, "let"),
		"return": newKeywordTester(AST_NODE_TYPES.ReturnStatement, "return"),
		"switch": newKeywordTester(AST_NODE_TYPES.SwitchStatement, "switch"),
		"throw": newKeywordTester(AST_NODE_TYPES.ThrowStatement, "throw"),
		"try": newKeywordTester(AST_NODE_TYPES.TryStatement, "try"),
		"using": { test: (node) => node.type === "VariableDeclaration" && (node.kind === "using" || node.kind === "await using") },
		"var": newKeywordTester(AST_NODE_TYPES.VariableDeclaration, "var"),
		"while": newKeywordTester([AST_NODE_TYPES.WhileStatement, AST_NODE_TYPES.DoWhileStatement], "while"),
		"with": newKeywordTester(AST_NODE_TYPES.WithStatement, "with"),
		"cjs-export": { test: (node, sourceCode) => node.type === "ExpressionStatement" && node.expression.type === "AssignmentExpression" && CJS_EXPORT.test(sourceCode.getText(node.expression.left)) },
		"cjs-import": { test: (node, sourceCode) => node.type === "VariableDeclaration" && node.declarations.length > 0 && Boolean(node.declarations[0].init) && CJS_IMPORT.test(sourceCode.getText(node.declarations[0].init)) },
		"enum": newKeywordTester(AST_NODE_TYPES.TSEnumDeclaration, "enum"),
		"interface": newKeywordTester(AST_NODE_TYPES.TSInterfaceDeclaration, "interface"),
		"type": newKeywordTester(AST_NODE_TYPES.TSTypeAliasDeclaration, "type"),
		"function-overload": { test: (node) => node.type === "TSDeclareFunction" }
	};
	padding_line_between_statements_default = createRule({
		name: "padding-line-between-statements",
		meta: {
			type: "layout",
			docs: { description: "Require or disallow padding lines between statements" },
			fixable: "whitespace",
			hasSuggestions: false,
			schema: {
				$defs: {
					paddingType: {
						type: "string",
						enum: Object.keys(PaddingTypes)
					},
					statementType: { anyOf: [{
						type: "string",
						enum: Object.keys(StatementTypes)
					}, {
						type: "array",
						items: {
							type: "string",
							enum: Object.keys(StatementTypes)
						},
						minItems: 1,
						uniqueItems: true,
						additionalItems: false
					}] }
				},
				type: "array",
				additionalItems: false,
				items: {
					type: "object",
					properties: {
						blankLine: { $ref: "#/$defs/paddingType" },
						prev: { $ref: "#/$defs/statementType" },
						next: { $ref: "#/$defs/statementType" }
					},
					additionalProperties: false,
					required: [
						"blankLine",
						"prev",
						"next"
					]
				}
			},
			messages: {
				unexpectedBlankLine: "Unexpected blank line before this statement.",
				expectedBlankLine: "Expected blank line before this statement."
			}
		},
		defaultOptions: [],
		create(context) {
			const sourceCode = context.sourceCode;
			const configureList = context.options || [];
			let scopeInfo = null;
			/**
			* Processes to enter to new scope.
			* This manages the current previous statement.
			*
			* @private
			*/
			function enterScope() {
				scopeInfo = {
					upper: scopeInfo,
					prevNode: null
				};
			}
			/**
			* Processes to exit from the current scope.
			*
			* @private
			*/
			function exitScope() {
				if (scopeInfo) scopeInfo = scopeInfo.upper;
			}
			/**
			* Checks whether the given node matches the given type.
			* @param node The statement node to check.
			* @param type The statement type to check.
			* @returns `true` if the statement node matched the type.
			* @private
			*/
			function match(node, type) {
				let innerStatementNode = node;
				while (innerStatementNode.type === AST_NODE_TYPES.LabeledStatement) innerStatementNode = innerStatementNode.body;
				if (Array.isArray(type)) return type.some(match.bind(null, innerStatementNode));
				return StatementTypes[type].test(innerStatementNode, sourceCode);
			}
			/**
			* Finds the last matched configure from configureList.
			* @paramprevNode The previous statement to match.
			* @paramnextNode The current statement to match.
			* @returns The tester of the last matched configure.
			* @private
			*/
			function getPaddingType(prevNode, nextNode) {
				for (let i = configureList.length - 1; i >= 0; --i) {
					const configure = configureList[i];
					if (match(prevNode, configure.prev) && match(nextNode, configure.next)) return PaddingTypes[configure.blankLine];
				}
				return PaddingTypes.any;
			}
			/**
			* Gets padding line sequences between the given 2 statements.
			* Comments are separators of the padding line sequences.
			* @paramprevNode The previous statement to count.
			* @paramnextNode The current statement to count.
			* @returns The array of token pairs.
			* @private
			*/
			function getPaddingLineSequences(prevNode, nextNode) {
				const pairs = [];
				let prevToken = getActualLastToken(prevNode, sourceCode);
				if (nextNode.loc.start.line - prevToken.loc.end.line >= 2) do {
					const token = sourceCode.getTokenAfter(prevToken, { includeComments: true });
					if (token.loc.start.line - prevToken.loc.end.line >= 2) pairs.push([prevToken, token]);
					prevToken = token;
				} while (prevToken.range[0] < nextNode.range[0]);
				return pairs;
			}
			/**
			* Verify padding lines between the given node and the previous node.
			* @param node The node to verify.
			*
			* @private
			*/
			function verify(node) {
				if (!node.parent || ![
					AST_NODE_TYPES.BlockStatement,
					AST_NODE_TYPES.Program,
					AST_NODE_TYPES.StaticBlock,
					AST_NODE_TYPES.SwitchCase,
					AST_NODE_TYPES.SwitchStatement,
					AST_NODE_TYPES.TSInterfaceBody,
					AST_NODE_TYPES.TSModuleBlock,
					AST_NODE_TYPES.TSTypeLiteral
				].includes(node.parent.type)) return;
				const prevNode = scopeInfo.prevNode;
				if (prevNode) {
					const type = getPaddingType(prevNode, node);
					const paddingLines = getPaddingLineSequences(prevNode, node);
					type.verify(context, prevNode, node, paddingLines);
				}
				scopeInfo.prevNode = node;
			}
			/**
			* Verify padding lines between the given node and the previous node.
			* Then process to enter to new scope.
			* @param node The node to verify.
			*
			* @private
			*/
			function verifyThenEnterScope(node) {
				verify(node);
				enterScope();
			}
			return {
				"Program": enterScope,
				"BlockStatement": enterScope,
				"SwitchStatement": enterScope,
				"StaticBlock": enterScope,
				"TSInterfaceBody": enterScope,
				"TSModuleBlock": enterScope,
				"TSTypeLiteral": enterScope,
				"Program:exit": exitScope,
				"BlockStatement:exit": exitScope,
				"SwitchStatement:exit": exitScope,
				"StaticBlock:exit": exitScope,
				"TSInterfaceBody:exit": exitScope,
				"TSModuleBlock:exit": exitScope,
				"TSTypeLiteral:exit": exitScope,
				":statement": verify,
				"SwitchCase": verifyThenEnterScope,
				"TSDeclareFunction": verifyThenEnterScope,
				"TSMethodSignature": verifyThenEnterScope,
				"SwitchCase:exit": exitScope,
				"TSDeclareFunction:exit": exitScope,
				"TSMethodSignature:exit": exitScope
			};
		}
	});
});
export { init_padding_line_between_statements, padding_line_between_statements_default };

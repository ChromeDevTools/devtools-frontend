import { __esmMin } from "../rolldown-runtime.js";
import { AST_NODE_TYPES, LINEBREAKS, ast_exports, createRule, init_ast, init_create_rule, isSingleLine, isTopLevelExpressionStatement, skipChainExpression } from "../utils.js";
function newKeywordTester(type, keyword) {
	return { test(node, sourceCode) {
		const isSameKeyword = sourceCode.getFirstToken(node)?.value === keyword;
		const isSameType = Array.isArray(type) ? type.includes(node.type) : type === node.type;
		return isSameKeyword && isSameType;
	} };
}
function newNodeTypeTester(type) {
	return { test: (node) => node.type === type };
}
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
function isBlockLikeStatement(node, sourceCode) {
	if (node.type === AST_NODE_TYPES.DoWhileStatement && node.body.type === AST_NODE_TYPES.BlockStatement) return true;
	if (isIIFEStatement(node)) return true;
	const lastToken = sourceCode.getLastToken(node, ast_exports.isNotSemicolonToken);
	const belongingNode = lastToken && (0, ast_exports.isClosingBraceToken)(lastToken) ? sourceCode.getNodeByRangeIndex(lastToken.range[0]) : null;
	return !!belongingNode && (belongingNode.type === AST_NODE_TYPES.BlockStatement || belongingNode.type === AST_NODE_TYPES.SwitchStatement);
}
function isDirective(node, sourceCode) {
	return isTopLevelExpressionStatement(node) && node.expression.type === AST_NODE_TYPES.Literal && typeof node.expression.value === "string" && !(0, ast_exports.isParenthesized)(node.expression, sourceCode);
}
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
function isExpression(node, sourceCode) {
	return node.type === AST_NODE_TYPES.ExpressionStatement && !isDirectivePrologue(node, sourceCode);
}
function getActualLastToken(node, sourceCode) {
	const semiToken = sourceCode.getLastToken(node);
	const prevToken = sourceCode.getTokenBefore(semiToken);
	const nextToken = sourceCode.getTokenAfter(semiToken);
	const isSemicolonLessStyle = prevToken && nextToken && prevToken.range[0] >= node.range[0] && (0, ast_exports.isSemicolonToken)(semiToken) && !(0, ast_exports.isTokenOnSameLine)(prevToken, semiToken) && (0, ast_exports.isTokenOnSameLine)(semiToken, nextToken);
	return isSemicolonLessStyle ? prevToken : semiToken;
}
function replacerToRemovePaddingLines(_, trailingSpaces, indentSpaces) {
	return trailingSpaces + indentSpaces;
}
function verifyForAny() {}
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
var CJS_EXPORT, CJS_IMPORT, LT, PADDING_LINE_SEQUENCE, PaddingTypes, MaybeMultilineStatementType, StatementTypes, padding_line_between_statements_default;
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
	MaybeMultilineStatementType = {
		"block-like": { test: isBlockLikeStatement },
		"expression": { test: isExpression },
		"export": newKeywordTester([
			AST_NODE_TYPES.ExportAllDeclaration,
			AST_NODE_TYPES.ExportDefaultDeclaration,
			AST_NODE_TYPES.ExportNamedDeclaration
		], "export"),
		"var": newKeywordTester(AST_NODE_TYPES.VariableDeclaration, "var"),
		"let": newKeywordTester(AST_NODE_TYPES.VariableDeclaration, "let"),
		"const": newKeywordTester(AST_NODE_TYPES.VariableDeclaration, "const"),
		"using": { test: (node) => node.type === "VariableDeclaration" && (node.kind === "using" || node.kind === "await using") }
	};
	StatementTypes = {
		"*": { test: () => true },
		"exports": { test: isCJSExport },
		"require": { test: isCJSRequire },
		"directive": { test: isDirectivePrologue },
		"iife": { test: isIIFEStatement },
		"block": newNodeTypeTester(AST_NODE_TYPES.BlockStatement),
		"empty": newNodeTypeTester(AST_NODE_TYPES.EmptyStatement),
		"function": newNodeTypeTester(AST_NODE_TYPES.FunctionDeclaration),
		"ts-method": newNodeTypeTester(AST_NODE_TYPES.TSMethodSignature),
		"break": newKeywordTester(AST_NODE_TYPES.BreakStatement, "break"),
		"case": newKeywordTester(AST_NODE_TYPES.SwitchCase, "case"),
		"class": newKeywordTester(AST_NODE_TYPES.ClassDeclaration, "class"),
		"continue": newKeywordTester(AST_NODE_TYPES.ContinueStatement, "continue"),
		"debugger": newKeywordTester(AST_NODE_TYPES.DebuggerStatement, "debugger"),
		"default": newKeywordTester([AST_NODE_TYPES.SwitchCase, AST_NODE_TYPES.ExportDefaultDeclaration], "default"),
		"do": newKeywordTester(AST_NODE_TYPES.DoWhileStatement, "do"),
		"for": newKeywordTester([
			AST_NODE_TYPES.ForStatement,
			AST_NODE_TYPES.ForInStatement,
			AST_NODE_TYPES.ForOfStatement
		], "for"),
		"if": newKeywordTester(AST_NODE_TYPES.IfStatement, "if"),
		"import": newKeywordTester(AST_NODE_TYPES.ImportDeclaration, "import"),
		"return": newKeywordTester(AST_NODE_TYPES.ReturnStatement, "return"),
		"switch": newKeywordTester(AST_NODE_TYPES.SwitchStatement, "switch"),
		"throw": newKeywordTester(AST_NODE_TYPES.ThrowStatement, "throw"),
		"try": newKeywordTester(AST_NODE_TYPES.TryStatement, "try"),
		"while": newKeywordTester([AST_NODE_TYPES.WhileStatement, AST_NODE_TYPES.DoWhileStatement], "while"),
		"with": newKeywordTester(AST_NODE_TYPES.WithStatement, "with"),
		"cjs-export": { test: (node, sourceCode) => node.type === "ExpressionStatement" && node.expression.type === "AssignmentExpression" && CJS_EXPORT.test(sourceCode.getText(node.expression.left)) },
		"cjs-import": { test: (node, sourceCode) => node.type === "VariableDeclaration" && node.declarations.length > 0 && Boolean(node.declarations[0].init) && CJS_IMPORT.test(sourceCode.getText(node.declarations[0].init)) },
		"enum": newKeywordTester(AST_NODE_TYPES.TSEnumDeclaration, "enum"),
		"interface": newKeywordTester(AST_NODE_TYPES.TSInterfaceDeclaration, "interface"),
		"type": newKeywordTester(AST_NODE_TYPES.TSTypeAliasDeclaration, "type"),
		"function-overload": newNodeTypeTester(AST_NODE_TYPES.TSDeclareFunction),
		...Object.fromEntries(Object.entries(MaybeMultilineStatementType).flatMap(([key, value]) => [
			[key, value],
			[`singleline-${key}`, {
				...value,
				test: (node, sourceCode) => value.test(node, sourceCode) && isSingleLine(node)
			}],
			[`multiline-${key}`, {
				...value,
				test: (node, sourceCode) => value.test(node, sourceCode) && !isSingleLine(node)
			}]
		]))
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
					statementType: {
						type: "string",
						enum: Object.keys(StatementTypes)
					},
					statementOption: { anyOf: [{ $ref: "#/$defs/statementType" }, {
						type: "array",
						items: { $ref: "#/$defs/statementType" },
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
						prev: { $ref: "#/$defs/statementOption" },
						next: { $ref: "#/$defs/statementOption" }
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
			function enterScope() {
				scopeInfo = {
					upper: scopeInfo,
					prevNode: null
				};
			}
			function exitScope() {
				if (scopeInfo) scopeInfo = scopeInfo.upper;
			}
			function match(node, type) {
				let innerStatementNode = node;
				while (innerStatementNode.type === AST_NODE_TYPES.LabeledStatement) innerStatementNode = innerStatementNode.body;
				if (Array.isArray(type)) return type.some(match.bind(null, innerStatementNode));
				return StatementTypes[type].test(innerStatementNode, sourceCode);
			}
			function getPaddingType(prevNode, nextNode) {
				for (let i = configureList.length - 1; i >= 0; --i) {
					const configure = configureList[i];
					if (match(prevNode, configure.prev) && match(nextNode, configure.next)) return PaddingTypes[configure.blankLine];
				}
				return PaddingTypes.any;
			}
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

import { __esmMin } from "../rolldown-runtime.js";
import { AST_NODE_TYPES, AST_TOKEN_TYPES, COMMENTS_IGNORE_PATTERN, ast_exports, createRule, init_ast, init_create_rule, isHashbangComment } from "../utils.js";
/**
* @returns an array with with any line numbers that are empty.
*/
function getEmptyLineNums(lines) {
	const emptyLines = lines.map((line, i) => ({
		code: line.trim(),
		num: i + 1
	})).filter((line) => !line.code).map((line) => line.num);
	return emptyLines;
}
/**
* @returns an array with with any line numbers that contain comments.
*/
function getCommentLineNums(comments) {
	const lines = [];
	comments.forEach((token) => {
		const start = token.loc.start.line;
		const end = token.loc.end.line;
		lines.push(start, end);
	});
	return lines;
}
var lines_around_comment_default;
var init_lines_around_comment = __esmMin(() => {
	init_ast();
	init_create_rule();
	lines_around_comment_default = createRule({
		name: "lines-around-comment",
		meta: {
			type: "layout",
			docs: { description: "Require empty lines around comments" },
			schema: [{
				type: "object",
				properties: {
					beforeBlockComment: {
						type: "boolean",
						default: true
					},
					afterBlockComment: {
						type: "boolean",
						default: false
					},
					beforeLineComment: {
						type: "boolean",
						default: false
					},
					afterLineComment: {
						type: "boolean",
						default: false
					},
					allowBlockStart: {
						type: "boolean",
						default: false
					},
					allowBlockEnd: {
						type: "boolean",
						default: false
					},
					allowClassStart: { type: "boolean" },
					allowClassEnd: { type: "boolean" },
					allowObjectStart: { type: "boolean" },
					allowObjectEnd: { type: "boolean" },
					allowArrayStart: { type: "boolean" },
					allowArrayEnd: { type: "boolean" },
					allowInterfaceStart: { type: "boolean" },
					allowInterfaceEnd: { type: "boolean" },
					allowTypeStart: { type: "boolean" },
					allowTypeEnd: { type: "boolean" },
					allowEnumStart: { type: "boolean" },
					allowEnumEnd: { type: "boolean" },
					allowModuleStart: { type: "boolean" },
					allowModuleEnd: { type: "boolean" },
					ignorePattern: { type: "string" },
					applyDefaultIgnorePatterns: { type: "boolean" },
					afterHashbangComment: { type: "boolean" }
				},
				additionalProperties: false
			}],
			fixable: "whitespace",
			messages: {
				after: "Expected line after comment.",
				before: "Expected line before comment."
			}
		},
		defaultOptions: [{ beforeBlockComment: true }],
		create(context, [_options]) {
			const options = _options;
			const defaultIgnoreRegExp = COMMENTS_IGNORE_PATTERN;
			const customIgnoreRegExp = new RegExp(options.ignorePattern ?? "", "u");
			const sourceCode = context.sourceCode;
			const comments = sourceCode.getAllComments();
			const lines = sourceCode.lines;
			const numLines = lines.length + 1;
			const commentLines = getCommentLineNums(comments);
			const emptyLines = getEmptyLineNums(lines);
			const commentAndEmptyLines = new Set(commentLines.concat(emptyLines));
			/**
			* @returns whether comments are on lines starting with or ending with code.
			*/
			function codeAroundComment(token) {
				let currentToken = token;
				do
					currentToken = sourceCode.getTokenBefore(currentToken, { includeComments: true });
				while (currentToken && (0, ast_exports.isCommentToken)(currentToken));
				if (currentToken && (0, ast_exports.isTokenOnSameLine)(currentToken, token)) return true;
				currentToken = token;
				do
					currentToken = sourceCode.getTokenAfter(currentToken, { includeComments: true });
				while (currentToken && (0, ast_exports.isCommentToken)(currentToken));
				if (currentToken && (0, ast_exports.isTokenOnSameLine)(token, currentToken)) return true;
				return false;
			}
			/**
			* @returns whether comments are inside a node type.
			*/
			function isParentNodeType(parent, nodeType) {
				return parent.type === nodeType;
			}
			/**
			* @returns the parent node that contains the given token.
			*/
			function getParentNodeOfToken(token) {
				const node = sourceCode.getNodeByRangeIndex(token.range[0]);
				/**
				*             For the purpose of this rule, the comment token is in a `StaticBlock` node only
				* if it's inside the braces of that `StaticBlock` node.
				*
				* Example where this function returns `null`:
				*
				*   static
				*   // comment
				*   {
				*   }
				*
				* Example where this function returns `StaticBlock` node:
				*
				*   static
				*   {
				*   // comment
				*   }
				*
				*/
				if (node && node.type === "StaticBlock") {
					const openingBrace = sourceCode.getFirstToken(node, { skip: 1 });
					return openingBrace && token.range[0] >= openingBrace.range[0] ? node : null;
				}
				return node;
			}
			/**
			* @returns whether comments are at the parent start.
			*/
			function isCommentAtParentStart(token, nodeType) {
				const parent = getParentNodeOfToken(token);
				if (parent && isParentNodeType(parent, nodeType)) {
					let parentStartNodeOrToken = parent;
					if (parent.type === "StaticBlock") parentStartNodeOrToken = sourceCode.getFirstToken(parent, { skip: 1 });
					else if (parent.type === "SwitchStatement") parentStartNodeOrToken = sourceCode.getTokenAfter(parent.discriminant, { filter: ast_exports.isOpeningBraceToken });
					return !!parentStartNodeOrToken && token.loc.start.line - parentStartNodeOrToken.loc.start.line === 1;
				}
				return false;
			}
			/**
			* @returns whether comments are at the parent end.
			*/
			function isCommentAtParentEnd(token, nodeType) {
				const parent = getParentNodeOfToken(token);
				return !!parent && isParentNodeType(parent, nodeType) && parent.loc.end.line - token.loc.end.line === 1;
			}
			/**
			* Returns whether or not comments are at the block start or not.
			* @param token The Comment token.
			* @returns True if the comment is at block start.
			*/
			function isCommentAtBlockStart(token) {
				return isCommentAtParentStart(token, AST_NODE_TYPES.ClassBody) || isCommentAtParentStart(token, AST_NODE_TYPES.BlockStatement) || isCommentAtParentStart(token, AST_NODE_TYPES.StaticBlock) || isCommentAtParentStart(token, AST_NODE_TYPES.SwitchCase) || isCommentAtParentStart(token, AST_NODE_TYPES.SwitchStatement);
			}
			/**
			* Returns whether or not comments are at the block end or not.
			* @param token The Comment token.
			* @returns True if the comment is at block end.
			*/
			function isCommentAtBlockEnd(token) {
				return isCommentAtParentEnd(token, AST_NODE_TYPES.ClassBody) || isCommentAtParentEnd(token, AST_NODE_TYPES.BlockStatement) || isCommentAtParentEnd(token, AST_NODE_TYPES.StaticBlock) || isCommentAtParentEnd(token, AST_NODE_TYPES.SwitchCase) || isCommentAtParentEnd(token, AST_NODE_TYPES.SwitchStatement);
			}
			/**
			* Returns whether or not comments are at the class start or not.
			* @param token The Comment token.
			* @returns True if the comment is at class start.
			*/
			function isCommentAtClassStart(token) {
				return isCommentAtParentStart(token, AST_NODE_TYPES.ClassBody);
			}
			/**
			* Returns whether or not comments are at the class end or not.
			* @param token The Comment token.
			* @returns True if the comment is at class end.
			*/
			function isCommentAtClassEnd(token) {
				return isCommentAtParentEnd(token, AST_NODE_TYPES.ClassBody);
			}
			/**
			* Returns whether or not comments are at the object start or not.
			* @param token The Comment token.
			* @returns True if the comment is at object start.
			*/
			function isCommentAtObjectStart(token) {
				return isCommentAtParentStart(token, AST_NODE_TYPES.ObjectExpression) || isCommentAtParentStart(token, AST_NODE_TYPES.ObjectPattern);
			}
			/**
			* Returns whether or not comments are at the object end or not.
			* @param token The Comment token.
			* @returns True if the comment is at object end.
			*/
			function isCommentAtObjectEnd(token) {
				return isCommentAtParentEnd(token, AST_NODE_TYPES.ObjectExpression) || isCommentAtParentEnd(token, AST_NODE_TYPES.ObjectPattern);
			}
			/**
			* Returns whether or not comments are at the array start or not.
			* @param token The Comment token.
			* @returns True if the comment is at array start.
			*/
			function isCommentAtArrayStart(token) {
				return isCommentAtParentStart(token, AST_NODE_TYPES.ArrayExpression) || isCommentAtParentStart(token, AST_NODE_TYPES.ArrayPattern);
			}
			/**
			* Returns whether or not comments are at the array end or not.
			* @param token The Comment token.
			* @returns True if the comment is at array end.
			*/
			function isCommentAtArrayEnd(token) {
				return isCommentAtParentEnd(token, AST_NODE_TYPES.ArrayExpression) || isCommentAtParentEnd(token, AST_NODE_TYPES.ArrayPattern);
			}
			function isCommentAtInterfaceStart(token) {
				return isCommentAtParentStart(token, AST_NODE_TYPES.TSInterfaceBody);
			}
			function isCommentAtInterfaceEnd(token) {
				return isCommentAtParentEnd(token, AST_NODE_TYPES.TSInterfaceBody);
			}
			function isCommentAtTypeStart(token) {
				return isCommentAtParentStart(token, AST_NODE_TYPES.TSTypeLiteral);
			}
			function isCommentAtTypeEnd(token) {
				return isCommentAtParentEnd(token, AST_NODE_TYPES.TSTypeLiteral);
			}
			function isCommentAtEnumStart(token) {
				return isCommentAtParentStart(token, AST_NODE_TYPES.TSEnumBody) || isCommentAtParentStart(token, AST_NODE_TYPES.TSEnumDeclaration);
			}
			function isCommentAtEnumEnd(token) {
				return isCommentAtParentEnd(token, AST_NODE_TYPES.TSEnumBody) || isCommentAtParentEnd(token, AST_NODE_TYPES.TSEnumDeclaration);
			}
			function isCommentAtModuleStart(token) {
				return isCommentAtParentStart(token, AST_NODE_TYPES.TSModuleBlock);
			}
			function isCommentAtModuleEnd(token) {
				return isCommentAtParentEnd(token, AST_NODE_TYPES.TSModuleBlock);
			}
			function checkForEmptyLine(token, { before, after }) {
				if (options.applyDefaultIgnorePatterns !== false && defaultIgnoreRegExp.test(token.value)) return;
				if (options.ignorePattern && customIgnoreRegExp.test(token.value)) return;
				const prevLineNum = token.loc.start.line - 1;
				const nextLineNum = token.loc.end.line + 1;
				if (prevLineNum < 1) before = false;
				if (nextLineNum >= numLines) after = false;
				if (codeAroundComment(token)) return;
				const blockStartAllowed = Boolean(options.allowBlockStart) && isCommentAtBlockStart(token) && !(options.allowClassStart === false && isCommentAtClassStart(token));
				const blockEndAllowed = Boolean(options.allowBlockEnd) && isCommentAtBlockEnd(token) && !(options.allowClassEnd === false && isCommentAtClassEnd(token));
				const classStartAllowed = Boolean(options.allowClassStart) && isCommentAtClassStart(token);
				const classEndAllowed = Boolean(options.allowClassEnd) && isCommentAtClassEnd(token);
				const objectStartAllowed = Boolean(options.allowObjectStart) && isCommentAtObjectStart(token);
				const objectEndAllowed = Boolean(options.allowObjectEnd) && isCommentAtObjectEnd(token);
				const arrayStartAllowed = Boolean(options.allowArrayStart) && isCommentAtArrayStart(token);
				const arrayEndAllowed = Boolean(options.allowArrayEnd) && isCommentAtArrayEnd(token);
				const interfaceStartAllowed = Boolean(options.allowInterfaceStart) && isCommentAtInterfaceStart(token);
				const interfaceEndAllowed = Boolean(options.allowInterfaceEnd) && isCommentAtInterfaceEnd(token);
				const typeStartAllowed = Boolean(options.allowTypeStart) && isCommentAtTypeStart(token);
				const typeEndAllowed = Boolean(options.allowTypeEnd) && isCommentAtTypeEnd(token);
				const enumStartAllowed = Boolean(options.allowEnumStart) && isCommentAtEnumStart(token);
				const enumEndAllowed = Boolean(options.allowEnumEnd) && isCommentAtEnumEnd(token);
				const moduleStartAllowed = Boolean(options.allowModuleStart) && isCommentAtModuleStart(token);
				const moduleEndAllowed = Boolean(options.allowModuleEnd) && isCommentAtModuleEnd(token);
				const exceptionStartAllowed = blockStartAllowed || classStartAllowed || objectStartAllowed || arrayStartAllowed || interfaceStartAllowed || typeStartAllowed || enumStartAllowed || moduleStartAllowed;
				const exceptionEndAllowed = blockEndAllowed || classEndAllowed || objectEndAllowed || arrayEndAllowed || interfaceEndAllowed || typeEndAllowed || enumEndAllowed || moduleEndAllowed;
				const previousTokenOrComment = sourceCode.getTokenBefore(token, { includeComments: true });
				const nextTokenOrComment = sourceCode.getTokenAfter(token, { includeComments: true });
				if (!exceptionStartAllowed && before && !commentAndEmptyLines.has(prevLineNum) && !((0, ast_exports.isCommentToken)(previousTokenOrComment) && (0, ast_exports.isTokenOnSameLine)(previousTokenOrComment, token))) {
					const lineStart = token.range[0] - token.loc.start.column;
					const range = [lineStart, lineStart];
					context.report({
						node: token,
						messageId: "before",
						fix(fixer) {
							return fixer.insertTextBeforeRange(range, "\n");
						}
					});
				}
				if (!exceptionEndAllowed && after && !commentAndEmptyLines.has(nextLineNum) && !((0, ast_exports.isCommentToken)(nextTokenOrComment) && (0, ast_exports.isTokenOnSameLine)(token, nextTokenOrComment))) context.report({
					node: token,
					messageId: "after",
					fix(fixer) {
						return fixer.insertTextAfter(token, "\n");
					}
				});
			}
			return { Program() {
				comments.forEach((token) => {
					if (token.type === AST_TOKEN_TYPES.Line) {
						if (options.beforeLineComment || options.afterLineComment) checkForEmptyLine(token, {
							after: options.afterLineComment,
							before: options.beforeLineComment
						});
					} else if (token.type === AST_TOKEN_TYPES.Block) {
						if (options.beforeBlockComment || options.afterBlockComment) checkForEmptyLine(token, {
							after: options.afterBlockComment,
							before: options.beforeBlockComment
						});
					} else if (isHashbangComment(token)) {
						if (options.afterHashbangComment) checkForEmptyLine(token, {
							after: options.afterHashbangComment,
							before: false
						});
					}
				});
			} };
		}
	});
});
export { init_lines_around_comment, lines_around_comment_default };

import { AST_NODE_TYPES, ast_exports, canTokensBeAdjacent, createRule, getPrecedence, getStaticPropertyName, isDecimalInteger, isKeywordToken, isMixedLogicalAndCoalesceExpressions, isRegExpLiteral, isSingleLine, isTopLevelExpressionStatement, skipChainExpression, warnDeprecatedOptions } from "../utils.js";
const isTypeAssertion = (0, ast_exports.isNodeOfTypes)([
	AST_NODE_TYPES.TSAsExpression,
	AST_NODE_TYPES.TSNonNullExpression,
	AST_NODE_TYPES.TSSatisfiesExpression,
	AST_NODE_TYPES.TSTypeAssertion
]);
var no_extra_parens_default = createRule({
	name: "no-extra-parens",
	meta: {
		type: "layout",
		docs: { description: "Disallow unnecessary parentheses" },
		fixable: "code",
		schema: { anyOf: [{
			type: "array",
			items: [{
				type: "string",
				enum: ["functions"]
			}],
			minItems: 0,
			maxItems: 1
		}, {
			type: "array",
			items: [{
				type: "string",
				enum: ["all"]
			}, {
				type: "object",
				properties: {
					conditionalAssign: { type: "boolean" },
					ternaryOperandBinaryExpressions: { type: "boolean" },
					nestedBinaryExpressions: { type: "boolean" },
					returnAssign: { type: "boolean" },
					ignoreJSX: {
						type: "string",
						enum: [
							"none",
							"all",
							"single-line",
							"multi-line"
						]
					},
					enforceForArrowConditionals: { type: "boolean" },
					enforceForSequenceExpressions: { type: "boolean" },
					enforceForNewInMemberExpressions: { type: "boolean" },
					enforceForFunctionPrototypeMethods: { type: "boolean" },
					allowParensAfterCommentPattern: { type: "string" },
					nestedConditionalExpressions: { type: "boolean" },
					allowNodesInSpreadElement: {
						type: "object",
						properties: {
							ConditionalExpression: { type: "boolean" },
							LogicalExpression: { type: "boolean" },
							AwaitExpression: { type: "boolean" }
						},
						additionalProperties: false
					},
					ignoredNodes: {
						type: "array",
						items: {
							type: "string",
							not: {
								type: "string",
								pattern: ":exit$"
							}
						}
					}
				},
				additionalProperties: false
			}],
			minItems: 0,
			maxItems: 2
		}] },
		messages: { unexpected: "Unnecessary parentheses around expression." }
	},
	defaultOptions: ["all"],
	create(context, [nodes, options]) {
		const sourceCode = context.sourceCode;
		const tokensToIgnore = /* @__PURE__ */ new WeakSet();
		const precedence = getPrecedence;
		const ALL_NODES = nodes !== "functions";
		const EXCEPT_COND_ASSIGN = ALL_NODES && options?.conditionalAssign === false;
		const EXCEPT_COND_TERNARY = ALL_NODES && options?.ternaryOperandBinaryExpressions === false;
		const IGNORE_NESTED_BINARY = ALL_NODES && options?.nestedBinaryExpressions === false;
		const EXCEPT_RETURN_ASSIGN = ALL_NODES && options?.returnAssign === false;
		const IGNORE_JSX = ALL_NODES && options?.ignoreJSX;
		const IGNORE_ARROW_CONDITIONALS = ALL_NODES && options?.enforceForArrowConditionals === false;
		const IGNORE_SEQUENCE_EXPRESSIONS = ALL_NODES && options?.enforceForSequenceExpressions === false;
		const IGNORE_NEW_IN_MEMBER_EXPR = ALL_NODES && options?.enforceForNewInMemberExpressions === false;
		const IGNORE_FUNCTION_PROTOTYPE_METHODS = ALL_NODES && options?.enforceForFunctionPrototypeMethods === false;
		const ALLOW_PARENS_AFTER_COMMENT_PATTERN = ALL_NODES && options?.allowParensAfterCommentPattern;
		const ALLOW_NESTED_TERNARY = ALL_NODES && options?.nestedConditionalExpressions === false;
		const ALLOW_NODES_IN_SPREAD = ALL_NODES && options && new Set(Object.entries(options.allowNodesInSpreadElement || {}).filter(([_, value]) => value).map(([key]) => key));
		warnDeprecatedOptions(options, [
			"enforceForArrowConditionals",
			"enforceForNewInMemberExpressions",
			"allowNodesInSpreadElement"
		], "ignoredNodes", "no-extra-parens");
		const PRECEDENCE_OF_ASSIGNMENT_EXPR = precedence({ type: "AssignmentExpression" });
		const PRECEDENCE_OF_UPDATE_EXPR = precedence({ type: "UpdateExpression" });
		let reportsBuffer;
		function pathToAncestor(node, ancestor) {
			const path = [node];
			let currentNode = node;
			while (currentNode !== ancestor) {
				currentNode = currentNode.parent;
				/* c8 ignore start */
				if (currentNode === null || currentNode === void 0) throw new Error("Nodes are not in the ancestor-descendant relationship.");
				/* c8 ignore stop */
				path.push(currentNode);
			}
			return path;
		}
		function pathToDescendant(node, descendant) {
			return pathToAncestor(descendant, node).reverse();
		}
		function isSafelyEnclosingInExpression(node, child) {
			switch (node.type) {
				case "ArrayExpression":
				case "ArrayPattern":
				case "BlockStatement":
				case "ObjectExpression":
				case "ObjectPattern":
				case "TemplateLiteral": return true;
				case "ArrowFunctionExpression":
				case "FunctionExpression": return node.params.includes(child);
				case "CallExpression":
				case "NewExpression": return node.arguments.includes(child);
				case "MemberExpression": return node.computed && node.property === child;
				case "ConditionalExpression": return node.consequent === child;
				default: return false;
			}
		}
		function startNewReportsBuffering() {
			reportsBuffer = {
				upper: reportsBuffer,
				inExpressionNodes: [],
				reports: []
			};
		}
		function endCurrentReportsBuffering() {
			const { upper, inExpressionNodes, reports } = reportsBuffer ?? {};
			if (upper) {
				upper.inExpressionNodes.push(...inExpressionNodes ?? []);
				upper.reports.push(...reports ?? []);
			} else reports?.forEach(({ finishReport }) => finishReport());
			reportsBuffer = upper;
		}
		function isInCurrentReportsBuffer(node) {
			return reportsBuffer?.reports.some((r) => r.node === node);
		}
		function removeFromCurrentReportsBuffer(node) {
			if (reportsBuffer) reportsBuffer.reports = reportsBuffer.reports.filter((r) => r.node !== node);
		}
		function isImmediateFunctionPrototypeMethodCall(node) {
			const callNode = skipChainExpression(node);
			if (callNode.type !== "CallExpression") return false;
			const callee = skipChainExpression(callNode.callee);
			return callee.type === "MemberExpression" && callee.object.type === "FunctionExpression" && ["call", "apply"].includes(getStaticPropertyName(callee));
		}
		function ruleApplies(node) {
			if (node.type === "JSXElement" || node.type === "JSXFragment") switch (IGNORE_JSX) {
				case "all": return false;
				case "multi-line": return isSingleLine(node);
				case "single-line": return !isSingleLine(node);
				case "none": break;
			}
			if (node.type === "SequenceExpression" && IGNORE_SEQUENCE_EXPRESSIONS) return false;
			if (isImmediateFunctionPrototypeMethodCall(node) && IGNORE_FUNCTION_PROTOTYPE_METHODS) return false;
			return ALL_NODES || node.type === "FunctionExpression" || node.type === "ArrowFunctionExpression";
		}
		function isParenthesised(node) {
			return (0, ast_exports.isParenthesized)(1, node, sourceCode);
		}
		function isParenthesisedTwice(node) {
			return (0, ast_exports.isParenthesized)(2, node, sourceCode);
		}
		function hasExcessParens(node) {
			return ruleApplies(node) && isParenthesised(node);
		}
		function hasDoubleExcessParens(node) {
			return ruleApplies(node) && isParenthesisedTwice(node);
		}
		function hasExcessParensWithPrecedence(node, precedenceLowerLimit) {
			if (ruleApplies(node) && isParenthesised(node)) {
				if (precedence(node) >= precedenceLowerLimit || isParenthesisedTwice(node)) return true;
			}
			return false;
		}
		function isCondAssignException(node) {
			return EXCEPT_COND_ASSIGN && node.test && node.test.type === "AssignmentExpression";
		}
		function isInReturnStatement(node) {
			for (let currentNode = node; currentNode; currentNode = currentNode.parent) if (currentNode.type === "ReturnStatement" || currentNode.type === "ArrowFunctionExpression" && currentNode.body.type !== "BlockStatement") return true;
			return false;
		}
		function isNewExpressionWithParens(newExpression) {
			const lastToken = sourceCode.getLastToken(newExpression);
			const penultimateToken = sourceCode.getTokenBefore(lastToken);
			return newExpression.arguments.length > 0 || (0, ast_exports.isOpeningParenToken)(penultimateToken) && (0, ast_exports.isClosingParenToken)(lastToken) && newExpression.callee.range[1] < newExpression.range[1];
		}
		function isMemberExpInNewCallee(node) {
			if (node.type === "MemberExpression") return node.parent.type === "NewExpression" && node.parent.callee === node ? true : "object" in node.parent && node.parent.object === node && isMemberExpInNewCallee(node.parent);
			return false;
		}
		function doesMemberExpressionContainCallExpression(node) {
			let currentNode = node.object;
			let currentNodeType = node.object.type;
			while (currentNodeType === "MemberExpression") {
				if (!("object" in currentNode)) break;
				currentNode = currentNode.object;
				currentNodeType = currentNode.type;
			}
			return currentNodeType === "CallExpression";
		}
		function containsAssignment(node) {
			if (node.type === "AssignmentExpression") return true;
			if (node.type === "ConditionalExpression" && (node.consequent.type === "AssignmentExpression" || node.alternate.type === "AssignmentExpression")) return true;
			if ("left" in node && (node.left && node.left.type === "AssignmentExpression" || node.right && node.right.type === "AssignmentExpression")) return true;
			return false;
		}
		function isReturnAssignException(node) {
			if (!EXCEPT_RETURN_ASSIGN || !isInReturnStatement(node)) return false;
			if (node.type === "ReturnStatement") return node.argument && containsAssignment(node.argument);
			if (node.type === "ArrowFunctionExpression" && node.body.type !== "BlockStatement") return containsAssignment(node.body);
			return containsAssignment(node);
		}
		function hasExcessParensNoLineTerminator(token, node) {
			if ((0, ast_exports.isTokenOnSameLine)(token, node)) return hasExcessParens(node);
			return hasDoubleExcessParens(node);
		}
		function requiresLeadingSpace(node) {
			const leftParenToken = sourceCode.getTokenBefore(node);
			const tokenBeforeLeftParen = sourceCode.getTokenBefore(leftParenToken, { includeComments: true });
			const tokenAfterLeftParen = sourceCode.getTokenAfter(leftParenToken, { includeComments: true });
			return tokenBeforeLeftParen && tokenBeforeLeftParen.range[1] === leftParenToken.range[0] && leftParenToken.range[1] === tokenAfterLeftParen.range[0] && !canTokensBeAdjacent(tokenBeforeLeftParen, tokenAfterLeftParen);
		}
		function requiresTrailingSpace(node) {
			const nextTwoTokens = sourceCode.getTokensAfter(node, { count: 2 });
			const rightParenToken = nextTwoTokens[0];
			const tokenAfterRightParen = nextTwoTokens[1];
			const tokenBeforeRightParen = sourceCode.getLastToken(node);
			return rightParenToken && tokenAfterRightParen && !sourceCode.isSpaceBetween(rightParenToken, tokenAfterRightParen) && !canTokensBeAdjacent(tokenBeforeRightParen, tokenAfterRightParen);
		}
		function isIIFE(node) {
			const maybeCallNode = skipChainExpression(node);
			return maybeCallNode.type === "CallExpression" && maybeCallNode.callee.type === "FunctionExpression";
		}
		function canBeAssignmentTarget(node) {
			return !!(node && (node.type === "Identifier" || node.type === "MemberExpression"));
		}
		function isAnonymousFunctionAssignmentException({ left, operator, right }) {
			if (left.type === "Identifier" && [
				"=",
				"&&=",
				"||=",
				"??="
			].includes(operator)) {
				const rhsType = right.type;
				if (rhsType === "ArrowFunctionExpression") return true;
				if ((rhsType === "FunctionExpression" || rhsType === "ClassExpression") && !right.id) return true;
			}
			return false;
		}
		function isFixable(node) {
			if (node.type !== "Literal" || typeof node.value !== "string") return true;
			if (isParenthesisedTwice(node)) return true;
			return !isTopLevelExpressionStatement(node.parent);
		}
		function report(node) {
			const leftParenToken = sourceCode.getTokenBefore(node);
			const rightParenToken = sourceCode.getTokenAfter(node);
			if (!isParenthesisedTwice(node)) {
				if (tokensToIgnore.has(sourceCode.getFirstToken(node))) return;
				if (isIIFE(node) && !("callee" in node && isParenthesised(node.callee))) return;
				if (ALLOW_PARENS_AFTER_COMMENT_PATTERN) {
					const commentsBeforeLeftParenToken = sourceCode.getCommentsBefore(leftParenToken);
					const totalCommentsBeforeLeftParenTokenCount = commentsBeforeLeftParenToken.length;
					if (totalCommentsBeforeLeftParenTokenCount > 0 && new RegExp(ALLOW_PARENS_AFTER_COMMENT_PATTERN, "u").test(commentsBeforeLeftParenToken[totalCommentsBeforeLeftParenTokenCount - 1].value)) return;
				}
			}
			function finishReport() {
				context.report({
					node,
					loc: leftParenToken.loc,
					messageId: "unexpected",
					fix: isFixable(node) ? (fixer) => {
						const parenthesizedSource = sourceCode.text.slice(leftParenToken.range[1], rightParenToken.range[0]);
						return fixer.replaceTextRange([leftParenToken.range[0], rightParenToken.range[1]], (requiresLeadingSpace(node) ? " " : "") + parenthesizedSource + (requiresTrailingSpace(node) ? " " : ""));
					} : null
				});
			}
			if (reportsBuffer) {
				reportsBuffer.reports.push({
					node,
					finishReport
				});
				return;
			}
			finishReport();
		}
		function checkArgumentWithPrecedence(node) {
			if ("argument" in node && node.argument && hasExcessParensWithPrecedence(node.argument, precedence(node))) report(node.argument);
		}
		function checkBinaryLogical(node) {
			const isLeftTypeAssertion = isTypeAssertion(node.left);
			const isRightTypeAssertion = isTypeAssertion(node.right);
			if (isLeftTypeAssertion && isRightTypeAssertion) return;
			const rule = (n) => {
				const prec = precedence(n);
				const leftPrecedence = precedence(n.left);
				const rightPrecedence = precedence(n.right);
				const isExponentiation = n.operator === "**";
				const shouldSkipLeft = IGNORE_NESTED_BINARY && (n.left.type === "BinaryExpression" || n.left.type === "LogicalExpression");
				const shouldSkipRight = IGNORE_NESTED_BINARY && (n.right.type === "BinaryExpression" || n.right.type === "LogicalExpression");
				if (!shouldSkipLeft && hasExcessParens(n.left)) {
					if (!(["AwaitExpression", "UnaryExpression"].includes(n.left.type) && isExponentiation) && !isMixedLogicalAndCoalesceExpressions(n.left, n) && !(n.parent.type === "ReturnStatement" && n.parent.loc.start.line !== n.left.loc.start.line && !isParenthesised(n)) && (leftPrecedence > prec || leftPrecedence === prec && !isExponentiation) || isParenthesisedTwice(n.left)) report(n.left);
				}
				if (!shouldSkipRight && hasExcessParens(n.right)) {
					if (!isMixedLogicalAndCoalesceExpressions(n.right, n) && (rightPrecedence > prec || rightPrecedence === prec && isExponentiation) || isParenthesisedTwice(n.right)) report(n.right);
				}
			};
			if (isLeftTypeAssertion) return rule({
				...node,
				left: {
					...node.left,
					type: AST_NODE_TYPES.SequenceExpression
				}
			});
			if (isRightTypeAssertion) return rule({
				...node,
				right: {
					...node.right,
					type: AST_NODE_TYPES.SequenceExpression
				}
			});
			return rule(node);
		}
		function checkCallNew(node) {
			const rule = (node$1) => {
				const callee = node$1.callee;
				if (hasExcessParensWithPrecedence(callee, precedence(node$1))) {
					if (hasDoubleExcessParens(callee) || !(isIIFE(node$1) || callee.type === "NewExpression" && !isNewExpressionWithParens(callee) && !(node$1.type === "NewExpression" && !isNewExpressionWithParens(node$1)) || node$1.type === "NewExpression" && callee.type === "MemberExpression" && doesMemberExpressionContainCallExpression(callee) || (!("optional" in node$1) || !node$1.optional) && callee.type === "ChainExpression")) report(node$1.callee);
				}
				node$1.arguments.forEach((arg) => {
					if (hasExcessParensWithPrecedence(arg, PRECEDENCE_OF_ASSIGNMENT_EXPR)) report(arg);
				});
			};
			if (isTypeAssertion(node.callee)) return rule({
				...node,
				callee: {
					...node.callee,
					type: AST_NODE_TYPES.SequenceExpression
				}
			});
			return rule(node);
		}
		function checkClass(node) {
			if (!node.superClass) return;
			if (precedence(node.superClass) > PRECEDENCE_OF_UPDATE_EXPR ? hasExcessParens(node.superClass) : hasDoubleExcessParens(node.superClass)) report(node.superClass);
		}
		function checkExpressionOrExportStatement(node) {
			const firstToken = isParenthesised(node) ? sourceCode.getTokenBefore(node) : sourceCode.getFirstToken(node);
			const secondToken = sourceCode.getTokenAfter(firstToken, ast_exports.isNotOpeningParenToken);
			const thirdToken = secondToken ? sourceCode.getTokenAfter(secondToken) : null;
			const tokenAfterClosingParens = secondToken ? sourceCode.getTokenAfter(secondToken, ast_exports.isNotClosingParenToken) : null;
			if ((0, ast_exports.isOpeningParenToken)(firstToken) && ((0, ast_exports.isOpeningBraceToken)(secondToken) || isKeywordToken(secondToken) && (secondToken.value === "function" || secondToken.value === "class" || secondToken.value === "let" && tokenAfterClosingParens && ((0, ast_exports.isOpeningBracketToken)(tokenAfterClosingParens) || tokenAfterClosingParens.type === "Identifier")) || secondToken && secondToken.type === "Identifier" && secondToken.value === "async" && isKeywordToken(thirdToken) && thirdToken.value === "function")) tokensToIgnore.add(secondToken);
			if (node.parent.type === "ExportDefaultDeclaration" ? hasExcessParensWithPrecedence(node, PRECEDENCE_OF_ASSIGNMENT_EXPR) : hasExcessParens(node)) report(node);
		}
		function checkUnaryUpdate(node) {
			if (isTypeAssertion(node.argument)) return checkArgumentWithPrecedence({
				...node,
				argument: {
					...node.argument,
					type: AST_NODE_TYPES.SequenceExpression
				}
			});
			return checkArgumentWithPrecedence(node);
		}
		function checkClassProperty(node) {
			if (node.computed && hasExcessParensWithPrecedence(node.key, PRECEDENCE_OF_ASSIGNMENT_EXPR)) report(node.key);
			if (node.value && hasExcessParensWithPrecedence(node.value, PRECEDENCE_OF_ASSIGNMENT_EXPR)) report(node.value);
		}
		function checkTSBinaryType(node) {
			node.types.forEach((type) => {
				if (IGNORE_NESTED_BINARY && (0, ast_exports.isNodeOfTypes)([AST_NODE_TYPES.TSUnionType, AST_NODE_TYPES.TSIntersectionType])(type) ? isParenthesisedTwice(type) : hasExcessParensWithPrecedence(type, precedence(node))) report(type);
			});
		}
		const baseListeners = {
			ArrayExpression(node) {
				node.elements.map((element) => isTypeAssertion(element) ? {
					...element,
					type: AST_NODE_TYPES.FunctionExpression
				} : element).forEach((ele) => {
					if (!!ele && hasExcessParensWithPrecedence(ele, PRECEDENCE_OF_ASSIGNMENT_EXPR)) report(ele);
				});
			},
			ArrayPattern(node) {
				node.elements.forEach((ele) => {
					if (!!ele && canBeAssignmentTarget(ele) && hasExcessParens(ele)) report(ele);
				});
			},
			ArrowFunctionExpression(node) {
				if (isTypeAssertion(node.body)) return;
				if (isReturnAssignException(node)) return;
				if (node.body.type === "ConditionalExpression" && IGNORE_ARROW_CONDITIONALS) return;
				if (node.body.type === "BlockStatement") return;
				const firstBodyToken = sourceCode.getFirstToken(node.body, ast_exports.isNotOpeningParenToken);
				if ((0, ast_exports.isOpeningParenToken)(sourceCode.getTokenBefore(firstBodyToken)) && (0, ast_exports.isOpeningBraceToken)(firstBodyToken)) tokensToIgnore.add(firstBodyToken);
				if (hasExcessParensWithPrecedence(node.body, PRECEDENCE_OF_ASSIGNMENT_EXPR)) report(node.body);
			},
			AssignmentExpression(node) {
				if (canBeAssignmentTarget(node.left) && hasExcessParens(node.left) && (!isAnonymousFunctionAssignmentException(node) || isParenthesisedTwice(node.left))) report(node.left);
				if (!isReturnAssignException(node) && hasExcessParensWithPrecedence(node.right, precedence(node))) report(node.right);
			},
			AssignmentPattern(node) {
				const { left, right } = node;
				if (canBeAssignmentTarget(left) && hasExcessParens(left)) report(left);
				if (right && hasExcessParensWithPrecedence(right, PRECEDENCE_OF_ASSIGNMENT_EXPR)) report(right);
			},
			AwaitExpression(node) {
				if (isTypeAssertion(node.argument)) return checkArgumentWithPrecedence({
					...node,
					argument: {
						...node.argument,
						type: AST_NODE_TYPES.SequenceExpression
					}
				});
				return checkArgumentWithPrecedence(node);
			},
			BinaryExpression(node) {
				if (reportsBuffer && node.operator === "in") reportsBuffer.inExpressionNodes.push(node);
				checkBinaryLogical(node);
			},
			"CallExpression": checkCallNew,
			ClassDeclaration(node) {
				if (node.superClass?.type === AST_NODE_TYPES.TSAsExpression) return checkClass({
					...node,
					superClass: {
						...node.superClass,
						type: AST_NODE_TYPES.SequenceExpression
					}
				});
				return checkClass(node);
			},
			ClassExpression(node) {
				if (node.superClass?.type === AST_NODE_TYPES.TSAsExpression) return checkClass({
					...node,
					superClass: {
						...node.superClass,
						type: AST_NODE_TYPES.SequenceExpression
					}
				});
				return checkClass(node);
			},
			ConditionalExpression(node) {
				const rule = (node$1) => {
					if (isReturnAssignException(node$1)) return;
					const availableTypes = new Set(["BinaryExpression", "LogicalExpression"]);
					if (!(EXCEPT_COND_TERNARY && availableTypes.has(node$1.test.type)) && !(ALLOW_NESTED_TERNARY && ["ConditionalExpression"].includes(node$1.test.type)) && !isCondAssignException(node$1) && hasExcessParensWithPrecedence(node$1.test, precedence({
						type: "LogicalExpression",
						operator: "||"
					}))) report(node$1.test);
					if (!(EXCEPT_COND_TERNARY && availableTypes.has(node$1.consequent.type)) && !(ALLOW_NESTED_TERNARY && ["ConditionalExpression"].includes(node$1.consequent.type)) && hasExcessParensWithPrecedence(node$1.consequent, PRECEDENCE_OF_ASSIGNMENT_EXPR)) report(node$1.consequent);
					if (!(EXCEPT_COND_TERNARY && availableTypes.has(node$1.alternate.type)) && !(ALLOW_NESTED_TERNARY && ["ConditionalExpression"].includes(node$1.alternate.type)) && hasExcessParensWithPrecedence(node$1.alternate, PRECEDENCE_OF_ASSIGNMENT_EXPR)) report(node$1.alternate);
				};
				if (isTypeAssertion(node.test)) return rule({
					...node,
					test: {
						...node.test,
						type: AST_NODE_TYPES.SequenceExpression
					}
				});
				if (isTypeAssertion(node.consequent)) return rule({
					...node,
					consequent: {
						...node.consequent,
						type: AST_NODE_TYPES.SequenceExpression
					}
				});
				if (isTypeAssertion(node.alternate)) return rule({
					...node,
					alternate: {
						...node.alternate,
						type: AST_NODE_TYPES.SequenceExpression
					}
				});
				return rule(node);
			},
			DoWhileStatement(node) {
				if (hasExcessParens(node.test) && !isCondAssignException(node)) report(node.test);
			},
			ExportDefaultDeclaration(node) {
				checkExpressionOrExportStatement(node.declaration);
			},
			ExpressionStatement(node) {
				checkExpressionOrExportStatement(node.expression);
			},
			ForInStatement(node) {
				if (isTypeAssertion(node.right)) return;
				if (node.left.type !== "VariableDeclaration") {
					const firstLeftToken = sourceCode.getFirstToken(node.left, ast_exports.isNotOpeningParenToken);
					if (firstLeftToken.value === "let" && (0, ast_exports.isOpeningBracketToken)(sourceCode.getTokenAfter(firstLeftToken, ast_exports.isNotClosingParenToken))) tokensToIgnore.add(firstLeftToken);
				}
				if (hasExcessParens(node.left)) report(node.left);
				if (hasExcessParens(node.right)) report(node.right);
			},
			ForOfStatement(node) {
				if (node.left.type !== "VariableDeclaration") {
					const firstLeftToken = sourceCode.getFirstToken(node.left, ast_exports.isNotOpeningParenToken);
					if (firstLeftToken.value === "let") tokensToIgnore.add(firstLeftToken);
				}
				if (hasExcessParens(node.left)) report(node.left);
				if (!isTypeAssertion(node.right) && hasExcessParensWithPrecedence(node.right, PRECEDENCE_OF_ASSIGNMENT_EXPR)) report(node.right);
			},
			ForStatement(node) {
				if (node.test && hasExcessParens(node.test) && !isCondAssignException(node) && !isTypeAssertion(node.test)) report(node.test);
				if (node.update && hasExcessParens(node.update) && !isTypeAssertion(node.update)) report(node.update);
				if (node.init && !isTypeAssertion(node.init)) {
					if (node.init.type !== "VariableDeclaration") {
						const firstToken = sourceCode.getFirstToken(node.init, ast_exports.isNotOpeningParenToken);
						if (firstToken.value === "let" && (0, ast_exports.isOpeningBracketToken)(sourceCode.getTokenAfter(firstToken, ast_exports.isNotClosingParenToken))) tokensToIgnore.add(firstToken);
					}
					startNewReportsBuffering();
					if (hasExcessParens(node.init)) report(node.init);
				}
			},
			"ForStatement > *.init:exit": function(node) {
				if (isTypeAssertion(node)) return;
				if (reportsBuffer?.reports.length) reportsBuffer.inExpressionNodes.forEach((inExpressionNode) => {
					const path = pathToDescendant(node, inExpressionNode);
					let nodeToExclude = null;
					for (let i = 0; i < path.length; i++) {
						const pathNode = path[i];
						if (i < path.length - 1) {
							const nextPathNode = path[i + 1];
							if (isSafelyEnclosingInExpression(pathNode, nextPathNode)) return;
						}
						if (isParenthesised(pathNode)) if (isInCurrentReportsBuffer(pathNode)) {
							if (isParenthesisedTwice(pathNode)) return;
							if (!nodeToExclude) nodeToExclude = pathNode;
						} else return;
					}
					if (nodeToExclude) removeFromCurrentReportsBuffer(nodeToExclude);
				});
				endCurrentReportsBuffering();
			},
			IfStatement(node) {
				if (hasExcessParens(node.test) && !isCondAssignException(node)) report(node.test);
			},
			ImportExpression(node) {
				const { source } = node;
				if (source.type === "SequenceExpression") {
					if (hasDoubleExcessParens(source)) report(source);
				} else if (hasExcessParens(source)) report(source);
			},
			"LogicalExpression": checkBinaryLogical,
			MemberExpression(node) {
				const rule = (node$1) => {
					const nodeObjHasExcessParens = isMemberExpInNewCallee(node$1) && doesMemberExpressionContainCallExpression(node$1) ? hasDoubleExcessParens(node$1.object) : hasExcessParens(node$1.object) && !(isImmediateFunctionPrototypeMethodCall(node$1.parent) && "callee" in node$1.parent && node$1.parent.callee === node$1 && IGNORE_FUNCTION_PROTOTYPE_METHODS);
					if (nodeObjHasExcessParens && precedence(node$1.object) >= precedence(node$1) && (node$1.computed || !(isDecimalInteger(node$1.object) || isRegExpLiteral(node$1.object)))) report(node$1.object);
					if (nodeObjHasExcessParens && node$1.object.type === "CallExpression") report(node$1.object);
					if (nodeObjHasExcessParens && !IGNORE_NEW_IN_MEMBER_EXPR && node$1.object.type === "NewExpression" && isNewExpressionWithParens(node$1.object)) report(node$1.object);
					if (nodeObjHasExcessParens && node$1.optional && node$1.object.type === "ChainExpression") report(node$1.object);
					if (node$1.computed && hasExcessParens(node$1.property)) report(node$1.property);
				};
				if (isTypeAssertion(node.object)) return rule({
					...node,
					object: {
						...node.object,
						type: AST_NODE_TYPES.SequenceExpression
					}
				});
				if (isTypeAssertion(node.property)) return rule({
					...node,
					property: {
						...node.property,
						type: AST_NODE_TYPES.FunctionExpression
					}
				});
				return rule(node);
			},
			MethodDefinition(node) {
				if (!node.computed) return;
				if (hasExcessParensWithPrecedence(node.key, PRECEDENCE_OF_ASSIGNMENT_EXPR)) report(node.key);
			},
			"NewExpression": checkCallNew,
			ObjectExpression(node) {
				node.properties.forEach((property) => {
					if (property.type === "Property" && property.value && hasExcessParensWithPrecedence(property.value, PRECEDENCE_OF_ASSIGNMENT_EXPR)) report(property.value);
				});
			},
			ObjectPattern(node) {
				node.properties.forEach(({ value }) => {
					if (value && canBeAssignmentTarget(value) && hasExcessParens(value)) report(value);
				});
			},
			Property(node) {
				if (node.computed) {
					const { key } = node;
					if (key && hasExcessParensWithPrecedence(key, PRECEDENCE_OF_ASSIGNMENT_EXPR)) report(key);
				}
			},
			"PropertyDefinition": checkClassProperty,
			"AccessorProperty": checkClassProperty,
			RestElement(node) {
				const argument = node.argument;
				if (canBeAssignmentTarget(argument) && hasExcessParens(argument)) report(argument);
			},
			ReturnStatement(node) {
				const returnToken = sourceCode.getFirstToken(node);
				if (isReturnAssignException(node)) return;
				if (node.argument && returnToken && hasExcessParensNoLineTerminator(returnToken, node.argument) && !isRegExpLiteral(node.argument)) report(node.argument);
			},
			SequenceExpression(node) {
				const precedenceOfNode = precedence(node);
				node.expressions.forEach((expression) => {
					if (hasExcessParensWithPrecedence(expression, precedenceOfNode)) report(expression);
				});
			},
			SpreadElement(node) {
				if (isTypeAssertion(node.argument)) return;
				if (ALLOW_NODES_IN_SPREAD && ALLOW_NODES_IN_SPREAD.has(node.argument.type)) return;
				if (!hasExcessParensWithPrecedence(node.argument, PRECEDENCE_OF_ASSIGNMENT_EXPR)) return;
				report(node.argument);
			},
			SwitchCase(node) {
				if (node.test && !isTypeAssertion(node.test) && hasExcessParens(node.test)) report(node.test);
			},
			SwitchStatement(node) {
				if (hasExcessParens(node.discriminant)) report(node.discriminant);
			},
			TemplateLiteral(node) {
				node.expressions.forEach((expression) => {
					if (hasExcessParens(expression)) report(expression);
				});
			},
			ThrowStatement(node) {
				if (!node.argument || isTypeAssertion(node.argument)) return;
				const throwToken = sourceCode.getFirstToken(node);
				if (!throwToken) return;
				if (hasExcessParensNoLineTerminator(throwToken, node.argument)) report(node.argument);
			},
			"UnaryExpression": checkUnaryUpdate,
			UpdateExpression(node) {
				if (isTypeAssertion(node.argument)) return checkUnaryUpdate(node);
				if (node.prefix) checkArgumentWithPrecedence(node);
				else {
					const { argument } = node;
					if ((0, ast_exports.isTokenOnSameLine)(argument, sourceCode.getLastToken(node))) checkArgumentWithPrecedence(node);
					else if (hasDoubleExcessParens(argument)) report(argument);
				}
			},
			VariableDeclarator(node) {
				const rule = (node$1) => {
					if (node$1.init && hasExcessParensWithPrecedence(node$1.init, PRECEDENCE_OF_ASSIGNMENT_EXPR) && !isRegExpLiteral(node$1.init)) report(node$1.init);
				};
				if (isTypeAssertion(node.init)) return rule({
					...node,
					type: AST_NODE_TYPES.VariableDeclarator,
					init: {
						...node.init,
						type: AST_NODE_TYPES.FunctionExpression
					}
				});
				return rule(node);
			},
			WhileStatement(node) {
				if (hasExcessParens(node.test) && !isCondAssignException(node)) report(node.test);
			},
			WithStatement(node) {
				if (hasExcessParens(node.object)) report(node.object);
			},
			YieldExpression(node) {
				if (!node.argument || isTypeAssertion(node.argument)) return;
				const yieldToken = sourceCode.getFirstToken(node);
				if (precedence(node.argument) >= precedence(node) && yieldToken && hasExcessParensNoLineTerminator(yieldToken, node.argument) || hasDoubleExcessParens(node.argument)) report(node.argument);
			},
			TSArrayType(node) {
				if (hasExcessParensWithPrecedence(node.elementType, precedence(node))) report(node.elementType);
			},
			"TSIntersectionType": checkTSBinaryType,
			"TSUnionType": checkTSBinaryType,
			TSTypeAnnotation(node) {
				if (hasExcessParens(node.typeAnnotation)) report(node.typeAnnotation);
			},
			TSTypeAliasDeclaration(node) {
				if (hasExcessParens(node.typeAnnotation)) report(node.typeAnnotation);
			},
			TSEnumMember(node) {
				if (!node.initializer) return;
				if (hasExcessParens(node.initializer)) report(node.initializer);
			}
		};
		const listeners = {};
		const ignoreNodes = /* @__PURE__ */ new Set();
		const listenerCallQueue = [];
		for (const key in baseListeners) listeners[key] = (node) => listenerCallQueue.push({
			node,
			listener: baseListeners[key]
		});
		return {
			...listeners,
			...options?.ignoredNodes?.reduce((listener, selector) => Object.assign(listener, { [selector]: (node) => ignoreNodes.add(node) }), {}),
			"Program:exit": function() {
				for (let i = 0; i < listenerCallQueue.length; i++) {
					const { node, listener } = listenerCallQueue[i];
					if (!ignoreNodes.has(node)) listener(node);
				}
			}
		};
	}
});
export { no_extra_parens_default };

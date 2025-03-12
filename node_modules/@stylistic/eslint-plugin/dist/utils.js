import { KEYS } from 'eslint-visitor-keys';
import { tokenize, latestEcmaVersion } from 'espree';
import { traverse as traverse$1 } from 'estraverse';

function createAllConfigs(plugin, name, filter) {
  const rules = Object.fromEntries(
    Object.entries(plugin.rules).filter(
      ([key, rule]) => (
        // Only include fixable rules
        rule.meta.fixable && !rule.meta.deprecated && key === rule.meta.docs.url.split("/").pop() && (!filter || filter(key, rule))
      )
    ).map(([key]) => [`${name}/${key}`, 2])
  );
  return {
    plugins: {
      [name]: plugin
    },
    rules
  };
}

const anyFunctionPattern = /^(?:Function(?:Declaration|Expression)|ArrowFunctionExpression)$/u;
const COMMENTS_IGNORE_PATTERN = /^\s*(?:eslint|jshint\s+|jslint\s+|istanbul\s+|globals?\s+|exported\s+|jscs)/u;
const LINEBREAKS = /* @__PURE__ */ new Set(["\r\n", "\r", "\n", "\u2028", "\u2029"]);
const LINEBREAK_MATCHER = /\r\n|[\r\n\u2028\u2029]/u;
const STATEMENT_LIST_PARENTS = /* @__PURE__ */ new Set(["Program", "BlockStatement", "StaticBlock", "SwitchCase"]);
const DECIMAL_INTEGER_PATTERN = /^(?:0|0[0-7]*[89]\d*|[1-9](?:_?\d)*)$/u;
const OCTAL_OR_NON_OCTAL_DECIMAL_ESCAPE_PATTERN = /^(?:[^\\]|\\.)*\\(?:[1-9]|0\d)/su;
const ASSIGNMENT_OPERATOR = ["=", "+=", "-=", "*=", "/=", "%=", "<<=", ">>=", ">>>=", "|=", "^=", "&=", "**=", "||=", "&&=", "??="];
function createGlobalLinebreakMatcher() {
  return new RegExp(LINEBREAK_MATCHER.source, "gu");
}
function getUpperFunction(node) {
  for (let currentNode = node; currentNode; currentNode = currentNode.parent) {
    if (anyFunctionPattern.test(currentNode.type))
      return currentNode;
  }
  return null;
}
function isFunction(node) {
  return Boolean(node && anyFunctionPattern.test(node.type));
}
function isNullLiteral(node) {
  return node.type === "Literal" && node.value === null && !("regex" in node) && !("bigint" in node);
}
function getStaticStringValue(node) {
  switch (node.type) {
    case "Literal":
      if (node.value === null) {
        if (isNullLiteral(node))
          return String(node.value);
        if ("regex" in node && node.regex)
          return `/${node.regex.pattern}/${node.regex.flags}`;
        if ("bigint" in node && node.bigint)
          return node.bigint;
      } else {
        return String(node.value);
      }
      break;
    case "TemplateLiteral":
      if (node.expressions.length === 0 && node.quasis.length === 1)
        return node.quasis[0].value.cooked;
      break;
  }
  return null;
}
function getStaticPropertyName(node) {
  let prop;
  if (node) {
    switch (node.type) {
      case "ChainExpression":
        return getStaticPropertyName(node.expression);
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
  }
  if (prop) {
    if (prop.type === "Identifier" && !("computed" in node && node.computed))
      return prop.name;
    return getStaticStringValue(prop);
  }
  return null;
}
function skipChainExpression(node) {
  return node && node.type === "ChainExpression" ? node.expression : node;
}
function negate(f) {
  return (token) => !f(token);
}
function isParenthesised(sourceCode, node) {
  const previousToken = sourceCode.getTokenBefore(node);
  const nextToken = sourceCode.getTokenAfter(node);
  return !!previousToken && !!nextToken && previousToken.value === "(" && previousToken.range[1] <= node.range[0] && nextToken.value === ")" && nextToken.range[0] >= node.range[1];
}
function isEqToken(token) {
  return token.value === "=" && token.type === "Punctuator";
}
function isArrowToken(token) {
  return token.value === "=>" && token.type === "Punctuator";
}
function isCommaToken(token) {
  return token.value === "," && token.type === "Punctuator";
}
function isQuestionDotToken(token) {
  return token.value === "?." && token.type === "Punctuator";
}
function isSemicolonToken(token) {
  return token.value === ";" && token.type === "Punctuator";
}
function isColonToken(token) {
  return token.value === ":" && token.type === "Punctuator";
}
function isOpeningParenToken(token) {
  return token.value === "(" && token.type === "Punctuator";
}
function isClosingParenToken(token) {
  return token.value === ")" && token.type === "Punctuator";
}
function isOpeningBracketToken(token) {
  return token.value === "[" && token.type === "Punctuator";
}
function isClosingBracketToken(token) {
  return token.value === "]" && token.type === "Punctuator";
}
function isOpeningBraceToken(token) {
  return token.value === "{" && token.type === "Punctuator";
}
function isClosingBraceToken(token) {
  return token.value === "}" && token.type === "Punctuator";
}
function isCommentToken(token) {
  if (!token)
    return false;
  return token.type === "Line" || token.type === "Block" || token.type === "Shebang";
}
function isKeywordToken(token) {
  return token.type === "Keyword";
}
function isLogicalExpression(node) {
  return node.type === "LogicalExpression" && (node.operator === "&&" || node.operator === "||");
}
function isCoalesceExpression(node) {
  return node.type === "LogicalExpression" && node.operator === "??";
}
function isMixedLogicalAndCoalesceExpressions(left, right) {
  return isLogicalExpression(left) && isCoalesceExpression(right) || isCoalesceExpression(left) && isLogicalExpression(right);
}
function getSwitchCaseColonToken(node, sourceCode) {
  if ("test" in node && node.test)
    return sourceCode.getTokenAfter(node.test, (token) => isColonToken(token));
  return sourceCode.getFirstToken(node, 1);
}
function isTopLevelExpressionStatement(node) {
  if (node.type !== "ExpressionStatement")
    return false;
  const parent = node.parent;
  return parent.type === "Program" || parent.type === "BlockStatement" && isFunction(parent.parent);
}
function isTokenOnSameLine(left, right) {
  return left?.loc?.end.line === right?.loc?.start.line;
}
const isNotClosingParenToken = /* @__PURE__ */ negate(isClosingParenToken);
const isNotCommaToken = /* @__PURE__ */ negate(isCommaToken);
const isNotOpeningParenToken = /* @__PURE__ */ negate(isOpeningParenToken);
const isNotSemicolonToken = /* @__PURE__ */ negate(isSemicolonToken);
function isStringLiteral(node) {
  return node.type === "Literal" && typeof node.value === "string" || node.type === "TemplateLiteral";
}
function isSurroundedBy(val, character) {
  return val[0] === character && val[val.length - 1] === character;
}
function getPrecedence(node) {
  switch (node.type) {
    case "SequenceExpression":
      return 0;
    case "AssignmentExpression":
    case "ArrowFunctionExpression":
    case "YieldExpression":
      return 1;
    case "ConditionalExpression":
      return 3;
    case "LogicalExpression":
      switch (node.operator) {
        case "||":
        case "??":
          return 4;
        case "&&":
          return 5;
      }
    /* falls through */
    case "BinaryExpression":
      switch (node.operator) {
        case "|":
          return 6;
        case "^":
          return 7;
        case "&":
          return 8;
        case "==":
        case "!=":
        case "===":
        case "!==":
          return 9;
        case "<":
        case "<=":
        case ">":
        case ">=":
        case "in":
        case "instanceof":
          return 10;
        case "<<":
        case ">>":
        case ">>>":
          return 11;
        case "+":
        case "-":
          return 12;
        case "*":
        case "/":
        case "%":
          return 13;
        case "**":
          return 15;
      }
    /* falls through */
    case "UnaryExpression":
    case "AwaitExpression":
      return 16;
    case "UpdateExpression":
      return 17;
    case "CallExpression":
    case "ChainExpression":
    case "ImportExpression":
      return 18;
    case "NewExpression":
      return 19;
    default:
      if (node.type in KEYS)
        return 20;
      return -1;
  }
}
function isDecimalInteger(node) {
  return node.type === "Literal" && typeof node.value === "number" && DECIMAL_INTEGER_PATTERN.test(node.raw);
}
function isDecimalIntegerNumericToken(token) {
  return token.type === "Numeric" && DECIMAL_INTEGER_PATTERN.test(token.value);
}
function getNextLocation(sourceCode, { column, line }) {
  if (column < sourceCode.lines[line - 1].length) {
    return {
      column: column + 1,
      line
    };
  }
  if (line < sourceCode.lines.length) {
    return {
      column: 0,
      line: line + 1
    };
  }
  return null;
}
function isNumericLiteral(node) {
  return node.type === "Literal" && (typeof node.value === "number" || Boolean("bigint" in node && node.bigint));
}
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
      if (!leftToken || lastComment.range[0] > leftToken.range[0])
        leftToken = lastComment;
    }
  } else {
    leftToken = leftValue;
  }
  if (leftToken.type === "Shebang" || leftToken.type === "Hashbang")
    return false;
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
      if (!rightToken || firstComment.range[0] < rightToken.range[0])
        rightToken = firstComment;
    }
  } else {
    rightToken = rightValue;
  }
  if (leftToken.type === "Punctuator" || rightToken.type === "Punctuator") {
    if (leftToken.type === "Punctuator" && rightToken.type === "Punctuator") {
      const PLUS_TOKENS = /* @__PURE__ */ new Set(["+", "++"]);
      const MINUS_TOKENS = /* @__PURE__ */ new Set(["-", "--"]);
      return !(PLUS_TOKENS.has(leftToken.value) && PLUS_TOKENS.has(rightToken.value) || MINUS_TOKENS.has(leftToken.value) && MINUS_TOKENS.has(rightToken.value));
    }
    if (leftToken.type === "Punctuator" && leftToken.value === "/")
      return !["Block", "Line", "RegularExpression"].includes(rightToken.type);
    return true;
  }
  if (leftToken.type === "String" || rightToken.type === "String" || leftToken.type === "Template" || rightToken.type === "Template")
    return true;
  if (leftToken.type !== "Numeric" && rightToken.type === "Numeric" && rightToken.value.startsWith("."))
    return true;
  if (leftToken.type === "Block" || rightToken.type === "Block" || rightToken.type === "Line")
    return true;
  if (rightToken.type === "PrivateIdentifier")
    return true;
  return false;
}
function hasOctalOrNonOctalDecimalEscapeSequence(rawString) {
  return OCTAL_OR_NON_OCTAL_DECIMAL_ESCAPE_PATTERN.test(rawString);
}
function getFirstNodeInLine(context, node) {
  const sourceCode = context.sourceCode;
  let token = node;
  let lines = null;
  do {
    token = sourceCode.getTokenBefore(token);
    lines = token.type === "JSXText" ? token.value.split("\n") : null;
  } while (token.type === "JSXText" && lines && /^\s*$/.test(lines[lines.length - 1]));
  return token;
}
function isNodeFirstInLine(context, node) {
  const token = getFirstNodeInLine(context, node);
  const startLine = node.loc.start.line;
  const endLine = token ? token.loc.end.line : -1;
  return startLine !== endLine;
}
function getTokenBeforeClosingBracket(node) {
  const attributes = "attributes" in node && node.attributes;
  if (!attributes || attributes.length === 0)
    return node.name;
  return attributes[attributes.length - 1];
}
function getParentSyntaxParen(node, sourceCode) {
  const parent = node.parent;
  if (!parent)
    return null;
  switch (parent.type) {
    case "CallExpression":
    case "NewExpression":
      if (parent.arguments.length === 1 && parent.arguments[0] === node) {
        return sourceCode.getTokenAfter(
          parent.callee,
          isOpeningParenToken
        );
      }
      return null;
    case "DoWhileStatement":
      if (parent.test === node) {
        return sourceCode.getTokenAfter(
          parent.body,
          isOpeningParenToken
        );
      }
      return null;
    case "IfStatement":
    case "WhileStatement":
      if (parent.test === node) {
        return sourceCode.getFirstToken(parent, 1);
      }
      return null;
    case "ImportExpression":
      if (parent.source === node) {
        return sourceCode.getFirstToken(parent, 1);
      }
      return null;
    case "SwitchStatement":
      if (parent.discriminant === node) {
        return sourceCode.getFirstToken(parent, 1);
      }
      return null;
    case "WithStatement":
      if (parent.object === node) {
        return sourceCode.getFirstToken(parent, 1);
      }
      return null;
    default:
      return null;
  }
}
function isParenthesized(node, sourceCode, times = 1) {
  let maybeLeftParen, maybeRightParen;
  if (node == null || node.parent == null || node.parent.type === "CatchClause" && node.parent.param === node) {
    return false;
  }
  maybeLeftParen = maybeRightParen = node;
  do {
    maybeLeftParen = sourceCode.getTokenBefore(maybeLeftParen);
    maybeRightParen = sourceCode.getTokenAfter(maybeRightParen);
  } while (maybeLeftParen != null && maybeRightParen != null && (maybeLeftParen.type === "Punctuator" && maybeLeftParen.value === "(") && (maybeRightParen.type === "Punctuator" && maybeRightParen.value === ")") && maybeLeftParen !== getParentSyntaxParen(node, sourceCode) && --times > 0);
  return times === 0;
}

function isObjectNotArray(obj) {
  return typeof obj === "object" && obj != null && !Array.isArray(obj);
}
function deepMerge(first = {}, second = {}) {
  const keys = new Set(Object.keys(first).concat(Object.keys(second)));
  return Array.from(keys).reduce((acc, key) => {
    const firstHasKey = key in first;
    const secondHasKey = key in second;
    const firstValue = first[key];
    const secondValue = second[key];
    if (firstHasKey && secondHasKey) {
      if (isObjectNotArray(firstValue) && isObjectNotArray(secondValue)) {
        acc[key] = deepMerge(firstValue, secondValue);
      } else {
        acc[key] = secondValue;
      }
    } else if (firstHasKey) {
      acc[key] = firstValue;
    } else {
      acc[key] = secondValue;
    }
    return acc;
  }, {});
}

function createRule({
  name,
  package: pkg,
  create,
  defaultOptions = [],
  meta
}) {
  return {
    create: (context) => {
      const optionsCount = Math.max(context.options.length, defaultOptions.length);
      const optionsWithDefault = Array.from(
        { length: optionsCount },
        (_, i) => {
          if (isObjectNotArray(context.options[i]) && isObjectNotArray(defaultOptions[i])) {
            return deepMerge(defaultOptions[i], context.options[i]);
          }
          return context.options[i] ?? defaultOptions[i];
        }
      );
      return create(context, optionsWithDefault);
    },
    defaultOptions,
    meta: {
      ...meta,
      docs: {
        ...meta.docs,
        url: `https://eslint.style/rules/${pkg}/${name}`
      }
    }
  };
}
function castRuleModule(rule) {
  return rule;
}

function traverse(ASTnode, visitor) {
  const opts = Object.assign({}, {
    fallback(node) {
      return Object.keys(node).filter((key) => key === "children" || key === "argument");
    }
  }, visitor);
  opts.keys = Object.assign({}, visitor.keys, {
    JSXElement: ["children"],
    JSXFragment: ["children"]
  });
  traverse$1(ASTnode, opts);
}
function traverseReturns(ASTNode, onReturn) {
  const nodeType = ASTNode.type;
  if (nodeType === "ReturnStatement") {
    onReturn(ASTNode.argument, () => {
    });
    return;
  }
  if (nodeType === "ArrowFunctionExpression" && ASTNode.expression) {
    onReturn(ASTNode.body, () => {
    });
    return;
  }
  if (nodeType !== "FunctionExpression" && nodeType !== "FunctionDeclaration" && nodeType !== "ArrowFunctionExpression" && nodeType !== "MethodDefinition") {
    return;
  }
  traverse(ASTNode.body, {
    enter(node) {
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
        case "SwitchCase":
          return;
        default:
          this.skip();
      }
    }
  });
}

function getVariable(variables, name) {
  return variables.find((variable) => variable.name === name);
}
function variablesInScope(context) {
  let scope = context.getScope();
  let variables = scope.variables;
  while (scope.type !== "global") {
    scope = scope.upper;
    variables = scope.variables.concat(variables);
  }
  if (scope.childScopes.length) {
    variables = scope.childScopes[0].variables.concat(variables);
    if (scope.childScopes[0].childScopes.length)
      variables = scope.childScopes[0].childScopes[0].variables.concat(variables);
  }
  variables.reverse();
  return variables;
}
function findVariableByName(context, name) {
  const variable = getVariable(variablesInScope(context), name);
  if (!variable || !variable.defs[0] || !variable.defs[0].node)
    return null;
  if (variable.defs[0].node.type === "TypeAlias")
    return variable.defs[0].node.right;
  if (variable.defs[0].type === "ImportBinding")
    return variable.defs[0].node;
  return variable.defs[0].node.init;
}

const COMPAT_TAG_REGEX = /^[a-z]/;
function isDOMComponent(node) {
  const name = getElementType(node);
  return COMPAT_TAG_REGEX.test(name);
}
function isJSX(node) {
  return node && ["JSXElement", "JSXFragment"].includes(node.type);
}
function isWhiteSpaces(value) {
  return typeof value === "string" ? /^\s*$/.test(value) : false;
}
function isReturningJSX(ASTnode, context, strict = false, ignoreNull = false) {
  const isJSXValue = (node) => {
    if (!node)
      return false;
    switch (node.type) {
      case "ConditionalExpression":
        if (strict)
          return isJSXValue(node.consequent) && isJSXValue(node.alternate);
        return isJSXValue(node.consequent) || isJSXValue(node.alternate);
      case "LogicalExpression":
        if (strict)
          return isJSXValue(node.left) && isJSXValue(node.right);
        return isJSXValue(node.left) || isJSXValue(node.right);
      case "SequenceExpression":
        return isJSXValue(node.expressions[node.expressions.length - 1]);
      case "JSXElement":
      case "JSXFragment":
        return true;
      case "Literal":
        if (!ignoreNull && node.value === null)
          return true;
        return false;
      case "Identifier": {
        const variable = findVariableByName(context, node.name);
        return isJSX(variable);
      }
      default:
        return false;
    }
  };
  let found = false;
  traverseReturns(
    ASTnode,
    (node, breakTraverse) => {
      if (isJSXValue(node)) {
        found = true;
        breakTraverse();
      }
    }
  );
  return found;
}
function getPropName(prop) {
  if (!prop.type || prop.type !== "JSXAttribute")
    throw new Error("The prop must be a JSXAttribute collected by the AST parser.");
  if (prop.name.type === "JSXNamespacedName")
    return `${prop.name.namespace.name}:${prop.name.name.name}`;
  return prop.name.name;
}
function resolveMemberExpressions(object, property) {
  if (object.type === "JSXMemberExpression")
    return `${resolveMemberExpressions(object.object, object.property)}.${property.name}`;
  return `${object.name}.${property.name}`;
}
function getElementType(node) {
  if (node.type === "JSXOpeningFragment")
    return "<>";
  const { name } = node;
  if (!name)
    throw new Error("The argument provided is not a JSXElement node.");
  if (name.type === "JSXMemberExpression") {
    const { object, property } = name;
    return resolveMemberExpressions(object, property);
  }
  if (name.type === "JSXNamespacedName")
    return `${name.namespace.name}:${name.name.name}`;
  return node.name.name;
}

let segmenter;
function isASCII(value) {
  return /^[\u0020-\u007F]*$/u.test(value);
}
function getStringLength(value) {
  if (isASCII(value))
    return value.length;
  segmenter ??= new Intl.Segmenter();
  return [...segmenter.segment(value)].length;
}

const NullThrowsReasons = {
  MissingParent: "Expected node to have a parent.",
  MissingToken: (token, thing) => `Expected to find a ${token} for the ${thing}.`
};
function nullThrows(value, message) {
  if (value == null) {
    throw new Error(`Non-null Assertion Failed: ${message}`);
  }
  return value;
}

const KEYWORDS_JS = [
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

class FixTracker {
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
  retainedRange;
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
    if (this.retainedRange) {
      actualRange = [
        Math.min(this.retainedRange[0], range[0]),
        Math.max(this.retainedRange[1], range[1])
      ];
    } else {
      actualRange = range;
    }
    return this.fixer.replaceTextRange(
      actualRange,
      this.sourceCode.text.slice(actualRange[0], range[0]) + text + this.sourceCode.text.slice(range[1], actualRange[1])
    );
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
}

export { isMixedLogicalAndCoalesceExpressions as $, ASSIGNMENT_OPERATOR as A, isNodeFirstInLine as B, isJSX as C, isWhiteSpaces as D, isReturningJSX as E, getFirstNodeInLine as F, isDOMComponent as G, getElementType as H, isStringLiteral as I, isSurroundedBy as J, getPropName as K, LINEBREAK_MATCHER as L, getTokenBeforeClosingBracket as M, isParenthesized as N, getStaticPropertyName as O, getStringLength as P, KEYWORDS_JS as Q, isKeywordToken as R, STATEMENT_LIST_PARENTS as S, deepMerge as T, nullThrows as U, NullThrowsReasons as V, COMMENTS_IGNORE_PATTERN as W, skipChainExpression as X, isParenthesised as Y, getPrecedence as Z, isDecimalInteger as _, isCommentToken as a, isTopLevelExpressionStatement as a0, FixTracker as a1, isNumericLiteral as a2, LINEBREAKS as a3, hasOctalOrNonOctalDecimalEscapeSequence as a4, getSwitchCaseColonToken as a5, isCommaToken as b, createRule as c, canTokensBeAdjacent as d, isOpeningParenToken as e, isClosingParenToken as f, isArrowToken as g, castRuleModule as h, isTokenOnSameLine as i, getNextLocation as j, isOpeningBracketToken as k, isNotCommaToken as l, isNotOpeningParenToken as m, isNotClosingParenToken as n, isClosingBracketToken as o, createAllConfigs as p, isDecimalIntegerNumericToken as q, isFunction as r, isSemicolonToken as s, isQuestionDotToken as t, isOpeningBraceToken as u, isEqToken as v, isColonToken as w, isClosingBraceToken as x, isNotSemicolonToken as y, createGlobalLinebreakMatcher as z };

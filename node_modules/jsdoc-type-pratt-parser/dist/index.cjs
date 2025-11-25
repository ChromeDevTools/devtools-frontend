"use strict";
var __defProp = Object.defineProperty;
var __defProps = Object.defineProperties;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __propIsEnum = Object.prototype.propertyIsEnumerable;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __spreadValues = (a, b) => {
  for (var prop in b || (b = {}))
    if (__hasOwnProp.call(b, prop))
      __defNormalProp(a, prop, b[prop]);
  if (__getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(b)) {
      if (__propIsEnum.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    }
  return a;
};
var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  catharsisTransform: () => catharsisTransform,
  identityTransformRules: () => identityTransformRules,
  jtpTransform: () => jtpTransform,
  parse: () => parse,
  parseName: () => parseName,
  parseNamePath: () => parseNamePath,
  stringify: () => stringify,
  stringifyRules: () => stringifyRules,
  transform: () => transform,
  traverse: () => traverse,
  tryParse: () => tryParse,
  visitorKeys: () => visitorKeys
});
module.exports = __toCommonJS(index_exports);

// src/errors.ts
function tokenToString(token) {
  if (token.text !== void 0 && token.text !== "") {
    return `'${token.type}' with value '${token.text}'`;
  } else {
    return `'${token.type}'`;
  }
}
var NoParsletFoundError = class _NoParsletFoundError extends Error {
  constructor(token) {
    super(`No parslet found for token: ${tokenToString(token)}`);
    this.token = token;
    Object.setPrototypeOf(this, _NoParsletFoundError.prototype);
  }
  getToken() {
    return this.token;
  }
};
var EarlyEndOfParseError = class _EarlyEndOfParseError extends Error {
  constructor(token) {
    super(`The parsing ended early. The next token was: ${tokenToString(token)}`);
    this.token = token;
    Object.setPrototypeOf(this, _EarlyEndOfParseError.prototype);
  }
  getToken() {
    return this.token;
  }
};
var UnexpectedTypeError = class _UnexpectedTypeError extends Error {
  constructor(result, message) {
    let error = `Unexpected type: '${result.type}'.`;
    if (message !== void 0) {
      error += ` Message: ${message}`;
    }
    super(error);
    Object.setPrototypeOf(this, _UnexpectedTypeError.prototype);
  }
};

// src/lexer/Token.ts
var baseNameTokens = [
  "module",
  "keyof",
  "event",
  "external",
  "readonly",
  "is",
  "typeof",
  "in",
  "null",
  "undefined",
  "function",
  "asserts",
  "infer",
  "extends",
  "import"
];
var reservedWordsAsRootTSTypes = [
  "false",
  "null",
  "true",
  "void"
];
var reservedWordsAsTSTypes = [
  ...reservedWordsAsRootTSTypes,
  "extends",
  "import",
  "in",
  "new",
  "this",
  "typeof"
];
var reservedWords = {
  always: [
    "break",
    "case",
    "catch",
    "class",
    "const",
    "continue",
    "debugger",
    "default",
    "delete",
    "do",
    "else",
    "export",
    "extends",
    "false",
    "finally",
    "for",
    "function",
    "if",
    "import",
    "in",
    "instanceof",
    "new",
    "null",
    "return",
    "super",
    "switch",
    "this",
    "throw",
    "true",
    "try",
    "typeof",
    "var",
    "void",
    "while",
    "with"
  ],
  strictMode: [
    "let",
    "static",
    "yield"
  ],
  moduleOrAsyncFunctionBodies: [
    "await"
  ]
};
var futureReservedWords = {
  always: ["enum"],
  strictMode: [
    "implements",
    "interface",
    "package",
    "private",
    "protected",
    "public"
  ]
};
var strictModeNonIdentifiers = [
  "arguments",
  "eval"
];

// src/assertTypes.ts
function assertResultIsNotReservedWord(parser, result) {
  let text;
  if (result.type === "JsdocTypeName") {
    text = result.value;
  } else if (result.type === "JsdocTypeParenthesis") {
    let res = result;
    while (res.type === "JsdocTypeParenthesis") {
      res = res.element;
    }
    if (res.type === "JsdocTypeName") {
      text = res.value;
    } else {
      return result;
    }
  } else {
    return result;
  }
  if (reservedWords.always.includes(text) && !reservedWordsAsRootTSTypes.includes(text) && (text !== "this" || parser.classContext !== true)) {
    throw new Error(`Unexpected reserved keyword "${text}"`);
  }
  if (futureReservedWords.always.includes(text)) {
    throw new Error(`Unexpected future reserved keyword "${text}"`);
  }
  if (parser.module !== void 0 && parser.module || parser.strictMode !== void 0 && parser.strictMode) {
    if (reservedWords.strictMode.includes(text)) {
      throw new Error(`Unexpected reserved keyword "${text}" for strict mode`);
    }
    if (futureReservedWords.strictMode.includes(text)) {
      throw new Error(`Unexpected future reserved keyword "${text}" for strict mode`);
    }
    if (strictModeNonIdentifiers.includes(text)) {
      throw new Error(`The item "${text}" is not an identifier in strict mode`);
    }
  }
  if (parser.module !== void 0 && parser.module || parser.asyncFunctionBody !== void 0 && parser.asyncFunctionBody) {
    if (reservedWords.moduleOrAsyncFunctionBodies.includes(text)) {
      throw new Error(`Unexpected reserved keyword "${text}" for modules or async function bodies`);
    }
  }
  return result;
}
function assertRootResult(result) {
  if (result === void 0) {
    throw new Error("Unexpected undefined");
  }
  if (result.type === "JsdocTypeKeyValue" || result.type === "JsdocTypeParameterList" || result.type === "JsdocTypeProperty" || result.type === "JsdocTypeReadonlyProperty" || result.type === "JsdocTypeObjectField" || result.type === "JsdocTypeJsdocObjectField" || result.type === "JsdocTypeIndexSignature" || result.type === "JsdocTypeMappedType" || result.type === "JsdocTypeTypeParameter" || result.type === "JsdocTypeCallSignature" || result.type === "JsdocTypeConstructorSignature" || result.type === "JsdocTypeMethodSignature" || result.type === "JsdocTypeIndexedAccessIndex" || result.type === "JsdocTypeComputedProperty" || result.type === "JsdocTypeComputedMethod") {
    throw new UnexpectedTypeError(result);
  }
  return result;
}
function assertPlainKeyValueOrRootResult(result) {
  if (result.type === "JsdocTypeKeyValue") {
    return assertPlainKeyValueResult(result);
  }
  return assertRootResult(result);
}
function assertPlainKeyValueOrNameResult(result) {
  if (result.type === "JsdocTypeName") {
    return result;
  }
  return assertPlainKeyValueResult(result);
}
function assertPlainKeyValueResult(result) {
  if (result.type !== "JsdocTypeKeyValue") {
    throw new UnexpectedTypeError(result);
  }
  return result;
}
function assertNumberOrVariadicNameResult(result) {
  var _a;
  if (result.type === "JsdocTypeVariadic") {
    if (((_a = result.element) == null ? void 0 : _a.type) === "JsdocTypeName") {
      return result;
    }
    throw new UnexpectedTypeError(result);
  }
  if (result.type !== "JsdocTypeNumber" && result.type !== "JsdocTypeName") {
    throw new UnexpectedTypeError(result);
  }
  return result;
}
function assertArrayOrTupleResult(result) {
  if (result.type === "JsdocTypeTuple") {
    return result;
  }
  if (result.type === "JsdocTypeGeneric" && result.meta.brackets === "square") {
    return result;
  }
  throw new UnexpectedTypeError(result);
}
function isSquaredProperty(result) {
  return result.type === "JsdocTypeIndexSignature" || result.type === "JsdocTypeMappedType";
}

// src/Parser.ts
var Parser = class {
  constructor(grammar, lexer, baseParser, {
    module: module2,
    strictMode,
    asyncFunctionBody,
    classContext,
    externalParsers
  } = {}) {
    this.grammar = grammar;
    this._lexer = lexer;
    this.baseParser = baseParser;
    this.externalParsers = externalParsers;
    this.module = module2;
    this.strictMode = strictMode;
    this.asyncFunctionBody = asyncFunctionBody;
    this.classContext = classContext;
  }
  get lexer() {
    return this._lexer;
  }
  /**
   * Parses a given string and throws an error if the parse ended before the end of the string.
   */
  parse() {
    const result = this.parseType(0 /* ALL */);
    if (this.lexer.current.type !== "EOF") {
      throw new EarlyEndOfParseError(this.lexer.current);
    }
    return result;
  }
  /**
   * Parses with the current lexer and asserts that the result is a {@link RootResult}.
   */
  parseType(precedence) {
    return assertRootResult(this.parseIntermediateType(precedence));
  }
  /**
   * The main parsing function. First it tries to parse the current state in the prefix step, and then it continues
   * to parse the state in the infix step.
   */
  parseIntermediateType(precedence) {
    const result = this.tryParslets(null, precedence);
    if (result === null) {
      throw new NoParsletFoundError(this.lexer.current);
    }
    return this.parseInfixIntermediateType(result, precedence);
  }
  /**
   * In the infix parsing step the parser continues to parse the current state with all parslets until none returns
   * a result.
   */
  parseInfixIntermediateType(left, precedence) {
    let result = this.tryParslets(left, precedence);
    while (result !== null) {
      left = result;
      result = this.tryParslets(left, precedence);
    }
    return left;
  }
  /**
   * Tries to parse the current state with all parslets in the grammar and returns the first non null result.
   */
  tryParslets(left, precedence) {
    for (const parslet of this.grammar) {
      const result = parslet(this, precedence, left);
      if (result !== null) {
        return result;
      }
    }
    return null;
  }
  /**
   * If the given type equals the current type of the {@link Lexer} advance the lexer. Return true if the lexer was
   * advanced.
   */
  consume(types) {
    if (!Array.isArray(types)) {
      types = [types];
    }
    if (types.includes(this.lexer.current.type)) {
      this._lexer = this.lexer.advance();
      return true;
    } else {
      return false;
    }
  }
  acceptLexerState(parser) {
    this._lexer = parser.lexer;
  }
};

// src/parslets/isQuestionMarkUnknownType.ts
function isQuestionMarkUnknownType(next) {
  return next === "}" || next === "EOF" || next === "|" || next === "," || next === ")" || next === ">";
}

// src/parslets/NullableParslets.ts
var nullableParslet = (parser, precedence, left) => {
  const type = parser.lexer.current.type;
  const next = parser.lexer.next.type;
  const accept = left == null && type === "?" && !isQuestionMarkUnknownType(next) || left != null && type === "?";
  if (!accept) {
    return null;
  }
  parser.consume("?");
  if (left == null) {
    return {
      type: "JsdocTypeNullable",
      element: parser.parseType(12 /* NULLABLE */),
      meta: {
        position: "prefix"
      }
    };
  } else {
    return {
      type: "JsdocTypeNullable",
      element: assertRootResult(left),
      meta: {
        position: "suffix"
      }
    };
  }
};

// src/parslets/Parslet.ts
function composeParslet(options) {
  const parslet = (parser, curPrecedence, left) => {
    const type = parser.lexer.current.type;
    const next = parser.lexer.next.type;
    if (left === null) {
      if ("parsePrefix" in options) {
        if (options.accept(type, next)) {
          return options.parsePrefix(parser);
        }
      }
    } else {
      if ("parseInfix" in options) {
        if (options.precedence > curPrecedence && options.accept(type, next)) {
          return options.parseInfix(parser, left);
        }
      }
    }
    return null;
  };
  Object.defineProperty(parslet, "name", {
    value: options.name
  });
  return parslet;
}

// src/parslets/OptionalParslet.ts
var optionalParslet = composeParslet({
  name: "optionalParslet",
  accept: (type) => type === "=",
  precedence: 11 /* OPTIONAL */,
  parsePrefix: (parser) => {
    parser.consume("=");
    return {
      type: "JsdocTypeOptional",
      element: parser.parseType(11 /* OPTIONAL */),
      meta: {
        position: "prefix"
      }
    };
  },
  parseInfix: (parser, left) => {
    parser.consume("=");
    return {
      type: "JsdocTypeOptional",
      element: assertRootResult(left),
      meta: {
        position: "suffix"
      }
    };
  }
});

// src/parslets/NumberParslet.ts
var numberParslet = composeParslet({
  name: "numberParslet",
  accept: (type) => type === "Number",
  parsePrefix: (parser) => {
    const value = parseFloat(parser.lexer.current.text);
    parser.consume("Number");
    return {
      type: "JsdocTypeNumber",
      value
    };
  }
});

// src/parslets/ParenthesisParslet.ts
var parenthesisParslet = composeParslet({
  name: "parenthesisParslet",
  accept: (type) => type === "(",
  parsePrefix: (parser) => {
    parser.consume("(");
    if (parser.consume(")")) {
      return {
        type: "JsdocTypeParameterList",
        elements: []
      };
    }
    const result = parser.parseIntermediateType(0 /* ALL */);
    if (!parser.consume(")")) {
      throw new Error("Unterminated parenthesis");
    }
    if (result.type === "JsdocTypeParameterList") {
      return result;
    } else if (result.type === "JsdocTypeKeyValue") {
      return {
        type: "JsdocTypeParameterList",
        elements: [result]
      };
    }
    return {
      type: "JsdocTypeParenthesis",
      element: assertRootResult(result)
    };
  }
});

// src/parslets/SpecialTypesParslet.ts
var specialTypesParslet = composeParslet({
  name: "specialTypesParslet",
  accept: (type, next) => type === "?" && isQuestionMarkUnknownType(next) || type === "null" || type === "undefined" || type === "*",
  parsePrefix: (parser) => {
    if (parser.consume("null")) {
      return {
        type: "JsdocTypeNull"
      };
    }
    if (parser.consume("undefined")) {
      return {
        type: "JsdocTypeUndefined"
      };
    }
    if (parser.consume("*")) {
      return {
        type: "JsdocTypeAny"
      };
    }
    if (parser.consume("?")) {
      return {
        type: "JsdocTypeUnknown"
      };
    }
    throw new Error("Unacceptable token: " + parser.lexer.current.text);
  }
});

// src/parslets/NotNullableParslet.ts
var notNullableParslet = composeParslet({
  name: "notNullableParslet",
  accept: (type) => type === "!",
  precedence: 12 /* NULLABLE */,
  parsePrefix: (parser) => {
    parser.consume("!");
    return {
      type: "JsdocTypeNotNullable",
      element: parser.parseType(12 /* NULLABLE */),
      meta: {
        position: "prefix"
      }
    };
  },
  parseInfix: (parser, left) => {
    parser.consume("!");
    return {
      type: "JsdocTypeNotNullable",
      element: assertRootResult(left),
      meta: {
        position: "suffix"
      }
    };
  }
});

// src/parslets/ParameterListParslet.ts
function createParameterListParslet({ allowTrailingComma }) {
  return composeParslet({
    name: "parameterListParslet",
    accept: (type) => type === ",",
    precedence: 1 /* PARAMETER_LIST */,
    parseInfix: (parser, left) => {
      const elements = [
        assertPlainKeyValueOrRootResult(left)
      ];
      parser.consume(",");
      do {
        try {
          const next = parser.parseIntermediateType(1 /* PARAMETER_LIST */);
          elements.push(assertPlainKeyValueOrRootResult(next));
        } catch (e) {
          if (allowTrailingComma && e instanceof NoParsletFoundError) {
            break;
          } else {
            throw e;
          }
        }
      } while (parser.consume(","));
      if (elements.length > 0 && elements.slice(0, -1).some((e) => e.type === "JsdocTypeVariadic")) {
        throw new Error("Only the last parameter may be a rest parameter");
      }
      return {
        type: "JsdocTypeParameterList",
        elements
      };
    }
  });
}

// src/parslets/GenericParslet.ts
var genericParslet = composeParslet({
  name: "genericParslet",
  accept: (type, next) => type === "<" || type === "." && next === "<",
  precedence: 17 /* GENERIC */,
  parseInfix: (parser, left) => {
    const dot = parser.consume(".");
    parser.consume("<");
    const objects = [];
    let infer = false;
    if (parser.consume("infer")) {
      infer = true;
      const left2 = parser.parseIntermediateType(10 /* SYMBOL */);
      if (left2.type !== "JsdocTypeName") {
        throw new UnexpectedTypeError(left2, "A typescript infer always has to have a name.");
      }
      objects.push(left2);
    } else {
      do {
        objects.push(parser.parseType(1 /* PARAMETER_LIST */));
      } while (parser.consume(","));
    }
    if (!parser.consume(">")) {
      throw new Error("Unterminated generic parameter list");
    }
    return __spreadProps(__spreadValues({
      type: "JsdocTypeGeneric",
      left: assertRootResult(left),
      elements: objects
    }, infer ? { infer: true } : {}), {
      meta: {
        brackets: "angle",
        dot
      }
    });
  }
});

// src/parslets/UnionParslets.ts
var unionParslet = composeParslet({
  name: "unionParslet",
  accept: (type) => type === "|",
  precedence: 5 /* UNION */,
  parseInfix: (parser, left) => {
    parser.consume("|");
    const elements = [];
    do {
      elements.push(parser.parseType(5 /* UNION */));
    } while (parser.consume("|"));
    return {
      type: "JsdocTypeUnion",
      elements: [
        assertResultIsNotReservedWord(parser, assertRootResult(left)),
        ...elements.map((element) => assertResultIsNotReservedWord(parser, element))
      ]
    };
  }
});

// src/grammars/baseGrammar.ts
var baseGrammar = [
  nullableParslet,
  optionalParslet,
  numberParslet,
  parenthesisParslet,
  specialTypesParslet,
  notNullableParslet,
  createParameterListParslet({
    allowTrailingComma: true
  }),
  genericParslet,
  unionParslet,
  optionalParslet
];

// src/parslets/NamePathParslet.ts
function createNamePathParslet({ allowSquareBracketsOnAnyType, allowJsdocNamePaths, pathGrammar: pathGrammar2 }) {
  return function namePathParslet(parser, precedence, left) {
    if (left == null || precedence >= 18 /* NAME_PATH */) {
      return null;
    }
    const type = parser.lexer.current.type;
    const next = parser.lexer.next.type;
    const accept = type === "." && next !== "<" || type === "[" && (allowSquareBracketsOnAnyType || left.type === "JsdocTypeName") || allowJsdocNamePaths && (type === "~" || type === "#");
    if (!accept) {
      return null;
    }
    let pathType;
    let brackets = false;
    if (parser.consume(".")) {
      pathType = "property";
    } else if (parser.consume("[")) {
      pathType = "property-brackets";
      brackets = true;
    } else if (parser.consume("~")) {
      pathType = "inner";
    } else {
      parser.consume("#");
      pathType = "instance";
    }
    const pathParser = brackets && allowSquareBracketsOnAnyType ? parser : pathGrammar2 !== null ? new Parser(pathGrammar2, parser.lexer, parser) : parser;
    const parsed = pathParser.parseType(18 /* NAME_PATH */);
    parser.acceptLexerState(pathParser);
    let right;
    switch (parsed.type) {
      case "JsdocTypeName":
        right = {
          type: "JsdocTypeProperty",
          value: parsed.value,
          meta: {
            quote: void 0
          }
        };
        break;
      case "JsdocTypeNumber":
        right = {
          type: "JsdocTypeProperty",
          value: parsed.value.toString(10),
          meta: {
            quote: void 0
          }
        };
        break;
      case "JsdocTypeStringValue":
        right = {
          type: "JsdocTypeProperty",
          value: parsed.value,
          meta: {
            quote: parsed.meta.quote
          }
        };
        break;
      case "JsdocTypeSpecialNamePath":
        if (parsed.specialType === "event") {
          right = parsed;
        } else {
          throw new UnexpectedTypeError(parsed, "Type 'JsdocTypeSpecialNamePath' is only allowed with specialType 'event'");
        }
        break;
      default:
        if (!brackets || !allowSquareBracketsOnAnyType) {
          throw new UnexpectedTypeError(parsed, "Expecting 'JsdocTypeName', 'JsdocTypeNumber', 'JsdocStringValue' or 'JsdocTypeSpecialNamePath'");
        }
        right = {
          type: "JsdocTypeIndexedAccessIndex",
          right: parsed
        };
    }
    if (brackets && !parser.consume("]")) {
      const token = parser.lexer.current;
      throw new Error(`Unterminated square brackets. Next token is '${token.type}' with text '${token.text}'`);
    }
    return {
      type: "JsdocTypeNamePath",
      left: assertRootResult(left),
      right,
      pathType
    };
  };
}

// src/parslets/NameParslet.ts
function createNameParslet({ allowedAdditionalTokens }) {
  return composeParslet({
    name: "nameParslet",
    accept: (type) => type === "Identifier" || type === "this" || type === "new" || allowedAdditionalTokens.includes(type),
    parsePrefix: (parser) => {
      const { type, text } = parser.lexer.current;
      parser.consume(type);
      return {
        type: "JsdocTypeName",
        value: text
      };
    }
  });
}

// src/parslets/StringValueParslet.ts
var stringValueParslet = composeParslet({
  name: "stringValueParslet",
  accept: (type) => type === "StringValue",
  parsePrefix: (parser) => {
    const text = parser.lexer.current.text;
    parser.consume("StringValue");
    return {
      type: "JsdocTypeStringValue",
      value: text.slice(1, -1),
      meta: {
        quote: text.startsWith("'") ? "single" : "double"
      }
    };
  }
});

// src/parslets/SpecialNamePathParslet.ts
function createSpecialNamePathParslet({ pathGrammar: pathGrammar2, allowedTypes }) {
  return composeParslet({
    name: "specialNamePathParslet",
    accept: (type) => allowedTypes.includes(type),
    parsePrefix: (parser) => {
      const type = parser.lexer.current.type;
      parser.consume(type);
      if (!parser.consume(":")) {
        return {
          type: "JsdocTypeName",
          value: type
        };
      }
      let result;
      let token = parser.lexer.current;
      if (parser.consume("StringValue")) {
        result = {
          type: "JsdocTypeSpecialNamePath",
          value: token.text.slice(1, -1),
          specialType: type,
          meta: {
            quote: token.text.startsWith("'") ? "single" : "double"
          }
        };
      } else {
        let value = "";
        const allowed = ["Identifier", "@", "/"];
        while (allowed.some((type2) => parser.consume(type2))) {
          value += token.text;
          token = parser.lexer.current;
        }
        result = {
          type: "JsdocTypeSpecialNamePath",
          value,
          specialType: type,
          meta: {
            quote: void 0
          }
        };
      }
      const moduleParser = new Parser(pathGrammar2, parser.lexer, parser);
      const moduleResult = moduleParser.parseInfixIntermediateType(result, 0 /* ALL */);
      parser.acceptLexerState(moduleParser);
      return assertRootResult(moduleResult);
    }
  });
}

// src/grammars/pathGrammar.ts
var basePathGrammar = [
  createNameParslet({
    allowedAdditionalTokens: ["external", "module"]
  }),
  stringValueParslet,
  numberParslet,
  createNamePathParslet({
    allowSquareBracketsOnAnyType: false,
    allowJsdocNamePaths: true,
    pathGrammar: null
  })
];
var pathGrammar = [
  ...basePathGrammar,
  createSpecialNamePathParslet({
    allowedTypes: ["event"],
    pathGrammar: basePathGrammar
  }),
  createNameParslet({
    allowedAdditionalTokens: baseNameTokens
  })
];

// src/parslets/FunctionParslet.ts
function getParameters(value) {
  let parameters = [];
  if (value.type === "JsdocTypeParameterList") {
    parameters = value.elements;
  } else if (value.type === "JsdocTypeParenthesis") {
    parameters = [value.element];
  } else {
    throw new UnexpectedTypeError(value);
  }
  return parameters.map((p) => assertPlainKeyValueOrRootResult(p));
}
function getUnnamedParameters(value) {
  const parameters = getParameters(value);
  if (parameters.some((p) => p.type === "JsdocTypeKeyValue")) {
    throw new Error("No parameter should be named");
  }
  return parameters;
}
function createFunctionParslet({ allowNamedParameters, allowNoReturnType, allowWithoutParenthesis, allowNewAsFunctionKeyword }) {
  return composeParslet({
    name: "functionParslet",
    accept: (type, next) => type === "function" || allowNewAsFunctionKeyword && type === "new" && next === "(",
    parsePrefix: (parser) => {
      const newKeyword = parser.consume("new");
      parser.consume("function");
      const hasParenthesis = parser.lexer.current.type === "(";
      if (!hasParenthesis) {
        if (!allowWithoutParenthesis) {
          throw new Error("function is missing parameter list");
        }
        return {
          type: "JsdocTypeName",
          value: "function"
        };
      }
      let result = {
        type: "JsdocTypeFunction",
        parameters: [],
        arrow: false,
        constructor: newKeyword,
        parenthesis: hasParenthesis
      };
      const value = parser.parseIntermediateType(14 /* FUNCTION */);
      if (allowNamedParameters === void 0) {
        result.parameters = getUnnamedParameters(value);
      } else if (newKeyword && value.type === "JsdocTypeFunction" && value.arrow) {
        result = value;
        result.constructor = true;
        return result;
      } else {
        result.parameters = getParameters(value);
        for (const p of result.parameters) {
          if (p.type === "JsdocTypeKeyValue" && !allowNamedParameters.includes(p.key)) {
            throw new Error(`only allowed named parameters are ${allowNamedParameters.join(", ")} but got ${p.type}`);
          }
        }
      }
      if (parser.consume(":")) {
        result.returnType = parser.parseType(7 /* PREFIX */);
      } else {
        if (!allowNoReturnType) {
          throw new Error("function is missing return type");
        }
      }
      return result;
    }
  });
}

// src/parslets/VariadicParslet.ts
function createVariadicParslet({ allowPostfix, allowEnclosingBrackets }) {
  return composeParslet({
    name: "variadicParslet",
    accept: (type) => type === "...",
    precedence: 7 /* PREFIX */,
    parsePrefix: (parser) => {
      parser.consume("...");
      const brackets = allowEnclosingBrackets && parser.consume("[");
      try {
        const element = parser.parseType(7 /* PREFIX */);
        if (brackets && !parser.consume("]")) {
          throw new Error("Unterminated variadic type. Missing ']'");
        }
        return {
          type: "JsdocTypeVariadic",
          element: assertRootResult(element),
          meta: {
            position: "prefix",
            squareBrackets: brackets
          }
        };
      } catch (e) {
        if (e instanceof NoParsletFoundError) {
          if (brackets) {
            throw new Error("Empty square brackets for variadic are not allowed.", {
              cause: e
            });
          }
          return {
            type: "JsdocTypeVariadic",
            meta: {
              position: void 0,
              squareBrackets: false
            }
          };
        } else {
          throw e;
        }
      }
    },
    parseInfix: allowPostfix ? (parser, left) => {
      parser.consume("...");
      return {
        type: "JsdocTypeVariadic",
        element: assertRootResult(left),
        meta: {
          position: "suffix",
          squareBrackets: false
        }
      };
    } : void 0
  });
}

// src/parslets/SymbolParslet.ts
var symbolParslet = composeParslet({
  name: "symbolParslet",
  accept: (type) => type === "(",
  precedence: 10 /* SYMBOL */,
  parseInfix: (parser, left) => {
    if (left.type !== "JsdocTypeName") {
      throw new Error("Symbol expects a name on the left side. (Reacting on '(')");
    }
    parser.consume("(");
    const result = {
      type: "JsdocTypeSymbol",
      value: left.value
    };
    if (!parser.consume(")")) {
      const next = parser.parseIntermediateType(10 /* SYMBOL */);
      result.element = assertNumberOrVariadicNameResult(next);
      if (!parser.consume(")")) {
        throw new Error("Symbol does not end after value");
      }
    }
    return result;
  }
});

// src/parslets/ArrayBracketsParslet.ts
var arrayBracketsParslet = composeParslet({
  name: "arrayBracketsParslet",
  precedence: 16 /* ARRAY_BRACKETS */,
  accept: (type, next) => type === "[" && next === "]",
  parseInfix: (parser, left) => {
    parser.consume("[");
    parser.consume("]");
    return {
      type: "JsdocTypeGeneric",
      left: {
        type: "JsdocTypeName",
        value: "Array"
      },
      elements: [
        assertRootResult(left)
      ],
      meta: {
        brackets: "square",
        dot: false
      }
    };
  }
});

// src/parslets/ObjectParslet.ts
function createObjectParslet({ signatureGrammar, objectFieldGrammar: objectFieldGrammar3, allowKeyTypes }) {
  return composeParslet({
    name: "objectParslet",
    accept: (type) => type === "{",
    parsePrefix: (parser) => {
      var _a;
      parser.consume("{");
      const result = {
        type: "JsdocTypeObject",
        meta: {
          separator: "comma"
        },
        elements: []
      };
      if (!parser.consume("}")) {
        let separator;
        const fieldParser = new Parser(
          objectFieldGrammar3,
          parser.lexer,
          parser,
          ((_a = parser.externalParsers) == null ? void 0 : _a.computedPropertyParser) !== void 0 ? {
            externalParsers: {
              computedPropertyParser: parser.externalParsers.computedPropertyParser
            }
          } : void 0
        );
        while (true) {
          fieldParser.acceptLexerState(parser);
          let field = fieldParser.parseIntermediateType(2 /* OBJECT */);
          parser.acceptLexerState(fieldParser);
          if (field === void 0 && allowKeyTypes) {
            field = parser.parseIntermediateType(2 /* OBJECT */);
          }
          let optional = false;
          if (field.type === "JsdocTypeNullable") {
            optional = true;
            field = field.element;
          }
          if (field.type === "JsdocTypeNumber" || field.type === "JsdocTypeName" || field.type === "JsdocTypeStringValue") {
            let quote2;
            if (field.type === "JsdocTypeStringValue") {
              quote2 = field.meta.quote;
            }
            result.elements.push({
              type: "JsdocTypeObjectField",
              key: field.value.toString(),
              right: void 0,
              optional,
              readonly: false,
              meta: {
                quote: quote2
              }
            });
          } else if (signatureGrammar !== void 0 && (field.type === "JsdocTypeCallSignature" || field.type === "JsdocTypeConstructorSignature" || field.type === "JsdocTypeMethodSignature")) {
            const signatureParser = new Parser(
              [
                ...signatureGrammar,
                ...parser.grammar.flatMap((grammar) => {
                  if (grammar.name === "keyValueParslet") {
                    return [];
                  }
                  return [grammar];
                })
              ],
              parser.lexer,
              parser
            );
            signatureParser.acceptLexerState(parser);
            const params = signatureParser.parseIntermediateType(2 /* OBJECT */);
            parser.acceptLexerState(signatureParser);
            field.parameters = getParameters(params);
            const returnType = parser.parseType(2 /* OBJECT */);
            field.returnType = returnType;
            result.elements.push(field);
          } else if (field.type === "JsdocTypeObjectField" || field.type === "JsdocTypeJsdocObjectField") {
            result.elements.push(field);
          } else if (field.type === "JsdocTypeReadonlyProperty" && field.element.type === "JsdocTypeObjectField") {
            if (typeof field.element.key === "object" && field.element.key.type === "JsdocTypeComputedMethod") {
              throw new Error("Computed method may not be readonly");
            }
            field.element.readonly = true;
            result.elements.push(field.element);
          } else {
            throw new UnexpectedTypeError(field);
          }
          if (parser.lexer.current.startOfLine) {
            separator != null ? separator : separator = "linebreak";
            parser.consume(",") || parser.consume(";");
          } else if (parser.consume(",")) {
            if (parser.lexer.current.startOfLine) {
              separator = "comma-and-linebreak";
            } else {
              separator = "comma";
            }
          } else if (parser.consume(";")) {
            if (parser.lexer.current.startOfLine) {
              separator = "semicolon-and-linebreak";
            } else {
              separator = "semicolon";
            }
          } else {
            break;
          }
          const type = parser.lexer.current.type;
          if (type === "}") {
            break;
          }
        }
        result.meta.separator = separator != null ? separator : "comma";
        if ((separator != null ? separator : "").endsWith("linebreak")) {
          result.meta.propertyIndent = "  ";
        }
        if (!parser.consume("}")) {
          throw new Error("Unterminated record type. Missing '}'");
        }
      }
      return result;
    }
  });
}

// src/parslets/ObjectFieldParslet.ts
function createObjectFieldParslet({ allowSquaredProperties, allowKeyTypes, allowReadonly, allowOptional }) {
  return composeParslet({
    name: "objectFieldParslet",
    precedence: 3 /* KEY_VALUE */,
    accept: (type) => type === ":",
    parseInfix: (parser, left) => {
      var _a;
      let optional = false;
      let readonlyProperty = false;
      if (allowOptional && left.type === "JsdocTypeNullable") {
        optional = true;
        left = left.element;
      }
      if (allowReadonly && left.type === "JsdocTypeReadonlyProperty") {
        readonlyProperty = true;
        left = left.element;
      }
      const parentParser = (_a = parser.baseParser) != null ? _a : parser;
      parentParser.acceptLexerState(parser);
      if (left.type === "JsdocTypeNumber" || left.type === "JsdocTypeName" || left.type === "JsdocTypeStringValue" || isSquaredProperty(left)) {
        if (isSquaredProperty(left) && !allowSquaredProperties) {
          throw new UnexpectedTypeError(left);
        }
        parentParser.consume(":");
        let quote2;
        if (left.type === "JsdocTypeStringValue") {
          quote2 = left.meta.quote;
        }
        const right = parentParser.parseType(3 /* KEY_VALUE */);
        parser.acceptLexerState(parentParser);
        return {
          type: "JsdocTypeObjectField",
          /* c8 ignore next -- Guard; not needed anymore? */
          key: isSquaredProperty(left) ? left : left.value.toString(),
          right,
          optional,
          readonly: readonlyProperty,
          meta: {
            quote: quote2
          }
        };
      } else {
        if (!allowKeyTypes) {
          throw new UnexpectedTypeError(left);
        }
        parentParser.consume(":");
        const right = parentParser.parseType(3 /* KEY_VALUE */);
        parser.acceptLexerState(parentParser);
        return {
          type: "JsdocTypeJsdocObjectField",
          left: assertRootResult(left),
          right
        };
      }
    }
  });
}

// src/parslets/KeyValueParslet.ts
function createKeyValueParslet({ allowOptional, allowVariadic, acceptParameterList }) {
  return composeParslet({
    name: "keyValueParslet",
    precedence: 3 /* KEY_VALUE */,
    accept: (type) => type === ":",
    parseInfix: (parser, left) => {
      let optional = false;
      let variadic = false;
      if (allowOptional && left.type === "JsdocTypeNullable") {
        optional = true;
        left = left.element;
      }
      if (allowVariadic && left.type === "JsdocTypeVariadic" && left.element !== void 0) {
        variadic = true;
        left = left.element;
      }
      if (left.type !== "JsdocTypeName") {
        if (acceptParameterList !== void 0 && left.type === "JsdocTypeParameterList") {
          parser.consume(":");
          return left;
        }
        throw new UnexpectedTypeError(left);
      }
      parser.consume(":");
      const right = parser.parseType(3 /* KEY_VALUE */);
      return {
        type: "JsdocTypeKeyValue",
        key: left.value,
        right,
        optional,
        variadic
      };
    }
  });
}

// src/grammars/jsdocGrammar.ts
var jsdocBaseGrammar = [
  ...baseGrammar,
  createFunctionParslet({
    allowWithoutParenthesis: true,
    allowNamedParameters: ["this", "new"],
    allowNoReturnType: true,
    allowNewAsFunctionKeyword: false
  }),
  stringValueParslet,
  createSpecialNamePathParslet({
    allowedTypes: ["module", "external", "event"],
    pathGrammar
  }),
  createVariadicParslet({
    allowEnclosingBrackets: true,
    allowPostfix: true
  }),
  createNameParslet({
    allowedAdditionalTokens: ["keyof"]
  }),
  symbolParslet,
  arrayBracketsParslet,
  createNamePathParslet({
    allowSquareBracketsOnAnyType: false,
    allowJsdocNamePaths: true,
    pathGrammar
  })
];
var jsdocGrammar = [
  ...jsdocBaseGrammar,
  createObjectParslet({
    // jsdoc syntax allows full types as keys, so we need to pull in the full grammar here
    // we leave out the object type deliberately
    objectFieldGrammar: [
      createNameParslet({
        allowedAdditionalTokens: ["typeof", "module", "in"]
      }),
      createObjectFieldParslet({
        allowSquaredProperties: false,
        allowKeyTypes: true,
        allowOptional: false,
        allowReadonly: false
      }),
      ...jsdocBaseGrammar
    ],
    allowKeyTypes: true
  }),
  createKeyValueParslet({
    allowOptional: true,
    allowVariadic: true
  })
];
var jsdocNameGrammar = [
  genericParslet,
  arrayBracketsParslet,
  createNameParslet({
    allowedAdditionalTokens: baseNameTokens
  })
];
var jsdocNamePathGrammar = [
  genericParslet,
  arrayBracketsParslet,
  createNameParslet({
    allowedAdditionalTokens: baseNameTokens
  }),
  createNamePathParslet({
    allowSquareBracketsOnAnyType: false,
    allowJsdocNamePaths: true,
    pathGrammar
  })
];
var jsdocNamePathSpecialGrammar = [
  createSpecialNamePathParslet({
    allowedTypes: ["module", "external", "event"],
    pathGrammar
  }),
  ...jsdocNamePathGrammar
];

// src/parslets/TypeOfParslet.ts
var typeOfParslet = composeParslet({
  name: "typeOfParslet",
  accept: (type) => type === "typeof",
  parsePrefix: (parser) => {
    parser.consume("typeof");
    return {
      type: "JsdocTypeTypeof",
      element: parser.parseType(13 /* KEY_OF_TYPE_OF */)
    };
  }
});

// src/grammars/closureGrammar.ts
var objectFieldGrammar = [
  createNameParslet({
    allowedAdditionalTokens: [
      "typeof",
      "module",
      "keyof",
      "event",
      "external",
      "in"
    ]
  }),
  nullableParslet,
  optionalParslet,
  stringValueParslet,
  numberParslet,
  createObjectFieldParslet({
    allowSquaredProperties: false,
    allowKeyTypes: false,
    allowOptional: false,
    allowReadonly: false
  })
];
var closureGrammar = [
  ...baseGrammar,
  createObjectParslet({
    allowKeyTypes: false,
    objectFieldGrammar
  }),
  createNameParslet({
    allowedAdditionalTokens: ["event", "external", "in"]
  }),
  typeOfParslet,
  createFunctionParslet({
    allowWithoutParenthesis: false,
    allowNamedParameters: ["this", "new"],
    allowNoReturnType: true,
    allowNewAsFunctionKeyword: false
  }),
  createVariadicParslet({
    allowEnclosingBrackets: false,
    allowPostfix: false
  }),
  // additional name parslet is needed for some special cases
  createNameParslet({
    allowedAdditionalTokens: ["keyof"]
  }),
  createSpecialNamePathParslet({
    allowedTypes: ["module"],
    pathGrammar
  }),
  createNamePathParslet({
    allowSquareBracketsOnAnyType: false,
    allowJsdocNamePaths: true,
    pathGrammar
  }),
  createKeyValueParslet({
    allowOptional: false,
    allowVariadic: false
  }),
  symbolParslet
];
var closureNameGrammar = [
  genericParslet,
  arrayBracketsParslet,
  createNameParslet({
    allowedAdditionalTokens: baseNameTokens
  })
];
var closureNamePathGrammar = [
  genericParslet,
  arrayBracketsParslet,
  createNameParslet({
    allowedAdditionalTokens: baseNameTokens
  }),
  createNamePathParslet({
    allowSquareBracketsOnAnyType: false,
    allowJsdocNamePaths: true,
    pathGrammar
  })
];
var closureNamePathSpecialGrammar = [
  createSpecialNamePathParslet({
    allowedTypes: ["module"],
    pathGrammar
  }),
  ...closureNamePathGrammar
];

// src/parslets/assertsParslet.ts
var assertsParslet = composeParslet({
  name: "assertsParslet",
  accept: (type) => type === "asserts",
  parsePrefix: (parser) => {
    parser.consume("asserts");
    const left = parser.parseIntermediateType(10 /* SYMBOL */);
    if (left.type !== "JsdocTypeName") {
      throw new UnexpectedTypeError(left, "A typescript asserts always has to have a name.");
    }
    if (!parser.consume("is")) {
      return {
        type: "JsdocTypeAssertsPlain",
        element: left
      };
    }
    return {
      type: "JsdocTypeAsserts",
      left,
      right: assertRootResult(parser.parseIntermediateType(8 /* INFIX */))
    };
  }
});

// src/parslets/FunctionPropertyParslet.ts
var functionPropertyParslet = composeParslet({
  name: "functionPropertyParslet",
  accept: (type, next) => type === "new" && (next === "(" || next === "<") || type === "Identifier" && (next === "(" || next === "<") || type === "StringValue" && (next === "(" || next === "<") || type === "(" || type === "<",
  parsePrefix: (parser) => {
    let result;
    const returnType = {
      type: "JsdocTypeName",
      value: "void"
    };
    const newKeyword = parser.consume("new");
    if (newKeyword) {
      result = {
        type: "JsdocTypeConstructorSignature",
        parameters: [],
        returnType
      };
    } else {
      const text = parser.lexer.current.text;
      const identifier = parser.consume("Identifier");
      if (identifier) {
        result = {
          type: "JsdocTypeMethodSignature",
          name: text,
          meta: {
            quote: void 0
          },
          parameters: [],
          returnType
        };
      } else {
        const text2 = parser.lexer.current.text;
        const stringValue = parser.consume("StringValue");
        if (stringValue) {
          result = {
            type: "JsdocTypeMethodSignature",
            name: text2.slice(1, -1),
            meta: {
              quote: text2.startsWith('"') ? "double" : "single"
            },
            parameters: [],
            returnType
          };
        } else {
          result = {
            type: "JsdocTypeCallSignature",
            parameters: [],
            returnType
          };
        }
      }
    }
    const typeParameters = [];
    if (parser.consume("<")) {
      do {
        let defaultValue = void 0;
        let name = parser.parseIntermediateType(10 /* SYMBOL */);
        if (name.type === "JsdocTypeOptional") {
          name = name.element;
          defaultValue = parser.parseType(10 /* SYMBOL */);
        }
        if (name.type !== "JsdocTypeName") {
          throw new UnexpectedTypeError(name);
        }
        let constraint = void 0;
        if (parser.consume("extends")) {
          constraint = parser.parseType(10 /* SYMBOL */);
          if (constraint.type === "JsdocTypeOptional") {
            constraint = constraint.element;
            defaultValue = parser.parseType(10 /* SYMBOL */);
          }
        }
        const typeParameter = {
          type: "JsdocTypeTypeParameter",
          name
        };
        if (constraint !== void 0) {
          typeParameter.constraint = constraint;
        }
        if (defaultValue !== void 0) {
          typeParameter.defaultValue = defaultValue;
        }
        typeParameters.push(typeParameter);
        if (parser.consume(">")) {
          break;
        }
      } while (parser.consume(","));
      result.typeParameters = typeParameters;
    }
    const hasParenthesis = parser.lexer.current.type === "(";
    if (!hasParenthesis) {
      throw new Error("function property is missing parameter list");
    }
    return result;
  }
});

// src/parslets/TupleParslet.ts
function createTupleParslet({ allowQuestionMark }) {
  return composeParslet({
    name: "tupleParslet",
    accept: (type) => type === "[",
    parsePrefix: (parser) => {
      parser.consume("[");
      const result = {
        type: "JsdocTypeTuple",
        elements: []
      };
      if (parser.consume("]")) {
        return result;
      }
      const typeList = parser.parseIntermediateType(0 /* ALL */);
      if (typeList.type === "JsdocTypeParameterList") {
        if (typeList.elements[0].type === "JsdocTypeKeyValue") {
          result.elements = typeList.elements.map(assertPlainKeyValueResult);
        } else {
          result.elements = typeList.elements.map(assertRootResult);
        }
      } else {
        if (typeList.type === "JsdocTypeKeyValue") {
          result.elements = [assertPlainKeyValueResult(typeList)];
        } else {
          result.elements = [assertRootResult(typeList)];
        }
      }
      if (!parser.consume("]")) {
        throw new Error("Unterminated '['");
      }
      if (!allowQuestionMark && result.elements.some((e) => e.type === "JsdocTypeUnknown")) {
        throw new Error("Question mark in tuple not allowed");
      }
      return result;
    }
  });
}

// src/parslets/KeyOfParslet.ts
var keyOfParslet = composeParslet({
  name: "keyOfParslet",
  accept: (type) => type === "keyof",
  parsePrefix: (parser) => {
    parser.consume("keyof");
    return {
      type: "JsdocTypeKeyof",
      element: assertRootResult(parser.parseType(13 /* KEY_OF_TYPE_OF */))
    };
  }
});

// src/parslets/ImportParslet.ts
var importParslet = composeParslet({
  name: "importParslet",
  accept: (type) => type === "import",
  parsePrefix: (parser) => {
    parser.consume("import");
    if (!parser.consume("(")) {
      throw new Error("Missing parenthesis after import keyword");
    }
    const path = parser.parseType(7 /* PREFIX */);
    if (path.type !== "JsdocTypeStringValue") {
      throw new Error("Only string values are allowed as paths for imports");
    }
    if (!parser.consume(")")) {
      throw new Error("Missing closing parenthesis after import keyword");
    }
    return {
      type: "JsdocTypeImport",
      element: path
    };
  }
});

// src/parslets/ReadonlyPropertyParslet.ts
var readonlyPropertyParslet = composeParslet({
  name: "readonlyPropertyParslet",
  accept: (type, next) => type === "readonly" && next !== ":",
  parsePrefix: (parser) => {
    parser.consume("readonly");
    return {
      type: "JsdocTypeReadonlyProperty",
      element: parser.parseIntermediateType(3 /* KEY_VALUE */)
    };
  }
});

// src/parslets/ArrowFunctionParslet.ts
var arrowFunctionParslet = composeParslet({
  name: "arrowFunctionParslet",
  precedence: 15 /* ARROW */,
  accept: (type) => type === "=>",
  parseInfix: (parser, left) => {
    parser.consume("=>");
    return {
      type: "JsdocTypeFunction",
      parameters: getParameters(left).map(assertPlainKeyValueOrNameResult),
      arrow: true,
      constructor: false,
      parenthesis: true,
      returnType: parser.parseType(2 /* OBJECT */)
    };
  }
});

// src/parslets/GenericArrowFunctionParslet.ts
var genericArrowFunctionParslet = composeParslet({
  name: "genericArrowFunctionParslet",
  accept: (type) => type === "<",
  parsePrefix: (parser) => {
    const typeParameters = [];
    parser.consume("<");
    do {
      let defaultValue = void 0;
      let name = parser.parseIntermediateType(10 /* SYMBOL */);
      if (name.type === "JsdocTypeOptional") {
        name = name.element;
        defaultValue = parser.parseType(10 /* SYMBOL */);
      }
      if (name.type !== "JsdocTypeName") {
        throw new UnexpectedTypeError(name);
      }
      let constraint = void 0;
      if (parser.consume("extends")) {
        constraint = parser.parseType(10 /* SYMBOL */);
        if (constraint.type === "JsdocTypeOptional") {
          constraint = constraint.element;
          defaultValue = parser.parseType(10 /* SYMBOL */);
        }
      }
      const typeParameter = {
        type: "JsdocTypeTypeParameter",
        name
      };
      if (constraint !== void 0) {
        typeParameter.constraint = constraint;
      }
      if (defaultValue !== void 0) {
        typeParameter.defaultValue = defaultValue;
      }
      typeParameters.push(typeParameter);
      if (parser.consume(">")) {
        break;
      }
    } while (parser.consume(","));
    const functionBase = parser.parseIntermediateType(10 /* SYMBOL */);
    functionBase.typeParameters = typeParameters;
    return functionBase;
  }
});

// src/parslets/IntersectionParslet.ts
var intersectionParslet = composeParslet({
  name: "intersectionParslet",
  accept: (type) => type === "&",
  precedence: 6 /* INTERSECTION */,
  parseInfix: (parser, left) => {
    parser.consume("&");
    const elements = [];
    do {
      elements.push(parser.parseType(6 /* INTERSECTION */));
    } while (parser.consume("&"));
    return {
      type: "JsdocTypeIntersection",
      elements: [
        assertResultIsNotReservedWord(parser, assertRootResult(left)),
        ...elements.map((element) => assertResultIsNotReservedWord(parser, element))
      ]
    };
  }
});

// src/parslets/predicateParslet.ts
var predicateParslet = composeParslet({
  name: "predicateParslet",
  precedence: 8 /* INFIX */,
  accept: (type) => type === "is",
  parseInfix: (parser, left) => {
    if (left.type !== "JsdocTypeName") {
      throw new UnexpectedTypeError(left, "A typescript predicate always has to have a name on the left side.");
    }
    parser.consume("is");
    return {
      type: "JsdocTypePredicate",
      left,
      right: assertRootResult(parser.parseIntermediateType(8 /* INFIX */))
    };
  }
});

// src/lexer/Lexer.ts
var breakingWhitespaceRegex = /^\s*\n\s*/;
var Lexer = class _Lexer {
  constructor(lexerRules, text, previous, current, next) {
    this.text = "";
    this.lexerRules = lexerRules;
    this.text = text;
    this.previous = previous;
    this.current = current;
    this.next = next;
  }
  static create(lexerRules, text) {
    const current = this.read(lexerRules, text);
    text = current.text;
    const next = this.read(lexerRules, text);
    text = next.text;
    return new _Lexer(lexerRules, text, void 0, current.token, next.token);
  }
  static read(lexerRules, text, startOfLine = false) {
    startOfLine || (startOfLine = breakingWhitespaceRegex.test(text));
    text = text.trim();
    for (const rule of lexerRules) {
      const partial = rule(text);
      if (partial !== null) {
        const token = __spreadProps(__spreadValues({}, partial), {
          startOfLine
        });
        text = text.slice(token.text.length);
        return { text, token };
      }
    }
    throw new Error("Unexpected Token " + text);
  }
  remaining() {
    return this.next.text + this.text;
  }
  advance() {
    const next = _Lexer.read(this.lexerRules, this.text);
    return new _Lexer(
      this.lexerRules,
      next.text,
      this.current,
      this.next,
      next.token
    );
  }
};

// src/parslets/ObjectSquaredPropertyParslet.ts
var objectSquaredPropertyParslet = composeParslet({
  name: "objectSquarePropertyParslet",
  accept: (type) => type === "[",
  parsePrefix: (parser) => {
    var _a, _b;
    if (parser.baseParser === void 0) {
      throw new Error("Only allowed inside object grammar");
    }
    parser.consume("[");
    let innerBracketType;
    if (((_a = parser.externalParsers) == null ? void 0 : _a.computedPropertyParser) === void 0) {
      try {
        innerBracketType = parser.parseIntermediateType(2 /* OBJECT */);
      } catch (err) {
        throw new Error("Error parsing value inside square bracketed property.", {
          cause: err
        });
      }
    }
    let result;
    if (innerBracketType !== void 0 && // Looks like an object field because of `key: value`, but is
    //  shaping to be an index signature
    innerBracketType.type === "JsdocTypeObjectField" && typeof innerBracketType.key === "string" && !innerBracketType.optional && !innerBracketType.readonly && innerBracketType.right !== void 0) {
      const key = innerBracketType.key;
      if (!parser.consume("]")) {
        throw new Error("Unterminated square brackets");
      }
      if (!parser.consume(":")) {
        throw new Error("Incomplete index signature");
      }
      const parentParser = parser.baseParser;
      parentParser.acceptLexerState(parser);
      innerBracketType.key = {
        type: "JsdocTypeIndexSignature",
        key,
        right: innerBracketType.right
      };
      innerBracketType.optional = false;
      innerBracketType.meta.quote = void 0;
      result = innerBracketType;
      const right = parentParser.parseType(4 /* INDEX_BRACKETS */);
      result.right = right;
      parser.acceptLexerState(parentParser);
    } else if (innerBracketType !== void 0 && // Looks like a name, but is shaping to be a mapped type clause
    innerBracketType.type === "JsdocTypeName" && parser.consume("in")) {
      const parentParser = parser.baseParser;
      parentParser.acceptLexerState(parser);
      const mappedTypeRight = parentParser.parseType(16 /* ARRAY_BRACKETS */);
      if (!parentParser.consume("]")) {
        throw new Error("Unterminated square brackets");
      }
      const optional = parentParser.consume("?");
      if (!parentParser.consume(":")) {
        throw new Error("Incomplete mapped type clause: missing colon");
      }
      const right = parentParser.parseType(4 /* INDEX_BRACKETS */);
      result = {
        type: "JsdocTypeObjectField",
        optional,
        readonly: false,
        meta: {
          quote: void 0
        },
        key: {
          type: "JsdocTypeMappedType",
          key: innerBracketType.value,
          right: mappedTypeRight
        },
        right
      };
      parser.acceptLexerState(parentParser);
    } else {
      if (((_b = parser.externalParsers) == null ? void 0 : _b.computedPropertyParser) !== void 0) {
        let remaining = parser.lexer.current.text + parser.lexer.remaining();
        let checkingText = remaining;
        while (checkingText !== "") {
          try {
            innerBracketType = parser.externalParsers.computedPropertyParser(
              checkingText
            );
            break;
          } catch (err) {
          }
          checkingText = checkingText.slice(0, -1);
        }
        remaining = remaining.slice(checkingText.length);
        const remainingTextParser = new Parser(
          parser.grammar,
          Lexer.create(parser.lexer.lexerRules, remaining),
          parser.baseParser,
          {
            externalParsers: {
              computedPropertyParser: parser.externalParsers.computedPropertyParser
            }
          }
        );
        parser.acceptLexerState(remainingTextParser);
      }
      if (!parser.consume("]")) {
        throw new Error("Unterminated square brackets");
      }
      let optional = parser.consume("?");
      const typeParameters = [];
      if (parser.consume("<")) {
        do {
          let defaultValue = void 0;
          let name = parser.parseIntermediateType(10 /* SYMBOL */);
          if (name.type === "JsdocTypeOptional") {
            name = name.element;
            defaultValue = parser.parseType(10 /* SYMBOL */);
          }
          if (name.type !== "JsdocTypeName") {
            throw new UnexpectedTypeError(name);
          }
          let constraint = void 0;
          if (parser.consume("extends")) {
            constraint = parser.parseType(10 /* SYMBOL */);
            if (constraint.type === "JsdocTypeOptional") {
              constraint = constraint.element;
              defaultValue = parser.parseType(10 /* SYMBOL */);
            }
          }
          const typeParameter = {
            type: "JsdocTypeTypeParameter",
            name
          };
          if (constraint !== void 0) {
            typeParameter.constraint = constraint;
          }
          if (defaultValue !== void 0) {
            typeParameter.defaultValue = defaultValue;
          }
          typeParameters.push(typeParameter);
          if (parser.consume(">")) {
            break;
          }
        } while (parser.consume(","));
      }
      let type;
      let key;
      const checkMiddle = () => {
        if (!optional) {
          optional = parser.consume("?");
        }
      };
      let right;
      const text = parser.lexer.current.type;
      if (text === "(") {
        const signatureParser = new Parser(
          [
            createKeyValueParslet({
              allowVariadic: true,
              allowOptional: true,
              acceptParameterList: true
            }),
            ...parser.baseParser.grammar.flatMap((grammar) => {
              if (grammar.name === "keyValueParslet") {
                return [];
              }
              return [grammar];
            })
          ],
          parser.lexer,
          parser
        );
        signatureParser.acceptLexerState(parser);
        const params = signatureParser.parseIntermediateType(2 /* OBJECT */);
        parser.acceptLexerState(signatureParser);
        const parameters = getParameters(params);
        type = "JsdocTypeComputedMethod";
        checkMiddle();
        parser.consume(":");
        const nextValue = parser.parseType(4 /* INDEX_BRACKETS */);
        key = {
          type,
          optional,
          value: innerBracketType,
          parameters,
          returnType: nextValue
        };
        if (typeParameters.length > 0) {
          key.typeParameters = typeParameters;
        }
      } else {
        type = "JsdocTypeComputedProperty";
        checkMiddle();
        if (!parser.consume(":")) {
          throw new Error("Incomplete computed property: missing colon");
        }
        right = parser.parseType(4 /* INDEX_BRACKETS */);
        key = {
          type,
          value: innerBracketType
        };
      }
      result = {
        type: "JsdocTypeObjectField",
        optional: type === "JsdocTypeComputedMethod" ? false : optional,
        readonly: false,
        meta: {
          quote: void 0
        },
        key,
        right
      };
    }
    return result;
  }
});

// src/parslets/ReadonlyArrayParslet.ts
var readonlyArrayParslet = composeParslet({
  name: "readonlyArrayParslet",
  accept: (type) => type === "readonly",
  parsePrefix: (parser) => {
    parser.consume("readonly");
    return {
      type: "JsdocTypeReadonlyArray",
      element: assertArrayOrTupleResult(parser.parseIntermediateType(0 /* ALL */))
    };
  }
});

// src/parslets/ConditionalParslet.ts
var conditionalParslet = composeParslet({
  name: "conditionalParslet",
  precedence: 8 /* INFIX */,
  accept: (type) => type === "extends",
  parseInfix: (parser, left) => {
    parser.consume("extends");
    const extendsType = parser.parseType(
      13 /* KEY_OF_TYPE_OF */
    ).element;
    const trueType = parser.parseType(8 /* INFIX */);
    parser.consume(":");
    return {
      type: "JsdocTypeConditional",
      checksType: assertRootResult(left),
      extendsType,
      trueType,
      falseType: parser.parseType(8 /* INFIX */)
    };
  }
});

// src/lexer/LexerRules.ts
function makePunctuationRule(type) {
  return (text) => {
    if (text.startsWith(type)) {
      return { type, text: type };
    } else {
      return null;
    }
  };
}
function getQuoted(text) {
  let position = 0;
  let char = void 0;
  const mark = text[0];
  let escaped = false;
  if (mark !== "'" && mark !== '"') {
    return null;
  }
  while (position < text.length) {
    position++;
    char = text[position];
    if (!escaped && char === mark) {
      position++;
      break;
    }
    escaped = !escaped && char === "\\";
  }
  if (char !== mark) {
    throw new Error("Unterminated String");
  }
  return text.slice(0, position);
}
function getTemplateLiteral(text) {
  let position = 0;
  let char = void 0;
  const mark = text[0];
  let escaped = false;
  if (mark !== "`") {
    return null;
  }
  while (position < text.length) {
    position++;
    char = text[position];
    if (!escaped && char === mark) {
      position++;
      break;
    }
    escaped = !escaped && char === "\\";
  }
  if (char !== mark) {
    throw new Error("Unterminated template literal");
  }
  return text.slice(0, position);
}
function getTemplateLiteralLiteral(text) {
  let position = 0;
  let char = void 0;
  const start = text[0];
  let escaped = false;
  if (start === "`" || start === "$" && text[1] === "{") {
    return null;
  }
  while (position < text.length) {
    position++;
    char = text[position];
    if (!escaped && (char === "`" || char === "$" && text[position + 1] === "{")) {
      break;
    }
    escaped = !escaped && char === "\\";
  }
  return text.slice(0, position);
}
var identifierStartRegex = new RegExp("[$_\\p{ID_Start}]|\\\\u\\p{Hex_Digit}{4}|\\\\u\\{0*(?:\\p{Hex_Digit}{1,5}|10\\p{Hex_Digit}{4})\\}", "u");
var identifierContinueRegex = new RegExp("[$\\p{ID_Continue}\\u200C\\u200D]|\\\\u\\p{Hex_Digit}{4}|\\\\u\\{0*(?:\\p{Hex_Digit}{1,5}|10\\p{Hex_Digit}{4})\\}", "u");
var identifierContinueRegexLoose = new RegExp("[$\\-\\p{ID_Continue}\\u200C\\u200D]|\\\\u\\p{Hex_Digit}{4}|\\\\u\\{0*(?:\\p{Hex_Digit}{1,5}|10\\p{Hex_Digit}{4})\\}", "u");
function makeGetIdentifier(identifierContinueRegex2) {
  return function(text) {
    let char = text[0];
    if (!identifierStartRegex.test(char)) {
      return null;
    }
    let position = 1;
    do {
      char = text[position];
      if (!identifierContinueRegex2.test(char)) {
        break;
      }
      position++;
    } while (position < text.length);
    return text.slice(0, position);
  };
}
var numberRegex = /^(-?((\d*\.\d+|\d+)([Ee][+-]?\d+)?))/;
var looseNumberRegex = /^(NaN|-?((\d*\.\d+|\d+)([Ee][+-]?\d+)?|Infinity))/;
function getGetNumber(numberRegex2) {
  return function getNumber(text) {
    var _a, _b;
    return (_b = (_a = numberRegex2.exec(text)) == null ? void 0 : _a[0]) != null ? _b : null;
  };
}
var looseIdentifierRule = (text) => {
  const value = makeGetIdentifier(identifierContinueRegexLoose)(text);
  if (value == null) {
    return null;
  }
  return {
    type: "Identifier",
    text: value
  };
};
var identifierRule = (text) => {
  const value = makeGetIdentifier(identifierContinueRegex)(text);
  if (value == null) {
    return null;
  }
  return {
    type: "Identifier",
    text: value
  };
};
function makeKeyWordRule(type) {
  return (text) => {
    if (!text.startsWith(type)) {
      return null;
    }
    const prepends = text[type.length];
    if (prepends !== void 0 && identifierContinueRegex.test(prepends)) {
      return null;
    }
    return {
      type,
      text: type
    };
  };
}
var stringValueRule = (text) => {
  const value = getQuoted(text);
  if (value == null) {
    return null;
  }
  return {
    type: "StringValue",
    text: value
  };
};
var templateLiteralRule = (text) => {
  const value = getTemplateLiteral(text);
  if (value == null) {
    return null;
  }
  return {
    type: "TemplateLiteral",
    text: value
  };
};
var eofRule = (text) => {
  if (text.length > 0) {
    return null;
  }
  return {
    type: "EOF",
    text: ""
  };
};
var numberRule = (text) => {
  const value = getGetNumber(numberRegex)(text);
  if (value === null) {
    return null;
  }
  return {
    type: "Number",
    text: value
  };
};
var looseNumberRule = (text) => {
  const value = getGetNumber(looseNumberRegex)(text);
  if (value === null) {
    return null;
  }
  return {
    type: "Number",
    text: value
  };
};
var rules = [
  eofRule,
  makePunctuationRule("=>"),
  makePunctuationRule("("),
  makePunctuationRule(")"),
  makePunctuationRule("{"),
  makePunctuationRule("}"),
  makePunctuationRule("["),
  makePunctuationRule("]"),
  makePunctuationRule("|"),
  makePunctuationRule("&"),
  makePunctuationRule("<"),
  makePunctuationRule(">"),
  makePunctuationRule(","),
  makePunctuationRule(";"),
  makePunctuationRule("*"),
  makePunctuationRule("?"),
  makePunctuationRule("!"),
  makePunctuationRule("="),
  makePunctuationRule(":"),
  makePunctuationRule("..."),
  makePunctuationRule("."),
  makePunctuationRule("#"),
  makePunctuationRule("~"),
  makePunctuationRule("/"),
  makePunctuationRule("@"),
  makeKeyWordRule("undefined"),
  makeKeyWordRule("null"),
  makeKeyWordRule("function"),
  makeKeyWordRule("this"),
  makeKeyWordRule("new"),
  makeKeyWordRule("module"),
  makeKeyWordRule("event"),
  makeKeyWordRule("extends"),
  makeKeyWordRule("external"),
  makeKeyWordRule("infer"),
  makeKeyWordRule("typeof"),
  makeKeyWordRule("keyof"),
  makeKeyWordRule("readonly"),
  makeKeyWordRule("import"),
  makeKeyWordRule("is"),
  makeKeyWordRule("in"),
  makeKeyWordRule("asserts"),
  numberRule,
  identifierRule,
  stringValueRule,
  templateLiteralRule
];
var looseRules = rules.toSpliced(
  -4,
  2,
  looseNumberRule,
  looseIdentifierRule
);

// src/parslets/TemplateLiteralParslet.ts
var templateLiteralParslet = composeParslet({
  name: "templateLiteralParslet",
  accept: (type) => type === "TemplateLiteral",
  parsePrefix: (parser) => {
    const text = parser.lexer.current.text;
    parser.consume("TemplateLiteral");
    const literals = [];
    const interpolations = [];
    let currentText = text.slice(1, -1);
    const advanceLiteral = () => {
      var _a;
      const literal = (_a = getTemplateLiteralLiteral(currentText)) != null ? _a : "";
      literals.push(literal.replace(/\\`/g, "`"));
      currentText = currentText.slice(literal.length);
    };
    advanceLiteral();
    while (true) {
      if (currentText.startsWith("${")) {
        currentText = currentText.slice(2);
        let templateParser;
        let interpolationType;
        let snipped = currentText;
        let remnant = "";
        while (true) {
          try {
            templateParser = new Parser(
              parser.grammar,
              Lexer.create(parser.lexer.lexerRules, snipped)
            );
            interpolationType = templateParser.parseType(0 /* ALL */);
            break;
          } catch (err) {
            remnant = snipped.slice(-1) + remnant;
            snipped = snipped.slice(0, -1);
          }
        }
        interpolations.push(interpolationType);
        if (templateParser.lexer.current.text !== "}") {
          throw new Error("unterminated interpolation");
        }
        currentText = templateParser.lexer.remaining() + remnant;
      } else {
        break;
      }
      advanceLiteral();
    }
    return {
      type: "JsdocTypeTemplateLiteral",
      literals,
      interpolations
    };
  }
});

// src/grammars/typescriptGrammar.ts
var objectFieldGrammar2 = [
  functionPropertyParslet,
  readonlyPropertyParslet,
  createNameParslet({
    allowedAdditionalTokens: baseNameTokens
  }),
  nullableParslet,
  optionalParslet,
  stringValueParslet,
  numberParslet,
  createObjectFieldParslet({
    allowSquaredProperties: true,
    allowKeyTypes: false,
    allowOptional: true,
    allowReadonly: true
  }),
  objectSquaredPropertyParslet
];
var typescriptGrammar = [
  ...baseGrammar,
  createObjectParslet({
    allowKeyTypes: false,
    objectFieldGrammar: objectFieldGrammar2,
    signatureGrammar: [
      createKeyValueParslet({
        allowVariadic: true,
        allowOptional: true,
        acceptParameterList: true
      })
    ]
  }),
  readonlyArrayParslet,
  typeOfParslet,
  keyOfParslet,
  importParslet,
  stringValueParslet,
  createFunctionParslet({
    allowWithoutParenthesis: true,
    allowNoReturnType: true,
    allowNamedParameters: ["this", "new", "args"],
    allowNewAsFunctionKeyword: true
  }),
  createTupleParslet({
    allowQuestionMark: false
  }),
  createVariadicParslet({
    allowEnclosingBrackets: false,
    allowPostfix: false
  }),
  assertsParslet,
  conditionalParslet,
  createNameParslet({
    allowedAdditionalTokens: ["event", "external", "in"]
  }),
  createSpecialNamePathParslet({
    allowedTypes: ["module"],
    pathGrammar
  }),
  arrayBracketsParslet,
  arrowFunctionParslet,
  genericArrowFunctionParslet,
  createNamePathParslet({
    allowSquareBracketsOnAnyType: true,
    allowJsdocNamePaths: false,
    pathGrammar
  }),
  intersectionParslet,
  predicateParslet,
  templateLiteralParslet,
  createKeyValueParslet({
    allowVariadic: true,
    allowOptional: true
  })
];
var typescriptNameGrammar = [
  genericParslet,
  arrayBracketsParslet,
  createNameParslet({
    allowedAdditionalTokens: baseNameTokens
  })
];
var typescriptNamePathGrammar = [
  genericParslet,
  arrayBracketsParslet,
  createNameParslet({
    allowedAdditionalTokens: baseNameTokens
  }),
  createNamePathParslet({
    allowSquareBracketsOnAnyType: true,
    // Here we actually want JSDoc name paths (even though TS
    //   in JSDoc namepath positions interpret them differently
    //   than JSDoc)
    allowJsdocNamePaths: true,
    pathGrammar
  })
];
var typescriptNamePathSpecialGrammar = [
  createSpecialNamePathParslet({
    allowedTypes: ["module"],
    pathGrammar
  }),
  ...typescriptNamePathGrammar
];

// src/parse.ts
function parse(expression, mode, {
  module: module2 = true,
  strictMode = true,
  asyncFunctionBody = true,
  classContext = false,
  computedPropertyParser
} = {}) {
  let parser;
  switch (mode) {
    case "closure":
      parser = new Parser(closureGrammar, Lexer.create(looseRules, expression), void 0, {
        module: module2,
        strictMode,
        asyncFunctionBody,
        classContext
      });
      break;
    case "jsdoc":
      parser = new Parser(jsdocGrammar, Lexer.create(looseRules, expression), void 0, {
        module: module2,
        strictMode,
        asyncFunctionBody,
        classContext
      });
      break;
    case "typescript":
      parser = new Parser(
        typescriptGrammar,
        Lexer.create(rules, expression),
        void 0,
        {
          module: module2,
          strictMode,
          asyncFunctionBody,
          classContext,
          externalParsers: {
            computedPropertyParser
          }
        }
      );
      break;
  }
  const result = parser.parse();
  return assertResultIsNotReservedWord(parser, result);
}
function tryParse(expression, modes = ["typescript", "closure", "jsdoc"], {
  module: module2 = true,
  strictMode = true,
  asyncFunctionBody = true,
  classContext = false
} = {}) {
  let error;
  for (const mode of modes) {
    try {
      return parse(expression, mode, {
        module: module2,
        strictMode,
        asyncFunctionBody,
        classContext
      });
    } catch (e) {
      error = e;
    }
  }
  throw error;
}
function parseNamePath(expression, mode, {
  includeSpecial = false
} = {}) {
  switch (mode) {
    case "closure":
      return new Parser(
        includeSpecial ? closureNamePathSpecialGrammar : closureNamePathGrammar,
        Lexer.create(looseRules, expression)
      ).parse();
    case "jsdoc":
      return new Parser(
        includeSpecial ? jsdocNamePathSpecialGrammar : jsdocNamePathGrammar,
        Lexer.create(looseRules, expression)
      ).parse();
    case "typescript": {
      return new Parser(
        includeSpecial ? typescriptNamePathSpecialGrammar : typescriptNamePathGrammar,
        Lexer.create(rules, expression)
      ).parse();
    }
  }
}
function parseName(expression, mode) {
  switch (mode) {
    case "closure":
      return new Parser(closureNameGrammar, Lexer.create(looseRules, expression)).parse();
    case "jsdoc":
      return new Parser(jsdocNameGrammar, Lexer.create(looseRules, expression)).parse();
    case "typescript":
      return new Parser(
        typescriptNameGrammar,
        Lexer.create(rules, expression)
      ).parse();
  }
}

// src/transforms/transform.ts
function transform(rules2, parseResult) {
  const rule = rules2[parseResult.type];
  if (rule === void 0) {
    throw new Error(`In this set of transform rules exists no rule for type ${parseResult.type}.`);
  }
  return rule(parseResult, (aParseResult) => transform(rules2, aParseResult));
}
function notAvailableTransform(parseResult) {
  throw new Error("This transform is not available. Are you trying the correct parsing mode?");
}
function extractSpecialParams(source) {
  const result = {
    params: []
  };
  for (const param of source.parameters) {
    if (param.type === "JsdocTypeKeyValue") {
      if (param.key === "this") {
        result.this = param.right;
      } else if (param.key === "new") {
        result.new = param.right;
      } else {
        result.params.push(param);
      }
    } else {
      result.params.push(param);
    }
  }
  return result;
}

// src/transforms/stringify.ts
function applyPosition(position, target, value) {
  return position === "prefix" ? value + target : target + value;
}
function quote(value, quote2) {
  switch (quote2) {
    case "double":
      return `"${value}"`;
    case "single":
      return `'${value}'`;
    case void 0:
      return value;
  }
}
function stringifyRules({
  computedPropertyStringifier
} = {}) {
  return {
    JsdocTypeParenthesis: (result, transform2) => `(${result.element !== void 0 ? transform2(result.element) : ""})`,
    JsdocTypeKeyof: (result, transform2) => `keyof ${transform2(result.element)}`,
    JsdocTypeFunction: (result, transform2) => {
      var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m, _n, _o, _p;
      if (!result.arrow) {
        let stringified = result.constructor ? "new" : "function";
        if (!result.parenthesis) {
          return stringified;
        }
        stringified += `(${result.parameters.map(transform2).join("," + ((_b = (_a = result.meta) == null ? void 0 : _a.parameterSpacing) != null ? _b : " "))})`;
        if (result.returnType !== void 0) {
          stringified += `${(_d = (_c = result.meta) == null ? void 0 : _c.preReturnMarkerSpacing) != null ? _d : ""}:${(_f = (_e = result.meta) == null ? void 0 : _e.postReturnMarkerSpacing) != null ? _f : " "}${transform2(result.returnType)}`;
        }
        return stringified;
      } else {
        if (result.returnType === void 0) {
          throw new Error("Arrow function needs a return type.");
        }
        let stringified = `${result.typeParameters !== void 0 ? `<${result.typeParameters.map(transform2).join("," + ((_h = (_g = result.meta) == null ? void 0 : _g.typeParameterSpacing) != null ? _h : " "))}>${(_j = (_i = result.meta) == null ? void 0 : _i.postGenericSpacing) != null ? _j : ""}` : ""}(${result.parameters.map(transform2).join("," + ((_l = (_k = result.meta) == null ? void 0 : _k.parameterSpacing) != null ? _l : " "))})${(_n = (_m = result.meta) == null ? void 0 : _m.preReturnMarkerSpacing) != null ? _n : " "}=>${(_p = (_o = result.meta) == null ? void 0 : _o.postReturnMarkerSpacing) != null ? _p : " "}${transform2(result.returnType)}`;
        if (result.constructor) {
          stringified = "new " + stringified;
        }
        return stringified;
      }
    },
    JsdocTypeName: (result) => result.value,
    JsdocTypeTuple: (result, transform2) => {
      var _a, _b;
      return `[${result.elements.map(transform2).join("," + ((_b = (_a = result.meta) == null ? void 0 : _a.elementSpacing) != null ? _b : " "))}]`;
    },
    JsdocTypeVariadic: (result, transform2) => result.meta.position === void 0 ? "..." : applyPosition(result.meta.position, transform2(result.element), "..."),
    JsdocTypeNamePath: (result, transform2) => {
      const left = transform2(result.left);
      const right = transform2(result.right);
      switch (result.pathType) {
        case "inner":
          return `${left}~${right}`;
        case "instance":
          return `${left}#${right}`;
        case "property":
          return `${left}.${right}`;
        case "property-brackets":
          return `${left}[${right}]`;
      }
    },
    JsdocTypeStringValue: (result) => quote(result.value, result.meta.quote),
    JsdocTypeAny: () => "*",
    JsdocTypeGeneric: (result, transform2) => {
      var _a;
      if (result.meta.brackets === "square") {
        const element = result.elements[0];
        const transformed = transform2(element);
        if (element.type === "JsdocTypeUnion" || element.type === "JsdocTypeIntersection") {
          return `(${transformed})[]`;
        } else {
          return `${transformed}[]`;
        }
      } else {
        return `${transform2(result.left)}${result.meta.dot ? "." : ""}<${result.infer === true ? "infer " : ""}${result.elements.map(transform2).join("," + ((_a = result.meta.elementSpacing) != null ? _a : " "))}>`;
      }
    },
    JsdocTypeImport: (result, transform2) => `import(${transform2(result.element)})`,
    JsdocTypeObjectField: (result, transform2) => {
      var _a, _b, _c;
      let text = "";
      if (result.readonly) {
        text += "readonly ";
      }
      let optionalBeforeParentheses = false;
      if (typeof result.key === "string") {
        text += quote(result.key, result.meta.quote);
      } else {
        if (result.key.type === "JsdocTypeComputedMethod") {
          optionalBeforeParentheses = true;
        }
        text += transform2(result.key);
      }
      text += (_a = result.meta.postKeySpacing) != null ? _a : "";
      if (!optionalBeforeParentheses && result.optional) {
        text += "?";
        text += (_b = result.meta.postOptionalSpacing) != null ? _b : "";
      }
      if (result.right === void 0) {
        return text;
      } else {
        return text + `:${(_c = result.meta.postColonSpacing) != null ? _c : " "}${transform2(result.right)}`;
      }
    },
    JsdocTypeJsdocObjectField: (result, transform2) => `${transform2(result.left)}: ${transform2(result.right)}`,
    JsdocTypeKeyValue: (result, transform2) => {
      var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j;
      let text = result.key;
      if (result.optional) {
        text += ((_b = (_a = result.meta) == null ? void 0 : _a.postKeySpacing) != null ? _b : "") + "?" + ((_d = (_c = result.meta) == null ? void 0 : _c.postOptionalSpacing) != null ? _d : "");
      } else if (result.variadic) {
        text = "..." + ((_f = (_e = result.meta) == null ? void 0 : _e.postVariadicSpacing) != null ? _f : "") + text;
      } else if (result.right !== void 0) {
        text += (_h = (_g = result.meta) == null ? void 0 : _g.postKeySpacing) != null ? _h : "";
      }
      if (result.right === void 0) {
        return text;
      } else {
        return text + `:${(_j = (_i = result.meta) == null ? void 0 : _i.postColonSpacing) != null ? _j : " "}${transform2(result.right)}`;
      }
    },
    JsdocTypeSpecialNamePath: (result) => `${result.specialType}:${quote(result.value, result.meta.quote)}`,
    JsdocTypeNotNullable: (result, transform2) => applyPosition(result.meta.position, transform2(result.element), "!"),
    JsdocTypeNull: () => "null",
    JsdocTypeNullable: (result, transform2) => applyPosition(result.meta.position, transform2(result.element), "?"),
    JsdocTypeNumber: (result) => result.value.toString(),
    JsdocTypeObject: (result, transform2) => {
      var _a, _b, _c, _d, _e;
      const lbType = ((_a = result.meta.separator) != null ? _a : "").endsWith("linebreak");
      const lbEnding = result.meta.separator === "comma-and-linebreak" ? ",\n" : result.meta.separator === "semicolon-and-linebreak" ? ";\n" : result.meta.separator === "linebreak" ? "\n" : "";
      const separatorForSingleObjectField = (_b = result.meta.separatorForSingleObjectField) != null ? _b : false;
      const trailingPunctuation = (_c = result.meta.trailingPunctuation) != null ? _c : false;
      return `{${/* c8 ignore next -- Guard */
      (lbType && (separatorForSingleObjectField || result.elements.length > 1) ? "\n" + ((_d = result.meta.propertyIndent) != null ? _d : "") : "") + result.elements.map(transform2).join(
        result.meta.separator === "comma" ? ", " : lbType ? lbEnding + /* c8 ignore next -- Guard */
        ((_e = result.meta.propertyIndent) != null ? _e : "") : "; "
      ) + (separatorForSingleObjectField && result.elements.length === 1 ? result.meta.separator === "comma" ? "," : lbType ? lbEnding : ";" : trailingPunctuation && result.meta.separator !== void 0 ? result.meta.separator.startsWith("comma") ? "," : result.meta.separator.startsWith("semicolon") ? ";" : "" : "") + (lbType && result.elements.length > 1 ? "\n" : "")}}`;
    },
    JsdocTypeOptional: (result, transform2) => applyPosition(result.meta.position, transform2(result.element), "="),
    JsdocTypeSymbol: (result, transform2) => `${result.value}(${result.element !== void 0 ? transform2(result.element) : ""})`,
    JsdocTypeTypeof: (result, transform2) => `typeof ${transform2(result.element)}`,
    JsdocTypeUndefined: () => "undefined",
    JsdocTypeUnion: (result, transform2) => {
      var _a;
      return result.elements.map(transform2).join(
        ((_a = result.meta) == null ? void 0 : _a.spacing) === void 0 ? " | " : `${result.meta.spacing}|${result.meta.spacing}`
      );
    },
    JsdocTypeUnknown: () => "?",
    JsdocTypeIntersection: (result, transform2) => result.elements.map(transform2).join(" & "),
    JsdocTypeProperty: (result) => quote(result.value, result.meta.quote),
    JsdocTypePredicate: (result, transform2) => `${transform2(result.left)} is ${transform2(result.right)}`,
    JsdocTypeIndexSignature: (result, transform2) => `[${result.key}: ${transform2(result.right)}]`,
    JsdocTypeMappedType: (result, transform2) => `[${result.key} in ${transform2(result.right)}]`,
    JsdocTypeAsserts: (result, transform2) => `asserts ${transform2(result.left)} is ${transform2(result.right)}`,
    JsdocTypeReadonlyArray: (result, transform2) => `readonly ${transform2(result.element)}`,
    JsdocTypeAssertsPlain: (result, transform2) => `asserts ${transform2(result.element)}`,
    JsdocTypeConditional: (result, transform2) => `${transform2(result.checksType)} extends ${transform2(result.extendsType)} ? ${transform2(result.trueType)} : ${transform2(result.falseType)}`,
    JsdocTypeTypeParameter: (result, transform2) => {
      var _a, _b, _c, _d;
      return `${transform2(result.name)}${result.constraint !== void 0 ? ` extends ${transform2(result.constraint)}` : ""}${result.defaultValue !== void 0 ? `${(_b = (_a = result.meta) == null ? void 0 : _a.defaultValueSpacing) != null ? _b : " "}=${(_d = (_c = result.meta) == null ? void 0 : _c.defaultValueSpacing) != null ? _d : " "}${transform2(result.defaultValue)}` : ""}`;
    },
    JsdocTypeCallSignature: (result, transform2) => {
      var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j;
      return `${result.typeParameters !== void 0 ? `<${result.typeParameters.map(transform2).join("," + ((_b = (_a = result.meta) == null ? void 0 : _a.typeParameterSpacing) != null ? _b : " "))}>${(_d = (_c = result.meta) == null ? void 0 : _c.postGenericSpacing) != null ? _d : ""}` : ""}(${result.parameters.map(transform2).join("," + ((_f = (_e = result.meta) == null ? void 0 : _e.parameterSpacing) != null ? _f : " "))})${(_h = (_g = result.meta) == null ? void 0 : _g.preReturnMarkerSpacing) != null ? _h : ""}:${(_j = (_i = result.meta) == null ? void 0 : _i.postReturnMarkerSpacing) != null ? _j : " "}${transform2(result.returnType)}`;
    },
    JsdocTypeConstructorSignature: (result, transform2) => {
      var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l;
      return `new${(_b = (_a = result.meta) == null ? void 0 : _a.postNewSpacing) != null ? _b : " "}${result.typeParameters !== void 0 ? `<${result.typeParameters.map(transform2).join("," + ((_d = (_c = result.meta) == null ? void 0 : _c.typeParameterSpacing) != null ? _d : " "))}>${(_f = (_e = result.meta) == null ? void 0 : _e.postGenericSpacing) != null ? _f : ""}` : ""}(${result.parameters.map(transform2).join("," + ((_h = (_g = result.meta) == null ? void 0 : _g.parameterSpacing) != null ? _h : " "))})${(_j = (_i = result.meta) == null ? void 0 : _i.preReturnMarkerSpacing) != null ? _j : ""}:${(_l = (_k = result.meta) == null ? void 0 : _k.postReturnMarkerSpacing) != null ? _l : " "}${transform2(result.returnType)}`;
    },
    JsdocTypeMethodSignature: (result, transform2) => {
      var _a, _b, _c, _d, _e, _f;
      const quote2 = result.meta.quote === "double" ? '"' : result.meta.quote === "single" ? "'" : "";
      return `${quote2}${result.name}${quote2}${(_a = result.meta.postMethodNameSpacing) != null ? _a : ""}${result.typeParameters !== void 0 ? `<${result.typeParameters.map(transform2).join("," + ((_b = result.meta.typeParameterSpacing) != null ? _b : " "))}>${(_c = result.meta.postGenericSpacing) != null ? _c : ""}` : ""}(${result.parameters.map(transform2).join("," + ((_d = result.meta.parameterSpacing) != null ? _d : " "))})${(_e = result.meta.preReturnMarkerSpacing) != null ? _e : ""}:${(_f = result.meta.postReturnMarkerSpacing) != null ? _f : " "}${transform2(result.returnType)}`;
    },
    JsdocTypeIndexedAccessIndex: (result, transform2) => transform2(result.right),
    JsdocTypeTemplateLiteral: (result, transform2) => `\`${// starts with a literal (even empty string) then alternating
    //    interpolations and literals and also ending in literal
    //    (even empty string)
    result.literals.slice(0, -1).map(
      (literal, idx) => literal.replace(/`/gu, "\\`") + "${" + transform2(result.interpolations[idx]) + "}"
    ).join("") + result.literals.slice(-1)[0].replace(/`/gu, "\\`")}\``,
    JsdocTypeComputedProperty: (result, transform2) => {
      if (result.value.type.startsWith("JsdocType")) {
        return `[${transform2(result.value)}]`;
      } else {
        if (computedPropertyStringifier === void 0) {
          throw new Error("Must have a computed property stringifier");
        }
        return `[${computedPropertyStringifier(result.value).replace(/;$/u, "")}]`;
      }
    },
    JsdocTypeComputedMethod: (result, transform2) => {
      var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m, _n, _o, _p;
      if (result.value.type.startsWith("JsdocType")) {
        return `[${transform2(result.value)}]${result.optional ? "?" : ""}${result.typeParameters !== void 0 ? `<${result.typeParameters.map(transform2).join("," + ((_b = (_a = result.meta) == null ? void 0 : _a.typeParameterSpacing) != null ? _b : " "))}>${(_d = (_c = result.meta) == null ? void 0 : _c.postGenericSpacing) != null ? _d : ""}` : ""}(${result.parameters.map(transform2).join("," + ((_f = (_e = result.meta) == null ? void 0 : _e.parameterSpacing) != null ? _f : " "))})${(_h = (_g = result.meta) == null ? void 0 : _g.preReturnMarkerSpacing) != null ? _h : ""}:${(_j = (_i = result.meta) == null ? void 0 : _i.postReturnMarkerSpacing) != null ? _j : " "}${transform2(result.returnType)}`;
      } else {
        if (computedPropertyStringifier === void 0) {
          throw new Error("Must have a computed property stringifier");
        }
        return `[${computedPropertyStringifier(result.value).replace(/;$/u, "")}](${result.parameters.map(transform2).join("," + ((_l = (_k = result.meta) == null ? void 0 : _k.parameterSpacing) != null ? _l : " "))})${(_n = (_m = result.meta) == null ? void 0 : _m.preReturnMarkerSpacing) != null ? _n : ""}:${(_p = (_o = result.meta) == null ? void 0 : _o.postReturnMarkerSpacing) != null ? _p : " "}${transform2(result.returnType)}`;
      }
    }
  };
}
var storedStringifyRules = stringifyRules();
function stringify(result, stringificationRules = storedStringifyRules) {
  if (typeof stringificationRules === "function") {
    stringificationRules = stringifyRules({
      computedPropertyStringifier: stringificationRules
    });
  }
  return transform(stringificationRules, result);
}

// src/transforms/catharsisTransform.ts
var reservedWords2 = [
  "null",
  "true",
  "false",
  "break",
  "case",
  "catch",
  "class",
  "const",
  "continue",
  "debugger",
  "default",
  "delete",
  "do",
  "else",
  "export",
  "extends",
  "finally",
  "for",
  "function",
  "if",
  "import",
  "in",
  "instanceof",
  "new",
  "return",
  "super",
  "switch",
  "this",
  "throw",
  "try",
  "typeof",
  "var",
  "void",
  "while",
  "with",
  "yield"
];
function makeName(value) {
  const result = {
    type: "NameExpression",
    name: value
  };
  if (reservedWords2.includes(value)) {
    result.reservedWord = true;
  }
  return result;
}
var catharsisTransformRules = {
  JsdocTypeOptional: (result, transform2) => {
    const transformed = transform2(result.element);
    transformed.optional = true;
    return transformed;
  },
  JsdocTypeNullable: (result, transform2) => {
    const transformed = transform2(result.element);
    transformed.nullable = true;
    return transformed;
  },
  JsdocTypeNotNullable: (result, transform2) => {
    const transformed = transform2(result.element);
    transformed.nullable = false;
    return transformed;
  },
  JsdocTypeVariadic: (result, transform2) => {
    if (result.element === void 0) {
      throw new Error("dots without value are not allowed in catharsis mode");
    }
    const transformed = transform2(result.element);
    transformed.repeatable = true;
    return transformed;
  },
  JsdocTypeAny: () => ({
    type: "AllLiteral"
  }),
  JsdocTypeNull: () => ({
    type: "NullLiteral"
  }),
  JsdocTypeStringValue: (result) => makeName(quote(result.value, result.meta.quote)),
  JsdocTypeUndefined: () => ({
    type: "UndefinedLiteral"
  }),
  JsdocTypeUnknown: () => ({
    type: "UnknownLiteral"
  }),
  JsdocTypeFunction: (result, transform2) => {
    const params = extractSpecialParams(result);
    const transformed = {
      type: "FunctionType",
      params: params.params.map(transform2)
    };
    if (params.this !== void 0) {
      transformed.this = transform2(params.this);
    }
    if (params.new !== void 0) {
      transformed.new = transform2(params.new);
    }
    if (result.returnType !== void 0) {
      transformed.result = transform2(result.returnType);
    }
    return transformed;
  },
  JsdocTypeGeneric: (result, transform2) => ({
    type: "TypeApplication",
    applications: result.elements.map((o) => transform2(o)),
    expression: transform2(result.left)
  }),
  JsdocTypeSpecialNamePath: (result) => makeName(result.specialType + ":" + quote(result.value, result.meta.quote)),
  JsdocTypeName: (result) => {
    if (result.value !== "function") {
      return makeName(result.value);
    } else {
      return {
        type: "FunctionType",
        params: []
      };
    }
  },
  JsdocTypeNumber: (result) => makeName(result.value.toString()),
  JsdocTypeObject: (result, transform2) => {
    const transformed = {
      type: "RecordType",
      fields: []
    };
    for (const field of result.elements) {
      if (field.type !== "JsdocTypeObjectField" && field.type !== "JsdocTypeJsdocObjectField") {
        transformed.fields.push({
          type: "FieldType",
          key: transform2(field),
          value: void 0
        });
      } else {
        transformed.fields.push(transform2(field));
      }
    }
    return transformed;
  },
  JsdocTypeObjectField: (result, transform2) => {
    if (typeof result.key !== "string") {
      throw new Error("Index signatures and mapped types are not supported");
    }
    return {
      type: "FieldType",
      key: makeName(quote(result.key, result.meta.quote)),
      value: result.right === void 0 ? void 0 : transform2(result.right)
    };
  },
  JsdocTypeJsdocObjectField: (result, transform2) => ({
    type: "FieldType",
    key: transform2(result.left),
    value: transform2(result.right)
  }),
  JsdocTypeUnion: (result, transform2) => ({
    type: "TypeUnion",
    elements: result.elements.map((e) => transform2(e))
  }),
  JsdocTypeKeyValue: (result, transform2) => ({
    type: "FieldType",
    key: makeName(result.key),
    value: result.right === void 0 ? void 0 : transform2(result.right)
  }),
  JsdocTypeNamePath: (result, transform2) => {
    const leftResult = transform2(result.left);
    let rightValue;
    if (result.right.type === "JsdocTypeIndexedAccessIndex") {
      throw new TypeError("JsdocTypeIndexedAccessIndex is not supported in catharsis");
    }
    if (result.right.type === "JsdocTypeSpecialNamePath") {
      rightValue = transform2(result.right).name;
    } else {
      rightValue = quote(result.right.value, result.right.meta.quote);
    }
    const joiner = result.pathType === "inner" ? "~" : result.pathType === "instance" ? "#" : ".";
    return makeName(`${leftResult.name}${joiner}${rightValue}`);
  },
  JsdocTypeSymbol: (result) => {
    let value = "";
    let element = result.element;
    let trailingDots = false;
    if ((element == null ? void 0 : element.type) === "JsdocTypeVariadic") {
      if (element.meta.position === "prefix") {
        value = "...";
      } else {
        trailingDots = true;
      }
      element = element.element;
    }
    if ((element == null ? void 0 : element.type) === "JsdocTypeName") {
      value += element.value;
    } else if ((element == null ? void 0 : element.type) === "JsdocTypeNumber") {
      value += element.value.toString();
    }
    if (trailingDots) {
      value += "...";
    }
    return makeName(`${result.value}(${value})`);
  },
  JsdocTypeParenthesis: (result, transform2) => transform2(assertRootResult(result.element)),
  JsdocTypeMappedType: notAvailableTransform,
  JsdocTypeIndexSignature: notAvailableTransform,
  JsdocTypeImport: notAvailableTransform,
  JsdocTypeKeyof: notAvailableTransform,
  JsdocTypeTuple: notAvailableTransform,
  JsdocTypeTypeof: notAvailableTransform,
  JsdocTypeIntersection: notAvailableTransform,
  JsdocTypeProperty: notAvailableTransform,
  JsdocTypePredicate: notAvailableTransform,
  JsdocTypeAsserts: notAvailableTransform,
  JsdocTypeReadonlyArray: notAvailableTransform,
  JsdocTypeAssertsPlain: notAvailableTransform,
  JsdocTypeConditional: notAvailableTransform,
  JsdocTypeTypeParameter: notAvailableTransform,
  JsdocTypeCallSignature: notAvailableTransform,
  JsdocTypeConstructorSignature: notAvailableTransform,
  JsdocTypeMethodSignature: notAvailableTransform,
  JsdocTypeIndexedAccessIndex: notAvailableTransform,
  JsdocTypeTemplateLiteral: notAvailableTransform,
  JsdocTypeComputedProperty: notAvailableTransform,
  JsdocTypeComputedMethod: notAvailableTransform
};
function catharsisTransform(result) {
  return transform(catharsisTransformRules, result);
}

// src/transforms/jtpTransform.ts
function getQuoteStyle(quote2) {
  switch (quote2) {
    case void 0:
      return "none";
    case "single":
      return "single";
    case "double":
      return "double";
  }
}
function getMemberType(type) {
  switch (type) {
    case "inner":
      return "INNER_MEMBER";
    case "instance":
      return "INSTANCE_MEMBER";
    case "property":
      return "MEMBER";
    case "property-brackets":
      return "MEMBER";
  }
}
function nestResults(type, results) {
  if (results.length === 2) {
    return {
      type,
      left: results[0],
      right: results[1]
    };
  } else {
    return {
      type,
      left: results[0],
      right: nestResults(type, results.slice(1))
    };
  }
}
var jtpRules = {
  JsdocTypeOptional: (result, transform2) => ({
    type: "OPTIONAL",
    value: transform2(result.element),
    meta: {
      syntax: result.meta.position === "prefix" ? "PREFIX_EQUAL_SIGN" : "SUFFIX_EQUALS_SIGN"
    }
  }),
  JsdocTypeNullable: (result, transform2) => ({
    type: "NULLABLE",
    value: transform2(result.element),
    meta: {
      syntax: result.meta.position === "prefix" ? "PREFIX_QUESTION_MARK" : "SUFFIX_QUESTION_MARK"
    }
  }),
  JsdocTypeNotNullable: (result, transform2) => ({
    type: "NOT_NULLABLE",
    value: transform2(result.element),
    meta: {
      syntax: result.meta.position === "prefix" ? "PREFIX_BANG" : "SUFFIX_BANG"
    }
  }),
  JsdocTypeVariadic: (result, transform2) => {
    const transformed = {
      type: "VARIADIC",
      meta: {
        syntax: result.meta.position === "prefix" ? "PREFIX_DOTS" : result.meta.position === "suffix" ? "SUFFIX_DOTS" : "ONLY_DOTS"
      }
    };
    if (result.element !== void 0) {
      transformed.value = transform2(result.element);
    }
    return transformed;
  },
  JsdocTypeName: (result) => ({
    type: "NAME",
    name: result.value
  }),
  JsdocTypeTypeof: (result, transform2) => ({
    type: "TYPE_QUERY",
    name: transform2(result.element)
  }),
  JsdocTypeTuple: (result, transform2) => ({
    type: "TUPLE",
    entries: result.elements.map(transform2)
  }),
  JsdocTypeKeyof: (result, transform2) => ({
    type: "KEY_QUERY",
    value: transform2(result.element)
  }),
  JsdocTypeImport: (result) => ({
    type: "IMPORT",
    path: {
      type: "STRING_VALUE",
      quoteStyle: getQuoteStyle(result.element.meta.quote),
      string: result.element.value
    }
  }),
  JsdocTypeUndefined: () => ({
    type: "NAME",
    name: "undefined"
  }),
  JsdocTypeAny: () => ({
    type: "ANY"
  }),
  JsdocTypeFunction: (result, transform2) => {
    const specialParams = extractSpecialParams(result);
    const transformed = {
      type: result.arrow ? "ARROW" : "FUNCTION",
      params: specialParams.params.map((param) => {
        if (param.type === "JsdocTypeKeyValue") {
          if (param.right === void 0) {
            throw new Error("Function parameter without ':' is not expected to be 'KEY_VALUE'");
          }
          return {
            type: "NAMED_PARAMETER",
            name: param.key,
            typeName: transform2(param.right)
          };
        } else {
          return transform2(param);
        }
      }),
      new: null,
      returns: null
    };
    if (specialParams.this !== void 0) {
      transformed.this = transform2(specialParams.this);
    } else if (!result.arrow) {
      transformed.this = null;
    }
    if (specialParams.new !== void 0) {
      transformed.new = transform2(specialParams.new);
    }
    if (result.returnType !== void 0) {
      transformed.returns = transform2(result.returnType);
    }
    return transformed;
  },
  JsdocTypeGeneric: (result, transform2) => {
    const transformed = {
      type: "GENERIC",
      subject: transform2(result.left),
      objects: result.elements.map(transform2),
      meta: {
        syntax: result.meta.brackets === "square" ? "SQUARE_BRACKET" : result.meta.dot ? "ANGLE_BRACKET_WITH_DOT" : "ANGLE_BRACKET"
      }
    };
    if (result.meta.brackets === "square" && result.elements[0].type === "JsdocTypeFunction" && !result.elements[0].parenthesis) {
      transformed.objects[0] = {
        type: "NAME",
        name: "function"
      };
    }
    return transformed;
  },
  JsdocTypeObjectField: (result, transform2) => {
    if (typeof result.key !== "string") {
      throw new Error("Index signatures and mapped types are not supported");
    }
    if (result.right === void 0) {
      return {
        type: "RECORD_ENTRY",
        key: result.key,
        quoteStyle: getQuoteStyle(result.meta.quote),
        value: null,
        readonly: false
      };
    }
    let right = transform2(result.right);
    if (result.optional) {
      right = {
        type: "OPTIONAL",
        value: right,
        meta: {
          syntax: "SUFFIX_KEY_QUESTION_MARK"
        }
      };
    }
    return {
      type: "RECORD_ENTRY",
      key: result.key,
      quoteStyle: getQuoteStyle(result.meta.quote),
      value: right,
      readonly: false
    };
  },
  JsdocTypeJsdocObjectField: () => {
    throw new Error("Keys may not be typed in jsdoctypeparser.");
  },
  JsdocTypeKeyValue: (result, transform2) => {
    if (result.right === void 0) {
      return {
        type: "RECORD_ENTRY",
        key: result.key,
        quoteStyle: "none",
        value: null,
        readonly: false
      };
    }
    let right = transform2(result.right);
    if (result.optional) {
      right = {
        type: "OPTIONAL",
        value: right,
        meta: {
          syntax: "SUFFIX_KEY_QUESTION_MARK"
        }
      };
    }
    return {
      type: "RECORD_ENTRY",
      key: result.key,
      quoteStyle: "none",
      value: right,
      readonly: false
    };
  },
  JsdocTypeObject: (result, transform2) => {
    const entries = [];
    for (const field of result.elements) {
      if (field.type === "JsdocTypeObjectField" || field.type === "JsdocTypeJsdocObjectField") {
        entries.push(transform2(field));
      }
    }
    return {
      type: "RECORD",
      entries
    };
  },
  JsdocTypeSpecialNamePath: (result) => {
    if (result.specialType !== "module") {
      throw new Error(`jsdoctypeparser does not support type ${result.specialType} at this point.`);
    }
    return {
      type: "MODULE",
      value: {
        type: "FILE_PATH",
        quoteStyle: getQuoteStyle(result.meta.quote),
        path: result.value
      }
    };
  },
  JsdocTypeNamePath: (result, transform2) => {
    let hasEventPrefix = false;
    let name;
    let quoteStyle;
    if (result.right.type === "JsdocTypeIndexedAccessIndex") {
      throw new TypeError("JsdocTypeIndexedAccessIndex not allowed in jtp");
    }
    if (result.right.type === "JsdocTypeSpecialNamePath" && result.right.specialType === "event") {
      hasEventPrefix = true;
      name = result.right.value;
      quoteStyle = getQuoteStyle(result.right.meta.quote);
    } else {
      name = result.right.value;
      quoteStyle = getQuoteStyle(result.right.meta.quote);
    }
    const transformed = {
      type: getMemberType(result.pathType),
      owner: transform2(result.left),
      name,
      quoteStyle,
      hasEventPrefix
    };
    if (transformed.owner.type === "MODULE") {
      const tModule = transformed.owner;
      transformed.owner = transformed.owner.value;
      tModule.value = transformed;
      return tModule;
    } else {
      return transformed;
    }
  },
  JsdocTypeUnion: (result, transform2) => nestResults("UNION", result.elements.map(transform2)),
  JsdocTypeParenthesis: (result, transform2) => ({
    type: "PARENTHESIS",
    value: transform2(assertRootResult(result.element))
  }),
  JsdocTypeNull: () => ({
    type: "NAME",
    name: "null"
  }),
  JsdocTypeUnknown: () => ({
    type: "UNKNOWN"
  }),
  JsdocTypeStringValue: (result) => ({
    type: "STRING_VALUE",
    quoteStyle: getQuoteStyle(result.meta.quote),
    string: result.value
  }),
  JsdocTypeIntersection: (result, transform2) => nestResults("INTERSECTION", result.elements.map(transform2)),
  JsdocTypeNumber: (result) => ({
    type: "NUMBER_VALUE",
    number: result.value.toString()
  }),
  JsdocTypeSymbol: notAvailableTransform,
  JsdocTypeProperty: notAvailableTransform,
  JsdocTypePredicate: notAvailableTransform,
  JsdocTypeMappedType: notAvailableTransform,
  JsdocTypeIndexSignature: notAvailableTransform,
  JsdocTypeAsserts: notAvailableTransform,
  JsdocTypeReadonlyArray: notAvailableTransform,
  JsdocTypeAssertsPlain: notAvailableTransform,
  JsdocTypeConditional: notAvailableTransform,
  JsdocTypeTypeParameter: notAvailableTransform,
  JsdocTypeCallSignature: notAvailableTransform,
  JsdocTypeConstructorSignature: notAvailableTransform,
  JsdocTypeMethodSignature: notAvailableTransform,
  JsdocTypeIndexedAccessIndex: notAvailableTransform,
  JsdocTypeTemplateLiteral: notAvailableTransform,
  JsdocTypeComputedProperty: notAvailableTransform,
  JsdocTypeComputedMethod: notAvailableTransform
};
function jtpTransform(result) {
  return transform(jtpRules, result);
}

// src/transforms/identityTransformRules.ts
function identityTransformRules() {
  return {
    JsdocTypeIntersection: (result, transform2) => ({
      type: "JsdocTypeIntersection",
      elements: result.elements.map(transform2)
    }),
    JsdocTypeGeneric: (result, transform2) => ({
      type: "JsdocTypeGeneric",
      left: transform2(result.left),
      elements: result.elements.map(transform2),
      meta: {
        dot: result.meta.dot,
        brackets: result.meta.brackets
      }
    }),
    JsdocTypeNullable: (result) => result,
    JsdocTypeUnion: (result, transform2) => ({
      type: "JsdocTypeUnion",
      elements: result.elements.map(transform2)
    }),
    JsdocTypeUnknown: (result) => result,
    JsdocTypeUndefined: (result) => result,
    JsdocTypeTypeof: (result, transform2) => ({
      type: "JsdocTypeTypeof",
      element: transform2(result.element)
    }),
    JsdocTypeSymbol: (result, transform2) => {
      const transformed = {
        type: "JsdocTypeSymbol",
        value: result.value
      };
      if (result.element !== void 0) {
        transformed.element = transform2(result.element);
      }
      return transformed;
    },
    JsdocTypeOptional: (result, transform2) => ({
      type: "JsdocTypeOptional",
      element: transform2(result.element),
      meta: {
        position: result.meta.position
      }
    }),
    JsdocTypeObject: (result, transform2) => ({
      type: "JsdocTypeObject",
      meta: {
        separator: "comma"
      },
      elements: result.elements.map(transform2)
    }),
    JsdocTypeNumber: (result) => result,
    JsdocTypeNull: (result) => result,
    JsdocTypeNotNullable: (result, transform2) => ({
      type: "JsdocTypeNotNullable",
      element: transform2(result.element),
      meta: {
        position: result.meta.position
      }
    }),
    JsdocTypeSpecialNamePath: (result) => result,
    JsdocTypeObjectField: (result, transform2) => ({
      type: "JsdocTypeObjectField",
      key: result.key,
      right: result.right === void 0 ? void 0 : transform2(result.right),
      optional: result.optional,
      readonly: result.readonly,
      meta: result.meta
    }),
    JsdocTypeJsdocObjectField: (result, transform2) => ({
      type: "JsdocTypeJsdocObjectField",
      left: transform2(result.left),
      right: transform2(result.right)
    }),
    JsdocTypeKeyValue: (result, transform2) => ({
      type: "JsdocTypeKeyValue",
      key: result.key,
      right: result.right === void 0 ? void 0 : transform2(result.right),
      optional: result.optional,
      variadic: result.variadic
    }),
    JsdocTypeImport: (result, transform2) => ({
      type: "JsdocTypeImport",
      element: transform2(result.element)
    }),
    JsdocTypeAny: (result) => result,
    JsdocTypeStringValue: (result) => result,
    JsdocTypeNamePath: (result) => result,
    JsdocTypeVariadic: (result, transform2) => {
      const transformed = {
        type: "JsdocTypeVariadic",
        meta: {
          position: result.meta.position,
          squareBrackets: result.meta.squareBrackets
        }
      };
      if (result.element !== void 0) {
        transformed.element = transform2(result.element);
      }
      return transformed;
    },
    JsdocTypeTuple: (result, transform2) => ({
      type: "JsdocTypeTuple",
      elements: result.elements.map(transform2)
    }),
    JsdocTypeName: (result) => result,
    JsdocTypeFunction: (result, transform2) => {
      const transformed = {
        type: "JsdocTypeFunction",
        arrow: result.arrow,
        parameters: result.parameters.map(transform2),
        constructor: result.constructor,
        parenthesis: result.parenthesis
      };
      if (result.returnType !== void 0) {
        transformed.returnType = transform2(result.returnType);
      }
      return transformed;
    },
    JsdocTypeKeyof: (result, transform2) => ({
      type: "JsdocTypeKeyof",
      element: transform2(result.element)
    }),
    JsdocTypeParenthesis: (result, transform2) => ({
      type: "JsdocTypeParenthesis",
      element: transform2(result.element)
    }),
    JsdocTypeProperty: (result) => result,
    JsdocTypePredicate: (result, transform2) => ({
      type: "JsdocTypePredicate",
      left: transform2(result.left),
      right: transform2(result.right)
    }),
    JsdocTypeIndexSignature: (result, transform2) => ({
      type: "JsdocTypeIndexSignature",
      key: result.key,
      right: transform2(result.right)
    }),
    JsdocTypeMappedType: (result, transform2) => ({
      type: "JsdocTypeMappedType",
      key: result.key,
      right: transform2(result.right)
    }),
    JsdocTypeAsserts: (result, transform2) => ({
      type: "JsdocTypeAsserts",
      left: transform2(result.left),
      right: transform2(result.right)
    }),
    JsdocTypeReadonlyArray: (result, transform2) => ({
      type: "JsdocTypeReadonlyArray",
      element: transform2(result.element)
    }),
    JsdocTypeAssertsPlain: (result, transform2) => ({
      type: "JsdocTypeAssertsPlain",
      element: transform2(result.element)
    }),
    JsdocTypeConditional: (result, transform2) => ({
      type: "JsdocTypeConditional",
      checksType: transform2(result.checksType),
      extendsType: transform2(result.extendsType),
      trueType: transform2(result.trueType),
      falseType: transform2(result.falseType)
    }),
    JsdocTypeTypeParameter: (result, transform2) => ({
      type: "JsdocTypeTypeParameter",
      name: transform2(result.name),
      constraint: result.constraint !== void 0 ? transform2(result.constraint) : void 0,
      defaultValue: result.defaultValue !== void 0 ? transform2(result.defaultValue) : void 0
    }),
    JsdocTypeCallSignature: (result, transform2) => ({
      type: "JsdocTypeCallSignature",
      parameters: result.parameters.map(transform2),
      returnType: transform2(result.returnType)
    }),
    JsdocTypeConstructorSignature: (result, transform2) => ({
      type: "JsdocTypeConstructorSignature",
      parameters: result.parameters.map(transform2),
      returnType: transform2(result.returnType)
    }),
    JsdocTypeMethodSignature: (result, transform2) => ({
      type: "JsdocTypeMethodSignature",
      name: result.name,
      parameters: result.parameters.map(transform2),
      returnType: transform2(result.returnType),
      meta: result.meta
    }),
    JsdocTypeIndexedAccessIndex: (result, transform2) => ({
      type: "JsdocTypeIndexedAccessIndex",
      right: transform2(result.right)
    }),
    JsdocTypeTemplateLiteral: (result, transform2) => ({
      type: "JsdocTypeTemplateLiteral",
      literals: result.literals,
      interpolations: result.interpolations.map(transform2)
    }),
    JsdocTypeComputedProperty: (result, transform2) => {
      if (result.value.type.startsWith("JsdocType")) {
        return {
          type: "JsdocTypeComputedProperty",
          value: transform2(result.value)
        };
      } else {
        return {
          type: "JsdocTypeComputedProperty",
          value: structuredClone(result.value)
        };
      }
    },
    JsdocTypeComputedMethod: (result, transform2) => {
      if (result.value.type.startsWith("JsdocType")) {
        return {
          type: "JsdocTypeComputedMethod",
          value: transform2(result.value),
          optional: result.optional,
          parameters: result.parameters.map(transform2),
          returnType: transform2(result.returnType)
        };
      } else {
        return {
          type: "JsdocTypeComputedMethod",
          value: structuredClone(result.value),
          optional: result.optional,
          parameters: result.parameters.map(transform2),
          returnType: transform2(result.returnType)
        };
      }
    }
  };
}

// src/visitorKeys.ts
var visitorKeys = {
  JsdocTypeAny: [],
  JsdocTypeFunction: ["typeParameters", "parameters", "returnType"],
  JsdocTypeGeneric: ["left", "elements"],
  JsdocTypeImport: ["element"],
  JsdocTypeIndexSignature: ["right"],
  JsdocTypeIntersection: ["elements"],
  JsdocTypeKeyof: ["element"],
  JsdocTypeKeyValue: ["right"],
  JsdocTypeMappedType: ["right"],
  JsdocTypeName: [],
  JsdocTypeNamePath: ["left", "right"],
  JsdocTypeNotNullable: ["element"],
  JsdocTypeNull: [],
  JsdocTypeNullable: ["element"],
  JsdocTypeNumber: [],
  JsdocTypeObject: ["elements"],
  JsdocTypeObjectField: ["key", "right"],
  JsdocTypeJsdocObjectField: ["left", "right"],
  JsdocTypeOptional: ["element"],
  JsdocTypeParenthesis: ["element"],
  JsdocTypeSpecialNamePath: [],
  JsdocTypeStringValue: [],
  JsdocTypeSymbol: ["element"],
  JsdocTypeTuple: ["elements"],
  JsdocTypeTypeof: ["element"],
  JsdocTypeUndefined: [],
  JsdocTypeUnion: ["elements"],
  JsdocTypeUnknown: [],
  JsdocTypeVariadic: ["element"],
  JsdocTypeProperty: [],
  JsdocTypePredicate: ["left", "right"],
  JsdocTypeAsserts: ["left", "right"],
  JsdocTypeReadonlyArray: ["element"],
  JsdocTypeAssertsPlain: ["element"],
  JsdocTypeConditional: ["checksType", "extendsType", "trueType", "falseType"],
  JsdocTypeTypeParameter: ["name", "constraint", "defaultValue"],
  JsdocTypeCallSignature: ["typeParameters", "parameters", "returnType"],
  JsdocTypeConstructorSignature: ["typeParameters", "parameters", "returnType"],
  JsdocTypeMethodSignature: ["typeParameters", "parameters", "returnType"],
  JsdocTypeIndexedAccessIndex: ["right"],
  JsdocTypeTemplateLiteral: ["interpolations"],
  JsdocTypeComputedProperty: ["value"],
  JsdocTypeComputedMethod: ["value", "typeParameters", "parameters", "returnType"]
};

// src/traverse.ts
function _traverse(node, parentNode, property, index, onEnter, onLeave) {
  onEnter == null ? void 0 : onEnter(node, parentNode, property, index);
  const keysToVisit = visitorKeys[node.type];
  for (const key of keysToVisit) {
    const value = node[key];
    if (value !== void 0) {
      if (Array.isArray(value)) {
        for (const [index2, element] of value.entries()) {
          _traverse(element, node, key, index2, onEnter, onLeave);
        }
      } else if (value !== null && typeof value === "object" && "type" in value) {
        _traverse(value, node, key, void 0, onEnter, onLeave);
      }
    }
  }
  onLeave == null ? void 0 : onLeave(node, parentNode, property, index);
}
function traverse(node, onEnter, onLeave) {
  _traverse(node, void 0, void 0, void 0, onEnter, onLeave);
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  catharsisTransform,
  identityTransformRules,
  jtpTransform,
  parse,
  parseName,
  parseNamePath,
  stringify,
  stringifyRules,
  transform,
  traverse,
  tryParse,
  visitorKeys
});
//# sourceMappingURL=index.cjs.map
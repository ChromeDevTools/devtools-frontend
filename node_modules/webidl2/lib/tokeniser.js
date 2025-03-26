import { syntaxError } from "./error.js";
import { unescape } from "./productions/helpers.js";

// These regular expressions use the sticky flag so they will only match at
// the current location (ie. the offset of lastIndex).
const tokenRe = {
  // This expression uses a lookahead assertion to catch false matches
  // against integers early.
  decimal:
    /-?(?=[0-9]*\.|[0-9]+[eE])(([0-9]+\.[0-9]*|[0-9]*\.[0-9]+)([Ee][-+]?[0-9]+)?|[0-9]+[Ee][-+]?[0-9]+)/y,
  integer: /-?(0([Xx][0-9A-Fa-f]+|[0-7]*)|[1-9][0-9]*)/y,
  identifier: /[_-]?[A-Za-z][0-9A-Z_a-z-]*/y,
  string: /"[^"]*"/y,
  whitespace: /[\t\n\r ]+/y,
  comment: /\/\/.*|\/\*[\s\S]*?\*\//y,
  other: /[^\t\n\r 0-9A-Za-z]/y,
};

export const typeNameKeywords = [
  "ArrayBuffer",
  "SharedArrayBuffer",
  "DataView",
  "Int8Array",
  "Int16Array",
  "Int32Array",
  "Uint8Array",
  "Uint16Array",
  "Uint32Array",
  "Uint8ClampedArray",
  "BigInt64Array",
  "BigUint64Array",
  "Float32Array",
  "Float64Array",
  "any",
  "object",
  "symbol",
];

export const stringTypes = ["ByteString", "DOMString", "USVString"];

export const argumentNameKeywords = [
  "async",
  "attribute",
  "callback",
  "const",
  "constructor",
  "deleter",
  "dictionary",
  "enum",
  "getter",
  "includes",
  "inherit",
  "interface",
  "iterable",
  "maplike",
  "namespace",
  "partial",
  "required",
  "setlike",
  "setter",
  "static",
  "stringifier",
  "typedef",
  "unrestricted",
];

const nonRegexTerminals = [
  "-Infinity",
  "FrozenArray",
  "Infinity",
  "NaN",
  "ObservableArray",
  "Promise",
  "bigint",
  "boolean",
  "byte",
  "double",
  "false",
  "float",
  "long",
  "mixin",
  "null",
  "octet",
  "optional",
  "or",
  "readonly",
  "record",
  "sequence",
  "short",
  "true",
  "undefined",
  "unsigned",
  "void",
].concat(argumentNameKeywords, stringTypes, typeNameKeywords);

const punctuations = [
  "(",
  ")",
  ",",
  "...",
  ":",
  ";",
  "<",
  "=",
  ">",
  "?",
  "*",
  "[",
  "]",
  "{",
  "}",
];

const reserved = [
  // "constructor" is now a keyword
  "_constructor",
  "toString",
  "_toString",
];

/**
 * @typedef {ArrayItemType<ReturnType<typeof tokenise>>} Token
 * @param {string} str
 */
function tokenise(str) {
  const tokens = [];
  let lastCharIndex = 0;
  let trivia = "";
  let line = 1;
  let index = 0;
  while (lastCharIndex < str.length) {
    const nextChar = str.charAt(lastCharIndex);
    let result = -1;

    if (/[\t\n\r ]/.test(nextChar)) {
      result = attemptTokenMatch("whitespace", { noFlushTrivia: true });
    } else if (nextChar === "/") {
      result = attemptTokenMatch("comment", { noFlushTrivia: true });
    }

    if (result !== -1) {
      const currentTrivia = tokens.pop().value;
      line += (currentTrivia.match(/\n/g) || []).length;
      trivia += currentTrivia;
      index -= 1;
    } else if (/[-0-9.A-Z_a-z]/.test(nextChar)) {
      result = attemptTokenMatch("decimal");
      if (result === -1) {
        result = attemptTokenMatch("integer");
      }
      if (result === -1) {
        result = attemptTokenMatch("identifier");
        const lastIndex = tokens.length - 1;
        const token = tokens[lastIndex];
        if (result !== -1) {
          if (reserved.includes(token.value)) {
            const message = `${unescape(
              token.value
            )} is a reserved identifier and must not be used.`;
            throw new WebIDLParseError(
              syntaxError(tokens, lastIndex, null, message)
            );
          } else if (nonRegexTerminals.includes(token.value)) {
            token.type = "inline";
          }
        }
      }
    } else if (nextChar === '"') {
      result = attemptTokenMatch("string");
    }

    for (const punctuation of punctuations) {
      if (str.startsWith(punctuation, lastCharIndex)) {
        tokens.push({
          type: "inline",
          value: punctuation,
          trivia,
          line,
          index,
        });
        trivia = "";
        lastCharIndex += punctuation.length;
        result = lastCharIndex;
        break;
      }
    }

    // other as the last try
    if (result === -1) {
      result = attemptTokenMatch("other");
    }
    if (result === -1) {
      throw new Error("Token stream not progressing");
    }
    lastCharIndex = result;
    index += 1;
  }

  // remaining trivia as eof
  tokens.push({
    type: "eof",
    value: "",
    trivia,
    line,
    index,
  });

  return tokens;

  /**
   * @param {keyof typeof tokenRe} type
   * @param {object} options
   * @param {boolean} [options.noFlushTrivia]
   */
  function attemptTokenMatch(type, { noFlushTrivia } = {}) {
    const re = tokenRe[type];
    re.lastIndex = lastCharIndex;
    const result = re.exec(str);
    if (result) {
      tokens.push({ type, value: result[0], trivia, line, index });
      if (!noFlushTrivia) {
        trivia = "";
      }
      return re.lastIndex;
    }
    return -1;
  }
}

export class Tokeniser {
  /**
   * @param {string} idl
   */
  constructor(idl) {
    this.source = tokenise(idl);
    this.position = 0;
  }

  /**
   * @param {string} message
   * @return {never}
   */
  error(message) {
    throw new WebIDLParseError(
      syntaxError(this.source, this.position, this.current, message)
    );
  }

  /**
   * @param {string} type
   */
  probeKind(type) {
    return (
      this.source.length > this.position &&
      this.source[this.position].type === type
    );
  }

  /**
   * @param {string} value
   */
  probe(value) {
    return (
      this.probeKind("inline") && this.source[this.position].value === value
    );
  }

  /**
   * @param {...string} candidates
   */
  consumeKind(...candidates) {
    for (const type of candidates) {
      if (!this.probeKind(type)) continue;
      const token = this.source[this.position];
      this.position++;
      return token;
    }
  }

  /**
   * @param {...string} candidates
   */
  consume(...candidates) {
    if (!this.probeKind("inline")) return;
    const token = this.source[this.position];
    for (const value of candidates) {
      if (token.value !== value) continue;
      this.position++;
      return token;
    }
  }

  /**
   * @param {string} value
   */
  consumeIdentifier(value) {
    if (!this.probeKind("identifier")) {
      return;
    }
    if (this.source[this.position].value !== value) {
      return;
    }
    return this.consumeKind("identifier");
  }

  /**
   * @param {number} position
   */
  unconsume(position) {
    this.position = position;
  }
}

export class WebIDLParseError extends Error {
  /**
   * @param {object} options
   * @param {string} options.message
   * @param {string} options.bareMessage
   * @param {string} options.context
   * @param {number} options.line
   * @param {*} options.sourceName
   * @param {string} options.input
   * @param {*[]} options.tokens
   */
  constructor({
    message,
    bareMessage,
    context,
    line,
    sourceName,
    input,
    tokens,
  }) {
    super(message);

    this.name = "WebIDLParseError"; // not to be mangled
    this.bareMessage = bareMessage;
    this.context = context;
    this.line = line;
    this.sourceName = sourceName;
    this.input = input;
    this.tokens = tokens;
  }
}

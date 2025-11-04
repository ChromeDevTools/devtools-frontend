var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// gen/front_end/panels/settings/emulation/utils/StructuredHeaders.js
var StructuredHeaders_exports = {};
__export(StructuredHeaders_exports, {
  parseItem: () => parseItem,
  parseList: () => parseList,
  serializeItem: () => serializeItem,
  serializeList: () => serializeList
});
var CHAR_MINUS = "-".charCodeAt(0);
var CHAR_0 = "0".charCodeAt(0);
var CHAR_9 = "9".charCodeAt(0);
var CHAR_A = "A".charCodeAt(0);
var CHAR_Z = "Z".charCodeAt(0);
var CHAR_LOWER_A = "a".charCodeAt(0);
var CHAR_LOWER_Z = "z".charCodeAt(0);
var CHAR_DQUOTE = '"'.charCodeAt(0);
var CHAR_COLON = ":".charCodeAt(0);
var CHAR_QUESTION_MARK = "?".charCodeAt(0);
var CHAR_STAR = "*".charCodeAt(0);
var CHAR_UNDERSCORE = "_".charCodeAt(0);
var CHAR_DOT = ".".charCodeAt(0);
var CHAR_BACKSLASH = "\\".charCodeAt(0);
var CHAR_SLASH = "/".charCodeAt(0);
var CHAR_PLUS = "+".charCodeAt(0);
var CHAR_EQUALS = "=".charCodeAt(0);
var CHAR_EXCLAMATION = "!".charCodeAt(0);
var CHAR_HASH = "#".charCodeAt(0);
var CHAR_DOLLAR = "$".charCodeAt(0);
var CHAR_PERCENT = "%".charCodeAt(0);
var CHAR_AND = "&".charCodeAt(0);
var CHAR_SQUOTE = "'".charCodeAt(0);
var CHAR_HAT = "^".charCodeAt(0);
var CHAR_BACKTICK = "`".charCodeAt(0);
var CHAR_PIPE = "|".charCodeAt(0);
var CHAR_TILDE = "~".charCodeAt(0);
var CHAR_MIN_ASCII_PRINTABLE = 32;
var CHAR_MAX_ASCII_PRINTABLE = 126;
function isDigit(charCode) {
  if (charCode === void 0) {
    return false;
  }
  return charCode >= CHAR_0 && charCode <= CHAR_9;
}
function isAlpha(charCode) {
  if (charCode === void 0) {
    return false;
  }
  return charCode >= CHAR_A && charCode <= CHAR_Z || charCode >= CHAR_LOWER_A && charCode <= CHAR_LOWER_Z;
}
function isLcAlpha(charCode) {
  if (charCode === void 0) {
    return false;
  }
  return charCode >= CHAR_LOWER_A && charCode <= CHAR_LOWER_Z;
}
function isTChar(charCode) {
  if (charCode === void 0) {
    return false;
  }
  if (isDigit(charCode) || isAlpha(charCode)) {
    return true;
  }
  switch (charCode) {
    case CHAR_EXCLAMATION:
    case CHAR_HASH:
    case CHAR_DOLLAR:
    case CHAR_PERCENT:
    case CHAR_AND:
    case CHAR_SQUOTE:
    case CHAR_STAR:
    case CHAR_PLUS:
    case CHAR_MINUS:
    case CHAR_DOT:
    case CHAR_HAT:
    case CHAR_UNDERSCORE:
    case CHAR_BACKTICK:
    case CHAR_PIPE:
    case CHAR_TILDE:
      return true;
    default:
      return false;
  }
}
var Input = class {
  data;
  pos;
  constructor(input) {
    this.data = input;
    this.pos = 0;
    this.skipSP();
  }
  peek() {
    return this.data[this.pos];
  }
  peekCharCode() {
    return this.pos < this.data.length ? this.data.charCodeAt(this.pos) : void 0;
  }
  eat() {
    ++this.pos;
  }
  // Matches SP*.
  // SP = %x20, from RFC 5234
  skipSP() {
    while (this.data[this.pos] === " ") {
      ++this.pos;
    }
  }
  // Matches OWS
  // OWS = *( SP / HTAB ) , from RFC 7230
  skipOWS() {
    while (this.data[this.pos] === " " || this.data[this.pos] === "	") {
      ++this.pos;
    }
  }
  atEnd() {
    return this.pos === this.data.length;
  }
  // 4.2 steps 6,7 --- checks for trailing characters.
  allParsed() {
    this.skipSP();
    return this.pos === this.data.length;
  }
};
function makeError() {
  return {
    kind: 0
    /* ResultKind.ERROR */
  };
}
function parseListInternal(input) {
  const result = { kind: 11, items: [] };
  while (!input.atEnd()) {
    const piece = parseItemOrInnerList(input);
    if (piece.kind === 0) {
      return piece;
    }
    result.items.push(piece);
    input.skipOWS();
    if (input.atEnd()) {
      return result;
    }
    if (input.peek() !== ",") {
      return makeError();
    }
    input.eat();
    input.skipOWS();
    if (input.atEnd()) {
      return makeError();
    }
  }
  return result;
}
function parseItemOrInnerList(input) {
  if (input.peek() === "(") {
    return parseInnerList(input);
  }
  return parseItemInternal(input);
}
function parseInnerList(input) {
  if (input.peek() !== "(") {
    return makeError();
  }
  input.eat();
  const items = [];
  while (!input.atEnd()) {
    input.skipSP();
    if (input.peek() === ")") {
      input.eat();
      const params = parseParameters(input);
      if (params.kind === 0) {
        return params;
      }
      return {
        kind: 12,
        items,
        parameters: params
      };
    }
    const item = parseItemInternal(input);
    if (item.kind === 0) {
      return item;
    }
    items.push(item);
    if (input.peek() !== " " && input.peek() !== ")") {
      return makeError();
    }
  }
  return makeError();
}
function parseItemInternal(input) {
  const bareItem = parseBareItem(input);
  if (bareItem.kind === 0) {
    return bareItem;
  }
  const params = parseParameters(input);
  if (params.kind === 0) {
    return params;
  }
  return { kind: 4, value: bareItem, parameters: params };
}
function parseBareItem(input) {
  const upcoming = input.peekCharCode();
  if (upcoming === CHAR_MINUS || isDigit(upcoming)) {
    return parseIntegerOrDecimal(input);
  }
  if (upcoming === CHAR_DQUOTE) {
    return parseString(input);
  }
  if (upcoming === CHAR_COLON) {
    return parseByteSequence(input);
  }
  if (upcoming === CHAR_QUESTION_MARK) {
    return parseBoolean(input);
  }
  if (upcoming === CHAR_STAR || isAlpha(upcoming)) {
    return parseToken(input);
  }
  return makeError();
}
function parseParameters(input) {
  const items = /* @__PURE__ */ new Map();
  while (!input.atEnd()) {
    if (input.peek() !== ";") {
      break;
    }
    input.eat();
    input.skipSP();
    const paramName = parseKey(input);
    if (paramName.kind === 0) {
      return paramName;
    }
    let paramValue = { kind: 10, value: true };
    if (input.peek() === "=") {
      input.eat();
      const parsedParamValue = parseBareItem(input);
      if (parsedParamValue.kind === 0) {
        return parsedParamValue;
      }
      paramValue = parsedParamValue;
    }
    if (items.has(paramName.value)) {
      items.delete(paramName.value);
    }
    items.set(paramName.value, { kind: 2, name: paramName, value: paramValue });
  }
  return { kind: 3, items: [...items.values()] };
}
function parseKey(input) {
  let outputString = "";
  const first = input.peekCharCode();
  if (first !== CHAR_STAR && !isLcAlpha(first)) {
    return makeError();
  }
  while (!input.atEnd()) {
    const upcoming = input.peekCharCode();
    if (!isLcAlpha(upcoming) && !isDigit(upcoming) && upcoming !== CHAR_UNDERSCORE && upcoming !== CHAR_MINUS && upcoming !== CHAR_DOT && upcoming !== CHAR_STAR) {
      break;
    }
    outputString += input.peek();
    input.eat();
  }
  return { kind: 1, value: outputString };
}
function parseIntegerOrDecimal(input) {
  let resultKind = 5;
  let sign = 1;
  let inputNumber = "";
  if (input.peek() === "-") {
    input.eat();
    sign = -1;
  }
  if (!isDigit(input.peekCharCode())) {
    return makeError();
  }
  while (!input.atEnd()) {
    const char = input.peekCharCode();
    if (char !== void 0 && isDigit(char)) {
      input.eat();
      inputNumber += String.fromCodePoint(char);
    } else if (char === CHAR_DOT && resultKind === 5) {
      input.eat();
      if (inputNumber.length > 12) {
        return makeError();
      }
      inputNumber += ".";
      resultKind = 6;
    } else {
      break;
    }
    if (resultKind === 5 && inputNumber.length > 15) {
      return makeError();
    }
    if (resultKind === 6 && inputNumber.length > 16) {
      return makeError();
    }
  }
  if (resultKind === 5) {
    const num = sign * Number.parseInt(inputNumber, 10);
    if (num < -999999999999999 || num > 999999999999999) {
      return makeError();
    }
    return { kind: 5, value: num };
  }
  const afterDot = inputNumber.length - 1 - inputNumber.indexOf(".");
  if (afterDot > 3 || afterDot === 0) {
    return makeError();
  }
  return { kind: 6, value: sign * Number.parseFloat(inputNumber) };
}
function parseString(input) {
  let outputString = "";
  if (input.peek() !== '"') {
    return makeError();
  }
  input.eat();
  while (!input.atEnd()) {
    const char = input.peekCharCode();
    if (char === void 0) {
      return makeError();
    }
    input.eat();
    if (char === CHAR_BACKSLASH) {
      if (input.atEnd()) {
        return makeError();
      }
      const nextChar = input.peekCharCode();
      input.eat();
      if (nextChar !== CHAR_BACKSLASH && nextChar !== CHAR_DQUOTE) {
        return makeError();
      }
      outputString += String.fromCodePoint(nextChar);
    } else if (char === CHAR_DQUOTE) {
      return { kind: 7, value: outputString };
    } else if (char < CHAR_MIN_ASCII_PRINTABLE || char > CHAR_MAX_ASCII_PRINTABLE) {
      return makeError();
    } else {
      outputString += String.fromCodePoint(char);
    }
  }
  return makeError();
}
function parseToken(input) {
  const first = input.peekCharCode();
  if (first !== CHAR_STAR && !isAlpha(first)) {
    return makeError();
  }
  let outputString = "";
  while (!input.atEnd()) {
    const upcoming = input.peekCharCode();
    if (upcoming === void 0 || !isTChar(upcoming) && upcoming !== CHAR_COLON && upcoming !== CHAR_SLASH) {
      break;
    }
    input.eat();
    outputString += String.fromCodePoint(upcoming);
  }
  return { kind: 8, value: outputString };
}
function parseByteSequence(input) {
  let outputString = "";
  if (input.peek() !== ":") {
    return makeError();
  }
  input.eat();
  while (!input.atEnd()) {
    const char = input.peekCharCode();
    if (char === void 0) {
      return makeError();
    }
    input.eat();
    if (char === CHAR_COLON) {
      return { kind: 9, value: outputString };
    }
    if (isDigit(char) || isAlpha(char) || char === CHAR_PLUS || char === CHAR_SLASH || char === CHAR_EQUALS) {
      outputString += String.fromCodePoint(char);
    } else {
      return makeError();
    }
  }
  return makeError();
}
function parseBoolean(input) {
  if (input.peek() !== "?") {
    return makeError();
  }
  input.eat();
  if (input.peek() === "0") {
    input.eat();
    return { kind: 10, value: false };
  }
  if (input.peek() === "1") {
    input.eat();
    return { kind: 10, value: true };
  }
  return makeError();
}
function parseItem(input) {
  const i = new Input(input);
  const result = parseItemInternal(i);
  if (!i.allParsed()) {
    return makeError();
  }
  return result;
}
function parseList(input) {
  return parseListInternal(new Input(input));
}
function serializeItem(input) {
  const bareItemVal = serializeBareItem(input.value);
  if (bareItemVal.kind === 0) {
    return bareItemVal;
  }
  const paramVal = serializeParameters(input.parameters);
  if (paramVal.kind === 0) {
    return paramVal;
  }
  return { kind: 13, value: bareItemVal.value + paramVal.value };
}
function serializeList(input) {
  const outputPieces = [];
  for (let i = 0; i < input.items.length; ++i) {
    const item = input.items[i];
    if (item.kind === 12) {
      const itemResult = serializeInnerList(item);
      if (itemResult.kind === 0) {
        return itemResult;
      }
      outputPieces.push(itemResult.value);
    } else {
      const itemResult = serializeItem(item);
      if (itemResult.kind === 0) {
        return itemResult;
      }
      outputPieces.push(itemResult.value);
    }
  }
  const output = outputPieces.join(", ");
  return { kind: 13, value: output };
}
function serializeInnerList(input) {
  const outputPieces = [];
  for (let i = 0; i < input.items.length; ++i) {
    const itemResult = serializeItem(input.items[i]);
    if (itemResult.kind === 0) {
      return itemResult;
    }
    outputPieces.push(itemResult.value);
  }
  let output = "(" + outputPieces.join(" ") + ")";
  const paramResult = serializeParameters(input.parameters);
  if (paramResult.kind === 0) {
    return paramResult;
  }
  output += paramResult.value;
  return { kind: 13, value: output };
}
function serializeParameters(input) {
  let output = "";
  for (const item of input.items) {
    output += ";";
    const nameResult = serializeKey(item.name);
    if (nameResult.kind === 0) {
      return nameResult;
    }
    output += nameResult.value;
    const itemVal = item.value;
    if (itemVal.kind !== 10 || !itemVal.value) {
      output += "=";
      const itemValResult = serializeBareItem(itemVal);
      if (itemValResult.kind === 0) {
        return itemValResult;
      }
      output += itemValResult.value;
    }
  }
  return { kind: 13, value: output };
}
function serializeKey(input) {
  if (input.value.length === 0) {
    return makeError();
  }
  const firstChar = input.value.charCodeAt(0);
  if (!isLcAlpha(firstChar) && firstChar !== CHAR_STAR) {
    return makeError();
  }
  for (let i = 1; i < input.value.length; ++i) {
    const char = input.value.charCodeAt(i);
    if (!isLcAlpha(char) && !isDigit(char) && char !== CHAR_UNDERSCORE && char !== CHAR_MINUS && char !== CHAR_DOT && char !== CHAR_STAR) {
      return makeError();
    }
  }
  return { kind: 13, value: input.value };
}
function serializeBareItem(input) {
  if (input.kind === 5) {
    return serializeInteger(input);
  }
  if (input.kind === 6) {
    return serializeDecimal(input);
  }
  if (input.kind === 7) {
    return serializeString(input);
  }
  if (input.kind === 8) {
    return serializeToken(input);
  }
  if (input.kind === 10) {
    return serializeBoolean(input);
  }
  if (input.kind === 9) {
    return serializeByteSequence(input);
  }
  return makeError();
}
function serializeInteger(input) {
  if (input.value < -999999999999999 || input.value > 999999999999999 || !Number.isInteger(input.value)) {
    return makeError();
  }
  return { kind: 13, value: input.value.toString(10) };
}
function serializeDecimal(_input) {
  throw new Error("Unimplemented");
}
function serializeString(input) {
  for (let i = 0; i < input.value.length; ++i) {
    const char = input.value.charCodeAt(i);
    if (char < CHAR_MIN_ASCII_PRINTABLE || char > CHAR_MAX_ASCII_PRINTABLE) {
      return makeError();
    }
  }
  let output = '"';
  for (let i = 0; i < input.value.length; ++i) {
    const charStr = input.value[i];
    if (charStr === '"' || charStr === "\\") {
      output += "\\";
    }
    output += charStr;
  }
  output += '"';
  return { kind: 13, value: output };
}
function serializeToken(input) {
  if (input.value.length === 0) {
    return makeError();
  }
  const firstChar = input.value.charCodeAt(0);
  if (!isAlpha(firstChar) && firstChar !== CHAR_STAR) {
    return makeError();
  }
  for (let i = 1; i < input.value.length; ++i) {
    const char = input.value.charCodeAt(i);
    if (!isTChar(char) && char !== CHAR_COLON && char !== CHAR_SLASH) {
      return makeError();
    }
  }
  return { kind: 13, value: input.value };
}
function serializeByteSequence(_input) {
  throw new Error("Unimplemented");
}
function serializeBoolean(input) {
  return { kind: 13, value: input.value ? "?1" : "?0" };
}

// gen/front_end/panels/settings/emulation/utils/UserAgentMetadata.js
var UserAgentMetadata_exports = {};
__export(UserAgentMetadata_exports, {
  parseBrandsList: () => parseBrandsList,
  serializeBrandsList: () => serializeBrandsList,
  validateAsStructuredHeadersString: () => validateAsStructuredHeadersString
});
function parseBrandsList(stringForm, parseErrorString, structErrorString) {
  const brandList = [];
  const parseResult = parseList(stringForm);
  if (parseResult.kind === 0) {
    return parseErrorString;
  }
  for (const listItem of parseResult.items) {
    if (listItem.kind !== 4) {
      return structErrorString;
    }
    const bareItem = listItem.value;
    if (bareItem.kind !== 7) {
      return structErrorString;
    }
    if (listItem.parameters.items.length !== 1) {
      return structErrorString;
    }
    const param = listItem.parameters.items[0];
    if (param.name.value !== "v") {
      return structErrorString;
    }
    const paramValue = param.value;
    if (paramValue.kind !== 7) {
      return structErrorString;
    }
    brandList.push({ brand: bareItem.value, version: paramValue.value });
  }
  return brandList;
}
function serializeBrandsList(brands) {
  const shList = { kind: 11, items: [] };
  const vParamName = { kind: 1, value: "v" };
  for (const brand of brands) {
    const nameString = { kind: 7, value: brand.brand };
    const verString = { kind: 7, value: brand.version };
    const verParams = {
      kind: 3,
      items: [{ kind: 2, name: vParamName, value: verString }]
    };
    const shItem = { kind: 4, value: nameString, parameters: verParams };
    shList.items.push(shItem);
  }
  const serializeResult = serializeList(shList);
  return serializeResult.kind === 0 ? "" : serializeResult.value;
}
function validateAsStructuredHeadersString(value, errorString) {
  const parsedResult = serializeItem({
    kind: 4,
    value: { kind: 7, value },
    parameters: { kind: 3, items: [] }
  });
  if (parsedResult.kind === 0) {
    return { valid: false, errorMessage: errorString };
  }
  return { valid: true, errorMessage: void 0 };
}
export {
  StructuredHeaders_exports as StructuredHeaders,
  UserAgentMetadata_exports as UserAgentMetadata
};
//# sourceMappingURL=utils.js.map

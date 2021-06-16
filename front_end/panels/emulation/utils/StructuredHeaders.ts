// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// This provides parsing and serialization for HTTP structured headers as specified in:
// https://tools.ietf.org/html/draft-ietf-httpbis-header-structure-19
// (the ABNF fragments are quoted from the spec, unless otherwise specified,
//  and the code pretty much just follows the algorithms given there).
//
// parseList, parseItem, serializeList, and serializeItem are the main entry points.
//
// Currently dictionary handling is not implemented (but would likely be easy
// to add).  Serialization of decimals and byte sequences is also not
// implemented.

export const enum ResultKind {
  ERROR = 0,
  PARAM_NAME = 1,
  PARAMETER = 2,
  PARAMETERS = 3,
  ITEM = 4,
  INTEGER = 5,
  DECIMAL = 6,
  STRING = 7,
  TOKEN = 8,
  BINARY = 9,
  BOOLEAN = 10,
  LIST = 11,
  INNER_LIST = 12,
  SERIALIZATION_RESULT = 13,
}

export interface Error {
  kind: ResultKind.ERROR;
}

export interface Integer {
  kind: ResultKind.INTEGER;
  value: number;
}

export interface Decimal {
  kind: ResultKind.DECIMAL;
  value: number;
}

export interface String {
  kind: ResultKind.STRING;
  value: string;
}

export interface Token {
  kind: ResultKind.TOKEN;
  value: string;
}

export interface Binary {
  kind: ResultKind.BINARY;
  // This is undecoded base64
  value: string;
}

export interface Boolean {
  kind: ResultKind.BOOLEAN;
  value: boolean;
}

//  bare-item = sf-integer / sf-decimal / sf-string / sf-token
//              / sf-binary / sf-boolean
export type BareItem = Integer|Decimal|String|Token|Binary|Boolean;

export interface ParamName {
  kind: ResultKind.PARAM_NAME;
  value: string;
}

// parameter     = param-name [ "=" param-value ]
// param-value   = bare-item
export interface Parameter {
  kind: ResultKind.PARAMETER;
  name: ParamName;
  value: BareItem;
}

// parameters  = *( ";" *SP parameter )
export interface Parameters {
  kind: ResultKind.PARAMETERS;
  items: Parameter[];
}

// sf-item   = bare-item parameters
export interface Item {
  kind: ResultKind.ITEM;
  value: BareItem;
  parameters: Parameters;
}

// inner-list    = "(" *SP [ sf-item *( 1*SP sf-item ) *SP ] ")"
//                   parameters
export interface InnerList {
  kind: ResultKind.INNER_LIST;
  items: Item[];
  parameters: Parameters;
}

// list-member = sf-item / inner-list
export type ListMember = Item|InnerList;

// sf-list = list-member *( OWS "," OWS list-member )
export interface List {
  kind: ResultKind.LIST;
  items: ListMember[];
}

export interface SerializationResult {
  kind: ResultKind.SERIALIZATION_RESULT;
  value: string;
}

const CHAR_MINUS: number = '-'.charCodeAt(0);
const CHAR_0: number = '0'.charCodeAt(0);
const CHAR_9: number = '9'.charCodeAt(0);
const CHAR_A: number = 'A'.charCodeAt(0);
const CHAR_Z: number = 'Z'.charCodeAt(0);
const CHAR_LOWER_A: number = 'a'.charCodeAt(0);
const CHAR_LOWER_Z: number = 'z'.charCodeAt(0);
const CHAR_DQUOTE: number = '"'.charCodeAt(0);
const CHAR_COLON: number = ':'.charCodeAt(0);
const CHAR_QUESTION_MARK: number = '?'.charCodeAt(0);
const CHAR_STAR: number = '*'.charCodeAt(0);
const CHAR_UNDERSCORE: number = '_'.charCodeAt(0);
const CHAR_DOT: number = '.'.charCodeAt(0);
const CHAR_BACKSLASH: number = '\\'.charCodeAt(0);
const CHAR_SLASH: number = '/'.charCodeAt(0);
const CHAR_PLUS: number = '+'.charCodeAt(0);
const CHAR_EQUALS: number = '='.charCodeAt(0);
const CHAR_EXCLAMATION: number = '!'.charCodeAt(0);
const CHAR_HASH: number = '#'.charCodeAt(0);
const CHAR_DOLLAR: number = '$'.charCodeAt(0);
const CHAR_PERCENT: number = '%'.charCodeAt(0);
const CHAR_AND: number = '&'.charCodeAt(0);
const CHAR_SQUOTE: number = '\''.charCodeAt(0);
const CHAR_HAT: number = '^'.charCodeAt(0);
const CHAR_BACKTICK: number = '`'.charCodeAt(0);
const CHAR_PIPE: number = '|'.charCodeAt(0);
const CHAR_TILDE: number = '~'.charCodeAt(0);

// ASCII printable range.
const CHAR_MIN_ASCII_PRINTABLE: number = 0x20;
const CHAR_MAX_ASCII_PRINTABLE: number = 0x7e;

// Note: structured headers operates over ASCII, not unicode, so these are
// all indeed supposed to return false on things outside 32-127 range regardless
// of them being other kinds of digits or letters.
function isDigit(charCode: number|undefined): boolean {
  // DIGIT = %x30-39 ; 0-9 (from RFC 5234)
  if (charCode === undefined) {
    return false;
  }
  return charCode >= CHAR_0 && charCode <= CHAR_9;
}

function isAlpha(charCode: number|undefined): boolean {
  // ALPHA = %x41-5A / %x61-7A   ; A-Z / a-z (from RFC 5234)
  if (charCode === undefined) {
    return false;
  }
  return (charCode >= CHAR_A && charCode <= CHAR_Z) || (charCode >= CHAR_LOWER_A && charCode <= CHAR_LOWER_Z);
}

function isLcAlpha(charCode: number|undefined): boolean {
  // lcalpha = %x61-7A ; a-z
  if (charCode === undefined) {
    return false;
  }
  return (charCode >= CHAR_LOWER_A && charCode <= CHAR_LOWER_Z);
}

function isTChar(charCode: number|undefined): boolean {
  if (charCode === undefined) {
    return false;
  }

  // tchar = "!" / "#" / "$" / "%" / "&" / "'" / "*" / "+" / "-" / "." /
  // "^" / "_" / "`" / "|" / "~" / DIGIT / ALPHA (from RFC 7230)
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

class Input {
  private readonly data: string;
  private pos: number;

  constructor(input: string) {
    this.data = input;
    this.pos = 0;
    // 4.2 step 2 is to discard any leading SP characters.
    this.skipSP();
  }

  peek(): string|undefined {
    return this.data[this.pos];
  }

  peekCharCode(): number|undefined {
    return (this.pos < this.data.length ? this.data.charCodeAt(this.pos) : undefined);
  }

  eat(): void {
    ++this.pos;
  }

  // Matches SP*.
  // SP = %x20, from RFC 5234
  skipSP(): void {
    while (this.data[this.pos] === ' ') {
      ++this.pos;
    }
  }

  // Matches OWS
  // OWS = *( SP / HTAB ) , from RFC 7230
  skipOWS(): void {
    while (this.data[this.pos] === ' ' || this.data[this.pos] === '\t') {
      ++this.pos;
    }
  }

  atEnd(): boolean {
    return (this.pos === this.data.length);
  }

  // 4.2 steps 6,7 --- checks for trailing characters.
  allParsed(): boolean {
    this.skipSP();
    return (this.pos === this.data.length);
  }
}

function makeError(): Error {
  return {kind: ResultKind.ERROR};
}

// 4.2.1. Parsing a list
function parseListInternal(input: Input): List|Error {
  const result: List = {kind: ResultKind.LIST, items: []};

  while (!input.atEnd()) {
    const piece: ListMember|Error = parseItemOrInnerList(input);
    if (piece.kind === ResultKind.ERROR) {
      return piece;
    }
    result.items.push(piece);
    input.skipOWS();
    if (input.atEnd()) {
      return result;
    }

    if (input.peek() !== ',') {
      return makeError();
    }
    input.eat();
    input.skipOWS();

    // "If input_string is empty, there is a trailing comma; fail parsing."
    if (input.atEnd()) {
      return makeError();
    }
  }
  return result;  // this case corresponds to an empty list.
}

// 4.2.1.1.  Parsing an Item or Inner List
function parseItemOrInnerList(input: Input): ListMember|Error {
  if (input.peek() === '(') {
    return parseInnerList(input);
  }
  return parseItemInternal(input);
}

// 4.2.1.2.  Parsing an Inner List
function parseInnerList(input: Input): InnerList|Error {
  if (input.peek() !== '(') {
    return makeError();
  }
  input.eat();

  const items: Item[] = [];
  while (!input.atEnd()) {
    input.skipSP();
    if (input.peek() === ')') {
      input.eat();
      const params: Parameters|Error = parseParameters(input);
      if (params.kind === ResultKind.ERROR) {
        return params;
      }
      return {
        kind: ResultKind.INNER_LIST,
        items: items,
        parameters: params,
      };
    }
    const item: Item|Error = parseItemInternal(input);
    if (item.kind === ResultKind.ERROR) {
      return item;
    }
    items.push(item);
    if (input.peek() !== ' ' && input.peek() !== ')') {
      return makeError();
    }
  }

  // Didn't see ), so error.
  return makeError();
}

// 4.2.3.  Parsing an Item
function parseItemInternal(input: Input): Item|Error {
  const bareItem: BareItem|Error = parseBareItem(input);
  if (bareItem.kind === ResultKind.ERROR) {
    return bareItem;
  }
  const params: Parameters|Error = parseParameters(input);
  if (params.kind === ResultKind.ERROR) {
    return params;
  }
  return {kind: ResultKind.ITEM, value: bareItem, parameters: params};
}

// 4.2.3.1.  Parsing a Bare Item
function parseBareItem(input: Input): BareItem|Error {
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

// 4.2.3.2.  Parsing Parameters
function parseParameters(input: Input): Parameters|Error {
  // The main noteworthy thing here is handling of duplicates and ordering:
  //
  // "Note that Parameters are ordered as serialized"
  //
  // "If parameters already contains a name param_name (comparing
  // character-for-character), overwrite its value."
  //
  // "Note that when duplicate Parameter keys are encountered, this has the
  // effect of ignoring all but the last instance."
  const items: Map<string, Parameter> = new Map<string, Parameter>();
  while (!input.atEnd()) {
    if (input.peek() !== ';') {
      break;
    }
    input.eat();
    input.skipSP();
    const paramName = parseKey(input);
    if (paramName.kind === ResultKind.ERROR) {
      return paramName;
    }

    let paramValue: BareItem = {kind: ResultKind.BOOLEAN, value: true};
    if (input.peek() === '=') {
      input.eat();
      const parsedParamValue: BareItem|Error = parseBareItem(input);
      if (parsedParamValue.kind === ResultKind.ERROR) {
        return parsedParamValue;
      }
      paramValue = parsedParamValue;
    }

    // Delete any previous occurrence of duplicates to get the ordering right.
    if (items.has(paramName.value)) {
      items.delete(paramName.value);
    }

    items.set(paramName.value, {kind: ResultKind.PARAMETER, name: paramName, value: paramValue});
  }

  return {kind: ResultKind.PARAMETERS, items: [...items.values()]};
}

// 4.2.3.3.  Parsing a Key
function parseKey(input: Input): ParamName|Error {
  let outputString: string = '';
  const first = input.peekCharCode();
  if (first !== CHAR_STAR && !isLcAlpha(first)) {
    return makeError();
  }

  while (!input.atEnd()) {
    const upcoming = input.peekCharCode();
    if (!isLcAlpha(upcoming) && !isDigit(upcoming) && upcoming !== CHAR_UNDERSCORE && upcoming !== CHAR_MINUS &&
        upcoming !== CHAR_DOT && upcoming !== CHAR_STAR) {
      break;
    }
    outputString += input.peek();
    input.eat();
  }

  return {kind: ResultKind.PARAM_NAME, value: outputString};
}

// 4.2.4.  Parsing an Integer or Decimal
function parseIntegerOrDecimal(input: Input): Integer|Decimal|Error {
  let resultKind = ResultKind.INTEGER;
  let sign: number = 1;
  let inputNumber = '';
  if (input.peek() === '-') {
    input.eat();
    sign = -1;
  }

  // This case includes end of input.
  if (!isDigit(input.peekCharCode())) {
    return makeError();
  }

  while (!input.atEnd()) {
    const char = input.peekCharCode();
    if (char !== undefined && isDigit(char)) {
      input.eat();
      inputNumber += String.fromCodePoint(char);
    } else if (char === CHAR_DOT && resultKind === ResultKind.INTEGER) {
      input.eat();
      if (inputNumber.length > 12) {
        return makeError();
      }
      inputNumber += '.';
      resultKind = ResultKind.DECIMAL;
    } else {
      break;
    }
    if (resultKind === ResultKind.INTEGER && inputNumber.length > 15) {
      return makeError();
    }
    if (resultKind === ResultKind.DECIMAL && inputNumber.length > 16) {
      return makeError();
    }
  }

  if (resultKind === ResultKind.INTEGER) {
    const num = sign * Number.parseInt(inputNumber, 10);
    if (num < -999999999999999 || num > 999999999999999) {
      return makeError();
    }
    return {kind: ResultKind.INTEGER, value: num};
  }
  const afterDot = inputNumber.length - 1 - inputNumber.indexOf('.');
  if (afterDot > 3 || afterDot === 0) {
    return makeError();
  }
  return {kind: ResultKind.DECIMAL, value: sign * Number.parseFloat(inputNumber)};
}

// 4.2.5.  Parsing a String
function parseString(input: Input): String|Error {
  let outputString = '';
  if (input.peek() !== '"') {
    return makeError();
  }
  input.eat();
  while (!input.atEnd()) {
    const char = input.peekCharCode();
    // can't happen due to atEnd(), but help the typechecker out.
    if (char === undefined) {
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
      return {kind: ResultKind.STRING, value: outputString};
    } else if (char<CHAR_MIN_ASCII_PRINTABLE || char>CHAR_MAX_ASCII_PRINTABLE) {
      return makeError();
    } else {
      outputString += String.fromCodePoint(char);
    }
  }

  // No closing quote.
  return makeError();
}

// 4.2.6.  Parsing a Token
function parseToken(input: Input): Token|Error {
  const first = input.peekCharCode();
  if (first !== CHAR_STAR && !isAlpha(first)) {
    return makeError();
  }
  let outputString = '';
  while (!input.atEnd()) {
    const upcoming = input.peekCharCode();
    if (upcoming === undefined || !isTChar(upcoming) && upcoming !== CHAR_COLON && upcoming !== CHAR_SLASH) {
      break;
    }
    input.eat();
    outputString += String.fromCodePoint(upcoming);
  }
  return {kind: ResultKind.TOKEN, value: outputString};
}

// 4.2.7.  Parsing a Byte Sequence
function parseByteSequence(input: Input): Binary|Error {
  let outputString = '';
  if (input.peek() !== ':') {
    return makeError();
  }
  input.eat();
  while (!input.atEnd()) {
    const char = input.peekCharCode();
    // can't happen due to atEnd(), but help the typechecker out.
    if (char === undefined) {
      return makeError();
    }

    input.eat();
    if (char === CHAR_COLON) {
      return {kind: ResultKind.BINARY, value: outputString};
    }
    if (isDigit(char) || isAlpha(char) || char === CHAR_PLUS || char === CHAR_SLASH || char === CHAR_EQUALS) {
      outputString += String.fromCodePoint(char);
    } else {
      return makeError();
    }
  }

  // No closing :
  return makeError();
}

// 4.2.8.  Parsing a Boolean
function parseBoolean(input: Input): Boolean|Error {
  if (input.peek() !== '?') {
    return makeError();
  }
  input.eat();
  if (input.peek() === '0') {
    input.eat();
    return {kind: ResultKind.BOOLEAN, value: false};
  }
  if (input.peek() === '1') {
    input.eat();
    return {kind: ResultKind.BOOLEAN, value: true};
  }
  return makeError();
}

export function parseItem(input: string): Item|Error {
  const i = new Input(input);
  const result: Item|Error = parseItemInternal(i);
  if (!i.allParsed()) {
    return makeError();
  }
  return result;
}

export function parseList(input: string): List|Error {
  // No need to look for trailing stuff here since parseListInternal does it already.
  return parseListInternal(new Input(input));
}

// 4.1.3.  Serializing an Item
export function serializeItem(input: Item): SerializationResult|Error {
  const bareItemVal = serializeBareItem(input.value);
  if (bareItemVal.kind === ResultKind.ERROR) {
    return bareItemVal;
  }
  const paramVal = serializeParameters(input.parameters);
  if (paramVal.kind === ResultKind.ERROR) {
    return paramVal;
  }
  return {kind: ResultKind.SERIALIZATION_RESULT, value: bareItemVal.value + paramVal.value};
}

// 4.1.1.  Serializing a List
export function serializeList(input: List): SerializationResult|Error {
  const outputPieces: string[] = [];
  for (let i = 0; i < input.items.length; ++i) {
    const item = input.items[i];
    if (item.kind === ResultKind.INNER_LIST) {
      const itemResult = serializeInnerList(item);
      if (itemResult.kind === ResultKind.ERROR) {
        return itemResult;
      }
      outputPieces.push(itemResult.value);
    } else {
      const itemResult = serializeItem(item);
      if (itemResult.kind === ResultKind.ERROR) {
        return itemResult;
      }
      outputPieces.push(itemResult.value);
    }
  }
  const output = outputPieces.join(', ');
  return {kind: ResultKind.SERIALIZATION_RESULT, value: output};
}

// 4.1.1.1.  Serializing an Inner List
function serializeInnerList(input: InnerList): SerializationResult|Error {
  const outputPieces: string[] = [];
  for (let i = 0; i < input.items.length; ++i) {
    const itemResult = serializeItem(input.items[i]);
    if (itemResult.kind === ResultKind.ERROR) {
      return itemResult;
    }
    outputPieces.push(itemResult.value);
  }
  let output = '(' + outputPieces.join(' ') + ')';
  const paramResult = serializeParameters(input.parameters);
  if (paramResult.kind === ResultKind.ERROR) {
    return paramResult;
  }
  output += paramResult.value;
  return {kind: ResultKind.SERIALIZATION_RESULT, value: output};
}

// 4.1.1.2.  Serializing Parameters
function serializeParameters(input: Parameters): SerializationResult|Error {
  let output = '';
  for (const item of input.items) {
    output += ';';
    const nameResult = serializeKey(item.name);
    if (nameResult.kind === ResultKind.ERROR) {
      return nameResult;
    }
    output += nameResult.value;
    const itemVal: BareItem = item.value;
    if (itemVal.kind !== ResultKind.BOOLEAN || !itemVal.value) {
      output += '=';
      const itemValResult = serializeBareItem(itemVal);
      if (itemValResult.kind === ResultKind.ERROR) {
        return itemValResult;
      }
      output += itemValResult.value;
    }
  }
  return {kind: ResultKind.SERIALIZATION_RESULT, value: output};
}

// 4.1.1.3.  Serializing a Key
function serializeKey(input: ParamName): SerializationResult|Error {
  if (input.value.length === 0) {
    return makeError();
  }

  const firstChar = input.value.charCodeAt(0);
  if (!isLcAlpha(firstChar) && firstChar !== CHAR_STAR) {
    return makeError();
  }

  for (let i = 1; i < input.value.length; ++i) {
    const char = input.value.charCodeAt(i);
    if (!isLcAlpha(char) && !isDigit(char) && char !== CHAR_UNDERSCORE && char !== CHAR_MINUS && char !== CHAR_DOT &&
        char !== CHAR_STAR) {
      return makeError();
    }
  }
  return {kind: ResultKind.SERIALIZATION_RESULT, value: input.value};
}

// 4.1.3.1.  Serializing a Bare Item
function serializeBareItem(input: BareItem): SerializationResult|Error {
  if (input.kind === ResultKind.INTEGER) {
    return serializeInteger(input);
  }
  if (input.kind === ResultKind.DECIMAL) {
    return serializeDecimal(input);
  }
  if (input.kind === ResultKind.STRING) {
    return serializeString(input);
  }
  if (input.kind === ResultKind.TOKEN) {
    return serializeToken(input);
  }
  if (input.kind === ResultKind.BOOLEAN) {
    return serializeBoolean(input);
  }
  if (input.kind === ResultKind.BINARY) {
    return serializeByteSequence(input);
  }
  return makeError();
}

// 4.1.4.  Serializing an Integer
function serializeInteger(input: Integer): SerializationResult|Error {
  if (input.value < -999999999999999 || input.value > 999999999999999 || !Number.isInteger(input.value)) {
    return makeError();
  }
  return {kind: ResultKind.SERIALIZATION_RESULT, value: input.value.toString(10)};
}

// 4.1.5.  Serializing a Decimal
function serializeDecimal(_input: Decimal): SerializationResult|Error {
  throw 'Unimplemented';
}

// 4.1.6.  Serializing a String
function serializeString(input: String): SerializationResult|Error {
  // Only printable ASCII strings are supported by the spec.
  for (let i = 0; i < input.value.length; ++i) {
    const char = input.value.charCodeAt(i);
    if (char<CHAR_MIN_ASCII_PRINTABLE || char>CHAR_MAX_ASCII_PRINTABLE) {
      return makeError();
    }
  }
  let output = '"';
  for (let i = 0; i < input.value.length; ++i) {
    const charStr = input.value[i];
    if (charStr === '"' || charStr === '\\') {
      output += '\\';
    }
    output += charStr;
  }
  output += '"';

  return {kind: ResultKind.SERIALIZATION_RESULT, value: output};
}

// 4.1.7.  Serializing a Token
function serializeToken(input: Token): SerializationResult|Error {
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
  return {kind: ResultKind.SERIALIZATION_RESULT, value: input.value};
}

// 4.1.8.  Serializing a Byte Sequence
function serializeByteSequence(_input: Binary): SerializationResult|Error {
  throw 'Unimplemented';
}

// 4.1.9.  Serializing a Boolean
function serializeBoolean(input: Boolean): SerializationResult|Error {
  return {kind: ResultKind.SERIALIZATION_RESULT, value: input.value ? '?1' : '?0'};
}

var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// gen/front_end/core/platform/ArrayUtilities.js
var ArrayUtilities_exports = {};
__export(ArrayUtilities_exports, {
  DEFAULT_COMPARATOR: () => DEFAULT_COMPARATOR,
  arrayDoesNotContainNullOrUndefined: () => arrayDoesNotContainNullOrUndefined,
  binaryIndexOf: () => binaryIndexOf,
  intersectOrdered: () => intersectOrdered,
  lowerBound: () => lowerBound,
  mergeOrdered: () => mergeOrdered,
  nearestIndexFromBeginning: () => nearestIndexFromBeginning,
  nearestIndexFromEnd: () => nearestIndexFromEnd,
  removeElement: () => removeElement,
  sortRange: () => sortRange,
  swap: () => swap,
  upperBound: () => upperBound
});
var removeElement = (array, element, firstOnly) => {
  let index = array.indexOf(element);
  if (index === -1) {
    return false;
  }
  if (firstOnly) {
    array.splice(index, 1);
    return true;
  }
  for (let i = index + 1, n = array.length; i < n; ++i) {
    if (array[i] !== element) {
      array[index++] = array[i];
    }
  }
  array.length = index;
  return true;
};
function swap(array, i1, i2) {
  const temp = array[i1];
  array[i1] = array[i2];
  array[i2] = temp;
}
function partition(array, comparator, left, right, pivotIndex) {
  const pivotValue = array[pivotIndex];
  swap(array, right, pivotIndex);
  let storeIndex = left;
  for (let i = left; i < right; ++i) {
    if (comparator(array[i], pivotValue) < 0) {
      swap(array, storeIndex, i);
      ++storeIndex;
    }
  }
  swap(array, right, storeIndex);
  return storeIndex;
}
function quickSortRange(array, comparator, left, right, sortWindowLeft, sortWindowRight) {
  if (right <= left) {
    return;
  }
  const pivotIndex = Math.floor(Math.random() * (right - left)) + left;
  const pivotNewIndex = partition(array, comparator, left, right, pivotIndex);
  if (sortWindowLeft < pivotNewIndex) {
    quickSortRange(array, comparator, left, pivotNewIndex - 1, sortWindowLeft, sortWindowRight);
  }
  if (pivotNewIndex < sortWindowRight) {
    quickSortRange(array, comparator, pivotNewIndex + 1, right, sortWindowLeft, sortWindowRight);
  }
}
function sortRange(array, comparator, leftBound, rightBound, sortWindowLeft, sortWindowRight) {
  if (leftBound === 0 && rightBound === array.length - 1 && sortWindowLeft === 0 && sortWindowRight >= rightBound) {
    array.sort(comparator);
  } else {
    quickSortRange(array, comparator, leftBound, rightBound, sortWindowLeft, sortWindowRight);
  }
  return array;
}
var binaryIndexOf = (array, value, comparator) => {
  const index = lowerBound(array, value, comparator);
  return index < array.length && comparator(value, array[index]) === 0 ? index : -1;
};
function mergeOrIntersect(array1, array2, comparator, mergeNotIntersect) {
  const result = [];
  let i = 0;
  let j = 0;
  while (i < array1.length && j < array2.length) {
    const compareValue = comparator(array1[i], array2[j]);
    if (mergeNotIntersect || !compareValue) {
      result.push(compareValue <= 0 ? array1[i] : array2[j]);
    }
    if (compareValue <= 0) {
      i++;
    }
    if (compareValue >= 0) {
      j++;
    }
  }
  if (mergeNotIntersect) {
    while (i < array1.length) {
      result.push(array1[i++]);
    }
    while (j < array2.length) {
      result.push(array2[j++]);
    }
  }
  return result;
}
var intersectOrdered = (array1, array2, comparator) => {
  return mergeOrIntersect(array1, array2, comparator, false);
};
var mergeOrdered = (array1, array2, comparator) => {
  return mergeOrIntersect(array1, array2, comparator, true);
};
var DEFAULT_COMPARATOR = (a, b) => {
  return a < b ? -1 : a > b ? 1 : 0;
};
function lowerBound(array, needle, comparator, left, right) {
  let l = left || 0;
  let r = right !== void 0 ? right : array.length;
  while (l < r) {
    const m = l + r >> 1;
    if (comparator(needle, array[m]) > 0) {
      l = m + 1;
    } else {
      r = m;
    }
  }
  return r;
}
function upperBound(array, needle, comparator, left, right) {
  let l = left || 0;
  let r = right !== void 0 ? right : array.length;
  while (l < r) {
    const m = l + r >> 1;
    if (comparator(needle, array[m]) >= 0) {
      l = m + 1;
    } else {
      r = m;
    }
  }
  return r;
}
function nearestIndex(arr, predicate, searchStart) {
  const searchFromEnd = searchStart === "END";
  if (arr.length === 0) {
    return null;
  }
  let left = 0;
  let right = arr.length - 1;
  let pivot = 0;
  let matchesPredicate = false;
  let moveToTheRight = false;
  let middle = 0;
  do {
    middle = left + (right - left) / 2;
    pivot = searchFromEnd ? Math.ceil(middle) : Math.floor(middle);
    matchesPredicate = predicate(arr[pivot]);
    moveToTheRight = matchesPredicate === searchFromEnd;
    if (moveToTheRight) {
      left = Math.min(right, pivot + (left === pivot ? 1 : 0));
    } else {
      right = Math.max(left, pivot + (right === pivot ? -1 : 0));
    }
  } while (right !== left);
  if (!predicate(arr[left])) {
    return null;
  }
  return left;
}
function nearestIndexFromBeginning(arr, predicate) {
  return nearestIndex(
    arr,
    predicate,
    "BEGINNING"
    /* NearestSearchStart.BEGINNING */
  );
}
function nearestIndexFromEnd(arr, predicate) {
  return nearestIndex(
    arr,
    predicate,
    "END"
    /* NearestSearchStart.END */
  );
}
function arrayDoesNotContainNullOrUndefined(arr) {
  return !arr.includes(null) && !arr.includes(void 0);
}

// gen/front_end/core/platform/Brand.js
var Brand_exports = {};

// gen/front_end/core/platform/Constructor.js
var Constructor_exports = {};

// gen/front_end/core/platform/DateUtilities.js
var DateUtilities_exports = {};
__export(DateUtilities_exports, {
  isValid: () => isValid,
  toISO8601Compact: () => toISO8601Compact
});
var isValid = (date) => {
  return !isNaN(date.getTime());
};
var toISO8601Compact = (date) => {
  function leadZero(x) {
    return (x > 9 ? "" : "0") + x;
  }
  return date.getFullYear() + leadZero(date.getMonth() + 1) + leadZero(date.getDate()) + "T" + leadZero(date.getHours()) + leadZero(date.getMinutes()) + leadZero(date.getSeconds());
};

// gen/front_end/core/platform/DevToolsPath.js
var DevToolsPath_exports = {};
__export(DevToolsPath_exports, {
  EmptyEncodedPathString: () => EmptyEncodedPathString,
  EmptyRawPathString: () => EmptyRawPathString,
  EmptyUrlString: () => EmptyUrlString,
  urlString: () => urlString
});
var EmptyUrlString = "";
var urlString = (strings, ...values) => String.raw({ raw: strings }, ...values);
var EmptyRawPathString = "";
var EmptyEncodedPathString = "";

// gen/front_end/core/platform/HostRuntime.js
var HostRuntime_exports = {};
__export(HostRuntime_exports, {
  HOST_RUNTIME: () => HOST_RUNTIME
});
import * as Browser from "./browser/browser.js";
import * as Node from "./node/node.js";
var HOST_RUNTIME = (() => {
  if (Node.HostRuntime.IS_NODE) {
    return Node.HostRuntime.HOST_RUNTIME;
  }
  if (Browser.HostRuntime.IS_BROWSER) {
    return Browser.HostRuntime.HOST_RUNTIME;
  }
  throw new Error("Unknown runtime!");
})();

// gen/front_end/core/platform/KeyboardUtilities.js
var KeyboardUtilities_exports = {};
__export(KeyboardUtilities_exports, {
  ARROW_KEYS: () => ARROW_KEYS,
  ENTER_KEY: () => ENTER_KEY,
  ESCAPE_KEY: () => ESCAPE_KEY,
  TAB_KEY: () => TAB_KEY,
  isEnterOrSpaceKey: () => isEnterOrSpaceKey,
  isEscKey: () => isEscKey,
  keyIsArrowKey: () => keyIsArrowKey
});
var ENTER_KEY = "Enter";
var ESCAPE_KEY = "Escape";
var TAB_KEY = "Tab";
var ARROW_KEYS = /* @__PURE__ */ new Set([
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight"
]);
function keyIsArrowKey(key) {
  return ARROW_KEYS.has(key);
}
function isEscKey(event) {
  return event.key === "Escape";
}
function isEnterOrSpaceKey(event) {
  return event.key === "Enter" || event.key === " ";
}

// gen/front_end/core/platform/MapUtilities.js
var MapUtilities_exports = {};
__export(MapUtilities_exports, {
  Multimap: () => Multimap,
  getWithDefault: () => getWithDefault,
  inverse: () => inverse
});
var inverse = function(map) {
  const result = new Multimap();
  for (const [key, value] of map.entries()) {
    result.set(value, key);
  }
  return result;
};
var Multimap = class {
  map = /* @__PURE__ */ new Map();
  set(key, value) {
    let set = this.map.get(key);
    if (!set) {
      set = /* @__PURE__ */ new Set();
      this.map.set(key, set);
    }
    set.add(value);
  }
  get(key) {
    return this.map.get(key) || /* @__PURE__ */ new Set();
  }
  has(key) {
    return this.map.has(key);
  }
  hasValue(key, value) {
    const set = this.map.get(key);
    if (!set) {
      return false;
    }
    return set.has(value);
  }
  get size() {
    return this.map.size;
  }
  delete(key, value) {
    const values = this.get(key);
    if (!values) {
      return false;
    }
    const result = values.delete(value);
    if (!values.size) {
      this.map.delete(key);
    }
    return result;
  }
  deleteAll(key) {
    this.map.delete(key);
  }
  keysArray() {
    return [...this.map.keys()];
  }
  keys() {
    return this.map.keys();
  }
  valuesArray() {
    const result = [];
    for (const set of this.map.values()) {
      result.push(...set.values());
    }
    return result;
  }
  clear() {
    this.map.clear();
  }
};
function getWithDefault(map, key, defaultValueFactory) {
  let value = map.get(key);
  if (value === void 0 || value === null) {
    value = defaultValueFactory(key);
    map.set(key, value);
  }
  return value;
}

// gen/front_end/core/platform/MimeType.js
var MimeType_exports = {};
__export(MimeType_exports, {
  isTextType: () => isTextType,
  parseContentType: () => parseContentType
});
var ADDITIONAL_TEXT_MIME_TYPES = /* @__PURE__ */ new Set([
  "application/ecmascript",
  "application/javascript",
  "application/json",
  "application/json+protobuf",
  "application/mpegurl",
  "application/vnd.apple.mpegurl",
  "application/vnd.dart",
  "application/xml",
  "application/x-aspx",
  "application/x-javascript",
  "application/x-jsp",
  "application/x-httpd-php",
  "application/x-mpegurl",
  "audio/mpegurl",
  "audio/x-mpegurl"
]);
function isTextType(mimeType) {
  return mimeType.startsWith("text/") || mimeType.startsWith("multipart/") || mimeType.includes("json") || mimeType.endsWith("+xml") || ADDITIONAL_TEXT_MIME_TYPES.has(mimeType);
}
function parseContentType(contentType) {
  if (contentType === "*/*") {
    return { mimeType: null, charset: null };
  }
  const { mimeType, params } = parseMimeType(contentType);
  const charset = params.get("charset")?.toLowerCase().trim() ?? null;
  return { mimeType, charset };
}
function parseMimeType(contentType) {
  contentType = contentType.trim();
  let mimeTypeEnd = findFirstIndexOf(contentType, " 	;(");
  if (mimeTypeEnd < 0) {
    mimeTypeEnd = contentType.length;
  }
  const slashPos = contentType.indexOf("/");
  if (slashPos < 0 || slashPos > mimeTypeEnd) {
    return { mimeType: null, params: /* @__PURE__ */ new Map() };
  }
  const mimeType = contentType.substring(0, mimeTypeEnd).toLowerCase();
  const params = /* @__PURE__ */ new Map();
  let offset = contentType.indexOf(";", mimeTypeEnd);
  while (offset >= 0 && offset < contentType.length) {
    ++offset;
    offset = findFirstIndexNotOf(contentType, " 	", offset);
    if (offset < 0) {
      continue;
    }
    const paramNameStart = offset;
    offset = findFirstIndexOf(contentType, ";=", offset);
    if (offset < 0 || contentType[offset] === ";") {
      continue;
    }
    const paramName = contentType.substring(paramNameStart, offset).toLowerCase();
    ++offset;
    offset = findFirstIndexNotOf(contentType, " 	", offset);
    let paramValue = "";
    if (offset < 0 || contentType[offset] === ";") {
      continue;
    } else if (contentType[offset] !== '"') {
      const valueStart = offset;
      offset = contentType.indexOf(";", offset);
      const valueEnd = offset >= 0 ? offset : contentType.length;
      paramValue = contentType.substring(valueStart, valueEnd).trimEnd();
    } else {
      ++offset;
      while (offset < contentType.length && contentType[offset] !== '"') {
        if (contentType[offset] === "\\" && offset + 1 < contentType.length) {
          ++offset;
        }
        paramValue += contentType[offset];
        ++offset;
      }
      offset = contentType.indexOf(";", offset);
    }
    if (!params.has(paramName)) {
      params.set(paramName, paramValue);
    }
  }
  return { mimeType, params };
}
function findFirstIndexOf(searchString, characters, pos = 0) {
  for (let i = pos; i < searchString.length; i++) {
    if (characters.includes(searchString[i])) {
      return i;
    }
  }
  return -1;
}
function findFirstIndexNotOf(searchString, characters, pos = 0) {
  for (let i = pos; i < searchString.length; i++) {
    if (!characters.includes(searchString[i])) {
      return i;
    }
  }
  return -1;
}

// gen/front_end/core/platform/NumberUtilities.js
var NumberUtilities_exports = {};
__export(NumberUtilities_exports, {
  aspectRatio: () => aspectRatio,
  clamp: () => clamp,
  floor: () => floor,
  greatestCommonDivisor: () => greatestCommonDivisor,
  mod: () => mod,
  toFixedIfFloating: () => toFixedIfFloating,
  withThousandsSeparator: () => withThousandsSeparator
});
var clamp = (num, min, max) => {
  let clampedNumber = num;
  if (num < min) {
    clampedNumber = min;
  } else if (num > max) {
    clampedNumber = max;
  }
  return clampedNumber;
};
var mod = (m, n) => {
  return (m % n + n) % n;
};
var toFixedIfFloating = (value) => {
  if (!value || Number.isNaN(Number(value))) {
    return value;
  }
  const number = Number(value);
  return number % 1 ? number.toFixed(3) : String(number);
};
var floor = (value, precision = 0) => {
  if (precision > 0 && precision < 1) {
    precision = 1 / precision;
    return Math.floor(value / precision) * precision;
  }
  const mult = Math.pow(10, precision);
  return Math.floor(value * mult) / mult;
};
var greatestCommonDivisor = (a, b) => {
  a = Math.round(a);
  b = Math.round(b);
  while (b !== 0) {
    const t = b;
    b = a % b;
    a = t;
  }
  return a;
};
var commonRatios = /* @__PURE__ */ new Map([
  ["8\u22365", "16\u223610"]
]);
var aspectRatio = (width, height) => {
  const divisor = greatestCommonDivisor(width, height);
  if (divisor !== 0) {
    width /= divisor;
    height /= divisor;
  }
  const result = `${width}\u2236${height}`;
  return commonRatios.get(result) || result;
};
var withThousandsSeparator = function(num) {
  let str = String(num);
  const re = /(\d+)(\d{3})/;
  while (str.match(re)) {
    str = str.replace(re, "$1\xA0$2");
  }
  return str;
};

// gen/front_end/core/platform/StringUtilities.js
var StringUtilities_exports = {};
__export(StringUtilities_exports, {
  DOUBLE_QUOTE: () => DOUBLE_QUOTE,
  SINGLE_QUOTE: () => SINGLE_QUOTE,
  base64ToSize: () => base64ToSize,
  caseInsensetiveComparator: () => caseInsensetiveComparator,
  collapseWhitespace: () => collapseWhitespace,
  compare: () => compare,
  concatBase64: () => concatBase64,
  countUnmatchedLeftParentheses: () => countUnmatchedLeftParentheses,
  countWtf8Bytes: () => countWtf8Bytes,
  createPlainTextSearchRegex: () => createPlainTextSearchRegex,
  createSearchRegex: () => createSearchRegex,
  escapeCharacters: () => escapeCharacters,
  escapeForRegExp: () => escapeForRegExp,
  filterRegex: () => filterRegex,
  findIndexesOfSubString: () => findIndexesOfSubString,
  findLineEndingIndexes: () => findLineEndingIndexes,
  findUnclosedCssQuote: () => findUnclosedCssQuote,
  formatAsJSLiteral: () => formatAsJSLiteral,
  hashCode: () => hashCode,
  isExtendedKebabCase: () => isExtendedKebabCase,
  isWhitespace: () => isWhitespace,
  naturalOrderComparator: () => naturalOrderComparator,
  regexSpecialCharacters: () => regexSpecialCharacters,
  removeURLFragment: () => removeURLFragment,
  replaceControlCharacters: () => replaceControlCharacters,
  replaceLast: () => replaceLast,
  reverse: () => reverse,
  sprintf: () => sprintf,
  stringifyWithPrecision: () => stringifyWithPrecision,
  stripLineBreaks: () => stripLineBreaks,
  toBase64: () => toBase64,
  toKebabCase: () => toKebabCase,
  toKebabCaseKeys: () => toKebabCaseKeys,
  toLowerCaseString: () => toLowerCaseString,
  toSnakeCase: () => toSnakeCase,
  toTitleCase: () => toTitleCase,
  trimEndWithMaxLength: () => trimEndWithMaxLength,
  trimMiddle: () => trimMiddle,
  trimURL: () => trimURL
});
var escapeCharacters = (inputString, charsToEscape) => {
  let foundChar = false;
  for (let i = 0; i < charsToEscape.length; ++i) {
    if (inputString.indexOf(charsToEscape.charAt(i)) !== -1) {
      foundChar = true;
      break;
    }
  }
  if (!foundChar) {
    return String(inputString);
  }
  let result = "";
  for (let i = 0; i < inputString.length; ++i) {
    if (charsToEscape.indexOf(inputString.charAt(i)) !== -1) {
      result += "\\";
    }
    result += inputString.charAt(i);
  }
  return result;
};
var toHexadecimal = (charCode, padToLength) => {
  return charCode.toString(16).toUpperCase().padStart(padToLength, "0");
};
var escapedReplacements = /* @__PURE__ */ new Map([
  ["\b", "\\b"],
  ["\f", "\\f"],
  ["\n", "\\n"],
  ["\r", "\\r"],
  ["	", "\\t"],
  ["\v", "\\v"],
  ["'", "\\'"],
  ["\\", "\\\\"],
  ["<!--", "\\x3C!--"],
  ["<script", "\\x3Cscript"],
  ["<\/script", "\\x3C/script"]
]);
var formatAsJSLiteral = (content) => {
  const patternsToEscape = /(\\|<(?:!--|\/?script))|(\p{Control})|(\p{Surrogate})/gu;
  const patternsToEscapePlusSingleQuote = /(\\|'|<(?:!--|\/?script))|(\p{Control})|(\p{Surrogate})/gu;
  const escapePattern = (match, pattern, controlChar, loneSurrogate) => {
    if (controlChar) {
      if (escapedReplacements.has(controlChar)) {
        return escapedReplacements.get(controlChar);
      }
      const twoDigitHex = toHexadecimal(controlChar.charCodeAt(0), 2);
      return "\\x" + twoDigitHex;
    }
    if (loneSurrogate) {
      const fourDigitHex = toHexadecimal(loneSurrogate.charCodeAt(0), 4);
      return "\\u" + fourDigitHex;
    }
    if (pattern) {
      return escapedReplacements.get(pattern) || "";
    }
    return match;
  };
  let escapedContent = "";
  let quote = "";
  if (!content.includes("'")) {
    quote = "'";
    escapedContent = content.replaceAll(patternsToEscape, escapePattern);
  } else if (!content.includes('"')) {
    quote = '"';
    escapedContent = content.replaceAll(patternsToEscape, escapePattern);
  } else if (!content.includes("`") && !content.includes("${")) {
    quote = "`";
    escapedContent = content.replaceAll(patternsToEscape, escapePattern);
  } else {
    quote = "'";
    escapedContent = content.replaceAll(patternsToEscapePlusSingleQuote, escapePattern);
  }
  return `${quote}${escapedContent}${quote}`;
};
var sprintf = (fmt, ...args) => {
  let argIndex = 0;
  const RE = /%(?:(\d+)\$)?(?:\.(\d*))?([%dfs])/g;
  return fmt.replaceAll(RE, (_, index, precision, specifier) => {
    if (specifier === "%") {
      return "%";
    }
    if (index !== void 0) {
      argIndex = parseInt(index, 10) - 1;
      if (argIndex < 0) {
        throw new RangeError(`Invalid parameter index ${argIndex + 1}`);
      }
    }
    if (argIndex >= args.length) {
      throw new RangeError(`Expected at least ${argIndex + 1} format parameters, but only ${args.length} where given.`);
    }
    if (specifier === "s") {
      const argValue2 = String(args[argIndex++]);
      if (precision !== void 0) {
        return argValue2.substring(0, Number(precision));
      }
      return argValue2;
    }
    let argValue = Number(args[argIndex++]);
    if (isNaN(argValue)) {
      argValue = 0;
    }
    if (specifier === "d") {
      return String(Math.floor(argValue)).padStart(Number(precision), "0");
    }
    if (precision !== void 0) {
      return argValue.toFixed(Number(precision));
    }
    return String(argValue);
  });
};
var toBase64 = (inputString) => {
  function encodeBits(b) {
    return b < 26 ? b + 65 : b < 52 ? b + 71 : b < 62 ? b - 4 : b === 62 ? 43 : b === 63 ? 47 : 65;
  }
  const encoder = new TextEncoder();
  const data = encoder.encode(inputString.toString());
  const n = data.length;
  let encoded = "";
  if (n === 0) {
    return encoded;
  }
  let shift;
  let v = 0;
  for (let i = 0; i < n; i++) {
    shift = i % 3;
    v |= data[i] << (16 >>> shift & 24);
    if (shift === 2) {
      encoded += String.fromCharCode(encodeBits(v >>> 18 & 63), encodeBits(v >>> 12 & 63), encodeBits(v >>> 6 & 63), encodeBits(v & 63));
      v = 0;
    }
  }
  if (shift === 0) {
    encoded += String.fromCharCode(encodeBits(v >>> 18 & 63), encodeBits(v >>> 12 & 63), 61, 61);
  } else if (shift === 1) {
    encoded += String.fromCharCode(encodeBits(v >>> 18 & 63), encodeBits(v >>> 12 & 63), encodeBits(v >>> 6 & 63), 61);
  }
  return encoded;
};
var findIndexesOfSubString = (inputString, searchString) => {
  const matches = [];
  let i = inputString.indexOf(searchString);
  while (i !== -1) {
    matches.push(i);
    i = inputString.indexOf(searchString, i + searchString.length);
  }
  return matches;
};
var findLineEndingIndexes = (inputString) => {
  const endings = findIndexesOfSubString(inputString, "\n");
  endings.push(inputString.length);
  return endings;
};
var isWhitespace = (inputString) => {
  return /^\s*$/.test(inputString);
};
var trimURL = (url, baseURLDomain) => {
  let result = url.replace(/^(https|http|file):\/\//i, "");
  if (baseURLDomain) {
    if (result.toLowerCase().startsWith(baseURLDomain.toLowerCase())) {
      result = result.substr(baseURLDomain.length);
    }
  }
  return result;
};
var collapseWhitespace = (inputString) => {
  return inputString.replace(/[\s\xA0]+/g, " ");
};
var reverse = (inputString) => {
  return inputString.split("").reverse().join("");
};
var replaceControlCharacters = (inputString) => {
  return inputString.replace(/[\0-\x08\x0B\f\x0E-\x1F\x80-\x9F]/g, "\uFFFD");
};
var countWtf8Bytes = (inputString) => {
  let count = 0;
  for (let i = 0; i < inputString.length; i++) {
    const c = inputString.charCodeAt(i);
    if (c <= 127) {
      count++;
    } else if (c <= 2047) {
      count += 2;
    } else if (c < 55296 || 57343 < c) {
      count += 3;
    } else {
      if (c <= 56319 && i + 1 < inputString.length) {
        const next = inputString.charCodeAt(i + 1);
        if (56320 <= next && next <= 57343) {
          count += 4;
          i++;
          continue;
        }
      }
      count += 3;
    }
  }
  return count;
};
var stripLineBreaks = (inputStr) => {
  return inputStr.replace(/(\r)?\n/g, "");
};
var EXTENDED_KEBAB_CASE_REGEXP = /^([a-z0-9]+(?:-[a-z0-9]+)*\.)*[a-z0-9]+(?:-[a-z0-9]+)*$/;
var isExtendedKebabCase = (inputStr) => {
  return EXTENDED_KEBAB_CASE_REGEXP.test(inputStr);
};
var toTitleCase = (inputStr) => {
  return inputStr.substring(0, 1).toUpperCase() + inputStr.substring(1);
};
var removeURLFragment = (inputStr) => {
  const url = new URL(inputStr);
  url.hash = "";
  return url.toString();
};
var SPECIAL_REGEX_CHARACTERS = "^[]{}()\\.^$*+?|-,";
var regexSpecialCharacters = function() {
  return SPECIAL_REGEX_CHARACTERS;
};
var filterRegex = function(query) {
  let regexString = "^(?:.*\\0)?";
  for (let i = 0; i < query.length; ++i) {
    let c = query.charAt(i);
    if (SPECIAL_REGEX_CHARACTERS.indexOf(c) !== -1) {
      c = "\\" + c;
    }
    regexString += "[^\\0" + c + "]*" + c;
  }
  return new RegExp(regexString, "i");
};
var createSearchRegex = function(query, caseSensitive, isRegex, matchWholeWord = false) {
  const regexFlags = caseSensitive ? "g" : "gi";
  let regexObject;
  if (isRegex) {
    try {
      regexObject = new RegExp(query, regexFlags);
    } catch {
    }
  }
  if (!regexObject) {
    regexObject = createPlainTextSearchRegex(query, regexFlags);
  }
  if (matchWholeWord && regexObject) {
    regexObject = new RegExp(`\\b${regexObject.source}\\b`, regexFlags);
  }
  return regexObject;
};
var caseInsensetiveComparator = function(a, b) {
  a = a.toUpperCase();
  b = b.toUpperCase();
  if (a === b) {
    return 0;
  }
  return a > b ? 1 : -1;
};
var hashCode = function(string) {
  if (!string) {
    return 0;
  }
  const p = (1 << 30) * 4 - 5;
  const z = 1345575271;
  const z2 = 1506996573;
  let s = 0;
  let zi = 1;
  for (let i = 0; i < string.length; i++) {
    const xi = string.charCodeAt(i) * z2;
    s = (s + zi * xi) % p;
    zi = zi * z % p;
  }
  s = (s + zi * (p - 1)) % p;
  return Math.abs(s | 0);
};
var compare = (a, b) => {
  if (a > b) {
    return 1;
  }
  if (a < b) {
    return -1;
  }
  return 0;
};
var trimMiddle = (str, maxLength) => {
  if (str.length <= maxLength) {
    return String(str);
  }
  let leftHalf = maxLength >> 1;
  let rightHalf = maxLength - leftHalf - 1;
  if (str.codePointAt(str.length - rightHalf - 1) >= 65536) {
    --rightHalf;
    ++leftHalf;
  }
  if (leftHalf > 0 && str.codePointAt(leftHalf - 1) >= 65536) {
    --leftHalf;
  }
  return str.substr(0, leftHalf) + "\u2026" + str.substr(str.length - rightHalf, rightHalf);
};
var trimEndWithMaxLength = (str, maxLength) => {
  if (str.length <= maxLength) {
    return String(str);
  }
  return str.substr(0, maxLength - 1) + "\u2026";
};
var escapeForRegExp = (str) => {
  return escapeCharacters(str, SPECIAL_REGEX_CHARACTERS);
};
var naturalOrderComparator = (a, b) => {
  const chunk = /^\d+|^\D+/;
  let chunkA, chunkB, numA, numB;
  while (true) {
    if (a) {
      if (!b) {
        return 1;
      }
    } else {
      if (b) {
        return -1;
      }
      return 0;
    }
    chunkA = a.match(chunk)[0];
    chunkB = b.match(chunk)[0];
    numA = !Number.isNaN(Number(chunkA));
    numB = !Number.isNaN(Number(chunkB));
    if (numA && !numB) {
      return -1;
    }
    if (numB && !numA) {
      return 1;
    }
    if (numA && numB) {
      const diff = Number(chunkA) - Number(chunkB);
      if (diff) {
        return diff;
      }
      if (chunkA.length !== chunkB.length) {
        if (!Number(chunkA) && !Number(chunkB)) {
          return chunkA.length - chunkB.length;
        }
        return chunkB.length - chunkA.length;
      }
    } else if (chunkA !== chunkB) {
      return chunkA < chunkB ? -1 : 1;
    }
    a = a.substring(chunkA.length);
    b = b.substring(chunkB.length);
  }
};
var base64ToSize = function(content) {
  if (!content) {
    return 0;
  }
  let size = content.length * 3 / 4;
  if (content[content.length - 1] === "=") {
    size--;
  }
  if (content.length > 1 && content[content.length - 2] === "=") {
    size--;
  }
  return size;
};
var SINGLE_QUOTE = "'";
var DOUBLE_QUOTE = '"';
var BACKSLASH = "\\";
var findUnclosedCssQuote = function(str) {
  let unmatchedQuote = "";
  for (let i = 0; i < str.length; ++i) {
    const char = str[i];
    if (char === BACKSLASH) {
      i++;
      continue;
    }
    if (char === SINGLE_QUOTE || char === DOUBLE_QUOTE) {
      if (unmatchedQuote === char) {
        unmatchedQuote = "";
      } else if (unmatchedQuote === "") {
        unmatchedQuote = char;
      }
    }
  }
  return unmatchedQuote;
};
var countUnmatchedLeftParentheses = (str) => {
  const stringLiteralRegex = /'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"/g;
  const strWithoutStrings = str.replace(stringLiteralRegex, "");
  let unmatchedCount = 0;
  for (const c of strWithoutStrings) {
    if (c === "(") {
      unmatchedCount++;
    } else if (c === ")" && unmatchedCount > 0) {
      unmatchedCount--;
    }
  }
  return unmatchedCount;
};
var createPlainTextSearchRegex = function(query, flags) {
  let regex = "";
  for (let i = 0; i < query.length; ++i) {
    const c = query.charAt(i);
    if (regexSpecialCharacters().indexOf(c) !== -1) {
      regex += "\\";
    }
    regex += c;
  }
  return new RegExp(regex, flags || "");
};
var toLowerCaseString = function(input) {
  return input.toLowerCase();
};
var WORD = /[A-Z]{2,}(?=[A-Z0-9][a-z0-9]+|\b|_)|[A-Za-z][0-9]+[a-z]?|[A-Z]?[a-z]+|[0-9][A-Za-z]+|[A-Z]|[0-9]+|[.]/g;
var toKebabCase = function(input) {
  return input.match?.(WORD)?.map((w) => w.toLowerCase()).join("-").replaceAll("-.-", ".") || input;
};
function toKebabCaseKeys(settingValue) {
  return Object.fromEntries(Object.entries(settingValue).map(([key, value]) => [toKebabCase(key), value]));
}
function toSnakeCase(text) {
  if (!text) {
    return "";
  }
  const result = text.replace(/(\p{L})(\p{N})/gu, "$1_$2").replace(/(\p{Lu}+)(\p{Lu}\p{Ll})/gu, "$1_$2").replace(/(\p{Ll}|\p{N})(\p{Lu})/gu, "$1_$2").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "_").replace(/^_|_$/g, "");
  return result;
}
var replaceLast = function(input, search, replacement) {
  const replacementStartIndex = input.lastIndexOf(search);
  if (replacementStartIndex === -1) {
    return input;
  }
  return input.slice(0, replacementStartIndex) + input.slice(replacementStartIndex).replace(search, replacement);
};
var stringifyWithPrecision = function stringifyWithPrecision2(s, precision = 2) {
  if (precision === 0) {
    return s.toFixed(0);
  }
  const string = s.toFixed(precision).replace(/\.?0*$/, "");
  return string === "-0" ? "0" : string;
};
var concatBase64 = function(lhs, rhs) {
  if (lhs.length === 0 || !lhs.endsWith("=")) {
    return lhs + rhs;
  }
  const lhsLeaveAsIs = lhs.substring(0, lhs.length - 4);
  const lhsToDecode = lhs.substring(lhs.length - 4);
  return lhsLeaveAsIs + globalThis.btoa(globalThis.atob(lhsToDecode) + globalThis.atob(rhs));
};

// gen/front_end/core/platform/Timing.js
var Timing_exports = {};
__export(Timing_exports, {
  microSecondsToMilliSeconds: () => microSecondsToMilliSeconds,
  milliSecondsToSeconds: () => milliSecondsToSeconds
});
function milliSecondsToSeconds(x) {
  return x / 1e3;
}
function microSecondsToMilliSeconds(x) {
  return x / 1e3;
}

// gen/front_end/core/platform/TypedArrayUtilities.js
var TypedArrayUtilities_exports = {};
__export(TypedArrayUtilities_exports, {
  createBitVector: () => createBitVector,
  createExpandableBigUint32Array: () => createExpandableBigUint32Array,
  createFixedBigUint32Array: () => createFixedBigUint32Array
});
function createExpandableBigUint32Array() {
  return new ExpandableBigUint32ArrayImpl();
}
function createFixedBigUint32Array(length, maxLengthForTesting) {
  try {
    if (maxLengthForTesting !== void 0 && length > maxLengthForTesting) {
      throw new RangeError();
    }
    return new BasicBigUint32ArrayImpl(length);
  } catch {
    return new SplitBigUint32ArrayImpl(length, maxLengthForTesting);
  }
}
var BasicBigUint32ArrayImpl = class extends Uint32Array {
  getValue(index) {
    return this[index];
  }
  setValue(index, value) {
    this[index] = value;
  }
  asUint32ArrayOrFail() {
    return this;
  }
  asArrayOrFail() {
    throw new Error("Not an array");
  }
};
var SplitBigUint32ArrayImpl = class {
  #data;
  #partLength;
  length;
  constructor(length, maxLengthForTesting) {
    this.#data = [];
    this.length = length;
    let partCount = 1;
    while (true) {
      partCount *= 2;
      this.#partLength = Math.ceil(length / partCount);
      try {
        if (maxLengthForTesting !== void 0 && this.#partLength > maxLengthForTesting) {
          throw new RangeError();
        }
        for (let i = 0; i < partCount; ++i) {
          this.#data[i] = new Uint32Array(this.#partLength);
        }
        return;
      } catch (e) {
        if (this.#partLength < 1e6) {
          throw e;
        }
      }
    }
  }
  getValue(index) {
    if (index >= 0 && index < this.length) {
      const partLength = this.#partLength;
      return this.#data[Math.floor(index / partLength)][index % partLength];
    }
    return this.#data[0][-1];
  }
  setValue(index, value) {
    if (index >= 0 && index < this.length) {
      const partLength = this.#partLength;
      this.#data[Math.floor(index / partLength)][index % partLength] = value;
    }
  }
  asUint32ArrayOrFail() {
    throw new Error("Not a Uint32Array");
  }
  asArrayOrFail() {
    throw new Error("Not an array");
  }
};
var ExpandableBigUint32ArrayImpl = class extends Array {
  getValue(index) {
    return this[index];
  }
  setValue(index, value) {
    this[index] = value;
  }
  asUint32ArrayOrFail() {
    throw new Error("Not a Uint32Array");
  }
  asArrayOrFail() {
    return this;
  }
};
function createBitVector(lengthOrBuffer) {
  return new BitVectorImpl(lengthOrBuffer);
}
var BitVectorImpl = class extends Uint8Array {
  constructor(lengthOrBuffer) {
    if (typeof lengthOrBuffer === "number") {
      super(Math.ceil(lengthOrBuffer / 8));
    } else {
      super(lengthOrBuffer);
    }
  }
  getBit(index) {
    const value = this[index >> 3] & 1 << (index & 7);
    return value !== 0;
  }
  setBit(index) {
    this[index >> 3] |= 1 << (index & 7);
  }
  clearBit(index) {
    this[index >> 3] &= ~(1 << (index & 7));
  }
  previous(index) {
    while (index !== index >> 3 << 3) {
      --index;
      if (this.getBit(index)) {
        return index;
      }
    }
    let byteIndex = (index >> 3) - 1;
    while (byteIndex >= 0 && this[byteIndex] === 0) {
      --byteIndex;
    }
    if (byteIndex < 0) {
      return -1;
    }
    for (index = (byteIndex << 3) + 7; index >= byteIndex << 3; --index) {
      if (this.getBit(index)) {
        return index;
      }
    }
    throw new Error("Unreachable");
  }
};

// gen/front_end/core/platform/TypescriptUtilities.js
var TypescriptUtilities_exports = {};
__export(TypescriptUtilities_exports, {
  assertNever: () => assertNever,
  assertNotNullOrUndefined: () => assertNotNullOrUndefined,
  assertUnhandled: () => assertUnhandled
});
function assertNotNullOrUndefined(val, message) {
  if (val === null || val === void 0) {
    throw new Error(`Expected given value to not be null/undefined but it was: ${val}${message ? `
${message}` : ""}`);
  }
}
function assertNever(_type, message) {
  throw new Error(message);
}
function assertUnhandled(_caseVariable) {
  return _caseVariable;
}

// gen/front_end/core/platform/UIString.js
var UIString_exports = {};
__export(UIString_exports, {
  LocalizedEmptyString: () => LocalizedEmptyString
});
var LocalizedEmptyString = "";

// gen/front_end/core/platform/UserVisibleError.js
var UserVisibleError_exports = {};
__export(UserVisibleError_exports, {
  UserVisibleError: () => UserVisibleError,
  isUserVisibleError: () => isUserVisibleError
});
var UserVisibleError = class extends Error {
  message;
  constructor(message) {
    super(message);
    this.message = message;
  }
};
function isUserVisibleError(error) {
  if (typeof error === "object" && error !== null) {
    return error instanceof UserVisibleError;
  }
  return false;
}
export {
  ArrayUtilities_exports as ArrayUtilities,
  Brand_exports as Brand,
  Constructor_exports as Constructor,
  DateUtilities_exports as DateUtilities,
  DevToolsPath_exports as DevToolsPath,
  HostRuntime_exports as HostRuntime,
  KeyboardUtilities_exports as KeyboardUtilities,
  MapUtilities_exports as MapUtilities,
  MimeType_exports as MimeType,
  NumberUtilities_exports as NumberUtilities,
  StringUtilities_exports as StringUtilities,
  Timing_exports as Timing,
  TypescriptUtilities_exports as TypeScriptUtilities,
  TypedArrayUtilities_exports as TypedArrayUtilities,
  UIString_exports as UIString,
  UserVisibleError_exports as UserVisibleError,
  assertNever,
  assertNotNullOrUndefined,
  assertUnhandled
};
//# sourceMappingURL=platform.js.map

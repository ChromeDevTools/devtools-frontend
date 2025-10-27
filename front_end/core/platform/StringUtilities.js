"use strict";
export const escapeCharacters = (inputString, charsToEscape) => {
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
const toHexadecimal = (charCode, padToLength) => {
  return charCode.toString(16).toUpperCase().padStart(padToLength, "0");
};
const escapedReplacements = /* @__PURE__ */ new Map([
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
export const formatAsJSLiteral = (content) => {
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
export const sprintf = (fmt, ...args) => {
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
export const toBase64 = (inputString) => {
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
      encoded += String.fromCharCode(
        encodeBits(v >>> 18 & 63),
        encodeBits(v >>> 12 & 63),
        encodeBits(v >>> 6 & 63),
        encodeBits(v & 63)
      );
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
export const findIndexesOfSubString = (inputString, searchString) => {
  const matches = [];
  let i = inputString.indexOf(searchString);
  while (i !== -1) {
    matches.push(i);
    i = inputString.indexOf(searchString, i + searchString.length);
  }
  return matches;
};
export const findLineEndingIndexes = (inputString) => {
  const endings = findIndexesOfSubString(inputString, "\n");
  endings.push(inputString.length);
  return endings;
};
export const isWhitespace = (inputString) => {
  return /^\s*$/.test(inputString);
};
export const trimURL = (url, baseURLDomain) => {
  let result = url.replace(/^(https|http|file):\/\//i, "");
  if (baseURLDomain) {
    if (result.toLowerCase().startsWith(baseURLDomain.toLowerCase())) {
      result = result.substr(baseURLDomain.length);
    }
  }
  return result;
};
export const collapseWhitespace = (inputString) => {
  return inputString.replace(/[\s\xA0]+/g, " ");
};
export const reverse = (inputString) => {
  return inputString.split("").reverse().join("");
};
export const replaceControlCharacters = (inputString) => {
  return inputString.replace(/[\0-\x08\x0B\f\x0E-\x1F\x80-\x9F]/g, "\uFFFD");
};
export const countWtf8Bytes = (inputString) => {
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
export const stripLineBreaks = (inputStr) => {
  return inputStr.replace(/(\r)?\n/g, "");
};
const EXTENDED_KEBAB_CASE_REGEXP = /^([a-z0-9]+(?:-[a-z0-9]+)*\.)*[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const isExtendedKebabCase = (inputStr) => {
  return EXTENDED_KEBAB_CASE_REGEXP.test(inputStr);
};
export const toTitleCase = (inputStr) => {
  return inputStr.substring(0, 1).toUpperCase() + inputStr.substring(1);
};
export const removeURLFragment = (inputStr) => {
  const url = new URL(inputStr);
  url.hash = "";
  return url.toString();
};
const SPECIAL_REGEX_CHARACTERS = "^[]{}()\\.^$*+?|-,";
export const regexSpecialCharacters = function() {
  return SPECIAL_REGEX_CHARACTERS;
};
export const filterRegex = function(query) {
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
export const createSearchRegex = function(query, caseSensitive, isRegex, matchWholeWord = false) {
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
export const caseInsensetiveComparator = function(a, b) {
  a = a.toUpperCase();
  b = b.toUpperCase();
  if (a === b) {
    return 0;
  }
  return a > b ? 1 : -1;
};
export const hashCode = function(string) {
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
export const compare = (a, b) => {
  if (a > b) {
    return 1;
  }
  if (a < b) {
    return -1;
  }
  return 0;
};
export const trimMiddle = (str, maxLength) => {
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
export const trimEndWithMaxLength = (str, maxLength) => {
  if (str.length <= maxLength) {
    return String(str);
  }
  return str.substr(0, maxLength - 1) + "\u2026";
};
export const escapeForRegExp = (str) => {
  return escapeCharacters(str, SPECIAL_REGEX_CHARACTERS);
};
export const naturalOrderComparator = (a, b) => {
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
export const base64ToSize = function(content) {
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
export const SINGLE_QUOTE = "'";
export const DOUBLE_QUOTE = '"';
const BACKSLASH = "\\";
export const findUnclosedCssQuote = function(str) {
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
export const countUnmatchedLeftParentheses = (str) => {
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
export const createPlainTextSearchRegex = function(query, flags) {
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
export const toLowerCaseString = function(input) {
  return input.toLowerCase();
};
const WORD = /[A-Z]{2,}(?=[A-Z0-9][a-z0-9]+|\b|_)|[A-Za-z][0-9]+[a-z]?|[A-Z]?[a-z]+|[0-9][A-Za-z]+|[A-Z]|[0-9]+|[.]/g;
export const toKebabCase = function(input) {
  return input.match?.(WORD)?.map((w) => w.toLowerCase()).join("-").replaceAll("-.-", ".") || input;
};
export function toKebabCaseKeys(settingValue) {
  return Object.fromEntries(Object.entries(settingValue).map(([key, value]) => [toKebabCase(key), value]));
}
export function toSnakeCase(text) {
  if (!text) {
    return "";
  }
  const result = text.replace(/(\p{L})(\p{N})/gu, "$1_$2").replace(/(\p{Lu}+)(\p{Lu}\p{Ll})/gu, "$1_$2").replace(/(\p{Ll}|\p{N})(\p{Lu})/gu, "$1_$2").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "_").replace(/^_|_$/g, "");
  return result;
}
export const replaceLast = function(input, search, replacement) {
  const replacementStartIndex = input.lastIndexOf(search);
  if (replacementStartIndex === -1) {
    return input;
  }
  return input.slice(0, replacementStartIndex) + input.slice(replacementStartIndex).replace(search, replacement);
};
export const stringifyWithPrecision = function stringifyWithPrecision2(s, precision = 2) {
  if (precision === 0) {
    return s.toFixed(0);
  }
  const string = s.toFixed(precision).replace(/\.?0*$/, "");
  return string === "-0" ? "0" : string;
};
export const concatBase64 = function(lhs, rhs) {
  if (lhs.length === 0 || !lhs.endsWith("=")) {
    return lhs + rhs;
  }
  const lhsLeaveAsIs = lhs.substring(0, lhs.length - 4);
  const lhsToDecode = lhs.substring(lhs.length - 4);
  return lhsLeaveAsIs + window.btoa(window.atob(lhsToDecode) + window.atob(rhs));
};
//# sourceMappingURL=StringUtilities.js.map

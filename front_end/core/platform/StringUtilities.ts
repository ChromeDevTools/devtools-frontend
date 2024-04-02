// Copyright (c) 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

export const escapeCharacters = (inputString: string, charsToEscape: string): string => {
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

  let result = '';
  for (let i = 0; i < inputString.length; ++i) {
    if (charsToEscape.indexOf(inputString.charAt(i)) !== -1) {
      result += '\\';
    }
    result += inputString.charAt(i);
  }

  return result;
};

const toHexadecimal = (charCode: number, padToLength: number): string => {
  return charCode.toString(16).toUpperCase().padStart(padToLength, '0');
};

// Remember to update the third group in the regexps patternsToEscape and
// patternsToEscapePlusSingleQuote when adding new entries in this map.
const escapedReplacements = new Map([
  ['\b', '\\b'],
  ['\f', '\\f'],
  ['\n', '\\n'],
  ['\r', '\\r'],
  ['\t', '\\t'],
  ['\v', '\\v'],
  ['\'', '\\\''],
  ['\\', '\\\\'],
  ['<!--', '\\x3C!--'],
  ['<script', '\\x3Cscript'],
  ['</script', '\\x3C/script'],
]);

export const formatAsJSLiteral = (content: string): string => {
  const patternsToEscape = /(\\|<(?:!--|\/?script))|(\p{Control})|(\p{Surrogate})/gu;
  const patternsToEscapePlusSingleQuote = /(\\|'|<(?:!--|\/?script))|(\p{Control})|(\p{Surrogate})/gu;
  const escapePattern = (match: string, pattern: string, controlChar: string, loneSurrogate: string): string => {
    if (controlChar) {
      if (escapedReplacements.has(controlChar)) {
        // @ts-ignore https://github.com/microsoft/TypeScript/issues/13086
        return escapedReplacements.get(controlChar);
      }
      const twoDigitHex = toHexadecimal(controlChar.charCodeAt(0), 2);
      return '\\x' + twoDigitHex;
    }
    if (loneSurrogate) {
      const fourDigitHex = toHexadecimal(loneSurrogate.charCodeAt(0), 4);
      return '\\u' + fourDigitHex;
    }
    if (pattern) {
      return escapedReplacements.get(pattern) || '';
    }
    return match;
  };

  let escapedContent = '';
  let quote = '';
  if (!content.includes('\'')) {
    quote = '\'';
    escapedContent = content.replaceAll(patternsToEscape, escapePattern);
  } else if (!content.includes('"')) {
    quote = '"';
    escapedContent = content.replaceAll(patternsToEscape, escapePattern);
  } else if (!content.includes('`') && !content.includes('${')) {
    quote = '`';
    escapedContent = content.replaceAll(patternsToEscape, escapePattern);
  } else {
    quote = '\'';
    escapedContent = content.replaceAll(patternsToEscapePlusSingleQuote, escapePattern);
  }
  return `${quote}${escapedContent}${quote}`;
};

/**
 * This implements a subset of the sprintf() function described in the Single UNIX
 * Specification. It supports the %s, %f, %d, and %% formatting specifiers, and
 * understands the %m$d notation to select the m-th parameter for this substitution,
 * as well as the optional precision for %s, %f, and %d.
 *
 * @param fmt format string.
 * @param args parameters to the format string.
 * @returns the formatted output string.
 */
export const sprintf = (fmt: string, ...args: unknown[]): string => {
  let argIndex = 0;
  const RE = /%(?:(\d+)\$)?(?:\.(\d*))?([%dfs])/g;
  return fmt.replaceAll(RE, (_: string, index?: string, precision?: string, specifier?: string) => {
    if (specifier === '%') {
      return '%';
    }
    if (index !== undefined) {
      argIndex = parseInt(index, 10) - 1;
      if (argIndex < 0) {
        throw new RangeError(`Invalid parameter index ${argIndex + 1}`);
      }
    }
    if (argIndex >= args.length) {
      throw new RangeError(`Expected at least ${argIndex + 1} format parameters, but only ${args.length} where given.`);
    }
    if (specifier === 's') {
      const argValue = String(args[argIndex++]);
      if (precision !== undefined) {
        return argValue.substring(0, Number(precision));
      }
      return argValue;
    }
    let argValue = Number(args[argIndex++]);
    if (isNaN(argValue)) {
      argValue = 0;
    }
    if (specifier === 'd') {
      return String(Math.floor(argValue)).padStart(Number(precision), '0');
    }
    if (precision !== undefined) {
      return argValue.toFixed(Number(precision));
    }
    return String(argValue);
  });
};

export const toBase64 = (inputString: string): string => {
  /* note to the reader: we can't use btoa here because we need to
   * support Unicode correctly. See the test cases for this function and
   * also
   * https://developer.mozilla.org/en-US/docs/Web/API/WindowBase64/Base64_encoding_and_decoding#The_Unicode_Problem
   */

  function encodeBits(b: number): number {
    return b < 26 ? b + 65 : b < 52 ? b + 71 : b < 62 ? b - 4 : b === 62 ? 43 : b === 63 ? 47 : 65;
  }
  const encoder = new TextEncoder();
  const data = encoder.encode(inputString.toString());
  const n = data.length;
  let encoded = '';
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
          encodeBits(v >>> 18 & 63), encodeBits(v >>> 12 & 63), encodeBits(v >>> 6 & 63), encodeBits(v & 63));
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

export const findIndexesOfSubString = (inputString: string, searchString: string): number[] => {
  const matches = [];
  let i = inputString.indexOf(searchString);
  while (i !== -1) {
    matches.push(i);
    i = inputString.indexOf(searchString, i + searchString.length);
  }
  return matches;
};

export const findLineEndingIndexes = (inputString: string): number[] => {
  const endings = findIndexesOfSubString(inputString, '\n');
  endings.push(inputString.length);
  return endings;
};

export const isWhitespace = (inputString: string): boolean => {
  return /^\s*$/.test(inputString);
};

export const trimURL = (url: string, baseURLDomain?: string): string => {
  let result = url.replace(/^(https|http|file):\/\//i, '');
  if (baseURLDomain) {
    if (result.toLowerCase().startsWith(baseURLDomain.toLowerCase())) {
      result = result.substr(baseURLDomain.length);
    }
  }
  return result;
};

export const collapseWhitespace = (inputString: string): string => {
  return inputString.replace(/[\s\xA0]+/g, ' ');
};

export const reverse = (inputString: string): string => {
  return inputString.split('').reverse().join('');
};

export const replaceControlCharacters = (inputString: string): string => {
  // Replace C0 and C1 control character sets with replacement character.
  // Do not replace '\t', \n' and '\r'.
  return inputString.replace(/[\0-\x08\x0B\f\x0E-\x1F\x80-\x9F]/g, '\uFFFD');
};

export const countWtf8Bytes = (inputString: string): number => {
  let count = 0;
  for (let i = 0; i < inputString.length; i++) {
    const c = inputString.charCodeAt(i);
    if (c <= 0x7F) {
      count++;
    } else if (c <= 0x07FF) {
      count += 2;
    } else if (c < 0xD800 || 0xDFFF < c) {
      count += 3;
    } else {
      if (c <= 0xDBFF && i + 1 < inputString.length) {
        // The current character is a leading surrogate, and there is a
        // next character.
        const next = inputString.charCodeAt(i + 1);
        if (0xDC00 <= next && next <= 0xDFFF) {
          // The next character is a trailing surrogate, meaning this
          // is a surrogate pair.
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

export const stripLineBreaks = (inputStr: string): string => {
  return inputStr.replace(/(\r)?\n/g, '');
};

const EXTENDED_KEBAB_CASE_REGEXP = /^([a-z0-9]+(?:-[a-z0-9]+)*\.)*[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Tests if the `inputStr` is following the extended Kebab Case naming convetion,
 * where words are separated with either a dash (`-`) or a dot (`.`), and all
 * characters must be lower-case alphanumeric.
 *
 * For example, it will yield `true` for `'my.amazing-string.literal'`, but `false`
 * for `'Another.AmazingLiteral'` or '`another_amazing_literal'`.
 *
 * @param inputStr the input string to test.
 * @return `true` if the `inputStr` follows the extended Kebab Case convention.
 */
export const isExtendedKebabCase = (inputStr: string): boolean => {
  return EXTENDED_KEBAB_CASE_REGEXP.test(inputStr);
};

export const toTitleCase = (inputStr: string): string => {
  return inputStr.substring(0, 1).toUpperCase() + inputStr.substring(1);
};

export const removeURLFragment = (inputStr: string): string => {
  const url = new URL(inputStr);
  url.hash = '';
  return url.toString();
};

const SPECIAL_REGEX_CHARACTERS = '^[]{}()\\.^$*+?|-,';

export const regexSpecialCharacters = function(): string {
  return SPECIAL_REGEX_CHARACTERS;
};

export const filterRegex = function(query: string): RegExp {
  let regexString = '^(?:.*\\0)?';  // Start from beginning or after a \0
  for (let i = 0; i < query.length; ++i) {
    let c = query.charAt(i);
    if (SPECIAL_REGEX_CHARACTERS.indexOf(c) !== -1) {
      c = '\\' + c;
    }
    regexString += '[^\\0' + c + ']*' + c;
  }
  return new RegExp(regexString, 'i');
};

export const createSearchRegex = function(
    query: string, caseSensitive: boolean, isRegex: boolean, matchWholeWord: boolean = false): RegExp {
  const regexFlags = caseSensitive ? 'g' : 'gi';
  let regexObject;

  if (isRegex) {
    try {
      regexObject = new RegExp(query, regexFlags);
    } catch (e) {
      // Silent catch.
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

export const caseInsensetiveComparator = function(a: string, b: string): number {
  a = a.toUpperCase();
  b = b.toUpperCase();
  if (a === b) {
    return 0;
  }
  return a > b ? 1 : -1;
};

export const hashCode = function(string?: string): number {
  if (!string) {
    return 0;
  }
  // Hash algorithm for substrings is described in "Über die Komplexität der Multiplikation in
  // eingeschränkten Branchingprogrammmodellen" by Woelfe.
  // http://opendatastructures.org/versions/edition-0.1d/ods-java/node33.html#SECTION00832000000000000000
  const p = ((1 << 30) * 4 - 5);  // prime: 2^32 - 5
  const z = 0x5033d967;           // 32 bits from random.org
  const z2 = 0x59d2f15d;          // random odd 32 bit number
  let s = 0;
  let zi = 1;
  for (let i = 0; i < string.length; i++) {
    const xi = string.charCodeAt(i) * z2;
    s = (s + zi * xi) % p;
    zi = (zi * z) % p;
  }
  s = (s + zi * (p - 1)) % p;
  return Math.abs(s | 0);
};

export const compare = (a: string, b: string): number => {
  if (a > b) {
    return 1;
  }
  if (a < b) {
    return -1;
  }
  return 0;
};

export const trimMiddle = (str: string, maxLength: number): string => {
  if (str.length <= maxLength) {
    return String(str);
  }
  let leftHalf = maxLength >> 1;
  let rightHalf = maxLength - leftHalf - 1;
  if ((str.codePointAt(str.length - rightHalf - 1) as number) >= 0x10000) {
    --rightHalf;
    ++leftHalf;
  }
  if (leftHalf > 0 && (str.codePointAt(leftHalf - 1) as number) >= 0x10000) {
    --leftHalf;
  }
  return str.substr(0, leftHalf) + '…' + str.substr(str.length - rightHalf, rightHalf);
};

export const trimEndWithMaxLength = (str: string, maxLength: number): string => {
  if (str.length <= maxLength) {
    return String(str);
  }
  return str.substr(0, maxLength - 1) + '…';
};

export const escapeForRegExp = (str: string): string => {
  return escapeCharacters(str, SPECIAL_REGEX_CHARACTERS);
};

export const naturalOrderComparator = (a: string, b: string): number => {
  const chunk = /^\d+|^\D+/;
  let chunka, chunkb, anum, bnum;
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
    chunka = (a.match(chunk) as string[])[0];
    chunkb = (b.match(chunk) as string[])[0];
    anum = !Number.isNaN(Number(chunka));
    bnum = !Number.isNaN(Number(chunkb));
    if (anum && !bnum) {
      return -1;
    }
    if (bnum && !anum) {
      return 1;
    }
    if (anum && bnum) {
      const diff = Number(chunka) - Number(chunkb);
      if (diff) {
        return diff;
      }
      if (chunka.length !== chunkb.length) {
        if (!Number(chunka) && !Number(chunkb)) {  // chunks are strings of all 0s (special case)
          return chunka.length - chunkb.length;
        }
        return chunkb.length - chunka.length;
      }
    } else if (chunka !== chunkb) {
      return (chunka < chunkb) ? -1 : 1;
    }
    a = a.substring(chunka.length);
    b = b.substring(chunkb.length);
  }
};

export const base64ToSize = function(content: string|null): number {
  if (!content) {
    return 0;
  }
  let size = content.length * 3 / 4;
  if (content[content.length - 1] === '=') {
    size--;
  }
  if (content.length > 1 && content[content.length - 2] === '=') {
    size--;
  }
  return size;
};

export const SINGLE_QUOTE = '\'';
export const DOUBLE_QUOTE = '"';
const BACKSLASH = '\\';

export const findUnclosedCssQuote = function(str: string): string {
  let unmatchedQuote = '';
  for (let i = 0; i < str.length; ++i) {
    const char = str[i];
    if (char === BACKSLASH) {
      i++;
      continue;
    }
    if (char === SINGLE_QUOTE || char === DOUBLE_QUOTE) {
      if (unmatchedQuote === char) {
        unmatchedQuote = '';
      } else if (unmatchedQuote === '') {
        unmatchedQuote = char;
      }
    }
  }
  return unmatchedQuote;
};

export const countUnmatchedLeftParentheses = (str: string): number => {
  let unmatchedCount = 0;
  for (const c of str) {
    if (c === '(') {
      unmatchedCount++;
    } else if (c === ')' && unmatchedCount > 0) {
      unmatchedCount--;
    }
  }
  return unmatchedCount;
};

export const createPlainTextSearchRegex = function(query: string, flags?: string): RegExp {
  // This should be kept the same as the one in StringUtil.cpp.
  let regex = '';
  for (let i = 0; i < query.length; ++i) {
    const c = query.charAt(i);
    if (regexSpecialCharacters().indexOf(c) !== -1) {
      regex += '\\';
    }
    regex += c;
  }
  return new RegExp(regex, flags || '');
};

class LowerCaseStringTag {
  private lowerCaseStringTag: (string|undefined);
}

export type LowerCaseString = string&LowerCaseStringTag;

export const toLowerCaseString = function(input: string): LowerCaseString {
  return input.toLowerCase() as LowerCaseString;
};

const WORD = /[A-Z]{2,}(?=[A-Z0-9][a-z0-9]+|\b|_)|[A-Za-z][0-9]+[a-z]?|[A-Z]?[a-z]+|[0-9][A-Za-z]+|[A-Z]|[0-9]+|[.]/g;
//            <---1---><------------2-----------> <---------3--------> <-----4----> <------5-----> <-----6----> <7>
// 1: two or more consecutive uppercase letters. This is useful for identifying acronyms
// 2: lookahead assertion that matches a word boundary
// 3: numeronym: single letter followed by number and another letter
// 4: word starting with an optional uppercase letter
// 5: single digit followed by word to handle '3D' or '2px' (this might be controverial)
// 6: single uppercase letter or number
// 7: a dot character. We extract it into a separate word and remove dashes around it later.
//    This is makes more sense conceptually and allows accounting for all possible word variants.
//    Making dot a part of a word prevent us from handling acronyms or numeronyms after the word
//    correctly without making the RegExp prohibitively complicated.
// https://regex101.com/r/FhMVKc/1
export const toKebabCase = function(input: string): Lowercase<string> {
  return (input.match?.(WORD)?.map(w => w.toLowerCase()).join('-').replaceAll('-.-', '.') || input) as
      Lowercase<string>;
};

/* eslint-disable @typescript-eslint/no-explicit-any */
export function toKebabCaseKeys(settingValue: {
  [x: string]: any,
}): {[x: string]: any} {
  const result: {
    [x: string]: any,
  } = {};
  for (const [key, value] of Object.entries(settingValue)) {
    result[toKebabCase(key)] = value;
  }
  return result;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

// Replaces the last ocurrence of parameter `search` with parameter `replacement` in `input`
export const replaceLast = function(input: string, search: string, replacement: string): string {
  const replacementStartIndex = input.lastIndexOf(search);
  if (replacementStartIndex === -1) {
    return input;
  }

  return input.slice(0, replacementStartIndex) + input.slice(replacementStartIndex).replace(search, replacement);
};

export const stringifyWithPrecision = function stringifyWithPrecision(s: number, precision = 2): string {
  if (precision === 0) {
    return s.toFixed(0);
  }
  const string = s.toFixed(precision).replace(/\.?0*$/, '');
  return string === '-0' ? '0' : string;
};

/**
 * Somewhat efficiently concatenates 2 base64 encoded strings.
 */
export const concatBase64 = function(lhs: string, rhs: string): string {
  if (lhs.length === 0 || !lhs.endsWith('=')) {
    // Empty string or no padding, we can straight-up concatenate.
    return lhs + rhs;
  }
  const lhsLeaveAsIs = lhs.substring(0, lhs.length - 4);
  const lhsToDecode = lhs.substring(lhs.length - 4);
  return lhsLeaveAsIs + window.btoa(window.atob(lhsToDecode) + window.atob(rhs));
};

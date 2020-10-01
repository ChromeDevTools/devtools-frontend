// Copyright (c) 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @param {string} inputString
 * @param {string} charsToEscape
 * @return {string} the string with any matching chars escaped
 */
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

  let result = '';
  for (let i = 0; i < inputString.length; ++i) {
    if (charsToEscape.indexOf(inputString.charAt(i)) !== -1) {
      result += '\\';
    }
    result += inputString.charAt(i);
  }

  return result;
};

/**
 * @enum {string}
 */
const FORMATTER_TYPES = {
  STRING: 'string',
  SPECIFIER: 'specifier',
};

/** @typedef {{type: !FORMATTER_TYPES, value: (string|{description: string}|undefined), specifier: (string|undefined), precision: (number|undefined), substitutionIndex: (number|undefined)}} */
// @ts-ignore typedef
export let FORMATTER_TOKEN;

/**
 * @param {string} formatString
 * @param {!Object.<string, function(string, ...*):*>} formatters
 * @return {!Array.<!FORMATTER_TOKEN>}
 */
export const tokenizeFormatString = function(formatString, formatters) {
  /** @type {!Array<!FORMATTER_TOKEN>} */
  const tokens = [];

  /**
   * @param {string} str
   */
  function addStringToken(str) {
    if (!str) {
      return;
    }
    if (tokens.length && tokens[tokens.length - 1].type === FORMATTER_TYPES.STRING) {
      tokens[tokens.length - 1].value += str;
    } else {
      tokens.push({
        type: FORMATTER_TYPES.STRING,
        value: str,
        specifier: undefined,
        precision: undefined,
        substitutionIndex: undefined
      });
    }
  }

  /**
   * @param {string} specifier
   * @param {number} precision
   * @param {number} substitutionIndex
   */
  function addSpecifierToken(specifier, precision, substitutionIndex) {
    tokens.push({type: FORMATTER_TYPES.SPECIFIER, specifier, precision, substitutionIndex, value: undefined});
  }

  /**
   * @param {number} code
   */
  function addAnsiColor(code) {
    /**
     * @type {!Object<number, string>}
     */
    const types = {3: 'color', 9: 'colorLight', 4: 'bgColor', 10: 'bgColorLight'};
    const colorCodes = ['black', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'lightGray', '', 'default'];
    const colorCodesLight =
        ['darkGray', 'lightRed', 'lightGreen', 'lightYellow', 'lightBlue', 'lightMagenta', 'lightCyan', 'white', ''];
    /** @type {!Object<string, !Array<string>>} */
    const colors = {color: colorCodes, colorLight: colorCodesLight, bgColor: colorCodes, bgColorLight: colorCodesLight};
    const type = types[Math.floor(code / 10)];
    if (!type) {
      return;
    }
    const color = colors[type][code % 10];
    if (!color) {
      return;
    }
    tokens.push({
      type: FORMATTER_TYPES.SPECIFIER,
      specifier: 'c',
      value: {description: (type.startsWith('bg') ? 'background : ' : 'color: ') + color},
      precision: undefined,
      substitutionIndex: undefined,
    });
  }

  let textStart = 0;
  let substitutionIndex = 0;
  const re =
      new RegExp(`%%|%(?:(\\d+)\\$)?(?:\\.(\\d*))?([${Object.keys(formatters).join('')}])|\\u001b\\[(\\d+)m`, 'g');
  for (let match = re.exec(formatString); !!match; match = re.exec(formatString)) {
    const matchStart = match.index;
    if (matchStart > textStart) {
      addStringToken(formatString.substring(textStart, matchStart));
    }

    if (match[0] === '%%') {
      addStringToken('%');
    } else if (match[0].startsWith('%')) {
      // eslint-disable-next-line no-unused-vars
      const [_, substitionString, precisionString, specifierString] = match;
      if (substitionString && Number(substitionString) > 0) {
        substitutionIndex = Number(substitionString) - 1;
      }
      const precision = precisionString ? Number(precisionString) : -1;
      addSpecifierToken(specifierString, precision, substitutionIndex);
      ++substitutionIndex;
    } else {
      const code = Number(match[4]);
      addAnsiColor(code);
    }
    textStart = matchStart + match[0].length;
  }
  addStringToken(formatString.substring(textStart));
  return tokens;
};

/**
 * @param {string} formatString
 * @param {?ArrayLike<*>} substitutions
 * @param {!Object.<string, function(string, ...*):*>} formatters
 * @param {!T} initialValue
 * @param {function(T, *): T} append
 * @param {!Array.<!FORMATTER_TOKEN>=} tokenizedFormat
 * @return {!{formattedResult: T, unusedSubstitutions: ?ArrayLike<*>}};
 * @template T
 */
export const format = function(formatString, substitutions, formatters, initialValue, append, tokenizedFormat) {
  if (!formatString || ((!substitutions || !substitutions.length) && formatString.search(/\u001b\[(\d+)m/) === -1)) {
    return {formattedResult: append(initialValue, formatString), unusedSubstitutions: substitutions};
  }

  function prettyFunctionName() {
    return 'String.format("' + formatString + '", "' + Array.prototype.join.call(substitutions, '", "') + '")';
  }

  /**
   * @param {string} msg
   */
  function warn(msg) {
    console.warn(prettyFunctionName() + ': ' + msg);
  }

  /**
   * @param {string} msg
   */
  function error(msg) {
    console.error(prettyFunctionName() + ': ' + msg);
  }

  let result = initialValue;
  const tokens = tokenizedFormat || tokenizeFormatString(formatString, formatters);
  /** @type {!Object<number, boolean>} */
  const usedSubstitutionIndexes = {};
  /** @type {!ArrayLike<*>} */
  const actualSubstitutions = substitutions || [];

  for (let i = 0; i < tokens.length; ++i) {
    const token = tokens[i];

    if (token.type === FORMATTER_TYPES.STRING) {
      result = append(result, token.value);
      continue;
    }

    if (token.type !== FORMATTER_TYPES.SPECIFIER) {
      error('Unknown token type "' + token.type + '" found.');
      continue;
    }

    if (!token.value && token.substitutionIndex !== undefined &&
        token.substitutionIndex >= actualSubstitutions.length) {
      // If there are not enough substitutions for the current substitutionIndex
      // just output the format specifier literally and move on.
      error(
          'not enough substitution arguments. Had ' + actualSubstitutions.length + ' but needed ' +
          (token.substitutionIndex + 1) + ', so substitution was skipped.');
      result = append(
          result,
          '%' + ((token.precision !== undefined && token.precision > -1) ? token.precision : '') + token.specifier);
      continue;
    }

    if (!token.value && token.substitutionIndex !== undefined) {
      usedSubstitutionIndexes[token.substitutionIndex] = true;
    }

    if (token.specifier === undefined || !(token.specifier in formatters)) {
      // Encountered an unsupported format character, treat as a string.
      warn('unsupported format character \u201C' + token.specifier + '\u201D. Treating as a string.');
      result = append(
          result,
          (token.value || token.substitutionIndex === undefined) ? '' : actualSubstitutions[token.substitutionIndex]);
      continue;
    }

    result = append(
        result,
        formatters[token.specifier](
            token.value || (token.substitutionIndex !== undefined && actualSubstitutions[token.substitutionIndex]),
            token));
  }

  const unusedSubstitutions = [];
  for (let i = 0; i < actualSubstitutions.length; ++i) {
    if (i in usedSubstitutionIndexes) {
      continue;
    }
    unusedSubstitutions.push(actualSubstitutions[i]);
  }

  return {formattedResult: result, unusedSubstitutions: unusedSubstitutions};
};

export const standardFormatters = {
  /**
   * @param {*} substitution
   * @return {number}
   */
  d: function(substitution) {
    return /** @type {number} */ (!isNaN(substitution) ? substitution : 0);
  },

  /**
   * @param {*} substitution
   * @param {!FORMATTER_TOKEN} token
   * @return {number}
   */
  f: function(substitution, token) {
    if (substitution && token.precision !== undefined && token.precision > -1) {
      substitution = substitution.toFixed(token.precision);
    }
    const precision = (token.precision !== undefined && token.precision > -1) ? Number(0).toFixed(token.precision) : 0;
    return /** @type number} */ (!isNaN(substitution) ? substitution : precision);
  },

  /**
   * @param {*} substitution
   * @return {string}
   */
  s: function(substitution) {
    return /** @type {string} */ (substitution);
  }
};

/**
 * @param {string} formatString
 * @param {!Array.<*>} substitutions
 * @return {string}
 */
export const vsprintf = function(formatString, substitutions) {
  // @ts-ignore
  return format(formatString, substitutions, standardFormatters, '', function(a, b) {
           return a + b;
         }).formattedResult;
};

/**
 * @param {string} format
 * @param {...*} var_arg
 * @return {string}
 */
export const sprintf = function(format, var_arg) {
  return vsprintf(format, Array.prototype.slice.call(arguments, 1));
};


 /**
 * @param {string} inputString
 * @return {string}
 */
export const toBase64 = inputString => {
  /* note to the reader: we can't use btoa here because we need to
   * support Unicode correctly. See the test cases for this function and
   * also
   * https://developer.mozilla.org/en-US/docs/Web/API/WindowBase64/Base64_encoding_and_decoding#The_Unicode_Problem
   */

  /**
   * @param {number} b
   * @return {number}
   */
  function encodeBits(b) {
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

/**
 *
 * @param {string} inputString
 * @param {string} searchString
 * @return {!Array.<number>}
 */
export const findIndexesOfSubString = (inputString, searchString) => {
  const matches = [];
  let i = inputString.indexOf(searchString);
  while (i !== -1) {
    matches.push(i);
    i = inputString.indexOf(searchString, i + searchString.length);
  }
  return matches;
};

/**
 *
 * @param {string} inputString
 * @return {!Array.<number>}
 */
export const findLineEndingIndexes = inputString => {
  const endings = findIndexesOfSubString(inputString, '\n');
  endings.push(inputString.length);
  return endings;
};

/**
 * @param {string} inputString
 * @return {boolean}
 */
export const isWhitespace = inputString => {
  return /^\s*$/.test(inputString);
};

/**
 * @param {string} url
 * @param {?string=} baseURLDomain
 * @return {string}
 */
export const trimURL = (url, baseURLDomain) => {
  let result = url.replace(/^(https|http|file):\/\//i, '');
  if (baseURLDomain) {
    if (result.toLowerCase().startsWith(baseURLDomain.toLowerCase())) {
      result = result.substr(baseURLDomain.length);
    }
  }
  return result;
};

/**
 * @param {string} inputString
 * @return {string}
 */
export const collapseWhitespace = inputString => {
  return inputString.replace(/[\s\xA0]+/g, ' ');
};

/**
 *
 * @param {string} inputString
 * @return {string}
 */
export const reverse = inputString => {
  return inputString.split('').reverse().join('');
};

/**
 * @param {string} inputString
 * @return {string}
 */
export const replaceControlCharacters = inputString => {
  // Replace C0 and C1 control character sets with replacement character.
  // Do not replace '\t', \n' and '\r'.
  return inputString.replace(/[\0-\x08\x0B\f\x0E-\x1F\x80-\x9F]/g, '\uFFFD');
};

/**
 * @param {string} inputString
 * @return {number}
 */
export const countWtf8Bytes = inputString => {
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

/**
 * @param {string} inputStr
 */
export const stripLineBreaks = inputStr => {
  return inputStr.replace(/(\r)?\n/g, '');
};

/**
 * @param {string} inputStr
 * @return {string}
 */
export const toTitleCase = inputStr => {
  return inputStr.substring(0, 1).toUpperCase() + inputStr.substring(1);
};

/**
 * @param {string} inputStr
 * @return {string}
 */
export const removeURLFragment = inputStr => {
  const url = new URL(inputStr);
  url.hash = '';
  return url.toString();
};

/**
 * @return {string}
 */
export const regexSpecialCharacters = function() {
  return '^[]{}()\\.^$*+?|-,';
};

/**
 * @param {string} query
 * @return {!RegExp}
 */
export const filterRegex = function(query) {
  const toEscape = regexSpecialCharacters();
  let regexString = '';
  for (let i = 0; i < query.length; ++i) {
    let c = query.charAt(i);
    if (toEscape.indexOf(c) !== -1) {
      c = '\\' + c;
    }
    if (i) {
      regexString += '[^\\0' + c + ']*';
    }
    regexString += c;
  }
  return new RegExp(regexString, 'i');
};

/**
 * @param {string} query
 * @param {boolean} caseSensitive
 * @param {boolean} isRegex
 * @return {!RegExp}
 */
export const createSearchRegex = function(query, caseSensitive, isRegex) {
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
    regexObject = self.createPlainTextSearchRegex(query, regexFlags);
  }

  return regexObject;
};

/**
 * @param {string} a
 * @param {string} b
 * @return {number}
 */
export const caseInsensetiveComparator = function(a, b) {
  a = a.toUpperCase();
  b = b.toUpperCase();
  if (a === b) {
    return 0;
  }
  return a > b ? 1 : -1;
};

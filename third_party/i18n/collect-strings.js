#!/usr/bin/env node
/* eslint-disable no-console, max-len, rulesdir/check_license_header */

/**
 * @license Copyright 2018 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const fs = require('fs');
const glob = require('glob');
const path = require('path');
const tsc = require('typescript');
const {collectAndBakeCtcStrings} = require('./bake-ctc-to-lhl.js');

const {writeIfChanged} = require('../../scripts/build/ninja/write-if-changed.js');

const OUTPUT_ROOT = path.join(process.cwd(), 'front_end');
const UISTRINGS_REGEX = /UIStrings = .*?\};\n/s;

/** @typedef {import('./bake-ctc-to-lhl.js').CtcMessage} CtcMessage */
/** @typedef {Required<Pick<CtcMessage, 'message'|'placeholders'>>} IncrementalCtc */
/** @typedef {{message: string, description: string, meaning: string, examples: Record<string, string>}} ParsedUIString */

const IGNORED_PATH_COMPONENTS = [
  '**/.git/**',
  '**/*_test_runner/**',
  '**/third_party/**',
  '**/*.test.ts',
];

/**
 * Extract the description and examples (if any) from a jsDoc annotation.
 * @param {import('typescript').JSDoc|undefined} ast
 * @param {string} message
 * @return {{description: string, meaning: string, examples: Record<string, string>}}
 */
function computeDescription(ast, message) {
  if (!ast) {
    throw Error(`Missing description comment for message "${message}"`);
  }

  if (ast.tags) {
    // This is a complex description with description and examples.
    let description = '';
    let meaning = '';
    /** @type {Record<string, string>} */
    const examples = {};

    for (const tag of ast.tags) {
      const comment = coerceToSingleLineAndTrim(tag.comment);

      if (tag.tagName.text === 'description') {
        description = comment;
      } else if (tag.tagName.text === 'example') {
        const {placeholderName, exampleValue} = parseExampleJsDoc(comment);
        examples[placeholderName] = exampleValue;
      } else if (tag.tagName.text === 'meaning') {
        meaning = comment;
      } else {
        // Until a compelling use case for supporting more @tags, throw to catch typos, etc.
        throw new Error(`Unexpected tagName "@${tag.tagName.text}"`);
      }
    }

    if (description.length === 0) {
      throw Error(`Empty @description for message "${message}"`);
    }
    return {description, meaning, examples};
  }

  if (ast.comment) {
    // The entire comment is the description, so return everything.
    return {description: coerceToSingleLineAndTrim(ast.comment), examples: {}};
  }

  throw Error(`Missing description comment for message "${message}"`);
}

/**
 * Collapses a jsdoc comment into a single line and trims whitespace.
 * @param {string=} comment
 * @return {string}
 */
function coerceToSingleLineAndTrim(comment = '') {
  // Line breaks within a jsdoc comment should always be replaceable with a space.
  return comment.replace(/\n+/g, ' ').trim();
}

/**
 * Parses a string of the form `{exampleValue} placeholderName`, parsed by tsc
 * as the content of an `@example` tag.
 * @param {string} rawExample
 * @return {{placeholderName: string, exampleValue: string}}
 */
function parseExampleJsDoc(rawExample) {
  const match = rawExample.match(/^{(?<exampleValue>[^}]+)} (?<placeholderName>.+)$/);
  if (!match || !match.groups) {
    throw new Error(`Incorrectly formatted @example: "${rawExample}"`);
  }
  const {placeholderName, exampleValue} = match.groups;
  return {placeholderName, exampleValue};
}

/**
 * Take a series of LHL format ICU messages and converts them
 * to CTC format by replacing {ICU} and `markdown` with
 * $placeholders$. Functional opposite of `bakePlaceholders`. This is commonly
 * called as one of the first steps in translation, via collect-strings.js.
 *
 * Converts this:
 * messages: {
 *  "lighthouse-core/audits/seo/canonical.js | explanationDifferentDomain" {
 *    "message": "Points to a different domain ({url})",
 *    },
 *  },
 * }
 *
 * Into this:
 * messages: {
 *  "lighthouse-core/audits/seo/canonical.js | explanationDifferentDomain" {
 *    "message": "Points to a different domain ($ICU_0$)",
 *    "placeholders": {
 *      "ICU_0": {
 *        "content": "{url}",
 *        "example": "https://example.com/"
 *      },
 *    },
 *  },
 * }
 *
 * Throws if the message violates some basic sanity checking.
 *
 * @param {string} message
 * @param {Record<string, string>} examples
 * @return {IncrementalCtc}
 */
function convertMessageToCtc(message, examples = {}) {
  /** @type {IncrementalCtc} */
  const ctc = {
    message,
    placeholders: {},
  };

  // Process each placeholder type
  _processPlaceholderMarkdownCode(ctc);

  _processPlaceholderMarkdownLink(ctc);

  _processPlaceholderCustomFormattedIcu(ctc);

  _processPlaceholderDirectIcu(ctc, examples);

  _ctcSanityChecks(ctc);

  return ctc;
}

/**
 * Convert code spans into placeholders with examples.
 *
 * @param {IncrementalCtc} icu
 */
function _processPlaceholderMarkdownCode(icu) {
  const message = icu.message;

  // Check that number of backticks is even.
  const match = message.match(/`/g);
  if (match && match.length % 2 !== 0) {
    throw Error(`Open backtick in message "${message}"`);
  }

  icu.message = '';
  let idx = 0;
  for (const segment of _splitMarkdownCodeSpans(message)) {
    if (segment.isCode) {
      const placeholderName = `MARKDOWN_SNIPPET_${idx++}`;
      // Backtick replacement looks unreadable here, so .join() instead.
      icu.message += '$' + placeholderName + '$';
      icu.placeholders[placeholderName] = {
        content: segment.text,
        example: segment.text,
      };
    } else {
      icu.message += segment.text;
    }
  }
}

/**
 * Convert markdown html links into placeholders.
 *
 * @param {IncrementalCtc} icu
 */
function _processPlaceholderMarkdownLink(icu) {
  const message = icu.message;

  // Check for markdown link common errors, ex:
  // * [extra] (space between brackets and parens)
  if (message.match(/\[.*\] \(.*\)/)) {
    throw Error(`Bad Link spacing in message "${message}"`);
  }
  // * [](empty link text)
  if (message.match(/\[\]\(.*\)/)) {
    throw Error(`markdown link text missing in message "${message}"`);
  }

  icu.message = '';
  let idx = 0;

  for (const segment of _splitMarkdownLink(message)) {
    if (!segment.isLink) {
      // Plain text segment.
      icu.message += segment.text;
      continue;
    }

    // Otherwise, append any links found.
    const startPlaceholder = `LINK_START_${idx}`;
    const endPlaceholder = `LINK_END_${idx}`;
    icu.message += '$' + startPlaceholder + '$' + segment.text + '$' + endPlaceholder + '$';
    idx++;
    icu.placeholders[startPlaceholder] = {
      content: '[',
    };
    icu.placeholders[endPlaceholder] = {
      content: `](${segment.linkHref})`,
    };
  }
}

/**
 * Split a string by markdown code spans (enclosed in `backticks`), splitting
 * into segments that were enclosed in backticks (marked as `isCode === true`)
 * and those that outside the backticks (`isCode === false`).
 * @param {string} text
 * @return {Array<{isCode: true, text: string}|{isCode: false, text: string}>}
 */
function _splitMarkdownCodeSpans(text) {
  /** @type {Array<{isCode: true, text: string}|{isCode: false, text: string}>} */
  const segments = [];
  // Split on backticked code spans.
  const parts = text.split(/`(.*?)`/g);
  for (let i = 0; i < parts.length; i++) {
    const text = parts[i];
    // Empty strings are an artifact of splitting, not meaningful.
    if (!text) {
      continue;
    }
    // Alternates between plain text and code segments.
    const isCode = i % 2 !== 0;
    segments.push({
      isCode,
      text,
    });
  }
  return segments;
}

/**
 * Split a string on markdown links (e.g. [some link](https://...)) into
 * segments of plain text that weren't part of a link (marked as
 * `isLink === false`), and segments with text content and a URL that did make
 * up a link (marked as `isLink === true`).
 * @param {string} text
 * @return {Array<{isLink: true, text: string, linkHref: string}|{isLink: false, text: string}>}
 */
function _splitMarkdownLink(text) {
  /** @type {Array<{isLink: true, text: string, linkHref: string}|{isLink: false, text: string}>} */
  const segments = [];
  const parts = text.split(/\[([^\]]+?)\]\((https?:\/\/.*?)\)/g);
  while (parts.length) {
    // Shift off the same number of elements as the pre-split and capture groups.
    const [preambleText, linkText, linkHref] = parts.splice(0, 3);
    if (preambleText) {  // Skip empty text as it's an artifact of splitting, not meaningful.
      segments.push({
        isLink: false,
        text: preambleText,
      });
    }
    // Append link if there are any.
    if (linkText && linkHref) {
      segments.push({
        isLink: true,
        text: linkText,
        linkHref,
      });
    }
  }
  return segments;
}

/**
 * Convert custom-formatted ICU syntax into placeholders with examples.
 * Custom formats defined in i18n.js in "format" object.
 *
 * Before:
 *  icu: 'This audit took {timeInMs, number, milliseconds} ms.'
 * After:
 *  icu: 'This audit took $CUSTOM_ICU_0' ms.
 *  placeholders: {
 *    CUSTOM_ICU_0 {
 *      content: {timeInMs, number, milliseconds},
 *      example: 499,
 *    }
 *  }
 *
 * @param {IncrementalCtc} icu
 */
function _processPlaceholderCustomFormattedIcu(icu) {
  // Split on custom-formatted ICU: {var, number, type}
  const parts = icu.message.split(/\{(\w+), (\w+), (\w+)\}/g);
  icu.message = '';
  let idx = 0;

  const rawNameCache = new Map();

  while (parts.length) {
    // Seperate out the match into parts.
    const [preambleText, rawName, format, formatType] = parts.splice(0, 4);
    icu.message += preambleText;

    if (!rawName || !format || !formatType) {
      continue;
    }
    // Check that custom-formatted ICU not using non-supported format ex:
    // * using a second arg anything other than "number"
    // * using a third arg that is not millis, secs, bytes, %, or extended %
    if (!format.match(/^number$/)) {
      throw Error(`Unsupported custom-formatted ICU format var "${format}" in message "${icu.message}"`);
    }
    if (!formatType.match(/milliseconds|seconds|bytes|percent|extendedPercent/)) {
      throw Error(`Unsupported custom-formatted ICU type var "${formatType}" in message "${icu.message}"`);
    }

    let index;
    const previousRawName = rawNameCache.get(rawName);
    if (previousRawName) {
      const [prevFormat, prevFormatType, prevIndex] = previousRawName;
      if (prevFormat !== format || prevFormatType !== formatType) {
        throw new Error(`must use same format and formatType for a given name. Invalid for: ${rawName}`);
      }

      index = prevIndex;
    } else {
      index = idx++;
      rawNameCache.set(rawName, [format, formatType, index]);
    }

    // Append ICU replacements if there are any.
    const placeholderName = `CUSTOM_ICU_${index}`;
    icu.message += `$${placeholderName}$`;
    let example;

    // Make some good examples.
    switch (formatType) {
      case 'seconds':
        example = '2.4';
        break;
      case 'percent':
        example = '54.6%';
        break;
      case 'extendedPercent':
        example = '37.92%';
        break;
      case 'milliseconds':
      case 'bytes':
        example = '499';
        break;
      default:
        // This shouldn't be possible, but if the above formatType regex fails, this is fallback.
        throw Error('Unknown formatType');
    }

    icu.placeholders[placeholderName] = {
      content: `{${rawName}, number, ${formatType}}`,
      example,
    };
  }
}

/**
 * Check a string with plurals e.g.
 * {n, plural, =0 {no things} =1 {# thing} other {# things}}
 *
 * @param {IncrementalCtc} icu
 */
function _checkPluralGroupsIcu(message, pluralMatches) {
  if (pluralMatches[0].length < message.length) {
    throw Error(
        `Message with plural "${message}" has text outside of the plural. ` +
        'Move all text inside the plural expression for the best translation.');
  }
  if (!pluralMatches[1].includes('=1 {') || !pluralMatches[1].includes('other {')) {
    throw Error(
        `Message with plural "${message}" doesn't have the required "=1" ` +
        'and "other" plural groups.');
  }
}

/**
 * Add examples for direct ICU replacement.
 *
 * @param {IncrementalCtc} icu
 * @param {Record<string, string>} examples
 */
function _processPlaceholderDirectIcu(icu, examples) {
  let tempMessage = icu.message;
  let idx = 0;
  const findIcu = /\{(\w+)\}/g;

  const pluralMatches = /\{\w+, plural, (.+)\}/g.exec(tempMessage);
  if (pluralMatches) {
    _checkPluralGroupsIcu(icu, pluralMatches);
  }

  let matches;
  // Make sure all ICU vars have examples
  while ((matches = findIcu.exec(tempMessage)) !== null) {
    const varName = matches[1];
    if (!examples[varName]) {
      throw Error(`Variable '${varName}' is missing @example comment in message "${tempMessage}"`);
    }
  }

  for (const [key, value] of Object.entries(examples)) {
    // Make sure all examples have ICU vars
    if (!icu.message.includes(`{${key}}`)) {
      throw Error(`Example '${key}' provided, but has not corresponding ICU replacement in message "${icu.message}"`);
    }
    const eName = `ICU_${idx++}`;
    tempMessage = tempMessage.replaceAll(`{${key}}`, `$${eName}$`);

    icu.placeholders[eName] = {
      content: `{${key}}`,
      example: value,
    };
  }
  icu.message = tempMessage;
}

/**
 * Do some basic sanity checks to a ctc object to confirm that it is valid. Future
 * ctc regression catching should go here.
 *
 * @param {IncrementalCtc} icu the ctc output message to verify
 */
function _ctcSanityChecks(icu) {
  // '$$' i.e. "Double Dollar" is sometimes invalid in ctc.
  // Upstream issue on this regex change https://github.com/GoogleChrome/lighthouse/issues/10285
  const regexMatch = icu.message.match(/\$([^$]*?)\$/);
  if (regexMatch && !regexMatch[1]) {
    throw new Error(`Ctc messages cannot contain double dollar: ${icu.message}`);
  }
}

/**
 * Take a series of messages and apply ĥât̂ markers to the translatable portions
 * of the text.  Used to generate `en-XL` locale to debug i18n strings. This is
 * done while messages are in `ctc` format, and therefore modifies only the
 * messages themselves while leaving placeholders untouched.
 *
 * @param {Record<string, CtcMessage>} messages
 * @return {Record<string, CtcMessage>}
 */
function createPsuedoLocaleStrings(messages) {
  /** @type {Record<string, CtcMessage>} */
  const psuedoLocalizedStrings = {};
  for (const [key, ctc] of Object.entries(messages)) {
    const message = ctc.message;
    const psuedoLocalizedString = [];
    let braceCount = 0;
    let inPlaceholder = false;
    let useHatForAccentMark = true;
    for (const char of message) {
      psuedoLocalizedString.push(char);
      if (char === '$') {
        inPlaceholder = !inPlaceholder;
        continue;
      }
      if (inPlaceholder) {
        continue;
      }

      if (char === '{') {
        braceCount++;
      } else if (char === '}') {
        braceCount--;
      }

      // Hack to not change {plural{ICU}braces} nested an odd number of times.
      // ex: "{itemCount, plural, =1 {1 link found} other {# links found}}"
      // becomes "{itemCount, plural, =1 {1 l̂ín̂ḱ f̂óûńd̂} other {# ĺîńk̂ś f̂óûńd̂}}"
      // ex: "{itemCount, plural, =1 {1 link {nested_replacement} found} other {# links {nested_replacement} found}}"
      // becomes: "{itemCount, plural, =1 {1 l̂ín̂ḱ {nested_replacement} f̂óûńd̂} other {# ĺîńk̂ś {nested_replacement} f̂óûńd̂}}"
      if (braceCount % 2 === 1) {
        continue;
      }

      // Add diacritical marks to the preceding letter, alternating between a hat ( ̂ ) and an acute (´).
      if (/[a-z]/i.test(char)) {
        psuedoLocalizedString.push(useHatForAccentMark ? '\u0302' : '\u0301');
        useHatForAccentMark = !useHatForAccentMark;
      }
    }
    psuedoLocalizedStrings[key] = {
      message: psuedoLocalizedString.join(''),
      description: ctc.description,
      placeholders: ctc.placeholders,
    };
  }
  return psuedoLocalizedStrings;
}

/**
 * Helper function that retrieves the text identifier of a named node in the tsc AST.
 * @param {import('typescript').NamedDeclaration} node
 * @return {string}
 */
function getIdentifier(node) {
  if (!node.name || !tsc.isIdentifier(node.name)) {
    throw new Error('no Identifier found');
  }

  return node.name.text;
}

/**
 * Helper function that retrieves the text token in the tsc AST.
 * @param {import('typescript').NamedDeclaration} node
 * @return {string}
 */
function getToken(node) {
  if (!node.initializer) {
    throw new Error('no Token found');
  }
  let token = '';
  getTokenHelper(node.initializer);
  function getTokenHelper(node) {
    if (!tsc.isToken(node)) {
      getTokenHelper(node.left);
      getTokenHelper(node.right);
    } else {
      token += node.text;
    }
  }
  return token;
}

/**
 * @param {string} sourceStr String of the form 'const UIStrings = {...}'.
 * @return {Record<string, ParsedUIString>}
 */
function parseUIStrings(sourceStr) {
  const tsAst = tsc.createSourceFile('uistrings', sourceStr, tsc.ScriptTarget.ES2019, true, tsc.ScriptKind.JS);

  const extractionError = new Error('UIStrings declaration was not extracted correctly by the collect-strings regex.');
  const uiStringsStatement = tsAst.statements[0];
  if (tsAst.statements.length !== 1) {
    throw extractionError;
  }
  if (!tsc.isVariableStatement(uiStringsStatement)) {
    throw extractionError;
  }

  const uiStringsDeclaration = uiStringsStatement.declarationList.declarations[0];
  if (!tsc.isVariableDeclaration(uiStringsDeclaration)) {
    throw extractionError;
  }
  if (getIdentifier(uiStringsDeclaration) !== 'UIStrings') {
    throw extractionError;
  }

  const uiStringsObject = uiStringsDeclaration.initializer;
  if (!uiStringsObject || !tsc.isObjectLiteralExpression(uiStringsObject)) {
    throw extractionError;
  }

  /** @type {Record<string, ParsedUIString>} */
  const parsedMessages = {};

  for (const property of uiStringsObject.properties) {
    const key = getIdentifier(property);

    // concat strings that are broken into parts.
    const message = getToken(property);

    // @ts-ignore - Not part of the public tsc interface yet.
    const jsDocComments = tsc.getJSDocCommentsAndTags(property);
    const {description, meaning, examples} = computeDescription(jsDocComments[0], message);

    parsedMessages[key] = {
      message,
      description,
      meaning,
      examples,
    };
  }

  return parsedMessages;
}

/** @type {Map<string, string>} */
const seenStrings = new Map();

/** @type {number} */
let collisions = 0;

/** @type {Array<string>} */
const collisionStrings = [];

/** @type {Record<string, CtcMessage>} */
const strings = {};

/**
 * Collects all LHL messsages defined in UIString from Javascript files in dir,
 * and converts them into CTC.
 * @param {string} directory
 * @return {Record<string, CtcMessage>}
 */
function collectAllStringsInDir(directory) {
  // If CWD is contains "third_party" (e.g. in a full Chromium checkout) then
  // *all* paths will be ignored. To avoid this, make the directory relative to
  // CWD.
  directory = path.relative(process.cwd(), directory)
  const files = glob.sync('**/*.{js,ts}', {
    cwd: directory,
    ignore: IGNORED_PATH_COMPONENTS,
  });
  for (const pathRelativeToDirectory of files) {
    const absolutePath = path.join(directory, pathRelativeToDirectory);
    const content = fs.readFileSync(absolutePath, 'utf8');
    const regexMatch = content.match(UISTRINGS_REGEX);

    if (!regexMatch) {
      // No UIStrings found in the file text or exports, so move to the next.
      continue;
    }

    // just parse the UIStrings substring to avoid ES version issues, save time, etc
    const justUIStrings = 'const ' + regexMatch[0];

    const parsedMessages = parseUIStrings(justUIStrings);
    for (const [key, parsed] of Object.entries(parsedMessages)) {
      const {message, description, meaning, examples} = parsed;

      // IntlMessageFormat does not work well with multiline strings, they also
      // usually indicate layout happening in i18n, so disallow its use.
      if (/(\\n)/.test(message)) {
        const malformedStringsEx = `The following string contains new line characters (\\n): which are not allowed:
            message: ${message}
            description: ${description}
            please remove them from the string and try again.
            `;
        throw new Error(malformedStringsEx);
      }

      const converted = convertMessageToCtc(message, examples);

      // Don't include placeholders if there are none.
      const placeholders = Object.keys(converted.placeholders).length === 0 ? undefined : converted.placeholders;

      /** @type {CtcMessage} */
      const ctc = {
        message: converted.message,
        description,
        placeholders,
      };

      if (meaning) {
        ctc.meaning = meaning;
      }

      const messageKey = `${pathRelativeToDirectory} | ${key}`;
      if (strings[messageKey] !== undefined) {
        throw new Error(`Duplicate message key '${messageKey}', please rename the '${key}' property.`);
      }
      strings[messageKey] = ctc;

      // check for duplicates, if duplicate, add @description as @meaning to both
      if (seenStrings.has(ctc.message)) {
        ctc.meaning = ctc.meaning ?? ctc.description;
        const seenId = seenStrings.get(ctc.message);
        if (seenId) {
          if (!strings[seenId].meaning) {
            strings[seenId].meaning = strings[seenId].meaning ?? strings[seenId].description;
            collisions++;
          }
          collisionStrings.push(ctc.message);
          collisions++;
        }
      }
      seenStrings.set(ctc.message, messageKey);
    }
  }

  return strings;
}

/**
 * @param {string} directory
 * @param {string} locale
 * @param {Record<string, CtcMessage>} strings
 */
function writeStringsToCtcFiles(directory, locale, strings) {
  const fullPath = path.join(directory, `${locale}.ctc.json`);
  /** @type {Record<string, CtcMessage>} */
  const output = {};
  const sortedEntries = Object.entries(strings).sort(([keyA], [keyB]) => keyA.localeCompare(keyB));
  for (const [key, defn] of sortedEntries) {
    output[key] = defn;
  }

  writeIfChanged(fullPath, JSON.stringify(output, null, 2) + '\n');
}

// @ts-ignore Test if called from the CLI or as a module.
if (require.main === module) {
  if (process.argv.length === 2) {
    throw new Error('Provide at least one directory from which to collect strings!');
  }
  const directories = process.argv.slice(2);
  let collectedStrings = {};
  for (const directory of directories) {
    collectedStrings = {
      ...collectedStrings,
      ...collectAllStringsInDir(directory),
    };
    console.log(`Collected from ${directory}!`);
  }

  const outputDirectory = path.join(OUTPUT_ROOT, 'core/i18n/locales');
  writeStringsToCtcFiles(outputDirectory, 'en-US', collectedStrings);
}

module.exports = {
  parseUIStrings,
  createPsuedoLocaleStrings,
  convertMessageToCtc,
  collectAllStringsInDir,
  collectAndBakeCtcStrings,
  writeStringsToCtcFiles,
  IGNORED_PATH_COMPONENTS,
};

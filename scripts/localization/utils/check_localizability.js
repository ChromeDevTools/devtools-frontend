// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
'use strict';

// Description: Scans for localizability violations in the DevTools front-end.
// Checks all .grdp files and reports messages without descriptions and placeholder examples.
// Audits all Common.UIString(), UI.formatLocalized(), and ls`` calls and
// checks for misuses of concatenation and conditionals. It also looks for
// specific arguments to functions that are expected to be a localized string.
// Since the check scans for common error patterns, it might misidentify something.
// In this case, add it to the excluded errors at the top of the script.

const localizationUtils = require('./localization_utils');
const espreeTypes = localizationUtils.espreeTypes;
const escodegen = localizationUtils.escodegen;

// Exclude known errors
const excludeErrors = [
  'Common.UIString.UIString(view.title())', 'Common.UIString.UIString(setting.title() || \'\')',
  'Common.UIString.UIString(option.text)', 'Common.UIString.UIString(experiment.title)',
  'Common.UIString.UIString(phase.message)', 'Common.UIString.UIString(Help.latestReleaseNote().header)',
  'Common.UIString.UIString(conditions.title)', 'Common.UIString.UIString(extension.title())',
  'Common.UIString.UIString(this._currentValueLabel, value)',

  'Common.UIString(view.title())', 'Common.UIString(setting.title() || \'\')', 'Common.UIString(option.text)',
  'Common.UIString(experiment.title)', 'Common.UIString(phase.message)',
  'Common.UIString(Help.latestReleaseNote().header)', 'Common.UIString(conditions.title)',
  'Common.UIString(extension.title())', 'Common.UIString(this._currentValueLabel, value)'
];

const localizabilityErrors = [];

function includesConditionalExpression(listOfElements) {
  return listOfElements.filter(ele => ele !== undefined && ele.type === espreeTypes.COND_EXPR).length > 0;
}

function includesGritPlaceholders(cookedValue) {
  // $[0-9] is a GRIT placeholder for Chromium l10n, unfortunately it cannot be escaped.
  // https://chromium-review.googlesource.com/c/chromium/src/+/1405148
  const regexPattern = /\$[0-9]+/g;
  return regexPattern.test(cookedValue);
}

/**
 * Matches strings like:
 *   - https://web.dev
 *   - https://web.dev/page
 *   - https://web.dev/page?referrer=devtools_frontend&otherParam=param
 */
function isURL(string) {
  const regexPattern =
      /^(http(s)?:\/\/.)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)$/g;
  return regexPattern.test(string);
}

function addError(error) {
  if (!localizabilityErrors.includes(error)) {
    localizabilityErrors.push(error);
  }
}

function buildConcatenatedNodesList(node, nodes) {
  if (!node) {
    return;
  }
  if (node.left === undefined && node.right === undefined) {
    nodes.push(node);
    return;
  }
  buildConcatenatedNodesList(node.left, nodes);
  buildConcatenatedNodesList(node.right, nodes);
}

/**
 * Recursively check if there is concatenation to localization call.
 * Concatenation is allowed between localized strings and strings that
 * don't contain letters.
 * Example (allowed): ls`Status code: ${statusCode}`
 * Example (allowed): ls`Status code` + ': '
 * Example (disallowed): ls`Status code: ` + statusCode
 * Example (disallowed): ls`Status ` + 'code'
 */
function checkConcatenation(parentNode, node, filePath) {
  function isConcatenationDisallowed(node) {
    if (node.type !== espreeTypes.LITERAL && node.type !== espreeTypes.TEMP_LITERAL) {
      return true;
    }

    let value;
    if (node.type === espreeTypes.LITERAL) {
      value = node.value;
    } else if (node.type === espreeTypes.TEMP_LITERAL && node.expressions.length === 0) {
      value = node.quasis[0].value.cooked;
    }

    if (!value || typeof value !== 'string') {
      return true;
    }

    return value.match(/[a-z]/i) !== null;
  }

  function isConcatenation(node) {
    return (node !== undefined && node.type === espreeTypes.BI_EXPR && node.operator === '+');
  }

  if (isConcatenation(parentNode)) {
    return;
  }

  if (isConcatenation(node)) {
    const concatenatedNodes = [];
    buildConcatenatedNodesList(node, concatenatedNodes);
    const nonLocalizationCalls = concatenatedNodes.filter(node => !localizationUtils.isLocalizationCall(node));
    const hasLocalizationCall = nonLocalizationCalls.length !== concatenatedNodes.length;
    if (hasLocalizationCall) {
      // concatenation with localization call
      const hasConcatenationViolation = nonLocalizationCalls.some(isConcatenationDisallowed);
      if (hasConcatenationViolation) {
        const code = escodegen.generate(node);
        addError(`${localizationUtils.getRelativeFilePathFromSrc(filePath)}${
            localizationUtils.getLocationMessage(
                node.loc)}: string concatenation should be changed to variable substitution with ls: ${code}`);
      }
    }
  }
}

/**
 * Check espree node object that represents the AST of code
 * to see if there is any localization error.
 */
function analyzeCommonUIStringNode(node, filePath, code) {
  const firstArgType = node.arguments[0].type;
  if (firstArgType !== espreeTypes.LITERAL && firstArgType !== espreeTypes.TEMP_LITERAL &&
      firstArgType !== espreeTypes.IDENTIFIER && !excludeErrors.includes(code)) {
    addError(`${localizationUtils.getRelativeFilePathFromSrc(filePath)}${
        localizationUtils.getLocationMessage(node.loc)}: first argument to call should be a string: ${code}`);
  }
  if (includesConditionalExpression(node.arguments.slice(1))) {
    addError(`${localizationUtils.getRelativeFilePathFromSrc(filePath)}${
        localizationUtils.getLocationMessage(
            node.loc)}: conditional(s) found in ${code}. Please extract conditional(s) out of the localization call.`);
  }

  if (node.arguments[0].type === espreeTypes.LITERAL && includesGritPlaceholders(node.arguments[0].value)) {
    addError(`${localizationUtils.getRelativeFilePathFromSrc(filePath)}${
        localizationUtils.getLocationMessage(node.loc)}: possible placeholder(s) found in  ${
        code}. Please extract placeholders(s) out of the localization call.`);
  }

  if (node.arguments[0].type === espreeTypes.LITERAL && isURL(node.arguments[0].value)) {
    addError(`${localizationUtils.getRelativeFilePathFromSrc(filePath)}${
        localizationUtils.getLocationMessage(node.loc)}: localized URL-only string found in ${
        code}. Please extract the URL out of the localization call.`);
  }
}

function analyzeTaggedTemplateNode(node, filePath, code) {
  if (includesConditionalExpression(node.quasi.expressions)) {
    addError(`${localizationUtils.getRelativeFilePathFromSrc(filePath)}${
        localizationUtils.getLocationMessage(
            node.loc)}: conditional(s) found in ${code}. Please extract conditional(s) out of the localization call.`);
  }

  if (includesGritPlaceholders(node.quasi.quasis[0].value.cooked)) {
    addError(`${localizationUtils.getRelativeFilePathFromSrc(filePath)}${
        localizationUtils.getLocationMessage(node.loc)}: possible placeholder(s) found in  ${
        code}. Please extract placeholders(s) out of the localization call.`);
  }

  if (isURL(node.quasi.quasis[0].value.raw)) {
    addError(`${localizationUtils.getRelativeFilePathFromSrc(filePath)}${
        localizationUtils.getLocationMessage(node.loc)}: localized URL-only string found in ${
        code}. Please extract the URL out of the localization call.`);
  }
}

function analyzeGetLocalizedStringNode(node, filePath) {
  // For example,
  // node: i18n.i18n.getLocalizedString(str_, UIStrings.url)
  // firstArg : str_
  // secondArg : UIStrings.url
  if (!node.arguments || node.arguments.length < 2) {
    addError(`${localizationUtils.getRelativeFilePathFromSrc(filePath)}${
        localizationUtils.getLocationMessage(node.loc)}: getLocalizedString call should have two arguments`);
    return;
  }
  const firstArg = node.arguments[0];
  if (firstArg.type !== espreeTypes.IDENTIFIER || firstArg.name !== 'str_') {
    addError(`${localizationUtils.getRelativeFilePathFromSrc(filePath)}${
        localizationUtils.getLocationMessage(node.loc)}: first argument should be 'str_'`);
  }
  const secondArg = node.arguments[1];
  const isCallingUIStringsObject = (secondArg.object && secondArg.object.name === 'UIStrings');
  const isPropertyAnIdentifier = (secondArg.property && secondArg.property.type === espreeTypes.IDENTIFIER);
  if (secondArg.type !== espreeTypes.MEMBER_EXPR || !isCallingUIStringsObject || !isPropertyAnIdentifier) {
    addError(`${localizationUtils.getRelativeFilePathFromSrc(filePath)}${
        localizationUtils.getLocationMessage(
            node.loc)}: second argument should reference an identifier in UIStrings object`);
  }
}

function auditGrdpFile(filePath, fileContent) {
  function reportMissingPlaceholderExample(messageContent, lineNumber) {
    const phRegex = /<ph[^>]*name="([^"]*)">\$\d(s|d|\.\df)(?!<ex>)<\/ph>/gms;
    let match;
    // ph tag that contains $1.2f format placeholder without <ex>
    // match[0]: full match
    // match[1]: ph name
    while ((match = phRegex.exec(messageContent)) !== null) {
      addError(`${localizationUtils.getRelativeFilePathFromSrc(filePath)} Line ${
          lineNumber +
          localizationUtils.lineNumberOfIndex(
              messageContent, match.index)}: missing <ex> in <ph> tag with the name "${match[1]}"`);
    }
  }

  function reportMissingDescriptionAndPlaceholderExample() {
    const messageRegex = /<message[^>]*name="([^"]*)"[^>]*desc="([^"]*)"[^>]*>\s*\n(.*?)<\/message>/gms;
    let match;
    // match[0]: full match
    // match[1]: message IDS_ key
    // match[2]: description
    // match[3]: message content
    while ((match = messageRegex.exec(fileContent)) !== null) {
      const lineNumber = localizationUtils.lineNumberOfIndex(fileContent, match.index);
      if (match[2].trim() === '') {
        addError(`${localizationUtils.getRelativeFilePathFromSrc(filePath)} Line ${
            lineNumber}: missing description for message with the name "${match[1]}"`);
      }
      reportMissingPlaceholderExample(match[3], lineNumber);
    }
  }

  reportMissingDescriptionAndPlaceholderExample();
}

module.exports = {
  analyzeCommonUIStringNode,
  analyzeGetLocalizedStringNode,
  analyzeTaggedTemplateNode,
  auditGrdpFile,
  checkConcatenation,
  localizabilityErrors,
};

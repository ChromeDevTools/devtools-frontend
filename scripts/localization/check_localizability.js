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

const fs = require('fs');
const {promisify} = require('util');
const readFileAsync = promisify(fs.readFile);
const path = require('path');
const localizationUtils = require('./utils/localization_utils');
const esprimaTypes = localizationUtils.esprimaTypes;
const escodegen = localizationUtils.escodegen;
const esprima = localizationUtils.esprima;

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

const usage = `Usage: node ${path.basename(process.argv[0])} [-a | <.js file path>*]

-a: If present, check all devtools frontend .js files
<.js file path>*: List of .js files with absolute paths separated by a space
`;

async function main() {
  if (process.argv.length < 3 || process.argv[2] === '--help') {
    console.log(usage);
    process.exit(0);
  }

  const errors = [];

  try {
    let filePaths = [];
    const frontendPath = path.resolve(__dirname, '..', '..', 'front_end');
    const filePathPromises = [localizationUtils.getFilesFromDirectory(frontendPath, filePaths, ['.grdp'])];
    if (process.argv[2] === '-a') {
      filePathPromises.push(localizationUtils.getFilesFromDirectory(frontendPath, filePaths, ['.js']));
    } else {
      if (process.argv[2] === '--file-list') {
        const fileContent = await readFileAsync(process.argv[3]);
        // convert to a list of filenames, remove the last empty string
        filePaths = fileContent.toString().split(/\r?\n/g).slice(0, -1);
      } else {
        filePaths = process.argv.slice(2);
      }
      // esprima has a bug parsing a valid JSON format, so exclude them.
      filePaths = filePaths.filter(file => {
        return (path.extname(file) !== '.json') && localizationUtils.shouldParseDirectory(file);
      });
    }
    await Promise.all(filePathPromises);

    filePaths.push(localizationUtils.SHARED_STRINGS_PATH);
    const auditFilePromises = filePaths.map(filePath => auditFileForLocalizability(filePath, errors));
    await Promise.all(auditFilePromises);
  } catch (err) {
    console.log(err);
    process.exit(1);
  }

  if (errors.length > 0) {
    console.log(`DevTools localization checker detected errors!\n${errors.join('\n')}`);
    process.exit(1);
  }
  console.log('DevTools localization checker passed');
}

main();

function includesConditionalExpression(listOfElements) {
  return listOfElements.filter(ele => ele !== undefined && ele.type === esprimaTypes.COND_EXPR).length > 0;
}

function addError(error, errors) {
  if (!errors.includes(error)) {
    errors.push(error);
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
function checkConcatenation(parentNode, node, filePath, errors) {
  function isConcatenationDisallowed(node) {
    if (node.type !== esprimaTypes.LITERAL && node.type !== esprimaTypes.TEMP_LITERAL) {
      return true;
    }

    let value;
    if (node.type === esprimaTypes.LITERAL) {
      value = node.value;
    } else if (node.type === esprimaTypes.TEMP_LITERAL && node.expressions.length === 0) {
      value = node.quasis[0].value.cooked;
    }

    if (!value || typeof value !== 'string') {
      return true;
    }

    return value.match(/[a-z]/i) !== null;
  }

  function isConcatenation(node) {
    return (node !== undefined && node.type === esprimaTypes.BI_EXPR && node.operator === '+');
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
        addError(
            `${localizationUtils.getRelativeFilePathFromSrc(filePath)}${
                localizationUtils.getLocationMessage(
                    node.loc)}: string concatenation should be changed to variable substitution with ls: ${code}`,
            errors);
      }
    }
  }
}

/**
 * Check esprima node object that represents the AST of code
 * to see if there is any localization error.
 */
function analyzeNode(parentNode, node, filePath, errors) {
  if (node === undefined || node === null) {
    return;
  }

  if (node instanceof Array) {
    for (const child of node) {
      analyzeNode(node, child, filePath, errors);
    }

    return;
  }

  const keys = Object.keys(node);
  const objKeys = keys.filter(key => {
    return typeof node[key] === 'object' && key !== 'loc';
  });
  if (objKeys.length === 0) {
    // base case: all values are non-objects -> node is a leaf
    return;
  }

  const locCase = localizationUtils.getLocalizationCase(node);
  const code = escodegen.generate(node);
  switch (locCase) {
    case 'Common.UIString':
    case 'UI.formatLocalized': {
      const firstArgType = node.arguments[0].type;
      if (firstArgType !== esprimaTypes.LITERAL && firstArgType !== esprimaTypes.TEMP_LITERAL &&
          firstArgType !== esprimaTypes.IDENTIFIER && !excludeErrors.includes(code)) {
        addError(
            `${localizationUtils.getRelativeFilePathFromSrc(filePath)}${
                localizationUtils.getLocationMessage(node.loc)}: first argument to call should be a string: ${code}`,
            errors);
      }
      if (includesConditionalExpression(node.arguments.slice(1))) {
        addError(
            `${localizationUtils.getRelativeFilePathFromSrc(filePath)}${
                localizationUtils.getLocationMessage(node.loc)}: conditional(s) found in ${
                code}. Please extract conditional(s) out of the localization call.`,
            errors);
      }
      break;
    }

    case 'Tagged Template': {
      if (includesConditionalExpression(node.quasi.expressions)) {
        addError(
            `${localizationUtils.getRelativeFilePathFromSrc(filePath)}${
                localizationUtils.getLocationMessage(node.loc)}: conditional(s) found in ${
                code}. Please extract conditional(s) out of the localization call.`,
            errors);
      }
      break;
    }

    default: {
      // String concatenation to localization call(s) should be changed
      checkConcatenation(parentNode, node, filePath, errors);
      break;
    }
  }

  for (const key of objKeys) {
    // recursively parse all the child nodes
    analyzeNode(node, node[key], filePath, errors);
  }
}

function auditGrdpFile(filePath, fileContent, errors) {
  function reportMissingPlaceholderExample(messageContent, lineNumber) {
    const phRegex = /<ph[^>]*name="([^"]*)">\$\d(s|d|\.\df)(?!<ex>)<\/ph>/gms;
    let match;
    // ph tag that contains $1.2f format placeholder without <ex>
    // match[0]: full match
    // match[1]: ph name
    while ((match = phRegex.exec(messageContent)) !== null) {
      addError(
          `${localizationUtils.getRelativeFilePathFromSrc(filePath)} Line ${
              lineNumber +
              localizationUtils.lineNumberOfIndex(
                  messageContent, match.index)}: missing <ex> in <ph> tag with the name "${match[1]}"`,
          errors);
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
        addError(
            `${localizationUtils.getRelativeFilePathFromSrc(filePath)} Line ${
                lineNumber}: missing description for message with the name "${match[1]}"`,
            errors);
      }
      reportMissingPlaceholderExample(match[3], lineNumber);
    }
  }

  reportMissingDescriptionAndPlaceholderExample();
}

async function auditFileForLocalizability(filePath, errors) {
  const fileContent = await localizationUtils.parseFileContent(filePath);
  if (path.extname(filePath) === '.grdp') {
    return auditGrdpFile(filePath, fileContent, errors);
  }

  const ast = esprima.parseModule(fileContent, {loc: true});

  const relativeFilePath = localizationUtils.getRelativeFilePathFromSrc(filePath);
  for (const node of ast.body) {
    analyzeNode(undefined, node, relativeFilePath, errors);
  }
}

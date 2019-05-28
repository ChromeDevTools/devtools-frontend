// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
'use strict';

// Description: Scans for localizability violations in the DevTools front-end.
// Audits all Common.UIString(), UI.formatLocalized(), and ls`` calls and
// checks for misuses of concatenation and conditionals. It also looks for
// specific arguments to functions that are expected to be a localized string.
// Since the check scans for common error patterns, it might misidentify something.
// In this case, add it to the excluded errors at the top of the script.

const path = require('path');
const localizationUtils = require('./localization_utils/localization_utils');
const esprimaTypes = localizationUtils.esprimaTypes;
const escodegen = localizationUtils.escodegen;
const esprima = localizationUtils.esprima;

// Exclude known errors
const excludeErrors = [
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
    if (process.argv[2] === '-a') {
      const frontendPath = path.resolve(__dirname, '..', 'front_end');
      await localizationUtils.getFilesFromDirectory(frontendPath, filePaths, ['.js']);
    } else {
      filePaths = process.argv.slice(2);
    }

    const promises = [];
    for (const filePath of filePaths)
      promises.push(auditFileForLocalizability(filePath, errors));

    await Promise.all(promises);
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
  if (!errors.includes(error))
    errors.push(error);
}

function buildConcatenatedNodesList(node, nodes) {
  if (!node)
    return;
  if (node.left === undefined && node.right === undefined) {
    nodes.push(node);
    return;
  }
  buildConcatenatedNodesList(node.left, nodes);
  buildConcatenatedNodesList(node.right, nodes);
}

/**
 * Recursively check if there is concatenation to localization call.
 * Concatenation is allowed between localized strings and non-alphabetic strings.
 * It is not allowed between a localized string and a word.
 * Example (allowed): ls`Status Code` + ": "
 * Example (disallowed): ls`Status` + " Code" + ": "
 */
function checkConcatenation(parentNode, node, filePath, errors) {
  function isWord(node) {
    return (node.type === esprimaTypes.LITERAL && !!node.value.match(/[a-z]/i));
  }
  function isConcatenation(node) {
    return (node !== undefined && node.type === esprimaTypes.BI_EXPR && node.operator === '+');
  }

  if (isConcatenation(parentNode))
    return;

  if (isConcatenation(node)) {
    const concatenatedNodes = [];
    buildConcatenatedNodesList(node, concatenatedNodes);
    const hasLocalizationCall =
        !!concatenatedNodes.find(currentNode => localizationUtils.isLocalizationCall(currentNode));
    if (hasLocalizationCall) {
      const hasAlphabeticLiteral = !!concatenatedNodes.find(currentNode => isWord(currentNode));
      if (hasAlphabeticLiteral) {
        const code = escodegen.generate(node);
        addError(
            `${filePath}${
                localizationUtils.getLocationMessage(
                    node.loc)}: string concatenation should be changed to variable substitution with ls: ${code}`,
            errors);
      }
    }
  }
}

/**
 * Check if an argument of a function is localized.
 */
function checkFunctionArgument(functionName, argumentIndex, node, filePath, errors) {
  if (node !== undefined && node.type === esprimaTypes.CALL_EXPR &&
      localizationUtils.verifyFunctionCallee(node.callee, functionName) && node.arguments !== undefined &&
      node.arguments.length > argumentIndex) {
    const arg = node.arguments[argumentIndex];
    // No need to localize empty strings.
    if (arg.type === esprimaTypes.LITERAL && arg.value === '')
      return;

    if (!localizationUtils.isLocalizationCall(arg)) {
      let order = '';
      switch (argumentIndex) {
        case 0:
          order = 'first';
          break;
        case 1:
          order = 'second';
          break;
        case 2:
          order = 'third';
          break;
        default:
          order = `${argumentIndex + 1}th`;
      }
      addError(
          `${filePath}${localizationUtils.getLocationMessage(node.loc)}: ${order} argument to ${
              functionName}() should be localized: ${escodegen.generate(node)}`,
          errors);
    }
  }
}

/**
 * Check esprima node object that represents the AST of code
 * to see if there is any localization error.
 */
function analyzeNode(parentNode, node, filePath, errors) {
  if (node === undefined || node === null)
    return;

  if (node instanceof Array) {
    for (const child of node)
      analyzeNode(node, child, filePath, errors);

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
    case 'UI.formatLocalized':
      const firstArgType = node.arguments[0].type;
      if (firstArgType !== esprimaTypes.LITERAL && firstArgType !== esprimaTypes.TEMP_LITERAL &&
          firstArgType !== esprimaTypes.IDENTIFIER && !excludeErrors.includes(code)) {
        addError(
            `${filePath}${localizationUtils.getLocationMessage(node.loc)}: first argument to call should be a string: ${
                code}`,
            errors);
      }
      if (includesConditionalExpression(node.arguments.slice(1))) {
        addError(
            `${filePath}${localizationUtils.getLocationMessage(node.loc)}: conditional(s) found in ${
                code}. Please extract conditional(s) out of the localization call.`,
            errors);
      }
      break;
    case 'Tagged Template':
      if (includesConditionalExpression(node.quasi.expressions)) {
        addError(
            `${filePath}${localizationUtils.getLocationMessage(node.loc)}: conditional(s) found in ${
                code}. Please extract conditional(s) out of the localization call.`,
            errors);
      }
      break;
    default:
      // String concatenation to localization call(s) should be changed
      checkConcatenation(parentNode, node, filePath, errors);
      break;
  }

  for (const key of objKeys) {
    // recursively parse all the child nodes
    analyzeNode(node, node[key], filePath, errors);
  }
}

async function auditFileForLocalizability(filePath, errors) {
  const fileContent = await localizationUtils.parseFileContent(filePath);
  const ast = esprima.parse(fileContent, {loc: true});

  const relativeFilePath = localizationUtils.getRelativeFilePathFromSrc(filePath);
  for (const node of ast.body)
    analyzeNode(undefined, node, relativeFilePath, errors);
}

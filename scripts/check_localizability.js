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

// Use modules in third_party/node/node_modules
const THIRD_PARTY_PATH = path.resolve(__dirname, '..', '..', '..', '..');
const REPO_NODE_MODULES_PATH = path.resolve(THIRD_PARTY_PATH, 'node', 'node_modules');
const escodegen = require(path.resolve(REPO_NODE_MODULES_PATH, 'escodegen'));
const esprima = require(path.resolve(REPO_NODE_MODULES_PATH, 'esprima'));

const fs = require('fs');
const {promisify} = require('util');
const readDirAsync = promisify(fs.readdir);
const readFileAsync = promisify(fs.readFile);
const statAsync = promisify(fs.stat);

const excludeFiles = ['lighthouse-dt-bundle.js', 'Tests.js'];
const excludeDirs = ['_test_runner', 'Images', 'node_modules'];
// Exclude known errors
const excludeErrors = [
  'Common.UIString(view.title())', 'Common.UIString(setting.title() || \'\')', 'Common.UIString(option.text)',
  'Common.UIString(experiment.title)', 'Common.UIString(phase.message)',
  'Common.UIString(Help.latestReleaseNote().header)', 'Common.UIString(conditions.title)',
  'Common.UIString(extension.title())', 'Common.UIString(this._currentValueLabel, value)'
];

const esprimaTypes = {
  BI_EXPR: 'BinaryExpression',
  CALL_EXPR: 'CallExpression',
  COND_EXPR: 'ConditionalExpression',
  IDENTIFIER: 'Identifier',
  MEMBER_EXPR: 'MemberExpression',
  TAGGED_TEMP_EXPR: 'TaggedTemplateExpression',
  TEMP_LITERAL: 'TemplateLiteral'
};

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
      await getFilesFromDirectory(frontendPath, filePaths);
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

function verifyIdentifier(node, name) {
  return node !== undefined && node.type === esprimaTypes.IDENTIFIER && node.name === name;
}

/**
 * Verify callee of objectName.propertyName(), e.g. Common.UIString().
 */
function verifyCallExpressionCallee(callee, objectName, propertyName) {
  return callee !== undefined && callee.type === esprimaTypes.MEMBER_EXPR && callee.computed === false &&
      verifyIdentifier(callee.object, objectName) && verifyIdentifier(callee.property, propertyName);
}

function isNodeCallOnObject(node, objectName, propertyName) {
  return node !== undefined && node.type === esprimaTypes.CALL_EXPR &&
      verifyCallExpressionCallee(node.callee, objectName, propertyName);
}

function isNodeCommonUIStringCall(node) {
  return isNodeCallOnObject(node, 'Common', 'UIString');
}

function isNodeUIformatLocalized(node) {
  return isNodeCallOnObject(node, 'UI', 'formatLocalized');
}

function isNodelsTaggedTemplateExpression(node) {
  return node !== undefined && node.type === esprimaTypes.TAGGED_TEMP_EXPR && verifyIdentifier(node.tag, 'ls') &&
      node.quasi !== undefined && node.quasi.type !== undefined && node.quasi.type === esprimaTypes.TEMP_LITERAL;
}

function includesConditionalExpression(listOfElements) {
  return listOfElements.filter(ele => ele !== undefined && ele.type === esprimaTypes.COND_EXPR).length > 0;
}

function getLocalizationCase(node) {
  if (isNodeCommonUIStringCall(node))
    return 'Common.UIString';
  else if (isNodelsTaggedTemplateExpression(node))
    return 'Tagged Template';
  else if (isNodeUIformatLocalized(node))
    return 'UI.formatLocalized';
  else
    return null;
}

function isLocalizationCall(node) {
  return isNodeCommonUIStringCall(node) || isNodelsTaggedTemplateExpression(node) || isNodeUIformatLocalized(node);
}

function addError(error, errors) {
  if (!errors.includes(error))
    errors.push(error);
}

function getLocation(node) {
  if (node !== undefined && node.loc !== undefined && node.loc.start !== undefined && node.loc.end !== undefined &&
      node.loc.start.line !== undefined && node.loc.end.line !== undefined) {
    const startLine = node.loc.start.line;
    const endLine = node.loc.end.line;
    if (startLine === endLine)
      return ` Line ${startLine}`;
    else
      return ` Line ${node.loc.start.line}-${node.loc.end.line}`;
  }
  return '';
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
    return (node.type === 'Literal' && !!node.value.match(/[a-z]/i));
  }
  function isConcatenation(node) {
    return (node !== undefined && node.type === esprimaTypes.BI_EXPR && node.operator === '+');
  }

  if (isConcatenation(parentNode))
    return;

  if (isConcatenation(node)) {
    let concatenatedNodes = [];
    buildConcatenatedNodesList(node, concatenatedNodes);
    const hasLocalizationCall = !!concatenatedNodes.find(currentNode => isLocalizationCall(currentNode));
    if (hasLocalizationCall) {
      const hasAlphabeticLiteral = !!concatenatedNodes.find(currentNode => isWord(currentNode));
      if (hasAlphabeticLiteral) {
        const code = escodegen.generate(node);
        addError(
            `${filePath}${
                getLocation(node)}: string concatenation should be changed to variable substitution with ls: ${code}`,
            errors);
      }
    }
  }
}

/**
 * Verify if callee is functionName() or object.functionName().
 */
function verifyFunctionCallee(callee, functionName) {
  return callee !== undefined &&
      ((callee.type === esprimaTypes.IDENTIFIER && callee.name === functionName) ||
       (callee.type === esprimaTypes.MEMBER_EXPR && verifyIdentifier(callee.property, functionName)));
}

/**
 * Check if an argument of a function is localized.
 */
function checkFunctionArgument(functionName, argumentIndex, node, filePath, errors) {
  if (node !== undefined && node.type === esprimaTypes.CALL_EXPR && verifyFunctionCallee(node.callee, functionName) &&
      node.arguments !== undefined && node.arguments.length > argumentIndex) {
    const arg = node.arguments[argumentIndex];
    // No need to localize empty strings.
    if (arg.type == 'Literal' && arg.value === '')
      return;

    if (!isLocalizationCall(arg)) {
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
          `${filePath}${getLocation(node)}: ${order} argument to ${functionName}() should be localized: ${
              escodegen.generate(node)}`,
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

  const locCase = getLocalizationCase(node);
  const code = escodegen.generate(node);
  switch (locCase) {
    case 'Common.UIString':
    case 'UI.formatLocalized':
      const firstArgType = node.arguments[0].type;
      if (firstArgType !== 'Literal' && firstArgType !== 'TemplateLiteral' && firstArgType !== 'Identifier' &&
          !excludeErrors.includes(code)) {
        addError(`${filePath}${getLocation(node)}: first argument to call should be a string: ${code}`, errors);
      }
      if (includesConditionalExpression(node.arguments.slice(1))) {
        addError(
            `${filePath}${getLocation(node)}: conditional(s) found in ${
                code}. Please extract conditional(s) out of the localization call.`,
            errors);
      }
      break;
    case 'Tagged Template':
      if (includesConditionalExpression(node.quasi.expressions)) {
        addError(
            `${filePath}${getLocation(node)}: conditional(s) found in ${
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

function getRelativeFilePathFromSrc(fullFilePath) {
  return path.relative(path.resolve(THIRD_PARTY_PATH, '..'), fullFilePath);
}

async function auditFileForLocalizability(filePath, errors) {
  const fileContent = await readFileAsync(filePath);
  const ast = esprima.parse(fileContent.toString(), {loc: true});

  const relativeFilePath = getRelativeFilePathFromSrc(filePath);
  for (const node of ast.body)
    analyzeNode(undefined, node, relativeFilePath, errors);
}

function shouldParseDirectory(directoryName) {
  return !excludeDirs.reduce((result, dir) => result || directoryName.indexOf(dir) !== -1, false);
}

function shouldParseFile(filePath) {
  return (path.extname(filePath) === '.js' && !excludeFiles.includes(path.basename(filePath)));
}

async function getFilesFromItem(itemPath, filePaths) {
  const stat = await statAsync(itemPath);
  if (stat.isDirectory() && shouldParseDirectory(itemPath))
    return await getFilesFromDirectory(itemPath, filePaths);

  if (shouldParseFile(itemPath))
    filePaths.push(itemPath);
}

async function getFilesFromDirectory(directoryPath, filePaths) {
  const itemNames = await readDirAsync(directoryPath);
  const promises = [];
  for (const itemName of itemNames) {
    const itemPath = path.resolve(directoryPath, itemName);
    promises.push(getFilesFromItem(itemPath, filePaths));
  }
  await Promise.all(promises);
}

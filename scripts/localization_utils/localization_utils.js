// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const fs = require('fs');
const md5 = require('./md5');
const {promisify} = require('util');
const path = require('path');
const readFileAsync = promisify(fs.readFile);
const readDirAsync = promisify(fs.readdir);
const statAsync = promisify(fs.stat);

const esprimaTypes = {
  BI_EXPR: 'BinaryExpression',
  CALL_EXPR: 'CallExpression',
  COND_EXPR: 'ConditionalExpression',
  IDENTIFIER: 'Identifier',
  LITERAL: 'Literal',
  MEMBER_EXPR: 'MemberExpression',
  NEW_EXPR: 'NewExpression',
  TAGGED_TEMP_EXPR: 'TaggedTemplateExpression',
  TEMP_LITERAL: 'TemplateLiteral'
};

const excludeFiles = ['lighthouse-dt-bundle.js', 'Tests.js'];
const excludeDirs = ['test_runner', 'Images', 'langpacks', 'node_modules'];
const cppSpecialCharactersMap = {
  '"': '\\"',
  '\\': '\\\\',
  '\n': '\\n'
};
const IDSPrefix = 'IDS_DEVTOOLS_';

const THIRD_PARTY_PATH = path.resolve(__dirname, '..', '..', '..', '..', '..');
const SRC_PATH = path.resolve(THIRD_PARTY_PATH, '..');
const GRD_PATH = path.resolve(__dirname, '..', '..', 'front_end', 'langpacks', 'devtools_ui_strings.grd');
const REPO_NODE_MODULES_PATH = path.resolve(THIRD_PARTY_PATH, 'node', 'node_modules');
const escodegen = require(path.resolve(REPO_NODE_MODULES_PATH, 'escodegen'));
const esprima = require(path.resolve(REPO_NODE_MODULES_PATH, 'esprima'));

function getRelativeFilePathFromSrc(filePath) {
  return path.relative(SRC_PATH, filePath);
}

function shouldParseDirectory(directoryName) {
  return !excludeDirs.some(dir => directoryName.includes(dir));
}

/**
 * @filepath can be partial path or full path, as long as it contains the file name.
 */
function shouldParseFile(filepath) {
  return !excludeFiles.includes(path.basename(filepath));
}

async function parseFileContent(filePath) {
  const fileContent = await readFileAsync(filePath);
  return fileContent.toString();
}

function isNodeCallOnObject(node, objectName, propertyName) {
  return node !== undefined && node.type === esprimaTypes.CALL_EXPR &&
      verifyCallExpressionCallee(node.callee, objectName, propertyName);
}

function isNodeCommonUIStringCall(node) {
  return isNodeCallOnObject(node, 'Common', 'UIString');
}

function isNodeCommonUIStringFormat(node) {
  return node && node.type === esprimaTypes.NEW_EXPR &&
      verifyCallExpressionCallee(node.callee, 'Common', 'UIStringFormat');
}

function isNodeUIformatLocalized(node) {
  return isNodeCallOnObject(node, 'UI', 'formatLocalized');
}

function isNodelsTaggedTemplateExpression(node) {
  return node !== undefined && node.type === esprimaTypes.TAGGED_TEMP_EXPR && verifyIdentifier(node.tag, 'ls') &&
      node.quasi !== undefined && node.quasi.type !== undefined && node.quasi.type === esprimaTypes.TEMP_LITERAL;
}

/**
 * Verify callee of objectName.propertyName(), e.g. Common.UIString().
 */
function verifyCallExpressionCallee(callee, objectName, propertyName) {
  return callee !== undefined && callee.type === esprimaTypes.MEMBER_EXPR && callee.computed === false &&
      verifyIdentifier(callee.object, objectName) && verifyIdentifier(callee.property, propertyName);
}

function verifyIdentifier(node, name) {
  return node !== undefined && node.type === esprimaTypes.IDENTIFIER && node.name === name;
}

function getLocalizationCase(node) {
  if (isNodeCommonUIStringCall(node))
    return 'Common.UIString';
  else if (isNodeCommonUIStringFormat(node))
    return 'Common.UIStringFormat';
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

/**
 * Verify if callee is functionName() or object.functionName().
 */
function verifyFunctionCallee(callee, functionName) {
  return callee !== undefined &&
      ((callee.type === esprimaTypes.IDENTIFIER && callee.name === functionName) ||
       (callee.type === esprimaTypes.MEMBER_EXPR && verifyIdentifier(callee.property, functionName)));
}

function getLocationMessage(location) {
  if (location !== undefined && location.start !== undefined && location.end !== undefined &&
      location.start.line !== undefined && location.end.line !== undefined) {
    const startLine = location.start.line;
    const endLine = location.end.line;
    if (startLine === endLine)
      return ` Line ${startLine}`;
    else
      return ` Line ${location.start.line}-${location.end.line}`;
  }
  return '';
}

function sanitizeStringIntoGRDFormat(str) {
  return str.replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;')
}

function sanitizeStringIntoFrontendFormat(str) {
  return str.replace(/&apos;/g, '\'')
      .replace(/&quot;/g, '"')
      .replace(/&gt;/g, '>')
      .replace(/&lt;/g, '<')
      .replace(/&amp;/g, '&');
}

function sanitizeString(str, specialCharactersMap) {
  let sanitizedStr = '';
  for (let i = 0; i < str.length; i++) {
    let currChar = str.charAt(i);
    if (specialCharactersMap[currChar] !== undefined)
      currChar = specialCharactersMap[currChar];

    sanitizedStr += currChar;
  }
  return sanitizedStr;
}

function sanitizeStringIntoCppFormat(str) {
  return sanitizeString(str, cppSpecialCharactersMap);
}

async function getFilesFromItem(itemPath, filePaths, acceptedFileEndings) {
  const stat = await statAsync(itemPath);
  if (stat.isDirectory() && shouldParseDirectory(itemPath))
    return await getFilesFromDirectory(itemPath, filePaths, acceptedFileEndings);

  const hasAcceptedEnding =
      acceptedFileEndings.some(acceptedEnding => itemPath.toLowerCase().endsWith(acceptedEnding.toLowerCase()));
  if (hasAcceptedEnding && shouldParseFile(itemPath))
    filePaths.push(itemPath);
}

async function getFilesFromDirectory(directoryPath, filePaths, acceptedFileEndings) {
  const itemNames = await readDirAsync(directoryPath);
  const promises = [];
  for (const itemName of itemNames) {
    const itemPath = path.resolve(directoryPath, itemName);
    promises.push(getFilesFromItem(itemPath, filePaths, acceptedFileEndings));
  }
  return Promise.all(promises);
}

async function getChildDirectoriesFromDirectory(directoryPath) {
  const dirPaths = [];
  const itemNames = await readDirAsync(directoryPath);
  for (const itemName of itemNames) {
    const itemPath = path.resolve(directoryPath, itemName);
    const stat = await statAsync(itemPath);
    if (stat.isDirectory() && shouldParseDirectory(itemName))
      dirPaths.push(itemPath);
  }
  return dirPaths;
}

/**
 * Pad leading / trailing whitespace with ''' so that the whitespace is preserved. See
 * https://www.chromium.org/developers/tools-we-use-in-chromium/grit/grit-users-guide.
 */
function padWhitespace(str) {
  if (str.match(/^\s+/))
    str = `'''${str}`;
  if (str.match(/\s+$/))
    str = `${str}'''`;
  return str;
}

function modifyStringIntoGRDFormat(str, args) {
  let sanitizedStr = sanitizeStringIntoGRDFormat(str);
  sanitizedStr = padWhitespace(sanitizedStr);

  const phRegex = /%d|%f|%s|%.[0-9]f/gm;
  if (!str.match(phRegex))
    return sanitizedStr;

  let phNames;
  if (args !== undefined)
    phNames = args.map(arg => arg.replace(/[^a-zA-Z]/gm, '_').toUpperCase());
  else
    phNames = ['PH1', 'PH2', 'PH3', 'PH4', 'PH5', 'PH6', 'PH7', 'PH8', 'PH9'];

  // It replaces all placeholders with <ph> tags.
  let match;
  let count = 1;
  while ((match = phRegex.exec(sanitizedStr)) !== null) {
    // This is necessary to avoid infinite loops with zero-width matches
    if (match.index === phRegex.lastIndex)
      phRegex.lastIndex++;

    // match[0]: the placeholder (e.g. %d, %s, %.2f, etc.)
    const ph = match[0];
    // e.g. $1s, $1d, $1.2f
    const newPh = `$${count}` + ph.substr(1);

    const i = sanitizedStr.indexOf(ph);
    sanitizedStr = `${sanitizedStr.substring(0, i)}<ph name="${phNames[count - 1]}">${newPh}</ph>${
        sanitizedStr.substring(i + ph.length)}`;
    count++;
  }
  return sanitizedStr;
}

function createGrdpMessage(ids, stringObj) {
  let message = `  <message name="${ids}" desc="${stringObj.description || ''}">\n`;
  message += `    ${modifyStringIntoGRDFormat(stringObj.string, stringObj.arguments)}\n`;
  message += '  </message>\n';
  return message;
}

function getIDSKey(str) {
  return `${IDSPrefix}${md5(str)}`
}

module.exports = {
  createGrdpMessage,
  escodegen,
  esprima,
  esprimaTypes,
  getChildDirectoriesFromDirectory,
  getFilesFromDirectory,
  getIDSKey,
  getLocalizationCase,
  getLocationMessage,
  getRelativeFilePathFromSrc,
  GRD_PATH,
  IDSPrefix,
  isLocalizationCall,
  modifyStringIntoGRDFormat,
  parseFileContent,
  sanitizeStringIntoCppFormat,
  sanitizeStringIntoFrontendFormat,
  verifyFunctionCallee
};
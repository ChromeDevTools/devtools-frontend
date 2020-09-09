// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const fs = require('fs');
const md5 = require('./md5');
const path = require('path');
const readDirAsync = fs.promises.readdir;
const readFileAsync = fs.promises.readFile;
const statAsync = fs.promises.stat;
const writeFileAsync = fs.promises.writeFile;

const espreeTypes = {
  BI_EXPR: 'BinaryExpression',
  CALL_EXPR: 'CallExpression',
  COND_EXPR: 'ConditionalExpression',
  IDENTIFIER: 'Identifier',
  LITERAL: 'Literal',
  MEMBER_EXPR: 'MemberExpression',
  NEW_EXPR: 'NewExpression',
  TAGGED_TEMP_EXPR: 'TaggedTemplateExpression',
  TEMP_LITERAL: 'TemplateLiteral',
  VARIABLE_DECLARATOR: 'VariableDeclarator'
};


const excludeFiles = [
  'Tests.js',
  '.d.ts',  // Skip definition files
];

const excludeDirs = [
  'test_runner',
  'Images',
  'langpacks',
  'node_modules',
  'lighthouse_worker',
  `front_end${path.sep}third_party`,
  `front_end${path.sep}dagre_layout`,
  `front_end${path.sep}javascript_metadata`,
  `front_end${path.sep}generated`,
];

const cppSpecialCharactersMap = {
  '"': '\\"',
  '\\': '\\\\',
  '\n': '\\n'
};
const IDSPrefix = 'IDS_DEVTOOLS_';

const SRC_PATH = path.resolve(__dirname, '..', '..', '..');
const FRONT_END_PATH = path.resolve(SRC_PATH, 'front_end');
const GRD_PATH = path.resolve(FRONT_END_PATH, 'langpacks', 'devtools_ui_strings.grd');
const SHARED_STRINGS_PATH = path.resolve(FRONT_END_PATH, 'langpacks', 'shared_strings.grdp');
const NODE_MODULES_PATH = path.resolve(SRC_PATH, 'node_modules');
const escodegen = require(path.resolve(NODE_MODULES_PATH, 'escodegen'));
const espree = require(path.resolve(NODE_MODULES_PATH, '@typescript-eslint', 'parser'));

function getRelativeFilePathFromSrc(filePath) {
  return path.relative(SRC_PATH, filePath);
}

function getRelativeFilePathFromFrontEnd(filePath) {
  return path.relative(FRONT_END_PATH, filePath);
}

function shouldParseDirectory(directoryName) {
  return !excludeDirs.some(dir => directoryName.includes(dir));
}

/**
 * @filepath can be partial path or full path, as long as it contains the file name.
 */
function shouldParseFile(filepath) {
  let result = true;
  for (const exclusionPath of excludeFiles) {
    if (path.normalize(filepath).includes(path.normalize(exclusionPath))) {
      result = false;
      break;
    }
  }

  return result;
}

async function parseFileContent(filePath) {
  let fileContent = await readFileAsync(filePath, {encoding: 'utf8'});
  // normalize line ending to LF
  fileContent = fileContent.replace(/\r\n/g, '\n');
  return fileContent;
}

function isNodeCallOnObject(node, objectName, propertyName) {
  return node !== undefined && node.type === espreeTypes.CALL_EXPR &&
      verifyCallExpressionCallee(node.callee, objectName, propertyName);
}

function isNodeCallOnNestedObject(node, outerObjectName, innerObjectName, property) {
  return node !== undefined && node.type === espreeTypes.CALL_EXPR &&
      verifyNestedCallExpressionCallee(node.callee, outerObjectName, innerObjectName, property);
}

function isNodeCommonUIStringCall(node) {
  return isNodeCallOnObject(node, 'Common', 'UIString') || isNodeCallOnNestedObject(node, 'Common', 'UIString', 'UIString');
}

function isNodePlatformUIStringCall(node) {
  return isNodeCallOnNestedObject(node, 'Platform', 'UIString', 'UIString');
}

function isNodeUIStringDirectCall(node) {
  return node.type === espreeTypes.CALL_EXPR && node.callee.type === 'Identifier' && node.callee.name === 'UIString';
}

function isNodeCommonUIStringFormat(node) {
  return node && node.type === espreeTypes.NEW_EXPR &&
      (verifyCallExpressionCallee(node.callee, 'Common', 'UIStringFormat') ||
       verifyNestedCallExpressionCallee(node.callee, 'Common', 'UIString', 'UIStringFormat'));
}

function isNodeUIformatLocalized(node) {
  return isNodeCallOnObject(node, 'UI', 'formatLocalized') ||
      isNodeCallOnNestedObject(node, 'UI', 'UIUtils', 'formatLocalized');
}

function isNodelsTaggedTemplateExpression(node) {
  return node !== undefined && node.type === espreeTypes.TAGGED_TEMP_EXPR && verifyIdentifier(node.tag, 'ls') &&
      node.quasi !== undefined && node.quasi.type !== undefined && node.quasi.type === espreeTypes.TEMP_LITERAL;
}

function isNodeGetLocalizedStringCall(node) {
  return isNodeCallOnNestedObject(node, 'i18n', 'i18n', 'getLocalizedString');
}

function isNodeGetFormatLocalizedStringCall(node) {
  return isNodeCallOnNestedObject(node, 'i18n', 'i18n', 'getFormatLocalizedString');
}

function isNodeDeclaresUIStrings(node) {
  return (node.type === espreeTypes.VARIABLE_DECLARATOR && node.id && node.id.name === 'UIStrings');
}

/**
 * Verify callee of objectName.propertyName(), e.g. Common.UIString().
 */
function verifyCallExpressionCallee(callee, objectName, propertyName) {
  return callee !== undefined && callee.type === espreeTypes.MEMBER_EXPR && callee.computed === false &&
      verifyIdentifier(callee.object, objectName) && verifyIdentifier(callee.property, propertyName);
}

/**
 * Verify nested callee of outerObjectName.innerObjectName.propertyName(), e.g. Common.UIString.UIString().
 */
function verifyNestedCallExpressionCallee(callee, outerObjectName, innerObjectName, propertyName) {
  return callee !== undefined && callee.type === espreeTypes.MEMBER_EXPR && callee.computed === false &&
      callee.object.type === espreeTypes.MEMBER_EXPR && verifyIdentifier(callee.object.object, outerObjectName) &&
      verifyIdentifier(callee.object.property, innerObjectName) && verifyIdentifier(callee.property, propertyName);
}

function verifyIdentifier(node, name) {
  return node !== undefined && node.type === espreeTypes.IDENTIFIER && node.name === name;
}

function getLocalizationCaseAndVersion(node) {
  if (isNodeCommonUIStringCall(node)) {
    return {locCase: 'Common.UIString', locVersion: 1};
  }
  if (isNodeCommonUIStringFormat(node)) {
    return {locCase: 'Common.UIStringFormat', locVersion: 1};
  }
  if (isNodelsTaggedTemplateExpression(node)) {
    return {locCase: 'Tagged Template', locVersion: 1};
  }
  if (isNodeUIformatLocalized(node)) {
    return {locCase: 'UI.formatLocalized', locVersion: 1};
  }
  if (isNodePlatformUIStringCall(node) || isNodeUIStringDirectCall(node)) {
    return {locCase: 'Platform.UIString', locVersion: 1};
  }
  if (isNodeGetLocalizedStringCall(node)) {
    return {locCase: 'i18n.i18n.getLocalizedString', locVersion: 2};
  }
  if (isNodeGetFormatLocalizedStringCall(node)) {
    return {locCase: 'i18n.i18n.getFormatLocalizedString', locVersion: 2};
  }
  if (isNodeDeclaresUIStrings(node)) {
    return {locCase: 'UIStrings', locVersion: 2};
  }
  return {locCase: null, locVersion: null};
}

function isLocalizationCall(node) {
  return isNodeCommonUIStringCall(node) || isNodelsTaggedTemplateExpression(node) || isNodeUIformatLocalized(node) ||
      isNodePlatformUIStringCall(node) || isNodeUIStringDirectCall(node);
}

/**
 * A helper function for localization V2 APIs unit tests.
 */
function isLocalizationV2Call(node) {
  return isNodeDeclaresUIStrings(node) || isNodeGetFormatLocalizedStringCall(node) ||
      isNodeGetLocalizedStringCall(node);
}

/**
 * Verify if callee is functionName() or object.functionName().
 */
function verifyFunctionCallee(callee, functionName) {
  return callee !== undefined &&
      ((callee.type === espreeTypes.IDENTIFIER && callee.name === functionName) ||
       (callee.type === espreeTypes.MEMBER_EXPR && verifyIdentifier(callee.property, functionName)));
}

function getLocationMessage(location) {
  if (location !== undefined && location.start !== undefined && location.end !== undefined &&
      location.start.line !== undefined && location.end.line !== undefined) {
    const startLine = location.start.line;
    const endLine = location.end.line;
    if (startLine === endLine) {
      return ` Line ${startLine}`;
    }
    return ` Line ${location.start.line}-${location.end.line}`;
  }
  return '';
}

function sanitizeStringIntoGRDFormat(str) {
  return str.replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
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
    if (specialCharactersMap[currChar] !== undefined) {
      currChar = specialCharactersMap[currChar];
    }

    sanitizedStr += currChar;
  }
  return sanitizedStr;
}

function sanitizeStringIntoCppFormat(str) {
  return sanitizeString(str, cppSpecialCharactersMap);
}

async function getFilesFromItem(itemPath, filePaths, acceptedFileEndings) {
  const stat = await statAsync(itemPath);
  if (stat.isDirectory() && shouldParseDirectory(itemPath)) {
    return await getFilesFromDirectory(itemPath, filePaths, acceptedFileEndings);
  }

  const hasAcceptedEnding =
      acceptedFileEndings.some(acceptedEnding => itemPath.toLowerCase().endsWith(acceptedEnding.toLowerCase()));
  if (hasAcceptedEnding && shouldParseFile(itemPath)) {
    filePaths.push(itemPath);
  }
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
    if (stat.isDirectory() && shouldParseDirectory(itemPath)) {
      dirPaths.push(itemPath);
    }
  }
  return dirPaths;
}

/**
 * Pad leading / trailing whitespace with ''' so that the whitespace is preserved. See
 * https://www.chromium.org/developers/tools-we-use-in-chromium/grit/grit-users-guide.
 */
function padWhitespace(str) {
  if (str.match(/^\s+/)) {
    str = `'''${str}`;
  }
  if (str.match(/\s+$/)) {
    str = `${str}'''`;
  }
  return str;
}

function modifyStringIntoGRDFormat(str, args) {
  let sanitizedStr = sanitizeStringIntoGRDFormat(str);
  sanitizedStr = padWhitespace(sanitizedStr);

  const phRegex = /%d|%f|%s|%.[0-9]f/gm;
  if (!str.match(phRegex)) {
    return sanitizedStr;
  }

  let phNames;
  if (args !== undefined) {
    phNames = args.map(arg => arg.replace(/[^a-zA-Z]/gm, '_').toUpperCase());
  } else {
    phNames = ['PH1', 'PH2', 'PH3', 'PH4', 'PH5', 'PH6', 'PH7', 'PH8', 'PH9'];
  }

  // It replaces all placeholders with <ph> tags.
  let match;
  let count = 1;
  while ((match = phRegex.exec(sanitizedStr)) !== null) {
    // This is necessary to avoid infinite loops with zero-width matches
    if (match.index === phRegex.lastIndex) {
      phRegex.lastIndex++;
    }

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
  message += `    ${stringObj.grdString || modifyStringIntoGRDFormat(stringObj.string, stringObj.arguments)}\n`;
  message += '  </message>\n';
  return message;
}

function getIDSKey(str) {
  return `${IDSPrefix}${md5(str)}`;
}

// Get line number in the file of a character at given index
function lineNumberOfIndex(str, index) {
  const stringToIndex = str.substr(0, index);
  return stringToIndex.split('\n').length;
}

// Relative file path from grdp file with back slash replaced with forward slash
function getRelativeGrdpPath(grdpPath) {
  return path.relative(path.dirname(GRD_PATH), grdpPath).split(path.sep).join('/');
}

function getAbsoluteGrdpPath(relativeGrdpFilePath) {
  return path.resolve(path.dirname(GRD_PATH), relativeGrdpFilePath);
}

// Create a <part> entry, given absolute path of a grdp file
function createPartFileEntry(grdpFilePath) {
  const relativeGrdpFilePath = getRelativeGrdpPath(grdpFilePath);
  return `      <part file="${relativeGrdpFilePath}" />\n`;
}

// grdpFilePaths are sorted and are absolute file paths
async function addChildGRDPFilePathsToGRD(grdpFilePaths) {
  const grdFileContent = await parseFileContent(GRD_PATH);
  const grdLines = grdFileContent.split('\n');

  let newGrdFileContent = '';
  for (let i = 0; i < grdLines.length; i++) {
    const grdLine = grdLines[i];
    // match[0]: full match
    // match[1]: relative grdp file path
    const match = grdLine.match(/<part file="(.*?)"/);
    if (match) {
      const grdpFilePathsRemaining = [];
      for (const grdpFilePath of grdpFilePaths) {
        if (grdpFilePath < getAbsoluteGrdpPath(match[1])) {
          newGrdFileContent += createPartFileEntry(grdpFilePath);
        } else {
          grdpFilePathsRemaining.push(grdpFilePath);
        }
      }
      grdpFilePaths = grdpFilePathsRemaining;
    } else if (grdLine.includes('</messages>')) {
      for (const grdpFilePath of grdpFilePaths) {
        newGrdFileContent += createPartFileEntry(grdpFilePath);
      }
    }
    newGrdFileContent += grdLine;
    if (i < grdLines.length - 1) {
      newGrdFileContent += '\n';
    }
  }
  return writeFileAsync(GRD_PATH, newGrdFileContent);
}

module.exports = {
  addChildGRDPFilePathsToGRD,
  createGrdpMessage,
  createPartFileEntry,
  escodegen,
  espree,
  espreeTypes,
  getAbsoluteGrdpPath,
  getChildDirectoriesFromDirectory,
  getFilesFromDirectory,
  getIDSKey,
  getLocalizationCaseAndVersion,
  getLocationMessage,
  getRelativeFilePathFromFrontEnd,
  getRelativeFilePathFromSrc,
  getRelativeGrdpPath,
  GRD_PATH,
  IDSPrefix,
  isLocalizationCall,
  isLocalizationV2Call,
  lineNumberOfIndex,
  modifyStringIntoGRDFormat,
  parseFileContent,
  SHARED_STRINGS_PATH,
  sanitizeStringIntoCppFormat,
  sanitizeStringIntoFrontendFormat,
  shouldParseDirectory,
  verifyFunctionCallee
};

// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * Functions in this script parse DevTools frontend .js and module.json files,
 * collect localizable strings, check if frontend strings are in .grd/.grdp
 * files and report error if present.
 */

const fs = require('fs');
const path = require('path');
const writeFileAsync = fs.promises.writeFile;
const renameFileAsync = fs.promises.rename;
const ts = require('typescript');
const localizationUtils = require('./localization_utils');
const checkLocalizability = require('./check_localizability');
const escodegen = localizationUtils.escodegen;
const espreeTypes = localizationUtils.espreeTypes;
const espree = localizationUtils.espree;
const extensionStringKeys = ['category', 'destination', 'title', 'title-mac'];
const {parseLocalizableStringFromTypeScriptFile} = require('./parse_typescript_files');

// Format of frontendStrings
// { IDS_md5-hash => {
//     string: string,
//     code: string,
//     isShared: boolean,
//     filepath: string,
//     grdpPath: string,
//     location: {
//       start: {
//         line: number, (1-based)
//         column: number (0-based)
//       },
//       end: {
//         line: number,
//         column: number
//       }
//     },
//     arguments: string[]
//   }
// }
const frontendStrings = new Map();

// Format
// {
//   IDS_KEY => []{
//     actualIDSKey: string,  // the IDS key in the message tag
//     description: string,
//     grdpPath: string,
//     location: {
//       start: {
//         line: number
//       },
//       end: {
//         line: number
//       }
//     }
//   }
// }
const IDSkeys = new Map();
const fileToGRDPMap = new Map();

// Format of V2 localizationCallsMap
// { filePath => []{
//      stringId: string,
//      code: string,
//      location: {
//        start: {
//          line: number, (1-based)
//           column: number (0-based)
//        },
//        end: {
//          line: number,
//          column: number
//        }
//       },
//      arguments: {}
//     }
// }
const localizationCallsMap = new Map();

// Format of uiStringsMap
// { filePath => []{
//       stringId: string,
//       stringValue: string,
//       location: {
//         start: {
//           line: number, (1-based)
//            column: number (0-based)
//         },
//         end: {
//           line: number,
//           column: number
//         }
//       }
//     }
// }
const uiStringsMap = new Map();

const devtoolsFrontendPath = path.resolve(__dirname, '..', '..', '..', 'front_end');
let devtoolsFrontendDirs;
// During migration process, we will update this when a directory is migrated
// e.g. const migratedDirsSet = new Set(['settings', 'console']);
// TODO(crbug.com/941561): Remove once localization V1 is no longer used.
const migratedDirsSet = new Set([]);
const locV1CallsInMigratedFiles = new Set();

/**
 * The following functions validate and update grd/grdp files.
 */

async function validateGrdAndGrdpFiles(shouldAutoFix) {
  const grdError = await validateGrdFile(shouldAutoFix);
  const grdpError = await validateGrdpFiles(shouldAutoFix);
  if (grdError !== '' || grdpError !== '') {
    return `${grdError}\n${grdpError}`;
  }
  return '';
}

function expectedGrdpFilePath(dir) {
  return path.resolve(dir, `${path.basename(dir)}_strings.grdp`);
}

async function validateGrdFile(shouldAutoFix) {
  const fileContent = await localizationUtils.parseFileContent(localizationUtils.GRD_PATH);
  const fileLines = fileContent.split('\n');
  const newLines = [];
  let errors = '';
  fileLines.forEach(line => {
    errors += validateGrdLine(line, newLines);
  });
  if (errors !== '' && shouldAutoFix) {
    await writeFileAsync(localizationUtils.GRD_PATH, newLines.join('\n'));
  }
  return errors;
}

function validateGrdLine(line, newLines) {
  let error = '';
  const match = line.match(/<part file="([^"]*)" \/>/);
  if (!match) {
    newLines.push(line);
    return error;
  }
  // match[0]: full match
  // match[1]: relative grdp file path
  const grdpFilePath = localizationUtils.getAbsoluteGrdpPath(match[1]);
  const expectedGrdpFile = expectedGrdpFilePath(path.dirname(grdpFilePath));
  if (fs.existsSync(grdpFilePath) &&
      (grdpFilePath === expectedGrdpFile || grdpFilePath === localizationUtils.SHARED_STRINGS_PATH)) {
    newLines.push(line);
    return error;
  }
  if (!fs.existsSync(grdpFilePath)) {
    error += `${line.trim()} in ${
                 localizationUtils.getRelativeFilePathFromSrc(
                     localizationUtils.GRD_PATH)} refers to a grdp file that doesn't exist. ` +
        'Please verify the grdp file and update the <part file="..."> entry to reference the correct grdp file. ' +
        `Make sure the grdp file name is ${path.basename(expectedGrdpFile)}.`;
  } else {
    error += `${line.trim()} in ${
        localizationUtils.getRelativeFilePathFromSrc(localizationUtils.GRD_PATH)} should reference "${
        localizationUtils.getRelativeGrdpPath(expectedGrdpFile)}".`;
  }
  return error;
}

async function validateGrdpFiles(shouldAutoFix) {
  const frontendDirsToGrdpFiles = await mapFrontendDirsToGrdpFiles();
  const grdFileContent = await localizationUtils.parseFileContent(localizationUtils.GRD_PATH);
  let errors = '';
  const renameFilePromises = [];
  const grdpFilesToAddToGrd = [];
  frontendDirsToGrdpFiles.forEach((grdpFiles, dir) => {
    errors += validateGrdpFile(dir, grdpFiles, grdFileContent, shouldAutoFix, renameFilePromises, grdpFilesToAddToGrd);
  });
  if (grdpFilesToAddToGrd.length > 0) {
    await localizationUtils.addChildGRDPFilePathsToGRD(grdpFilesToAddToGrd.sort());
  }
  await Promise.all(renameFilePromises);
  return errors;
}

async function mapFrontendDirsToGrdpFiles() {
  devtoolsFrontendDirs =
      devtoolsFrontendDirs || await localizationUtils.getChildDirectoriesFromDirectory(devtoolsFrontendPath);
  const dirToGrdpFiles = new Map();
  const getGrdpFilePromises = devtoolsFrontendDirs.map(dir => {
    const files = [];
    dirToGrdpFiles.set(dir, files);
    return localizationUtils.getFilesFromDirectory(dir, files, ['.grdp']);
  });
  await Promise.all(getGrdpFilePromises);
  return dirToGrdpFiles;
}

function validateGrdpFile(dir, grdpFiles, grdFileContent, shouldAutoFix, renameFilePromises, grdpFilesToAddToGrd) {
  let error = '';
  const expectedGrdpFile = expectedGrdpFilePath(dir);
  if (grdpFiles.length === 0) {
    return error;
  }
  if (grdpFiles.length > 1) {
    throw new Error(`${grdpFiles.length} GRDP files found under ${
        localizationUtils.getRelativeFilePathFromSrc(dir)}. Please make sure there's only one GRDP file named ${
        path.basename(expectedGrdpFile)} under this directory.`);
  }

  // Only one grdp file is under the directory
  if (grdpFiles[0] !== expectedGrdpFile) {
    // Rename grdp file and the reference in the grd file
    if (shouldAutoFix) {
      renameFilePromises.push(renameFileAsync(grdpFiles[0], expectedGrdpFile));
      grdpFilesToAddToGrd.push(expectedGrdpFile);
    } else {
      error += `${localizationUtils.getRelativeFilePathFromSrc(grdpFiles[0])} should be renamed to ${
          localizationUtils.getRelativeFilePathFromSrc(expectedGrdpFile)}.`;
    }
    return error;
  }

  // Only one grdp file and its name follows the naming convention
  if (!grdFileContent.includes(localizationUtils.getRelativeGrdpPath(grdpFiles[0]))) {
    if (shouldAutoFix) {
      grdpFilesToAddToGrd.push(grdpFiles[0]);
    } else {
      error += `Please add ${localizationUtils.createPartFileEntry(grdpFiles[0]).trim()} to ${
          localizationUtils.getRelativeFilePathFromSrc(grdpFiles[0])}.`;
    }
  }
  return error;
}

/**
 * Parse localizable resources.
 */
async function parseLocalizableResourceMaps() {
  if ((frontendStrings.size === 0 && IDSkeys.size === 0) ||
      (localizationCallsMap.size === 0 && uiStringsMap.size === 0)) {
    await parseLocalizableResourceMapsHelper();
  }
  return [frontendStrings, IDSkeys];
}

async function parseLocalizableResourceMapsHelper() {
  const grdpToFiles = new Map();
  const dirs = devtoolsFrontendDirs || await localizationUtils.getChildDirectoriesFromDirectory(devtoolsFrontendPath);
  const grdpToFilesPromises = dirs.map(dir => {
    const files = [];
    grdpToFiles.set(expectedGrdpFilePath(dir), files);
    return localizationUtils.getFilesFromDirectory(dir, files, ['.js', 'module.json', '.ts']);
  });
  await Promise.all(grdpToFilesPromises);

  const promises = [];
  for (const [grdpPath, files] of grdpToFiles) {
    files.forEach(file => fileToGRDPMap.set(file, grdpPath));
    promises.push(parseLocalizableStrings(files));
  }
  await Promise.all(promises);
  // Parse grd(p) files after frontend strings are processed so we know
  // what to add or remove based on frontend strings
  await parseIDSKeys();
}

/**
 * The following functions parse localizable strings (wrapped in Common.UIString,
 * Common.UIStringFormat, UI.formatLocalized, ls``, i18n.getLocalizedString,
 * i18n.getFormatLocalizedString) from devtools frontend files.
 */

async function parseLocalizableStrings(devtoolsFiles) {
  const promises = devtoolsFiles.map(filePath => parseLocalizableStringsFromFile(filePath));
  await Promise.all(promises);
}

async function parseLocalizableStringsFromFile(filePath) {
  const fileContent = await localizationUtils.parseFileContent(filePath);
  if (path.basename(filePath) === 'module.json') {
    return parseLocalizableStringFromModuleJson(fileContent, filePath);
  }

  if (path.extname(filePath) === '.ts') {
    try {
      const tsStrings = await parseLocalizableStringFromTypeScriptFile(filePath);
      tsStrings.forEach(tsString => {
        addString(tsString.cooked, tsString.code, tsString.filePath, tsString.location, tsString.parsedArguments);
      });
    } catch (e) {
      throw new Error(
          `DevTools localization TypeScript parser failed on:\n${
              localizationUtils.getRelativeFilePathFromSrc(filePath)}: ${e.message}` +
          '\nThis error is likely down to an issue in our TypeScript AST parser.' +
          '\nPlease report this at crbug.com.');
    }
    return;
  }

  let ast;

  if (hasUIStrings(fileContent)) {
    const relativeFilePath = localizationUtils.getRelativeFilePathFromFrontEnd(filePath);
    const dirName = relativeFilePath.slice(0, relativeFilePath.indexOf('\\'));
    migratedDirsSet.add(dirName);
  }

  try {
    ast = espree.parse(fileContent, {ecmaVersion: 11, sourceType: 'module', range: true, loc: true});
  } catch (e) {
    throw new Error(
        `DevTools localization parser failed:\n${localizationUtils.getRelativeFilePathFromSrc(filePath)}: ${
            e.message}` +
        '\nThis error is likely due to unsupported JavaScript features.' +
        ' Such features are not supported by eslint either and will cause presubmit to fail.' +
        ' Please update the code and use official JavaScript features.');
  }
  for (const node of ast.body) {
    parseLocalizableStringFromNode(undefined, node, filePath);
  }
}

function parseLocalizableStringFromModuleJson(fileContent, filePath) {
  const fileJSON = JSON.parse(fileContent);
  if (!fileJSON.extensions) {
    return;
  }

  for (const extension of fileJSON.extensions) {
    for (const key in extension) {
      if (extensionStringKeys.includes(key)) {
        handleModuleJsonString(extension[key], extension[key], filePath);
      } else if (key === 'device') {
        handleModuleJsonString(extension.device.title, extension.device.title, filePath);
      } else if (key === 'options') {
        for (const option of extension.options) {
          handleModuleJsonString(option.title, option.title, filePath);
          if (option.text !== undefined) {
            handleModuleJsonString(option.text, option.text, filePath);
          }
        }
      } else if (key === 'defaultValue' && Array.isArray(extension[key])) {
        for (const defaultVal of extension[key]) {
          if (defaultVal.title) {
            handleModuleJsonString(defaultVal.title, defaultVal.title, filePath);
          }
        }
      } else if (key === 'tags' && extension[key]) {
        const tagsList = extension[key].split(',');
        for (let tag of tagsList) {
          tag = tag.trim();
          handleModuleJsonString(tag, tag, filePath);
        }
      }
    }
  }
}

function handleModuleJsonString(str, code, filePath) {
  // add string for Loc V1
  addString(str, code, filePath);

  // add to map for Loc V2
  addToLocAPICallsMap(filePath, str, code);
}

function parseLocalizableStringFromNode(parentNode, node, filePath) {
  if (!node) {
    return;
  }

  if (Array.isArray(node)) {
    for (const child of node) {
      parseLocalizableStringFromNode(node, child, filePath);
    }

    return;
  }

  const keys = Object.keys(node);
  const objKeys = keys.filter(key => key !== 'loc' && typeof node[key] === 'object');
  if (objKeys.length === 0) {
    // base case: all values are non-objects -> node is a leaf
    return;
  }

  const {locCase, locVersion} = localizationUtils.getLocalizationCaseAndVersion(node);
  if (locVersion === 1) {
    // check if the V1 API call is in a directory that are already migrated to V2
    checkMigratedDirectory(filePath);
  }

  switch (locCase) {
    case 'Common.UIString':
    case 'Platform.UIString':
    case 'Common.UIStringFormat': {
      checkLocalizability.analyzeCommonUIStringNode(node, filePath, escodegen.generate(node));
      handleCommonUIString(node, filePath);
      break;
    }
    case 'UI.formatLocalized': {
      checkLocalizability.analyzeCommonUIStringNode(node, filePath, escodegen.generate(node));
      if (node.arguments !== undefined && node.arguments[1] !== undefined && node.arguments[1].elements !== undefined) {
        handleCommonUIString(node, filePath, node.arguments[1].elements);
      }
      break;
    }
    case 'Tagged Template': {
      const code = escodegen.generate(node);
      checkLocalizability.analyzeTaggedTemplateNode(node, filePath, code);
      handleTemplateLiteral(node.quasi, code, filePath);
      break;
    }
    case 'i18n.i18n.getLocalizedString':
    case 'i18n.i18n.getFormatLocalizedString': {
      checkLocalizability.analyzeGetLocalizedStringNode(node, filePath);
      if (node.arguments !== undefined && node.arguments[1] !== undefined) {
        handleGetLocalizedStringNode(filePath, node);
      }
      break;
    }
    case 'UIStrings': {
      if (node.init && node.init.properties) {
        handleUIStringsDeclarationNode(filePath, node);
      }
      break;
    }
    default: {
      // String concatenation to localization call(s) should be changed
      checkLocalizability.checkConcatenation(parentNode, node, filePath);
      break;
    }
  }

  for (const key of objKeys) {
    // recursively parse all the child nodes
    parseLocalizableStringFromNode(node, node[key], filePath);
  }
}

function handleCommonUIString(node, filePath, argumentNodes) {
  if (argumentNodes === undefined) {
    argumentNodes = node.arguments.slice(1);
  }
  const firstArgType = node.arguments[0].type;
  switch (firstArgType) {
    case espreeTypes.LITERAL: {
      const message = node.arguments[0].value;
      addString(message, escodegen.generate(node), filePath, node.loc, argumentNodes);
      break;
    }
    case espreeTypes.TEMP_LITERAL: {
      handleTemplateLiteral(node.arguments[0], escodegen.generate(node), filePath, argumentNodes);
      break;
    }
    default: {
      break;
    }
  }
}

function handleTemplateLiteral(node, code, filePath, argumentNodes) {
  if (node.expressions.length === 0) {
    // template literal does not contain any variables, parse the value
    addString(node.quasis[0].value.cooked, code, filePath, node.loc, argumentNodes);
    return;
  }

  argumentNodes = node.expressions;
  let processedMsg = '';
  for (let i = 0; i < node.quasis.length; i++) {
    processedMsg += node.quasis[i].value.cooked;
    if (i < node.expressions.length) {
      // add placeholder for variable so that
      // the ph tag gets generated
      processedMsg += '%s';
    }
  }
  addString(processedMsg, code, filePath, node.loc, argumentNodes);
}

/**
 * Handle the node that declares `UIStrings`
 */
function handleUIStringsDeclarationNode(filePath, node) {
  const stringEntryNodes = node.init.properties;
  const stringEntryList = [];
  for (const node of stringEntryNodes) {
    if (node.key && node.value) {
      stringEntryList.push({stringId: node.key.name, stringValue: node.value.value, location: node.loc});
    }
  }
  uiStringsMap.set(filePath, stringEntryList);
}

/**
 * Handle the node that is `i18n.getLocalizedString()` or `i18n.getFormatLocalizedString` call.
 */
function handleGetLocalizedStringNode(filePath, node) {
  const stringIdNode = node.arguments[1];
  const argumentNodes = node.arguments[2];
  if (stringIdNode.property && stringIdNode.property.name && stringIdNode.property.type === espreeTypes.IDENTIFIER) {
    addToLocAPICallsMap(filePath, stringIdNode.property.name, escodegen.generate(node), node.loc, argumentNodes);
  }
}

/**
 * Add the string that is called with Localization V2 API into the map for that file.
 */
function addToLocAPICallsMap(filePath, stringId, code, location, argumentNodes) {
  const currentString = {stringId, code};
  if (location) {
    currentString.location = location;
  }
  if (argumentNodes) {
    currentString.argumentNodes = argumentNodes;
  }

  if (localizationCallsMap.has(filePath)) {
    const stringList = localizationCallsMap.get(filePath);
    stringList.push(currentString);
  } else {
    localizationCallsMap.set(filePath, [currentString]);
  }
}

function addString(str, code, filePath, location, argumentNodes) {
  const ids = localizationUtils.getIDSKey(str);

  // In the case of duplicates, the corresponding grdp message should be added
  // to the shared strings file only if the duplicate strings span across different
  // grdp files
  const existingString = frontendStrings.get(ids);
  if (existingString) {
    if (!existingString.isShared && existingString.grdpPath !== fileToGRDPMap.get(filePath)) {
      existingString.isShared = true;
      existingString.grdpPath = localizationUtils.SHARED_STRINGS_PATH;
    }
    return;
  }

  const currentString =
      {string: str, code: code, isShared: false, filepath: filePath, grdpPath: fileToGRDPMap.get(filePath)};

  if (location) {
    currentString.location = location;
  }
  if (argumentNodes && argumentNodes.length > 0) {
    currentString.arguments = argumentNodes.map(argNode => {
      /* if this string came from TS the nodes have already been parsed
       * and converted from an AST Node into a string
       */
      if (typeof argNode === 'string') {
        return argNode;
      }

      return escodegen.generate(argNode);
    });
  }

  frontendStrings.set(ids, currentString);
}

/**
 * Check if the file is in a directory that has been migrated to V2
 */
function isInMigratedDirectory(filePath) {
  const relativeFilePath = localizationUtils.getRelativeFilePathFromFrontEnd(filePath);
  const dirName = relativeFilePath.slice(0, relativeFilePath.indexOf('\\'));
  return migratedDirsSet.has(dirName);
}

/**
 * Check if UIStrings presents in the file
 */
function hasUIStrings(content) {
  const sourceFile = ts.createSourceFile('', content, ts.ScriptTarget.ESNext, true);
  return (findUIStringsNode(sourceFile) !== null);
}

/**
 * Take in an AST node and recursively look for UIStrings node, return the UIStrings node if found
 */
function findUIStringsNode(node) {
  const nodesToVisit = [node];
  while (nodesToVisit.length) {
    const currentNode = nodesToVisit.shift();
    if (currentNode.kind === ts.SyntaxKind.VariableDeclaration && currentNode.name.escapedText === 'UIStrings') {
      return currentNode;
    }
    nodesToVisit.push(...currentNode.getChildren());
  }
  return null;
}

/**
 * Add the file path if it's in a migrated directory
 */
function checkMigratedDirectory(filePath) {
  if (isInMigratedDirectory(filePath)) {
    locV1CallsInMigratedFiles.add(filePath);
  }
}

/**
 * The following functions parse <message>s and their IDS keys from
 * devtools frontend grdp files.
 */

async function parseIDSKeys() {
  // NOTE: this function assumes that no <message> tags are present in the parent
  const grdpFilePaths = await parseGRDFile();
  await parseGRDPFiles(grdpFilePaths);
}

async function parseGRDFile() {
  const fileContent = await localizationUtils.parseFileContent(localizationUtils.GRD_PATH);
  const grdFileDir = path.dirname(localizationUtils.GRD_PATH);
  const partFileRegex = /<part file="(.*?)"/g;

  let match;
  const grdpFilePaths = new Set();
  while ((match = partFileRegex.exec(fileContent)) !== null) {
    if (match.index === partFileRegex.lastIndex) {
      partFileRegex.lastIndex++;
    }
    // match[0]: full match
    // match[1]: part file path
    grdpFilePaths.add(path.resolve(grdFileDir, match[1]));
  }
  return grdpFilePaths;
}

function parseGRDPFiles(grdpFilePaths) {
  const promises = Array.from(grdpFilePaths, grdpFilePath => parseGRDPFile(grdpFilePath));
  return Promise.all(promises);
}

function trimGrdpPlaceholder(placeholder) {
  const exampleRegex = new RegExp('<ex>.*?<\/ex>', 'gms');
  // $1s<ex>my example</ex> -> $1s
  return placeholder.replace(exampleRegex, '').trim();
}

function convertToFrontendPlaceholders(message) {
  // <ph name="phname">$1s<ex>my example</ex></ph> and <ph name="phname2">$2.3f</ph>
  // match[0]: <ph name="phname1">$1s</ph>
  // match[1]: $1s<ex>my example</ex>
  const placeholderRegex = new RegExp('<ph[^>]*>(.*?)<\/ph>', 'gms');
  let match;
  while ((match = placeholderRegex.exec(message)) !== null) {
    const placeholder = match[0];
    const placeholderValue = trimGrdpPlaceholder(match[1]);
    const newPlaceholderValue = placeholderValue.replace(/\$[1-9]/, '%');
    message =
        message.substring(0, match.index) + newPlaceholderValue + message.substring(match.index + placeholder.length);
    // Modified the message, so search from the beginning of the string again.
    placeholderRegex.lastIndex = 0;
  }
  return message;
}

async function parseGRDPFile(filePath) {
  const fileContent = await localizationUtils.parseFileContent(filePath);
  checkLocalizability.auditGrdpFile(filePath, fileContent);

  function stripWhitespacePadding(message) {
    let match = message.match(/^'''/);
    if (match) {
      message = message.substring(3);
    }
    match = message.match(/(.*?)'''$/);
    if (match) {
      message = match[1];
    }
    return message;
  }

  // Example:
  //  <message name="IDS_DEVTOOLS_md5_hash" desc="Description of this message">
  //      Message text here with optional placeholders <ph name="phname">$1s</ph>
  //  </message>
  // match[0]: the entire '<message>...</message>' block.
  // match[1]: 'IDS_DEVTOOLS_md5_hash'
  // match[2]: 'Description of this message'
  // match[3]: '     Message text here with optional placeholders <ph name="phname">$1s</ph>\n  '
  const messageRegex = new RegExp('<message[^>]*name="([^"]*)"[^>]*desc="([^"]*)"[^>]*>\s*\r?\n(.*?)<\/message>', 'gms');
  let match;
  while ((match = messageRegex.exec(fileContent)) !== null) {
    const line = localizationUtils.lineNumberOfIndex(fileContent, match.index);
    const actualIDSKey = match[1];
    const description = match[2];
    const grdString = match[3].trim();
    let message = convertToFrontendPlaceholders(grdString);
    message = stripWhitespacePadding(message);
    message = localizationUtils.sanitizeStringIntoFrontendFormat(message);

    const ids = localizationUtils.getIDSKey(message);
    addMessage(ids, actualIDSKey, filePath, line, description, grdString);
  }
}

function addMessage(expectedIDSKey, actualIDSKey, grdpPath, line, description, grdString) {
  if (!IDSkeys.has(expectedIDSKey)) {
    IDSkeys.set(expectedIDSKey, []);
  }

  IDSkeys.get(expectedIDSKey)
      .push({actualIDSKey, grdpPath, location: {start: {line}, end: {line}}, description, grdString});
}

/**
 * The following functions compare frontend localizable strings
 * with grdp <message>s and report error of resources to add,
 * remove or modify.
 */
function getAndReportResourcesToAdd() {
  const keysToAddToGRD = getMessagesToAdd();
  if (keysToAddToGRD.size === 0) {
    return;
  }

  let errorStr = 'The following frontend string(s) need to be added to GRD/GRDP file(s).\n';
  errorStr += 'Please refer to auto-generated message(s) below and modify as needed.\n\n';

  // Example error message:
  // third_party/devtools-frontend/front_end/network/NetworkDataGridNode.js Line 973: ls`(disk cache)`
  // Add a new message tag for this string to third_party\devtools-frontend\front_end\network\network_strings.grdp
  // <message name="IDS_DEVTOOLS_ad86890fb40822a3b12627efaca4ecd7" desc="Fill in the description.">
  //   (disk cache)
  // </message>
  for (const [key, stringObj] of keysToAddToGRD) {
    errorStr += `${localizationUtils.getRelativeFilePathFromSrc(stringObj.filepath)}${
        localizationUtils.getLocationMessage(stringObj.location)}: ${stringObj.code}\n`;
    errorStr += `Add a new message tag for this string to ${
        localizationUtils.getRelativeFilePathFromSrc(fileToGRDPMap.get(stringObj.filepath))}\n\n`;
    errorStr += localizationUtils.createGrdpMessage(key, stringObj);
  }
  return errorStr;
}

function getAndReportResourcesToRemove() {
  const keysToRemoveFromGRD = getMessagesToRemove();
  if (keysToRemoveFromGRD.size === 0) {
    return;
  }

  let errorStr =
      '\nThe message(s) associated with the following IDS key(s) should be removed from its GRD/GRDP file(s):\n';
  // Example error message:
  // third_party/devtools-frontend/front_end/accessibility/accessibility_strings.grdp Line 300: IDS_DEVTOOLS_c9bbad3047af039c14d0e7ec957bb867
  for (const [ids, messages] of keysToRemoveFromGRD) {
    messages.forEach(message => {
      const path = localizationUtils.getRelativeFilePathFromSrc(message.grdpPath);
      const msg = localizationUtils.getLocationMessage(message.location);
      errorStr += `${path}${msg}: ${ids}\n\n`;
    });
  }
  return errorStr;
}

function getAndReportIDSKeysToModify() {
  const messagesToModify = getIDSKeysToModify();
  if (messagesToModify.size === 0) {
    return;
  }

  let errorStr = '\nThe following GRD/GRDP message(s) do not have the correct IDS key.\n';
  errorStr += 'Please update the key(s) by changing the "name" value.\n\n';

  for (const [expectedIDSKey, messages] of messagesToModify) {
    messages.forEach(message => {
      const path = localizationUtils.getRelativeFilePathFromSrc(message.grdpPath);
      const msg = localizationUtils.getLocationMessage(message.location);
      errorStr += `${path}${msg}:\n${message.actualIDSKey} --> ${expectedIDSKey}\n\n`;
    });
  }
  return errorStr;
}

function getMessagesToAdd() {
  // If a message with ids key exists in grdpPath
  function messageExists(ids, grdpPath) {
    const messages = IDSkeys.get(ids);
    return messages.some(message => message.grdpPath === grdpPath);
  }

  const difference = [];
  for (const [ids, frontendString] of frontendStrings) {
    if (!isInMigratedDirectory(frontendString.filepath) &&
        (!IDSkeys.has(ids) || !messageExists(ids, frontendString.grdpPath))) {
      difference.push([ids, frontendString]);
    }
  }
  return new Map(difference.sort());
}

// Return a map from the expected IDS key to a list of messages
// whose actual IDS keys need to be modified.
function getIDSKeysToModify() {
  const messagesToModify = new Map();
  for (const [expectedIDSKey, messages] of IDSkeys) {
    for (const message of messages) {
      if (expectedIDSKey !== message.actualIDSKey) {
        if (messagesToModify.has(expectedIDSKey)) {
          messagesToModify.get(expectedIDSKey).push(message);
        } else {
          messagesToModify.set(expectedIDSKey, [message]);
        }
      }
    }
  }
  return messagesToModify;
}

function getMessagesToRemove() {
  const difference = new Map();
  for (const [ids, messages] of IDSkeys) {
    if (!frontendStrings.has(ids)) {
      difference.set(ids, messages);
      continue;
    }

    const expectedGrdpPath = frontendStrings.get(ids).grdpPath;
    const messagesInGrdp = [];
    const messagesToRemove = [];
    messages.forEach(message => {
      if (message.grdpPath !== expectedGrdpPath) {
        messagesToRemove.push(message);
      } else {
        messagesInGrdp.push(message);
      }
    });

    if (messagesToRemove.length === 0 && messagesInGrdp.length === 1) {
      continue;
    }

    if (messagesInGrdp.length > 1) {
      // If there are more than one messages with ids in the
      // expected grdp file, keep one with the longest
      // description and delete all the other messages
      const longestDescription = getLongestDescription(messagesInGrdp);
      let foundMessageToKeep = false;
      for (const message of messagesInGrdp) {
        if (message.description === longestDescription && !foundMessageToKeep) {
          foundMessageToKeep = true;
          continue;
        }
        messagesToRemove.push(message);
      }
    }
    difference.set(ids, messagesToRemove);
  }
  return difference;
}

function getLongestDescription(messages) {
  let longestDescription = '';
  messages.forEach(message => {
    if (message.description.length > longestDescription.length) {
      longestDescription = message.description;
    }
  });
  return longestDescription;
}

function getLocalizabilityError() {
  let error = '';
  if (checkLocalizability.localizabilityErrors.length > 0) {
    error += '\nDevTools localizability errors detected! Please fix these manually.\n';
    error += checkLocalizability.localizabilityErrors.join('\n');
  }
  return error;
}

module.exports = {
  findUIStringsNode,
  getAndReportIDSKeysToModify,
  getAndReportResourcesToAdd,
  getAndReportResourcesToRemove,
  getIDSKeysToModify,
  getLocalizabilityError,
  getLongestDescription,
  getMessagesToAdd,
  getMessagesToRemove,
  localizationCallsMap,
  locV1CallsInMigratedFiles,
  parseLocalizableResourceMaps,
  uiStringsMap,
  validateGrdAndGrdpFiles,
};

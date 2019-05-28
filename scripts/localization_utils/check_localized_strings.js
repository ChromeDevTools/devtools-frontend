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
const {promisify} = require('util');
const writeFileAsync = promisify(fs.writeFile);
const localizationUtils = require('./localization_utils');
const escodegen = localizationUtils.escodegen;
const esprimaTypes = localizationUtils.esprimaTypes;
const esprima = localizationUtils.esprima;
const DEVTOOLS_FRONTEND_PATH = path.resolve(__dirname, '..', '..', 'front_end');
const extensionStringKeys = ['category', 'destination', 'title', 'title-mac'];

// Format of frontendStrings
// { IDS_md5-hash => {
//     string: string,
//     code: string,
//     filepath: string,
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
//   IDS_KEY => {
//     filepath: string,
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

const devtoolsFrontendPath = path.resolve(__dirname, '..', '..', 'front_end');

async function parseLocalizableResourceMaps(isDebug) {
  const devtoolsFiles = [];
  await localizationUtils.getFilesFromDirectory(devtoolsFrontendPath, devtoolsFiles, ['.js', 'module.json']);

  const promises = [parseLocalizableStrings(devtoolsFiles, isDebug), parseIDSKeys(localizationUtils.GRD_PATH, isDebug)];
  return Promise.all(promises);
}

/**
 * The following functions parse localizable strings (wrapped in
 * Common.UIString, UI.formatLocalized or ls``) from devtools frontend files.
 */

async function parseLocalizableStrings(devtoolsFiles, isDebug) {
  const promises = devtoolsFiles.map(filePath => parseLocalizableStringsFromFile(filePath));
  await Promise.all(promises);
  if (isDebug)
    await writeFileAsync(path.resolve(__dirname, 'localizable_strings.json'), JSON.stringify(frontendStrings));
  return frontendStrings;
}

async function parseLocalizableStringsFromFile(filePath) {
  const fileContent = await localizationUtils.parseFileContent(filePath);
  if (path.basename(filePath) === 'module.json')
    return parseLocalizableStringFromModuleJson(fileContent, filePath);

  const ast = esprima.parse(fileContent, {loc: true});
  for (const node of ast.body)
    parseLocalizableStringFromNode(node, filePath);
}

function parseLocalizableStringFromModuleJson(fileContent, filePath) {
  const fileJSON = JSON.parse(fileContent);
  if (!fileJSON.extensions)
    return;

  for (const extension of fileJSON.extensions) {
    for (const key in extension) {
      if (extensionStringKeys.includes(key)) {
        addString(extension[key], extension[key], filePath);
      } else if (key === 'device') {
        addString(extension.device.title, extension.device.title, filePath);
      } else if (key === 'options') {
        for (const option of extension.options) {
          addString(option.title, option.title, filePath);
          if (option.text !== undefined)
            addString(option.text, option.text, filePath);
        }
      }
    }
  }
}

function parseLocalizableStringFromNode(node, filePath) {
  if (!node)
    return;

  if (Array.isArray(node)) {
    for (const child of node)
      parseLocalizableStringFromNode(child, filePath);

    return;
  }

  const keys = Object.keys(node);
  const objKeys = keys.filter(key => key !== 'loc' && typeof node[key] === 'object');
  if (objKeys.length === 0) {
    // base case: all values are non-objects -> node is a leaf
    return;
  }

  const locCase = localizationUtils.getLocalizationCase(node);
  switch (locCase) {
    case 'Common.UIString':
      handleCommonUIString(node, filePath);
      break;
    case 'UI.formatLocalized':
      if (node.arguments !== undefined && node.arguments[1] !== undefined && node.arguments[1].elements !== undefined)
        handleCommonUIString(node, filePath, node.arguments[1].elements);
      break;
    case 'Tagged Template':
      handleTemplateLiteral(node.quasi, escodegen.generate(node), filePath);
      break;
    case null:
      break;
    default:
      throw new Error(
          `${filePath}${localizationUtils.getLocationMessage(node.loc)}: unexpected localization case for node: ${
              escodegen.generate(node)}`);
  }

  for (const key of objKeys) {
    // recursively parse all the child nodes
    parseLocalizableStringFromNode(node[key], filePath);
  }
}

function handleCommonUIString(node, filePath, argumentNodes) {
  if (argumentNodes === undefined)
    argumentNodes = node.arguments.slice(1);
  const firstArgType = node.arguments[0].type;
  switch (firstArgType) {
    case esprimaTypes.LITERAL:
      const message = node.arguments[0].value;
      addString(message, escodegen.generate(node), filePath, node.loc, argumentNodes);
      break;
    case esprimaTypes.TEMP_LITERAL:
      handleTemplateLiteral(node.arguments[0], escodegen.generate(node), filePath, argumentNodes);
      break;
    default:
      break;
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

function addString(str, code, filePath, location, argumentNodes) {
  const currentString = {
    string: str,
    code: code,
    filepath: filePath,
  };
  if (location)
    currentString.location = location;
  if (argumentNodes && argumentNodes.length > 0)
    currentString.arguments = argumentNodes.map(argNode => escodegen.generate(argNode));

  // In the case of duplicates, to enforce that entries are added to
  // a consistent GRDP file, we use the file path that sorts lowest as
  // the winning entry into frontendStrings.
  const ids = localizationUtils.getIDSKey(str);
  if (frontendStrings.has(ids) && frontendStrings.get(ids).filepath <= filePath)
    return;
  frontendStrings.set(ids, currentString);
}

/**
 * The following functions parse <message>s and their IDS keys from
 * devtools frontend grdp files.
 */

async function parseIDSKeys(grdFilePath, isDebug) {
  // NOTE: this function assumes that no <message> tags are present in the parent
  const grdpFilePaths = await parseGRDFile(grdFilePath);
  await parseGRDPFiles(grdpFilePaths);
  if (isDebug)
    await writeFileAsync(path.resolve(__dirname, 'IDS_Keys.json'), JSON.stringify(IDSkeys));
  return IDSkeys;
}

async function parseGRDFile(grdFilePath) {
  const fileContent = await localizationUtils.parseFileContent(grdFilePath);
  const grdFileDir = path.dirname(grdFilePath);
  const partFileRegex = /<part file="(.*?)"/g;

  let match;
  const grdpFilePaths = new Set();
  while ((match = partFileRegex.exec(fileContent)) !== null) {
    if (match.index === partFileRegex.lastIndex)
      partFileRegex.lastIndex++;
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
  let placeholderRegex = new RegExp('<ph[^>]*>(.*?)<\/ph>', 'gms');
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

function trimGrdpMessage(message) {
  // '    Message text \n  ' trims to ' Message text '.
  const fixedLeadingWhitespace = 4;  // GRDP encoding uses 4 leading spaces.
  const trimmedMessage = message.substring(4);
  return trimmedMessage.substring(0, trimmedMessage.lastIndexOf('\n'));
}

async function parseGRDPFile(filePath) {
  const fileContent = await localizationUtils.parseFileContent(filePath);

  function lineNumberOfIndex(str, index) {
    const stringToIndex = str.substr(0, index);
    return stringToIndex.split('\n').length;
  }

  // Example:
  //  <message name="IDS_*" desc="*">
  //      Message text here with optional placeholders <ph name="phname">$1s</ph>
  //  </message>
  // match[0]: the entire '<message>...</message>' block.
  // match[1]: '     Message text here with optional placeholders <ph name="phname">$1s</ph>\n  '
  const messageRegex = new RegExp('<message[^>]*>\s*\n(.*?)<\/message>', 'gms');
  let match;
  while ((match = messageRegex.exec(fileContent)) !== null) {
    const line = lineNumberOfIndex(fileContent, match.index);

    let message = match[1];
    message = trimGrdpMessage(message);
    message = convertToFrontendPlaceholders(message);
    message = localizationUtils.sanitizeStringIntoFrontendFormat(message);

    const ids = localizationUtils.getIDSKey(message);
    IDSkeys.set(ids, {filepath: filePath, location: {start: {line}, end: {line}}});
  }
}

/**
 * The following functions compare frontend localizable strings
 * with grdp <message>s and report error of resources to add or
 * remove.
 */
async function getAndReportResourcesToAdd(frontendStrings, IDSkeys) {
  const keysToAddToGRD = getDifference(IDSkeys, frontendStrings);
  if (keysToAddToGRD.size === 0)
    return;

  let errorStr = 'The following frontend string(s) need to be added to GRD/GRDP file(s).\n';
  errorStr += 'Please refer to auto-generated message(s) below and modify as needed.\n\n';

  const frontendDirs = await localizationUtils.getChildDirectoriesFromDirectory(DEVTOOLS_FRONTEND_PATH);
  const fileToGRDPMap = new Map();

  // Example error message:
  // third_party/blink/renderer/devtools/front_end/network/NetworkDataGridNode.js Line 973: ls`(disk cache)`
  // Add a new message tag for this string to third_party\blink\renderer\devtools\front_end\network\network_strings.grdp
  // <message name="IDS_DEVTOOLS_ad86890fb40822a3b12627efaca4ecd7" desc="Fill in the description.">
  //   (disk cache)
  // </message>
  for (const [key, stringObj] of keysToAddToGRD) {
    let relativeGRDPFilePath = '';
    if (fileToGRDPMap.has(stringObj.filepath)) {
      relativeGRDPFilePath = fileToGRDPMap.get(stringObj.filepath);
    } else {
      relativeGRDPFilePath = localizationUtils.getRelativeFilePathFromSrc(
          localizationUtils.getGRDPFilePath(stringObj.filepath, frontendDirs));
      fileToGRDPMap.set(stringObj.filepath, relativeGRDPFilePath);
    }
    errorStr += `${localizationUtils.getRelativeFilePathFromSrc(stringObj.filepath)}${
        localizationUtils.getLocationMessage(stringObj.location)}: ${stringObj.code}\n`;
    errorStr += `Add a new message tag for this string to ${
        localizationUtils.getRelativeFilePathFromSrc(
            localizationUtils.getGRDPFilePath(stringObj.filepath, frontendDirs))}\n\n`;
    errorStr += localizationUtils.createGrdpMessage(key, stringObj);
  }
  return errorStr;
}

function getAndReportResourcesToRemove(frontendStrings, IDSkeys) {
  const keysToRemoveFromGRD = getDifference(frontendStrings, IDSkeys);
  if (keysToRemoveFromGRD.size === 0)
    return;

  let errorStr =
      '\nThe message(s) associated with the following IDS key(s) should be removed from its GRD/GRDP file(s):\n';
  // Example error message:
  // third_party/blink/renderer/devtools/front_end/help/help_strings.grdp Line 18: IDS_DEVTOOLS_7d0ee6fed10d3d4e5c9ee496729ab519
  for (const [key, keyObj] of keysToRemoveFromGRD) {
    errorStr += `${localizationUtils.getRelativeFilePathFromSrc(keyObj.filepath)}${
        localizationUtils.getLocationMessage(keyObj.location)}: ${key}\n\n`;
  }
  return errorStr;
}

/**
 * Output a Map containing entries that are in @comparison but not @reference in sorted order.
 */
function getDifference(reference, comparison) {
  const difference = [];
  for (const [key, value] of comparison) {
    if (!reference.has(key))
      difference.push([key, value]);
  }
  return new Map(difference.sort());
}

module.exports = {
  parseLocalizableResourceMaps,
  getAndReportResourcesToAdd,
  getAndReportResourcesToRemove,
  getDifference
};

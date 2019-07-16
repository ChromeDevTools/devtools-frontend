// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * Functions in this script parse DevTools frontend .js and module.json files,
 * collect localizable strings, check if frontend strings are in .grd/.grdp
 * files and report error if present.
 */

const path = require('path');
const localizationUtils = require('./localization_utils');
const escodegen = localizationUtils.escodegen;
const esprimaTypes = localizationUtils.esprimaTypes;
const esprima = localizationUtils.esprima;
const extensionStringKeys = ['category', 'destination', 'title', 'title-mac'];

// Format of frontendStrings
// { IDS_md5-hash => {
//     string: string,
//     code: string,
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
//   IDS_KEY => a list of {
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

const devtoolsFrontendPath = path.resolve(__dirname, '..', '..', 'front_end');

async function parseLocalizableResourceMaps() {
  const grdpToFiles = new Map();
  const dirs = await localizationUtils.getChildDirectoriesFromDirectory(devtoolsFrontendPath);
  const grdpToFilesPromises = dirs.map(dir => {
    const files = [];
    grdpToFiles.set(path.resolve(dir, `${path.basename(dir)}_strings.grdp`), files);
    return localizationUtils.getFilesFromDirectory(dir, files, ['.js', 'module.json']);
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
  await parseIDSKeys(localizationUtils.GRD_PATH);
}

/**
 * The following functions parse localizable strings (wrapped in Common.UIString,
 * Common.UIStringFormat, UI.formatLocalized or ls``) from devtools frontend files.
 */

async function parseLocalizableStrings(devtoolsFiles) {
  const promises = devtoolsFiles.map(filePath => parseLocalizableStringsFromFile(filePath));
  await Promise.all(promises);
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
    case 'Common.UIStringFormat':
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
  const currentString = {string: str, code: code, filepath: filePath, grdpPath: fileToGRDPMap.get(filePath)};
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

async function parseIDSKeys(grdFilePath) {
  // NOTE: this function assumes that no <message> tags are present in the parent
  const grdpFilePaths = await parseGRDFile(grdFilePath);
  await parseGRDPFiles(grdpFilePaths);
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

async function parseGRDPFile(filePath) {
  const fileContent = await localizationUtils.parseFileContent(filePath);

  function lineNumberOfIndex(str, index) {
    const stringToIndex = str.substr(0, index);
    return stringToIndex.split('\n').length;
  }

  function stripWhitespacePadding(message) {
    let match = message.match(/^'''/);
    if (match)
      message = message.substring(3);
    match = message.match(/(.*?)'''$/);
    if (match)
      message = match[1];
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
  const messageRegex = new RegExp('<message[^>]*name="([^"]*)"[^>]*desc="([^"]*)"[^>]*>\s*\n(.*?)<\/message>', 'gms');
  let match;
  while ((match = messageRegex.exec(fileContent)) !== null) {
    const line = lineNumberOfIndex(fileContent, match.index);
    const actualIDSKey = match[1];
    const description = match[2];
    let message = match[3];
    message = convertToFrontendPlaceholders(message.trim());
    message = stripWhitespacePadding(message);
    message = localizationUtils.sanitizeStringIntoFrontendFormat(message);

    const ids = localizationUtils.getIDSKey(message);
    addMessage(ids, actualIDSKey, filePath, line, description);
  }
}

function addMessage(expectedIDSKey, actualIDSKey, grdpPath, line, description) {
  if (!IDSkeys.has(expectedIDSKey))
    IDSkeys.set(expectedIDSKey, []);

  IDSkeys.get(expectedIDSKey).push({actualIDSKey, grdpPath, location: {start: {line}, end: {line}}, description});
}

/**
 * The following functions compare frontend localizable strings
 * with grdp <message>s and report error of resources to add,
 * remove or modify.
 */
async function getAndReportResourcesToAdd() {
  const keysToAddToGRD = getMessagesToAdd();
  if (keysToAddToGRD.size === 0)
    return;

  let errorStr = 'The following frontend string(s) need to be added to GRD/GRDP file(s).\n';
  errorStr += 'Please refer to auto-generated message(s) below and modify as needed.\n\n';

  // Example error message:
  // third_party/blink/renderer/devtools/front_end/network/NetworkDataGridNode.js Line 973: ls`(disk cache)`
  // Add a new message tag for this string to third_party\blink\renderer\devtools\front_end\network\network_strings.grdp
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
  if (keysToRemoveFromGRD.size === 0)
    return;

  let errorStr =
      '\nThe message(s) associated with the following IDS key(s) should be removed from its GRD/GRDP file(s):\n';
  // Example error message:
  // third_party/blink/renderer/devtools/front_end/accessibility/accessibility_strings.grdp Line 300: IDS_DEVTOOLS_c9bbad3047af039c14d0e7ec957bb867
  for (const [ids, messages] of keysToRemoveFromGRD) {
    messages.forEach(
        message => errorStr += `${localizationUtils.getRelativeFilePathFromSrc(message.grdpPath)}${
            localizationUtils.getLocationMessage(message.location)}: ${ids}\n\n`);
  }
  return errorStr;
}

function getAndReportIDSKeysToModify() {
  const messagesToModify = getIDSKeysToModify();
  if (messagesToModify.size === 0)
    return;

  let errorStr = '\nThe following GRD/GRDP message(s) do not have the correct IDS key.\n';
  errorStr += 'Please update the key(s) by changing the "name" value.\n\n';

  for (const [expectedIDSKey, messages] of messagesToModify) {
    messages.forEach(
        message => errorStr += `${localizationUtils.getRelativeFilePathFromSrc(message.grdpPath)}${
            localizationUtils.getLocationMessage(
                message.location)}:\n${message.actualIDSKey} --> ${expectedIDSKey}\n\n`);
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
    if (!IDSkeys.has(ids) || !messageExists(ids, frontendString.grdpPath))
      difference.push([ids, frontendString]);
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
        if (messagesToModify.has(expectedIDSKey))
          messagesToModify.get(expectedIDSKey).push(message);
        else
          messagesToModify.set(expectedIDSKey, [message]);
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
      if (message.grdpPath !== expectedGrdpPath)
        messagesToRemove.push(message);
      else
        messagesInGrdp.push(message);
    });

    if (messagesToRemove.length === 0 && messagesInGrdp.length === 1)
      continue;

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
    if (message.description.length > longestDescription.length)
      longestDescription = message.description;
  });
  return longestDescription;
}

module.exports = {
  frontendStrings,
  IDSkeys,
  parseLocalizableResourceMaps,
  getAndReportIDSKeysToModify,
  getAndReportResourcesToAdd,
  getAndReportResourcesToRemove,
  getIDSKeysToModify,
  getLongestDescription,
  getMessagesToAdd,
  getMessagesToRemove,
};

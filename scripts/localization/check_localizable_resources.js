// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * This script is part of the presubmit check that parses DevTools frontend .js and
 * module.json files, collects localizable strings, checks if frontend strings are
 * in .grd/.grdp files and reports error if present.
 *
 * If argument '--autofix' is present, add the new resources to and remove unused
 * messages from GRDP files.
 */

const fs = require('fs');
const {promisify} = require('util');
const writeFileAsync = promisify(fs.writeFile);
const appendFileAsync = promisify(fs.appendFile);
const checkLocalizedStrings = require('./utils/check_localized_strings');
const localizationUtils = require('./utils/localization_utils');

const grdpFileStart = '<?xml version="1.0" encoding="utf-8"?>\n<grit-part>\n';
const grdpFileEnd = '</grit-part>';

async function main() {
  try {
    const shouldAutoFix = process.argv.includes('--autofix');
    const error = await checkLocalizedStrings.validateGrdAndGrdpFiles(shouldAutoFix);
    if (error !== '' && !shouldAutoFix) {
      throw new Error(error);
    }

    await checkLocalizedStrings.parseLocalizableResourceMaps();
    if (shouldAutoFix) {
      await autofix(error);
    } else {
      getErrors();
    }
  } catch (e) {
    console.log(e.stack);
    process.exit(1);
  }
}

main();

function getErrors(existingError) {
  const toAddError = checkLocalizedStrings.getAndReportResourcesToAdd();
  const toModifyError = checkLocalizedStrings.getAndReportIDSKeysToModify();
  const toRemoveError = checkLocalizedStrings.getAndReportResourcesToRemove();
  let error =
      `${existingError ? `${existingError}\n` : ''}${toAddError || ''}${toModifyError || ''}${toRemoveError || ''}`;

  if (error === '') {
    console.log('DevTools localizable resources checker passed.');
    return;
  }

  error += '\nThe errors are potentially fixable with the `--autofix` option.';

  throw new Error(error);
}

async function autofix(existingError) {
  const keysToAddToGRD = checkLocalizedStrings.getMessagesToAdd();
  const keysToRemoveFromGRD = checkLocalizedStrings.getMessagesToRemove();
  const resourceAdded = await addResourcesToGRDP(keysToAddToGRD, keysToRemoveFromGRD);
  const resourceModified = await modifyResourcesInGRDP();
  const resourceRemoved = await removeResourcesFromGRDP(keysToRemoveFromGRD);
  const shouldAddExampleTag = checkShouldAddExampleTag(keysToAddToGRD);

  if (!resourceAdded && !resourceRemoved && !resourceModified && existingError === '') {
    console.log('DevTools localizable resources checker passed.');
    return;
  }

  let message =
      'Found changes to localizable DevTools resources.\nDevTools localizable resources checker has updated the appropriate grd/grdp file(s).';
  if (existingError !== '') {
    message +=
        `\nGrd/Grdp files have been updated. Please verify the updated grdp files and/or the <part> file references in ${
            localizationUtils.getRelativeFilePathFromSrc(localizationUtils.GRD_PATH)} are correct.`;
  }
  if (resourceAdded) {
    message += '\nManually write a description for any new <message> entries.';
    if (shouldAddExampleTag) {
      message += ' Add example tag(s) <ex> for messages that contain placeholder(s)';
    }
    message += '\nFor more details, see devtools/docs/langpacks/grdp_files.md';
  }
  if (resourceRemoved && duplicateRemoved(keysToRemoveFromGRD)) {
    message += '\nDuplicate <message> entries are removed. Please verify the retained descriptions are correct.';
  }
  message += '\n';
  message += '\nUse git status to see what has changed.';
  throw new Error(message);
}

function checkShouldAddExampleTag(keys) {
  if (keys.size === 0) {
    return false;
  }
  const stringObjs = [...keys.values()];
  const stringsWithArgument = stringObjs.filter(stringObj => !!stringObj.arguments);
  return stringsWithArgument.length > 0;
}

function duplicateRemoved(keysToRemoveFromGRD) {
  for (const [, messages] of keysToRemoveFromGRD) {
    if (messages.length > 1) {
      return true;
    }
  }
  return false;
}

// Return true if any resources are added
async function addResourcesToGRDP(keysToAddToGRD, keysToRemoveFromGRD) {
  function mapGRDPFilePathToStrings(keysToAddToGRD, keysToRemoveFromGRD) {
    const grdpFilePathToStrings = new Map();
    // Get the grdp files that need to be modified
    for (const [key, stringObj] of keysToAddToGRD) {
      if (!grdpFilePathToStrings.has(stringObj.grdpPath)) {
        grdpFilePathToStrings.set(stringObj.grdpPath, []);
      }

      // Add the IDS key to stringObj so we have access to it later
      stringObj.ids = key;
      // If the same key is to be removed, this is likely a string copy
      // to another folder. Keep the description.
      if (keysToRemoveFromGRD.has(key)) {
        stringObj.description = checkLocalizedStrings.getLongestDescription(keysToRemoveFromGRD.get(key));
      }
      grdpFilePathToStrings.get(stringObj.grdpPath).push(stringObj);
    }
    return grdpFilePathToStrings;
  }

  if (keysToAddToGRD.size === 0) {
    return false;
  }

  // Map grdp file path to strings to be added to that file so that we only need to
  // modify every grdp file once
  const grdpFilePathToStrings = mapGRDPFilePathToStrings(keysToAddToGRD, keysToRemoveFromGRD);
  const promises = [];

  const grdpFilePathsToAdd = [];
  for (const [grdpFilePath, initialStringsToAdd] of grdpFilePathToStrings) {
    let stringsToAdd = initialStringsToAdd;
    // The grdp file doesn't exist, so create one.
    if (!fs.existsSync(grdpFilePath)) {
      let grdpMessagesToAdd = '';
      for (const stringObj of stringsToAdd) {
        grdpMessagesToAdd += localizationUtils.createGrdpMessage(stringObj.ids, stringObj);
      }

      // Create a new grdp file and reference it in the parent grd file
      promises.push(appendFileAsync(grdpFilePath, `${grdpFileStart}${grdpMessagesToAdd}${grdpFileEnd}`));
      grdpFilePathsToAdd.push(grdpFilePath);
      continue;
    }

    const grdpFileContent = await localizationUtils.parseFileContent(grdpFilePath);
    const grdpFileLines = grdpFileContent.split('\n');

    let newGrdpFileContent = '';
    const IDSRegex = new RegExp(`"(${localizationUtils.IDSPrefix}.*?)"`);
    for (let i = 0; i < grdpFileLines.length; i++) {
      const grdpLine = grdpFileLines[i];
      const match = grdpLine.match(IDSRegex);
      // match[0]: full match
      // match[1]: message IDS key
      if (match) {
        const ids = match[1];
        const stringsToAddRemaining = [];
        for (const stringObj of stringsToAdd) {
          // Insert the new <message> in sorted order.
          if (ids > stringObj.ids) {
            newGrdpFileContent += localizationUtils.createGrdpMessage(stringObj.ids, stringObj);
          } else {
            stringsToAddRemaining.push(stringObj);
          }
        }
        stringsToAdd = stringsToAddRemaining;
      } else if (grdpLine.includes(grdpFileEnd)) {
        // Just hit the end tag, so insert any remaining <message>s.
        for (const stringObj of stringsToAdd) {
          newGrdpFileContent += localizationUtils.createGrdpMessage(stringObj.ids, stringObj);
        }
      }
      newGrdpFileContent += grdpLine;
      if (i < grdpFileLines.length - 1) {
        newGrdpFileContent += '\n';
      }
    }

    promises.push(writeFileAsync(grdpFilePath, newGrdpFileContent));
  }
  promises.push(localizationUtils.addChildGRDPFilePathsToGRD(grdpFilePathsToAdd.sort()));
  await Promise.all(promises);
  return true;
}

// Return true if any resources are updated
async function modifyResourcesInGRDP() {
  const messagesToModify = checkLocalizedStrings.getIDSKeysToModify();
  if (messagesToModify.size === 0) {
    return false;
  }

  const grdpToMessages = mapGRDPFilePathToMessages(messagesToModify);
  const promises = [];
  for (const [grdpPath, messages] of grdpToMessages) {
    let fileContent = await localizationUtils.parseFileContent(grdpPath);
    for (const message of messages) {
      const idsRegex = new RegExp(`name="${message.actualIDSKey}"`);
      fileContent = fileContent.replace(idsRegex, `name="${message.ids}"`);
    }
    promises.push(writeFileAsync(grdpPath, fileContent));
  }
  await Promise.all(promises);
  return true;
}

// Return true if any resources are removed
async function removeResourcesFromGRDP(keysToRemoveFromGRD) {
  function indexOfFirstMatchingMessage(line, messages) {
    for (let i = 0; i < messages.length; i++) {
      const message = messages[i];
      const match =
        line.match(new RegExp(`<message[^>]*name="${message.ids}"[^>]*desc="(.*)?"[^>]*>`));
      if (match) {
        return i;
      }
    }
    return -1;
  }

  if (keysToRemoveFromGRD.size === 0) {
    return false;
  }

  const grdpToMessages = mapGRDPFilePathToMessages(keysToRemoveFromGRD);
  const promises = [];
  for (const [grdpFilePath, messages] of grdpToMessages) {
    let newGrdpFileContent = '';
    const grdpFileContent = await localizationUtils.parseFileContent(grdpFilePath);
    const grdpFileLines = grdpFileContent.split('\n');

    for (let i = 0; i < grdpFileLines.length; i++) {
      const index = indexOfFirstMatchingMessage(grdpFileLines[i], messages);
      if (index === -1) {
        newGrdpFileContent += grdpFileLines[i];
        if (i < grdpFileLines.length - 1) {
          newGrdpFileContent += '\n';
        }
        continue;
      }

      messages.splice(index, 1);
      while (!grdpFileLines[i].includes('</message>')) {
        i++;
      }
    }

    promises.push(writeFileAsync(grdpFilePath, newGrdpFileContent));
  }
  await Promise.all(promises);
  return true;
}

// Given a map from IDS key to a list of messages, return a map
// from grdp file path to a list of messages with a new property
// `ids` set to the key.
function mapGRDPFilePathToMessages(keyToMessages) {
  const grdpFilePathToMessages = new Map();
  for (const [ids, messages] of keyToMessages) {
    for (const message of messages) {
      if (!grdpFilePathToMessages.has(message.grdpPath)) {
        grdpFilePathToMessages.set(message.grdpPath, []);
      }

      message.ids = ids;
      grdpFilePathToMessages.get(message.grdpPath).push(message);
    }
  }
  return grdpFilePathToMessages;
}

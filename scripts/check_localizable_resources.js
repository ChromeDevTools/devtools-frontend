// Copyright 2019 The Chromium Authors. All rights reserved.
// Copyright (C) Microsoft Corporation. All rights reserved.
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
const path = require('path');
const {promisify} = require('util');
const writeFileAsync = promisify(fs.writeFile);
const appendFileAsync = promisify(fs.appendFile);
const checkLocalizedStrings = require('./localization_utils/check_localized_strings');
const localizationUtils = require('./localization_utils/localization_utils');

const grdpFileStart = '<?xml version="1.0" encoding="utf-8"?>\n<grit-part>\n';
const grdpFileEnd = '</grit-part>';

async function main() {
  let frontendStrings;
  let IDSkeys;

  try {
    [frontendStrings, IDSkeys] = await checkLocalizedStrings.parseLocalizableResourceMaps(false);

    if (process.argv.includes('--autofix')) {
      await autofix(frontendStrings, IDSkeys);
    } else {
      await getErrors(frontendStrings, IDSkeys);
    }
  } catch (e) {
    console.log(`Error: ${e.message}`);
    process.exit(1);
  }
}

main();

async function getErrors(frontendStrings, IDSkeys) {
  const toAddError = await checkLocalizedStrings.getAndReportResourcesToAdd(frontendStrings, IDSkeys);
  const toRemoveError = checkLocalizedStrings.getAndReportResourcesToRemove(frontendStrings, IDSkeys);
  let error = `${toAddError ? toAddError : ''}${toRemoveError ? toRemoveError : ''}`;

  if (error === '') {
    console.log('DevTools localizable resources checker passed.');
    return;
  }

  error += '\nThe errors are potentially fixable with the `--autofix` option.';

  throw new Error(error);
}

async function autofix(frontendStrings, IDSkeys) {
  const resourceAdded = await addResourcesToGRDP(frontendStrings, IDSkeys);
  const resourceRemoved = await removeResourcesFromGRDP(frontendStrings, IDSkeys);

  if (!resourceAdded && !resourceRemoved) {
    console.log('DevTools localizable resources checker passed.');
    return;
  }

  let message =
      'Found changes to localizable DevTools strings.\nDevTools localizable resources checker has updated the appropriate grdp file(s).';
  if (resourceAdded)
    message += '\nManually write a description for any new <message> entries.';
  message += '\nUse git status to see what has changed.';
  throw new Error(message);
}

// Return true if any resources are added
async function addResourcesToGRDP(frontendStrings, IDSkeys) {
  const keysToAddToGRD = checkLocalizedStrings.getDifference(IDSkeys, frontendStrings);
  if (keysToAddToGRD.size === 0)
    return false;

  const frontendPath = path.resolve(__dirname, '..', 'front_end');
  const frontendDirs = await localizationUtils.getChildDirectoriesFromDirectory(frontendPath);
  // Map file path to its parent grdp file path
  const filePathToGrdpFilePath = new Map();
  // Map grdp file path to strings to be added to that file so that we only need to
  // modify every grdp file once
  const grdpFilePathToStrings = new Map();

  // Get the grdp files that need to be modified
  for (const [key, stringObj] of keysToAddToGRD) {
    let grdpFilePath = '';
    if (filePathToGrdpFilePath.has(stringObj.filepath)) {
      grdpFilePath = filePathToGrdpFilePath.get(stringObj.filepath);
    } else {
      grdpFilePath = localizationUtils.getGRDPFilePath(stringObj.filepath, frontendDirs);
      filePathToGrdpFilePath.set(stringObj.filepath, grdpFilePath);
    }

    if (!grdpFilePathToStrings.has(grdpFilePath))
      grdpFilePathToStrings.set(grdpFilePath, []);

    // Add the IDS key to stringObj so we have access to it later
    stringObj.ids = key;
    grdpFilePathToStrings.get(grdpFilePath).push(stringObj);
  }

  const promises = [];

  const grdpFilePathsToAdd = [];
  for (let [grdpFilePath, stringsToAdd] of grdpFilePathToStrings) {
    // The grdp file doesn't exist, so create one.
    if (!fs.existsSync(grdpFilePath)) {
      let grdpMessagesToAdd = '';
      for (const stringObj of stringsToAdd)
        grdpMessagesToAdd += localizationUtils.createGrdpMessage(stringObj.ids, stringObj);

      // Create a new grdp file and reference it in the parent grd file
      promises.push(appendFileAsync(grdpFilePath, `${grdpFileStart}${grdpMessagesToAdd}${grdpFileEnd}`));
      grdpFilePathsToAdd.push(
          path.relative(path.dirname(localizationUtils.GRD_PATH), grdpFilePath).split(path.sep).join('/'));
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
          if (ids > stringObj.ids)
            newGrdpFileContent += localizationUtils.createGrdpMessage(stringObj.ids, stringObj);
          else
            stringsToAddRemaining.push(stringObj);
        }
        stringsToAdd = stringsToAddRemaining;
      } else if (grdpLine.includes(grdpFileEnd)) {
        // Just hit the end tag, so insert any remaining <message>s.
        for (const stringObj of stringsToAdd)
          newGrdpFileContent += localizationUtils.createGrdpMessage(stringObj.ids, stringObj);
      }
      newGrdpFileContent += grdpLine;
      if (i < grdpFileLines.length - 1)
        newGrdpFileContent += '\n';
    }

    promises.push(writeFileAsync(grdpFilePath, newGrdpFileContent));
  }
  promises.push(addChildGRDPFilePathsToGRD(grdpFilePathsToAdd.sort()));
  await Promise.all(promises);
  return true;
}

async function addChildGRDPFilePathsToGRD(relativeGrdpFilePaths) {
  function createPartFileEntry(relativeGrdpFilePath) {
    return `      <part file="${relativeGrdpFilePath}" />\n`;
  }

  const grdFileContent = await localizationUtils.parseFileContent(localizationUtils.GRD_PATH);
  const grdLines = grdFileContent.split('\n');

  let newGrdFileContent = '';
  for (let i = 0; i < grdLines.length; i++) {
    const grdLine = grdLines[i];
    // match[0]: full match
    // match[1]: relative grdp file path
    const match = grdLine.match(/<part file="(.*?)"/);
    if (match) {
      const relativeGrdpFilePathsRemaining = [];
      for (const relativeGrdpFilePath of relativeGrdpFilePaths) {
        if (relativeGrdpFilePath < match[1])
          newGrdFileContent += createPartFileEntry(relativeGrdpFilePath);
        else
          relativeGrdpFilePathsRemaining.push(relativeGrdpFilePath);
      }
      relativeGrdpFilePaths = relativeGrdpFilePathsRemaining;
    } else if (grdLine.includes('</messages>')) {
      for (const relativeGrdpFilePath of relativeGrdpFilePaths)
        newGrdFileContent += createPartFileEntry(relativeGrdpFilePath);
    }
    newGrdFileContent += grdLine;
    if (i < grdLines.length - 1)
      newGrdFileContent += '\n';
  }
  return writeFileAsync(localizationUtils.GRD_PATH, newGrdFileContent);
}

// Return true if any resources are removed
async function removeResourcesFromGRDP(frontendStrings, IDSkeys) {
  const keysToRemoveFromGRD = checkLocalizedStrings.getDifference(frontendStrings, IDSkeys);
  if (keysToRemoveFromGRD.size === 0)
    return false;

  // Map grdp file path to message IDS keys to remove
  const grdpFilePathToKeys = new Map();
  for (const [key, messageObj] of keysToRemoveFromGRD) {
    if (!grdpFilePathToKeys.has(messageObj.filepath))
      grdpFilePathToKeys.set(messageObj.filepath, []);

    grdpFilePathToKeys.get(messageObj.filepath).push(key);
  }

  const promises = [];
  for (const [grdpFilePath, listOfKeys] of grdpFilePathToKeys) {
    let newGrdpFileContent = '';
    const grdpFileContent = await localizationUtils.parseFileContent(grdpFilePath);
    const grdpFileLines = grdpFileContent.split('\n');

    for (let i = 0; i < grdpFileLines.length; i++) {
      if (!lineContainsIDS(grdpFileLines[i], listOfKeys)) {
        newGrdpFileContent += grdpFileLines[i];
        if (i < grdpFileLines.length - 1)
          newGrdpFileContent += '\n';
        continue;
      }

      while (!grdpFileLines[i].includes('</message>'))
        i++;
    }

    promises.push(writeFileAsync(grdpFilePath, newGrdpFileContent));
  }
  await Promise.all(promises);
  return true;
}

function lineContainsIDS(line, listOfIDS) {
  return listOfIDS.some(ids => line.includes(ids));
}

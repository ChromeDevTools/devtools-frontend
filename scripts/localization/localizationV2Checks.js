// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * This script is part of the presubmit check that parses DevTools frontend files,
 * collects localizable strings, and run some checks for localization.
 *
 * If argument '--autofix' is present, try fixing the error automatically
 */
const fs = require('fs');
const ts = require('typescript');
const writeFileAsync = fs.promises.writeFile;
const parseLocalizableResources = require('./utils/check_localized_strings');

/**
 * Verifies that all strings in UIStrings structure are called with localization API.
 */
async function checkUIStrings(shouldAutoFix) {
  const localizationCallsMap = parseLocalizableResources.localizationCallsMap;
  const uiStringsMap = parseLocalizableResources.uiStringsMap;
  const errorMap = new Map();
  for (const [filePath, uiStringsEntries] of uiStringsMap.entries()) {
    let errorList;
    if (filePath.endsWith('moduleUIStrings.js')) {
      const newFilePath = filePath.replace('moduleUIStrings.js', 'module.json');
      const stringIdSet = getStringIdsFromCallSites(localizationCallsMap.get(newFilePath));
      errorList = checkStringEntries(uiStringsEntries, stringIdSet, true);
    } else {
      const stringIdSet = getStringIdsFromCallSites(localizationCallsMap.get(filePath));
      errorList = checkStringEntries(uiStringsEntries, stringIdSet, false);
    }

    if (errorList.length > 0) {
      errorMap.set(filePath, errorList);
    }
  }

  if (errorMap.size > 0) {
    if (shouldAutoFix) {
      return autoFixUIStringsCheck(errorMap);
    }
    return addUIStringsCheckError(errorMap);
  }
  return;
}

/**
 * Get all the string entries called with localization API from the entry map of that file.
 * Returns a set of the string IDs.
 */
function getStringIdsFromCallSites(entryFromCallsMap) {
  const stringIdSet = new Set();
  if (entryFromCallsMap) {
    for (const entry of entryFromCallsMap) {
      stringIdSet.add(entry.stringId);
    }
  }
  return stringIdSet;
}

/**
 * Check if any unused string is in UIStrings structure.
 */
function checkStringEntries(uiStringsEntries, stringIdSet, isModuleJSON) {
  const unusedEntries = [];
  for (const stringEntry of uiStringsEntries) {
    if (isModuleJSON) {
      if (!stringIdSet.has(stringEntry.stringValue)) {
        unusedEntries.push(stringEntry);
      }
    } else {
      if (!stringIdSet.has(stringEntry.stringId)) {
        unusedEntries.push(stringEntry);
      }
    }
  }
  return unusedEntries;
}

/**
 * Add UIStrings check error message to the Loc V2 check error.
 */
function addUIStringsCheckError(errorMap) {
  let UIStringsCheckErrorMessage = 'Unused string found in UIStrings.\n' +
      'Please remove them from UIStrings, or add the localization calls in your code.\n\n';

  for (const [filePath, uiStringsEntries] of errorMap.entries()) {
    UIStringsCheckErrorMessage += `${filePath}\n`;
    for (const entry of uiStringsEntries) {
      UIStringsCheckErrorMessage += `    "${entry.stringValue}"\n`;
    }
  }
  return UIStringsCheckErrorMessage;
}

/**
 * Auto-fixing UIString check error by removing unused strings in UIStrings structure.
 */
async function autoFixUIStringsCheck(errorMap) {
  let autoFixUIStringsMessage = '\nUnused string found in UIStrings.';
  const promises = [];
  for (const [filePath, unusedUIStringsEntries] of errorMap.entries()) {
    let content = fs.readFileSync(filePath, 'utf8');
    content = removeUnusedEntries(filePath, content, unusedUIStringsEntries);
    promises.push(writeFileAsync(filePath, content));
    autoFixUIStringsMessage += `\nReplaced UIStrings in ${filePath}`;
  }
  await Promise.all(promises);
  return autoFixUIStringsMessage;
}

/**
 * Remove unused entries from UIStrings and return the new file content
 */
function removeUnusedEntries(filePath, content, unusedUIStringsEntries) {
  const textToRemoveList = getTextToRemove(filePath, content, unusedUIStringsEntries);
  for (const text of textToRemoveList) {
    // check if the trailing comma present (the last entry may or may not have it)
    if (content[content.indexOf(text) + text.length] === ',') {
      content = content.replace(`${text},`, '');
    } else {
      content = content.replace(text, '');
    }
  }
  return content;
}

/**
 * Find the full text of unused entries in UIStrings
 */
function getTextToRemove(filePath, content, unusedUIStringsEntries) {
  const sourceFile = ts.createSourceFile(filePath, content, ts.ScriptTarget.ESNext, true);
  const unusedStringIds = new Set(unusedUIStringsEntries.map(entry => entry.stringId));
  const collectUnusedPropertyTextsFromNode = node => {
    // check through the properties to see if the name matches a stringId that should be removed
    const unusedPropertyTexts = [];
    for (const property of node.initializer.properties) {
      if (unusedStringIds.has(property.name.escapedText)) {
        // get the full text of the entry including descriptions and placeholders
        unusedPropertyTexts.push(property.getFullText());
      }
    }
    return unusedPropertyTexts;
  };

  const uiStringsNode = parseLocalizableResources.findUIStringsNode(sourceFile);
  return collectUnusedPropertyTextsFromNode(uiStringsNode);
}

/**
 * Verifies that there are no V1 APIs added in a directories that are migrated.
 * The check will be removed when the migration process is done.
 */
function checkNoV1CallsInMigratedDir() {
  const filesContainV1Calls = parseLocalizableResources.locV1CallsInMigratedFiles;
  if (filesContainV1Calls.size === 0) {
    return;
  }

  fileMigratedError = 'Localization V1 APIs used in these files that have already migrated to V2:\n';
  for (const filePath of filesContainV1Calls) {
    fileMigratedError += `\n${filePath}`;
  }
  fileMigratedError += '\nAutofix are not supported for this check. Please manually update V1 APIs to V2 APIs.';
  fileMigratedError += `\nFor example:
    ls("An example string") ---> i18n.i18n.getLocalizedString(_str, UIStrings.theExampleString)
    and then add it to UIStrings:
    const UIStrings = { theExampleString: 'An example string' } with descriptions.`;
  fileMigratedError += '\nFor more details. See devtools-frontend\\src\\docs\\localization\\README.md';
  return fileMigratedError;
}

module.exports = {
  checkUIStrings,
  removeUnusedEntries,
  checkNoV1CallsInMigratedDir,
};

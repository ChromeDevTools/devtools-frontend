// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * This script is part of the presubmit check that parses DevTools frontend files,
 * collects localizable strings, and run some checks for localization.
 *
 * If argument '--autofix' is present, try fixing the error automatically
 */
const parseLocalizableResources = require('./utils/check_localized_strings');

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
    ls("An example string") ---> i18nString(UIStrings.theExampleString)
    and then add it to UIStrings:
    const UIStrings = { theExampleString: 'An example string' } with descriptions.`;
  fileMigratedError += '\nFor more details. See devtools-frontend\\src\\docs\\localization\\README.md';
  return fileMigratedError;
}

module.exports = {
  checkNoV1CallsInMigratedDir,
};

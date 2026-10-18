// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import childProcess from 'node:child_process';
import fs from 'node:fs';
import {glob} from 'node:fs/promises';
import path from 'node:path';
import {promisify} from 'node:util';
import yargs from 'yargs';
import {hideBin} from 'yargs/helpers';

const exec = promisify(childProcess.exec);

const yargsObject = yargs(hideBin(process.argv))
                        .option('remove-files', {
                          type: 'boolean',
                          desc: 'Set to true to have obsolete goldens removed.',
                          default: false,
                        })
                        .parseSync();

const shouldRemoveFiles = yargsObject.removeFiles === true;
const SOURCE_ROOT = path.resolve(import.meta.dirname, path.join('..', '..'));
// LINT.IfChange(ObsoleteGoldensPaths)
const unitTestRoot = path.join(SOURCE_ROOT, 'front_end');
const GOLDENS_LOCATION = path.join(SOURCE_ROOT, 'test', 'goldens');
const unitTestFiles =
    (await Array.fromAsync(glob('**/*.test.ts', {cwd: unitTestRoot}))).map(file => path.join(unitTestRoot, file));
// LINT.ThenChange(/PRESUBMIT.py:ObsoleteGoldensPaths)

function findScreenshotsToCheck(folder) {
  const filesToCheck = [];
  const filesInFolder = fs.readdirSync(folder);
  for (const result of filesInFolder) {
    const fullPath = path.join(folder, result);
    const isDir = fs.lstatSync(fullPath).isDirectory();
    if (isDir) {
      filesToCheck.push(...findScreenshotsToCheck(fullPath));
    } else if (path.extname(fullPath) === '.png') {
      filesToCheck.push(fullPath);
    }
  }
  return filesToCheck;
}

const PNG_EXTENSION = '.png';

/**
 * Returns the text before each ".png" in the unit test files, from the start
 * of its line. Golden paths end with ".png" and have no line breaks, so a unit
 * test file contains a golden path only if one of these strings ends with it.
 * This reads each unit test file one time.
 */
function findPngReferences(filesToSearch) {
  const references = [];
  for (const file of filesToSearch) {
    const content = fs.readFileSync(file, 'utf-8');
    let index = content.indexOf(PNG_EXTENSION);
    while (index !== -1) {
      const lineStart = content.lastIndexOf('\n', index) + 1;
      references.push(content.slice(lineStart, index + PNG_EXTENSION.length));
      index = content.indexOf(PNG_EXTENSION, index + PNG_EXTENSION.length);
    }
  }
  return references;
}

const pngReferences = findPngReferences(unitTestFiles);

function checkGoldensForPlatform(platform) {
  const obsoleteImages = [];

  const platformRoot = path.join(GOLDENS_LOCATION, platform);
  const goldens = findScreenshotsToCheck(platformRoot);

  for (const golden of goldens) {
    const relativeGoldenPath = path.relative(platformRoot, golden).replace(/\\/g, '/');
    const isReferenced = pngReferences.some(reference => reference.endsWith(relativeGoldenPath));

    if (!isReferenced) {
      obsoleteImages.push(path.join(platform, relativeGoldenPath));
    }
  }
  return obsoleteImages;
}

async function run() {
  const obsoleteImages = [
    ...checkGoldensForPlatform('linux'),
    ...checkGoldensForPlatform('mac'),
    ...checkGoldensForPlatform('win32'),
  ];
  if (obsoleteImages.length > 0) {
    console.log(
        'Obsolete screenshots found. These can safely be deleted from the repository as part of this CL',
    );
    if (!shouldRemoveFiles) {
      console.log(
          'Alternatively, run this script (scripts/test/check_obsolete_goldens.js) with --remove-files to have the script remove these files.',
      );
    }

    for (const image of obsoleteImages) {
      const imagePath = path.relative(
          process.cwd(),
          path.join(GOLDENS_LOCATION, image),
      );

      console.log(shouldRemoveFiles ? 'Removing: ' : '', imagePath);
      if (shouldRemoveFiles) {
        await exec(`rm ${imagePath}`);
      }
    }
    process.exit(1);
  }
}

run();

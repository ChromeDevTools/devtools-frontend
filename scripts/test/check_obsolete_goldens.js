// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const childProcess = require('child_process');
const fs = require('fs');
const glob = require('glob');
const path = require('path');
const util = require('util');
const yargs = require('yargs');
const {hideBin} = require('yargs/helpers');
const exec = util.promisify(childProcess.exec);

const yargsObject = yargs(hideBin(process.argv))
                        .option('remove-files', {
                          type: 'boolean',
                          desc: 'Set to true to have obsolete goldens removed.',
                          default: false,
                        })
                        .parseSync();

const shouldRemoveFiles = yargsObject.removeFiles === true;
const SOURCE_ROOT = path.resolve(__dirname, path.join('..', '..'));
const unitTestRoot = path.join(SOURCE_ROOT, 'front_end');
const GOLDENS_LOCATION = path.join(SOURCE_ROOT, 'test', 'goldens');
const unitTestFiles = glob.sync('**/*.test.ts', {cwd: unitTestRoot}).map(file => path.join(unitTestRoot, file));

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

function checkFolder(relativeGoldenPath, filesToSearch) {
  for (const file of filesToSearch) {
    const content = fs.readFileSync(file, 'utf-8');
    if (content.includes(relativeGoldenPath)) {
      return true;
    }
  }
  return false;
}

function checkGoldensForPlatform(platform) {
  const obsoleteImages = [];

  const platformRoot = path.join(GOLDENS_LOCATION, platform);
  const goldens = findScreenshotsToCheck(platformRoot);

  for (const golden of goldens) {
    const relativeGoldenPath = path.relative(platformRoot, golden).replace(/\\/g, '/');
    const units = checkFolder(relativeGoldenPath, unitTestFiles);

    if (!units) {
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

// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const path = require('path');
const fs = require('fs');
const childProcess = require('child_process');
const util = require('util');
const exec = util.promisify(childProcess.exec);

const yargsObject =
    require('yargs')
        .option(
            'remove-files', {type: 'boolean', desc: 'Set to true to have obsolete goldens removed.', default: false})
        .argv;

const shouldRemoveFiles = yargsObject['remove-files'] === true;
const SOURCE_ROOT = path.resolve(__dirname, path.join('..', '..'));
const interactionTestRoot = path.join(SOURCE_ROOT, 'test', 'interactions');
const GOLDENS_LOCATION = path.join(interactionTestRoot, 'goldens');

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

async function checkGoldensForPlatform(platform) {
  const obsoleteImages = [];

  const platformRoot = path.join(GOLDENS_LOCATION, platform);
  const goldens = findScreenshotsToCheck(platformRoot);
  for await (const golden of goldens) {
    const relativeGoldenPath = path.relative(platformRoot, golden);
    // Filepaths in screenshot tests assertions are used using forward slashes.
    // If this is excecuted in windows `relativeGoldenPath` will come with
    // backward slashes, so the path needs to be fixed.
    const unixRelativeGoldenPath = relativeGoldenPath.replace(/\\/g, '/');
    const isWin = process.platform === 'win32';
    try {
      const textSearchCommand = isWin ? `GET-CHILDITEM ${interactionTestRoot}* -recurs | Select-String -Pattern "${
                                            unixRelativeGoldenPath}" -CaseSensitive` :
                                        `grep -r ${unixRelativeGoldenPath} ${interactionTestRoot}`;
      // If this doesn't throw, that means we found a match and we're fine.
      await exec(textSearchCommand, isWin ? {shell: 'powershell.exe'} : undefined);
    } catch (error) {
      if (error.code === 1) {
        // This is what grep returns when the image is missing
        obsoleteImages.push(path.join(platform, relativeGoldenPath));
      } else {
        // Unexpected error, so throw.
        throw new Error(`Unexpected error when checking obsolete screenshots: ${error.message}`);
      }
    }
  }

  return obsoleteImages;
}

async function run() {
  const obsoleteImages = [
    ...await checkGoldensForPlatform('linux'), ...await checkGoldensForPlatform('mac'),
    ...await checkGoldensForPlatform('win32')
  ];
  if (obsoleteImages.length > 0) {
    // eslint-disable-next-line no-console
    console.log('Obsolete screenshots found. These can safely be deleted from the repository as part of this CL');
    if (!shouldRemoveFiles) {
      // eslint-disable-next-line no-console
      console.log('Alternatively, run this script with --remove-files to have the script remove these files.');
    }

    for (const image of obsoleteImages) {
      const imagePath = path.relative(process.cwd(), path.join(GOLDENS_LOCATION, image));
      // eslint-disable-next-line no-console
      console.log(shouldRemoveFiles ? 'Removing: ' : '', imagePath);
      if (shouldRemoveFiles) {
        await exec(`rm ${imagePath}`);
      }
    }
    process.exit(1);
  }
}

run();

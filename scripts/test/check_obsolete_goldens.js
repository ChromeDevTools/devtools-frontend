// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const childProcess = require('child_process');
const fs = require('fs');
const path = require('path');
const util = require('util');
const yargs = require('yargs');
const exec = util.promisify(childProcess.exec);

const yargsObject =
    yargs
        .option(
            'remove-files', {type: 'boolean', desc: 'Set to true to have obsolete goldens removed.', default: false})
        .argv;

const shouldRemoveFiles = yargsObject['remove-files'] === true;
const SOURCE_ROOT = path.resolve(__dirname, path.join('..', '..'));
const interactionTestRoot = path.join(SOURCE_ROOT, 'test', 'interactions');
// TODO: grep seems slow on the entire front_end folder.
const unitTestRoot = path.join(SOURCE_ROOT, 'front_end', 'panels');
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

async function checkFolder(relativeGoldenPath, searchRoot) {
  // Filepaths in screenshot tests assertions are used using forward slashes.
  // If this is executed in windows `relativeGoldenPath` will come with
  // backward slashes, so the path needs to be fixed.
  const unixRelativeGoldenPath = relativeGoldenPath.replace(/\\/g, '/');
  const isWin = process.platform === 'win32';
  if (isWin) {
    // Currently, we do not assert screenshots on Windows.
    // Eventually, if we support all platforms we can remove this early
    // exit.
    return true;
  }
  const textSearchCommand = isWin ?
      `GET-CHILDITEM ${searchRoot}* -recurs | Select-String -Pattern "${unixRelativeGoldenPath}" -CaseSensitive` :
      `grep -r ${unixRelativeGoldenPath} ${searchRoot}`;
  try {
    // If this doesn't throw, that means we found a match and we're fine.
    await exec(textSearchCommand, isWin ? {shell: 'powershell.exe'} : undefined);
    return true;
  } catch (error) {
    if (error.code === 1) {
      return false;
    }
    console.warn(error);
    return false;
  }
}

async function checkGoldensForPlatform(platform) {
  const obsoleteImages = [];

  const platformRoot = path.join(GOLDENS_LOCATION, platform);
  const goldens = findScreenshotsToCheck(platformRoot);
  for await (const golden of goldens) {
    const relativeGoldenPath = path.relative(platformRoot, golden);
    const interactions = await checkFolder(relativeGoldenPath, interactionTestRoot);
    const units = await checkFolder(relativeGoldenPath, unitTestRoot);

    if (!interactions && !units) {
      obsoleteImages.push(path.join(platform, relativeGoldenPath));
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
    console.log('Obsolete screenshots found. These can safely be deleted from the repository as part of this CL');
    if (!shouldRemoveFiles) {
      console.log('Alternatively, run this script with --remove-files to have the script remove these files.');
    }

    for (const image of obsoleteImages) {
      const imagePath = path.relative(process.cwd(), path.join(GOLDENS_LOCATION, image));

      console.log(shouldRemoveFiles ? 'Removing: ' : '', imagePath);
      if (shouldRemoveFiles) {
        await exec(`rm ${imagePath}`);
      }
    }
    process.exit(1);
  }
}

run();

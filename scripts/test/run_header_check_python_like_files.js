// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// Script that can automatically add missing license headers to Python-like
// files, including `.gn`, `.py`, `.gni` files.

const readline = require('readline');
const path = require('path');
const fs = require('fs');
const glob = require('glob');

const ROOT_DIRECTORY = path.join(__dirname, '..', '..');
const FRONT_END_DIRECTORY = path.join(ROOT_DIRECTORY, 'front_end');
const TEST_DIRECTORY = path.join(ROOT_DIRECTORY, 'test');
const SCRIPTS_DIRECTORY = path.join(ROOT_DIRECTORY, 'scripts');
const INSPECTOR_OVERLAY_DIRECTORY = path.join(ROOT_DIRECTORY, 'inspector_overlay');

const CURRENT_YEAR = new Date().getFullYear();
const LINE_LICENSE_HEADER = [
  `# Copyright ${CURRENT_YEAR} The Chromium Authors. All rights reserved.`,
  '# Use of this source code is governed by a BSD-style license that can be',
  '# found in the LICENSE file.',
];
const LINE_REGEXES =
    LINE_LICENSE_HEADER.map(line => new RegExp(line.replace(String(CURRENT_YEAR), '(\\(c\\) )?\\d{4}') + '$'));

/**
 * @param {string} fileName
 */
async function checkAndMaybeAddLicenseHeader(fileName) {
  const fileLocation = path.join(process.cwd(), fileName);

  const fileStream = fs.createReadStream(fileLocation);
  const fileReader = readline.createInterface({input: fileStream});

  try {
    await new Promise((resolve, reject) => {
      let i = 0;
      fileReader.on('line', line => {
        if (LINE_REGEXES[i].exec(line)) {
          i++;

          if (i === LINE_REGEXES.length) {
            fileReader.close();
            fileReader.removeAllListeners();
            resolve();
          }
        } else {
          reject(`Invalid license header for file ${fileLocation}`);
        }
      });
    });
  } catch (checkError) {
    try {
      fixLicenseHeaderForFile(fileLocation);
    } catch (writeError) {
      console.error('Unable to automatically fix license header for file');
      console.error(`Error when checking: ${checkError}`);
      console.error(`Error when writing: ${writeError}`);
      process.exit(1);
    }
  } finally {
    fileStream.close();
  }
}

/**
 * @param {string} fileLocation
 */
function fixLicenseHeaderForFile(fileLocation) {
  fs.writeFileSync(
      fileLocation,
      Buffer.concat([Buffer.from(LINE_LICENSE_HEADER.join('\n') + '\n\n'), fs.readFileSync(fileLocation)]));
}

let filesToLint = process.argv.slice(2);

if (filesToLint.length === 0) {
  const topLevelDirectories =
      [FRONT_END_DIRECTORY, SCRIPTS_DIRECTORY, TEST_DIRECTORY, INSPECTOR_OVERLAY_DIRECTORY].join(',');
  filesToLint =
      glob.sync(`{${topLevelDirectories}}/**/BUILD.gn`).map(fileLocation => path.relative(process.cwd(), fileLocation));
}

for (const fileName of filesToLint) {
  checkAndMaybeAddLicenseHeader(fileName);
}

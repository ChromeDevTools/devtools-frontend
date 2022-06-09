// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// Script that can automatically add missing license headers to non-JS
// files, including `.gn`, `.py`, `.gni`, `.css` files.

// @ts-check

const readline = require('readline');
const path = require('path');
const fs = require('fs');
const glob = require('glob');

const ROOT_DIRECTORY = path.join(__dirname, '..', '..');
const FRONT_END_DIRECTORY = path.join(ROOT_DIRECTORY, 'front_end');
const TEST_DIRECTORY = path.join(ROOT_DIRECTORY, 'test');
const SCRIPTS_DIRECTORY = path.join(ROOT_DIRECTORY, 'scripts');
const INSPECTOR_OVERLAY_DIRECTORY = path.join(ROOT_DIRECTORY, 'inspector_overlay');
const CONFIG_DIRECTORY = path.join(ROOT_DIRECTORY, 'config');

const CURRENT_YEAR = new Date().getFullYear();
const LINE_LICENSE_HEADER = [
  `Copyright ${CURRENT_YEAR} The Chromium Authors. All rights reserved.`,
  'Use of this source code is governed by a BSD-style license that can be',
  'found in the LICENSE file.',
];
const LINE_REGEXES = LINE_LICENSE_HEADER.map(line => line.replace(String(CURRENT_YEAR), '(\\(c\\) )?\\d{4}') + '$');

const PYTHON_LIKE_LINE_REGEXES = LINE_REGEXES.map(line => new RegExp('# ' + line));

/** @type {!Array<!RegExp>} */
const CSS_LIKE_LINE_REGEXES = [];
CSS_LIKE_LINE_REGEXES.push(new RegExp('\\/\\*'));
for (const line of LINE_REGEXES) {
  CSS_LIKE_LINE_REGEXES.push(new RegExp(` \\* ${line}`));
}
CSS_LIKE_LINE_REGEXES.push(new RegExp(' \\*\\/'));

const EXEMPTED_FILES = new Set([
  ['front_end', 'panels', 'application', 'indexedDBViews.css'],
  ['front_end', 'panels', 'application', 'resourcesPanel.css'],
  ['front_end', 'panels', 'console', 'consoleView.css'],
  ['front_end', 'panels', 'elements', 'elementsPanel.css'],
  ['front_end', 'panels', 'network', 'networkLogView.css'],
  ['front_end', 'panels', 'network', 'networkPanel.css'],
  ['front_end', 'panels', 'profiler', 'heapProfiler.css'],
  ['front_end', 'panels', 'profiler', 'profilesPanel.css'],
  ['front_end', 'panels', 'screencast', 'screencastView.css'],
  ['front_end', 'panels', 'sources', 'navigatorTree.css'],
  ['front_end', 'panels', 'sources', 'sourcesNavigator.css'],
  ['front_end', 'panels', 'sources', 'sourcesPanel.css'],
  ['front_end', 'panels', 'sources', 'sourcesView.css'],
  ['front_end', 'panels', 'timeline', 'timelinePanel.css'],
  ['front_end', 'ui', 'legacy', 'filter.css'],
  ['front_end', 'ui', 'legacy', 'inspectorSyntaxHighlight.css'],
  ['front_end', 'ui', 'legacy', 'splitWidget.css'],
  ['front_end', 'ui', 'legacy', 'suggestBox.css'],
  ['front_end', 'ui', 'legacy', 'tabbedPane.css'],
  ['front_end', 'ui', 'legacy', 'viewContainers.css'],
].map(fileLocation => fileLocation.join('/')));

/**
 * @param {string} fileLocation
 * @returns {boolean}
 */
function isPythonLikeFile(fileLocation) {
  return ['.gn', '.gni'].includes(path.extname(fileLocation));
}

/**
 * @param {string} fileLocation
 */
async function checkAndMaybeAddLicenseHeader(fileLocation) {
  const fileStream = fs.createReadStream(fileLocation);
  const fileReader = readline.createInterface({input: fileStream});

  const lineRegexes = isPythonLikeFile(fileLocation) ? PYTHON_LIKE_LINE_REGEXES : CSS_LIKE_LINE_REGEXES;

  try {
    await new Promise((resolve, reject) => {
      let i = 0;
      fileReader.on('line', line => {
        if (lineRegexes[i].exec(line)) {
          i++;

          if (i === lineRegexes.length) {
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
  /** @type {!Array<string>} */
  let newLicenseHeaderLines;
  if (isPythonLikeFile(fileLocation)) {
    newLicenseHeaderLines = LINE_LICENSE_HEADER.map(line => `# ${line}`);
  } else {
    newLicenseHeaderLines = ['/*'];
    for (const line of LINE_LICENSE_HEADER) {
      newLicenseHeaderLines.push(` * ${line}`);
    }
    newLicenseHeaderLines.push(' */');
  }
  fs.writeFileSync(
      fileLocation,
      Buffer.concat([Buffer.from(newLicenseHeaderLines.join('\n') + '\n\n'), fs.readFileSync(fileLocation)]));
}

let filesToLint = process.argv.slice(2);

if (filesToLint.length === 0) {
  const topLevelDirectories =
      [FRONT_END_DIRECTORY, SCRIPTS_DIRECTORY, TEST_DIRECTORY, INSPECTOR_OVERLAY_DIRECTORY, CONFIG_DIRECTORY].join(',');
  filesToLint = glob.sync(`{${topLevelDirectories}}/**/{BUILD.gn,*.gni,*.css}`);
}

for (const fileLocation of filesToLint) {
  const relativeFileLocation = path.relative(ROOT_DIRECTORY, fileLocation).replace(/\\/g, '/');
  if (relativeFileLocation.startsWith('front_end/third_party')) {
    continue;
  }
  if (EXEMPTED_FILES.has(relativeFileLocation)) {
    continue;
  }
  checkAndMaybeAddLicenseHeader(fileLocation);
}

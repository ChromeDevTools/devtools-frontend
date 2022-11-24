// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const glob = require('glob');
const path = require('path');

const {collectAllStringsInDir, createPsuedoLocaleStrings, IGNORED_PATH_COMPONENTS} =
    require('../../../third_party/i18n/collect-strings.js');
const {bakePlaceholders} = require('../../../third_party/i18n/bake-ctc-to-lhl.js');
const {writeIfChanged} = require('../../../scripts/build/ninja/write-if-changed.js');

/** @typedef {import('../../../third_party/i18n/bake-ctc-to-lhl.js').CtcMessage} CtcMessage */

const yargsObject = require('yargs')
                        .option('input-directories', {
                          type: 'array',
                          demandOption: true,
                        })
                        .option('output-directory', {
                          type: 'string',
                          demandOption: true,
                        })
                        .option('include-en-xl', {
                          type: 'boolean',
                        })
                        .strict()
                        .argv;

/**
 * @param {string} outputDirectory
 * @param {string} locale
 * @param {Record<string, CtcMessage>} strings
 */
function convertCtcToLhLAndSave(outputDirectory, locale, strings) {
  const outputPath = path.join(outputDirectory, `${locale}.json`);

  /** @type {Record<string, CtcMessage>} */
  const sortedCtcStrings = {};
  const sortedEntries = Object.entries(strings).sort(([keyA], [keyB]) => keyA.localeCompare(keyB));
  for (const [key, defn] of sortedEntries) {
    sortedCtcStrings[key] = defn;
  }

  const convertedStrings = bakePlaceholders(sortedCtcStrings);
  writeIfChanged(outputPath, JSON.stringify(convertedStrings, null, 2) + '\n');
}

const inputDirectories = yargsObject['input-directories'];
if (inputDirectories.length === 0) {
  throw new Error('Provide at least one directory!');
}

/** @type {Record<string, CtcMessage} */
let collectedStrings = {};
/** @type {string[]} */
const files = [];
for (const directory of inputDirectories) {
  collectedStrings = {
    ...collectedStrings,
    ...collectAllStringsInDir(directory),
  };

  const fs = glob.sync('**/*.{js,ts,gn}', {
    cwd: directory,
    ignore: IGNORED_PATH_COMPONENTS,
  });
  files.push(...fs.map(f => path.join(directory, f)));
}

const outputDirectory = yargsObject['output-directory'];
convertCtcToLhLAndSave(outputDirectory, 'en-US', collectedStrings);
if (yargsObject['include-en-xl']) {
  convertCtcToLhLAndSave(outputDirectory, 'en-XL', createPsuedoLocaleStrings(collectedStrings));
}

// Write the depfile. This is necessary to properly rebuild en-US.json/en-XL.json
// when any of the input TS files change. We also re-build when any GN file changes,
// since new TS/JS files might have been added.
const depfile = `
${path.join(outputDirectory, 'en-US.json')}: ${files.join(' ')}
`;

writeIfChanged(path.join(outputDirectory, 'collected-ui-strings.d'), depfile);

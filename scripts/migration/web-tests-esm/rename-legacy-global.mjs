// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @fileoverview A quick and dirty search & replace script to aid in the
 * "*-legacy-ts" removal effort.
 *
 * It replaces each occurrence passed via "--from" to "--to" and adds the
 * import passed via "--import" if not already present in the web test.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import yargs from 'yargs';

const yargsObject = yargs(process.argv.slice(2), process.cwd()).option('web-test-directory', {
                          type: 'string',
                          demandOption: true,
                        })
                        .option('import', {
                          type: 'string',
                          demandOption: true,
                        })
                        .option('from', {
                          type: 'string',
                          demandOption: true,
                        })
                        .option('to', {
                          type: 'string',
                          demandOption: true,
                        })
                        .strict()
                        .argv;

// `createPlainTextSearchRegex` is stolen from string-utilities.ts.
const SPECIAL_REGEX_CHARACTERS = '^[]{}()\\.^$*+?|-,';
const createPlainTextSearchRegex = function(query) {
  // This should be kept the same as the one in StringUtil.cpp.
  let regex = '';
  for (let i = 0; i < query.length; ++i) {
    const c = query.charAt(i);
    if (SPECIAL_REGEX_CHARACTERS.indexOf(c) !== -1) {
      regex += '\\';
    }
    regex += c;
  }
  return new RegExp(regex, 'g');
};

/**
 * Returns all the *.js web tests in a directory (recursively).
 * Skips over 'resources' directories which contain text fixtures.
 */
async function findWebTests(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const pathPromises = entries.map(async entry => {
    const p = path.resolve(dir, entry.name);
    if (entry.isDirectory() && entry.name !== 'resources') return findWebTests(p);
    else if (entry.isFile() && entry.name.endsWith('.js')) {
      return [p];
    }
    return [];
  });
  return (await Promise.all(pathPromises)).flat();
}

/**
 * Inserts `importLine` at the beginning of `content` if not already present.
 * It has some smartness to either start a new 'import * as' block or append
 * it to an existing one.
 */
function addImportIfNecessary(content, importLine) {
  if (content.includes(importLine)) return content;

  // Find where to insert `importLine`. We'll add it either to
  // an existing import * as block or start a new one below the import {TestRunner} block.
  const lines = content.split('\n');
  let lastImportIndex = 0;
  let onlyHasTestRunnerImports = true;
  for (const [index, line] of lines.entries()) {
    if (line.startsWith('import {')) {
      lastImportIndex = index;
    } else if (line.startsWith('import * as')) {
      lastImportIndex = index;
      onlyHasTestRunnerImports = false;
    }
  }

  const linesToInsert = onlyHasTestRunnerImports ? ['', importLine] : [importLine];
  lines.splice(lastImportIndex + 1, 0, ...linesToInsert);
  return lines.join('\n');
}

const fromRegex = createPlainTextSearchRegex(yargsObject.from);
const webTestPaths = await findWebTests(yargsObject.webTestDirectory);

for (const filePath of webTestPaths) {
  const content = await fs.readFile(filePath, { encoding: 'utf-8'});

  let replacedContent = content;
  if (yargsObject.from === yargsObject.to && !content.match(fromRegex)) {
    // If the before/after are the same, we only check for the presence
    // and add the import if needed.
    continue;
  } else if (yargsObject.from !== yargsObject.to) {
    replacedContent = content.replaceAll(fromRegex, yargsObject.to);
    if (replacedContent === content) continue;
  }

  replacedContent = addImportIfNecessary(replacedContent, yargsObject.import);
  await fs.writeFile(filePath, replacedContent, {encoding: 'utf-8'});
}

const suggestedCommitMessage = `
[DevTools] Replace \`${yargsObject.from}\` global with import

Bug: chromium:1442410
`.trim();
console.log(suggestedCommitMessage);

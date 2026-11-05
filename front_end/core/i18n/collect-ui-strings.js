// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {createHash} from 'node:crypto';
import * as fs from 'node:fs';
import {createRequire} from 'node:module';
import * as path from 'node:path';
import yargs from 'yargs';
import {hideBin} from 'yargs/helpers';

import {writeIfChanged} from '../../../scripts/build/ninja/write-if-changed.js';
import {bakePlaceholders} from '../../../third_party/i18n/bake-ctc-to-lhl.js';
import {
  collectAllStringsInDir,
  createPsuedoLocaleStrings,
  IGNORED_PATH_COMPONENTS,
} from '../../../third_party/i18n/collect-strings.js';

/** @typedef {import('../../../third_party/i18n/bake-ctc-to-lhl.js').CtcMessage} CtcMessage */

const yargsObject = yargs(hideBin(process.argv))
                        .option('input-directories', {
                          type: 'array',
                          demandOption: true,
                        })
                        .option('generated-root', {
                          type: 'string',
                        })
                        .option('generated-files', {
                          type: 'array',
                          implies: 'generated-root',
                        })
                        .option('output-directory', {
                          type: 'string',
                          demandOption: true,
                        })
                        .option('include-en-xl', {
                          type: 'boolean',
                        })
                        .strict()
                        .parseSync();

/**
 * @param outputDirectory
 * @param locale
 * @param strings
 */
async function convertCtcToLhLAndSave(outputDirectory, locale, strings) {
  const outputPath = path.join(outputDirectory, `${locale}.json`);

  /** @type {Record<string, CtcMessage>} */
  const sortedCtcStrings = {};
  const sortedEntries = Object.entries(strings).sort(
      ([keyA], [keyB]) => keyA.localeCompare(keyB),
  );
  for (const [key, defn] of sortedEntries) {
    sortedCtcStrings[key] = defn;
  }

  const convertedStrings = bakePlaceholders(sortedCtcStrings);
  await writeIfChanged(outputPath, JSON.stringify(convertedStrings, null, 2) + '\n');
}

const inputDirectories = yargsObject['input-directories'];
if (inputDirectories.length === 0) {
  throw new Error('Provide at least one directory!');
}

const outputDirectory = yargsObject['output-directory'];

// The parse results depend on collect-strings.js and the TypeScript version,
// so a change to either one discards the cache.
const cachePath = path.join(outputDirectory, 'collected-ui-strings.cache.json');
const collectStringsSource = fs.readFileSync(new URL('../../../third_party/i18n/collect-strings.js', import.meta.url));
const typescriptVersion = createRequire(import.meta.url)('typescript/package.json').version;
const cacheVersion = createHash('sha256').update(collectStringsSource).update(typescriptVersion).digest('hex');
/** @type {Record<string, {source: string, parsed: object}>} */
let savedFiles = {};
try {
  const saved = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
  if (saved.version === cacheVersion) {
    savedFiles = saved.files;
  }
} catch {
  // Without a cache, all UIStrings get parsed again.
}
const cache = new Map(Object.entries(savedFiles));
const initialCacheSize = cache.size;

/** @type {Record<string, CtcMessage>} */
let collectedStrings = {};
/** @type {string[]} */
const files = [];
for (const directory of inputDirectories) {
  const directoryFiles = fs.globSync('**/*.{js,ts,gn}', {
    cwd: directory,
    exclude: IGNORED_PATH_COMPONENTS,
  });
  collectedStrings = {
    ...collectedStrings,
    ...collectAllStringsInDir(
        directory,
        directoryFiles.filter(f => !f.endsWith('.gn')),
        cache,
        ),
  };
  files.push(...directoryFiles.map(f => path.join(directory, f)));
}
// Sources that the build generates live in the gen dir, which mirrors the
// source tree. The message key of a UIString is the path of its file relative
// to front_end/, as passed to registerUIStrings(), so the generated files are
// given relative to front_end/ in the gen dir and collected with it as root.
const generatedRoot = yargsObject['generated-root'];
const generatedFiles = yargsObject['generated-files'] ?? [];
if (generatedFiles.length > 0) {
  collectedStrings = {
    ...collectedStrings,
    ...collectAllStringsInDir(generatedRoot, generatedFiles, cache),
  };
  files.push(...generatedFiles.map(f => path.join(generatedRoot, f)));
}

const tasks = [convertCtcToLhLAndSave(outputDirectory, 'en-US', collectedStrings)];
if (yargsObject['include-en-xl']) {
  tasks.push(convertCtcToLhLAndSave(
      outputDirectory,
      'en-XL',
      createPsuedoLocaleStrings(collectedStrings),
      ));
}
await Promise.all(tasks);

// Write the depfile. This is necessary to properly rebuild en-US.json/en-XL.json
// when any of the input TS files change. We also re-build when any GN file changes,
// since new TS/JS files might have been added.
const depfile = `
${path.join(outputDirectory, 'en-US.json')}: ${files.join(' ')}
`;

await writeIfChanged(path.join(outputDirectory, 'collected-ui-strings.d'), depfile);

// Drop the entries of deleted files, and save the cache only if it changed.
let cacheChanged = false;
await Promise.all(
    Array.from(cache.entries()).map(async ([file, entry]) => {
      if (savedFiles[file] !== entry) {
        cacheChanged = true;
      }
      try {
        await fs.promises.access(file);
      } catch {
        cache.delete(file);
        cacheChanged = true;
      }
    }),
);
if (cacheChanged || cache.size !== initialCacheSize) {
  const serialized = JSON.stringify({version: cacheVersion, files: Object.fromEntries(cache)});
  await writeIfChanged(cachePath, serialized);
}

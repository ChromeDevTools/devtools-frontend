// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * Run this script to re-format all .js and .ts files found
 * node scripts/reformat-clang-js-ts.js --directory=front_end
 * The script starts in the given directory and recursively finds all `.js` and `.ts` files to reformat.
 * Any `.clang-format` with `DisableFormat: true` is respected; those
 * directories will not be used.
 **/

const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');

const yargs = require('yargs')
                  .option('dry-run', {
                    type: 'boolean',
                    default: false,
                    desc: 'Logs which files will be formatted, but doesn\'t write to disk',
                  })
                  .option('directory', {type: 'string', demandOption: true, desc: 'The starting directory to run in.'})
                  .strict()
                  .argv;

const startingDirectory = path.join(process.cwd(), yargs.directory);

const filesToFormat = [];
function processDirectory(dir) {
  const contents = fs.readdirSync(dir);

  if (contents.includes('.clang-format')) {
    const clangFormatConfig = fs.readFileSync(path.join(dir, '.clang-format'), 'utf8');
    if (clangFormatConfig.includes('DisableFormat: true')) {
      return;
    }
  }
  for (const item of contents) {
    const fullPath = path.join(dir, item);
    if (fs.lstatSync(fullPath).isDirectory()) {
      processDirectory(fullPath);
    } else if (['.ts', '.js'].includes(path.extname(fullPath))) {
      filesToFormat.push(fullPath);
    }
  }
}

processDirectory(startingDirectory);
filesToFormat.forEach((file, index) => {
  console.log(`Formatting ${index + 1}/${filesToFormat.length}`, path.relative(process.cwd(), file));

  if (yargs.dryRun) {
    return;
  }
  const out = String(childProcess.execSync(`clang-format -i ${file}`));
  if (out.trim() !== '') {
    console.log(out);
  }
});

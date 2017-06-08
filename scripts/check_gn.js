// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const fs = require('fs');
const path = require('path');

const inspectorManifest = require('../front_end/inspector.json');
const utils = require('./utils');

const gnPath = path.resolve(__dirname, '..', 'BUILD.gn');
const gnFile = fs.readFileSync(gnPath, 'utf-8');
const gnLines = gnFile.split('\n');

function main() {
  let errors = [];
  errors = errors.concat(checkNonAutostartNonRemoteModules());
  if (errors.length) {
    console.log('DevTools BUILD.gn checker detected errors!');
    console.log(`There's an issue with: ${gnPath}`);
    console.log(errors.join('\n'));
    process.exit(1);
  }
  console.log('DevTools BUILD.gn checker passed');
}

main();

function checkNonAutostartNonRemoteModules() {
  const errors = [];
  const gnVariable = 'generated_non_autostart_non_remote_modules';
  const lines = selectGNLines(`${gnVariable} = [`, ']');
  if (!lines.length) {
    return [
      'Could not identify non-autostart non-remote modules in gn file',
      'Please look at: ' + __filename,
    ];
  }
  const text = lines.join('\n');
  const modules = inspectorManifest.modules.filter(m => m.type !== 'autostart' && m.type !== 'remote').map(m => m.name);

  const missingModules = modules.filter(m => !utils.includes(text, `${m}/${m}_module.js`));
  if (missingModules.length)
    errors.push(`Check that you've included [${missingModules.join(', ')}] modules in: ` + gnVariable);

  // e.g. "$resources_out_dir/audits/audits_module.js" => "audits"
  const mapLineToModuleName = line => line.split('/')[2].split('_module')[0];

  const extraneousModules = lines.map(mapLineToModuleName).filter(module => !utils.includes(modules, module));
  if (extraneousModules.length)
    errors.push(`Found extraneous modules [${extraneousModules.join(', ')}] in: ` + gnVariable);

  return errors;
}

function selectGNLines(startLine, endLine) {
  let lines = gnLines.map(line => line.trim());
  let startIndex = lines.indexOf(startLine);
  if (startIndex === -1)
    return [];
  let endIndex = lines.indexOf(endLine, startIndex);
  if (endIndex === -1)
    return [];
  return lines.slice(startIndex + 1, endIndex);
}

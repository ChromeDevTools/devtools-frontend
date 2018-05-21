// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
'use strict';

const fs = require('fs');
const path = require('path');

const FRONTEND_PATH = path.resolve(__dirname, '..', 'front_end');

const manifestModules = [];
for (var config of ['inspector.json', 'devtools_app.json', 'js_app.json', 'node_app.json', 'shell.json', 'worker_app.json'])
  manifestModules.push(...require(path.resolve(FRONTEND_PATH, config)).modules);

const utils = require('./utils');

const gnPath = path.resolve(__dirname, '..', 'BUILD.gn');
const gnFile = fs.readFileSync(gnPath, 'utf-8');
const gnLines = gnFile.split('\n');

function main() {
  let errors = [];
  errors = errors.concat(checkNonAutostartNonRemoteModules());
  errors = errors.concat(checkAllDevToolsFiles());
  if (errors.length) {
    console.log('DevTools BUILD.gn checker detected errors!');
    console.log(`There's an issue with: ${gnPath}`);
    console.log(errors.join('\n'));
    process.exit(1);
  }
  console.log('DevTools BUILD.gn checker passed');
}

main();

/**
 * Ensures that generated module files are in the right list in BUILD.gn.
 * This is primarily to avoid remote modules from accidentally getting
 * bundled with the main Chrome binary.
 */
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
  const modules = manifestModules.filter(m => m.type !== 'autostart' && m.type !== 'remote').map(m => m.name);

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

/**
 * Ensures that all source files (according to the various module.json files) are
 * listed in BUILD.gn.
 */
function checkAllDevToolsFiles() {
  const errors = [];
  const excludedFiles = ['InspectorBackendCommands.js', 'SupportedCSSProperties.js', 'ARIAProperties.js'];
  const gnVariable = 'all_devtools_files';
  const lines = selectGNLines(`${gnVariable} = [`, ']');
  if (!lines.length) {
    return [
      'Could not identify all_devtools_files list in gn file',
      'Please look at: ' + __filename,
    ];
  }
  const gnFiles = new Set(lines);
  var moduleFiles = [];
  fs.readdirSync(FRONTEND_PATH).forEach(function(moduleName) {
    const moduleJSONPath = path.join(FRONTEND_PATH, moduleName, 'module.json');
    if (utils.isFile(moduleJSONPath)) {
      const moduleJSON = require(moduleJSONPath);
      const scripts = moduleJSON.scripts || [];
      const resources = moduleJSON.resources || [];
      const files = scripts.concat(resources)
                        .map(relativePathFromBuildGN)
                        .filter(file => excludedFiles.every(excludedFile => !file.includes(excludedFile)));
      moduleFiles = moduleFiles.concat(files);

      function relativePathFromBuildGN(filename) {
        const relativePath = path.normalize(`front_end/${moduleName}/${filename}`);
        return `"${relativePath}",`;
      }
    }
  });
  for (const file of moduleFiles) {
    if (!gnFiles.has(file))
      errors.push(`Missing file in BUILD.gn for ${gnVariable}: ` + file);
  }
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

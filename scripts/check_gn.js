// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
'use strict';

const fs = require('fs');
const path = require('path');

const FRONTEND_PATH = path.resolve(__dirname, '..', 'front_end');

const manifestModules = [];
for (const config of ['inspector', 'devtools_app', 'js_app', 'worker_app']) {
  manifestModules.push(...require(path.resolve(FRONTEND_PATH, 'entrypoints', config, `${config}.json`)).modules);
}

const gnPath = path.resolve(__dirname, '..', 'BUILD.gn');
const gnFile = fs.readFileSync(gnPath, 'utf-8');
const gnLines = gnFile.split('\n');

/**
 * Ensures that all source files (according to the various module.json files) are
 * listed in BUILD.gn.
 */
function checkAllDevToolsFiles() {
  return checkGNVariable('all_devtools_files', 'all_devtools_files', moduleJSON => {
    const resources = moduleJSON.resources || [];
    return [
      'module.json',
      ...resources,
    ];
  });
}

function checkGNVariable(fileName, gnVariable, obtainFiles, obtainRelativePath) {
  const filePath = path.resolve(__dirname, '..', 'config', 'gni', `${fileName}.gni`);
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const linesToCheck = fileContent.split('\n');

  const errors = [];
  const excludedFiles =
      ['axe.js', 'entrypoints/formatter_worker/', 'third_party/lighthouse/', 'third_party/i18n/'].map(path.normalize);
  const lines = selectGNLines(`${gnVariable} = [`, ']', linesToCheck).map(path.normalize);
  if (!lines.length) {
    return [
      `Could not identify ${gnVariable} list in gn file`,
      'Please look at: ' + __filename,
    ];
  }
  const gnFiles = new Set(lines);
  let moduleFiles = [];

  function addModuleFilesForDirectory(moduleJSONPath, buildGNPath, folderName) {
    const moduleJSON = require(moduleJSONPath);
    const files = obtainFiles(moduleJSON, folderName)
                      .map(obtainRelativePath && obtainRelativePath(buildGNPath) || relativePathFromBuildGN)
                      .filter(file => excludedFiles.every(excludedFile => !file.includes(excludedFile)));
    moduleFiles = moduleFiles.concat(files);

    function relativePathFromBuildGN(filename) {
      const relativePath = path.normalize(`front_end/${buildGNPath}/${filename}`);
      return `"${relativePath}",`;
    }
  }

  function traverseDirectoriesForModuleJSONFiles(folderName, buildGNPath) {
    if (!fs.lstatSync(folderName).isDirectory()) {
      return;
    }
    const moduleJSONPath = path.join(folderName, 'module.json');
    if (fs.existsSync(moduleJSONPath)) {
      addModuleFilesForDirectory(moduleJSONPath, buildGNPath, path.basename(folderName));
    }

    fs.readdirSync(folderName).forEach(nestedModuleName => {
      traverseDirectoriesForModuleJSONFiles(
          path.join(folderName, nestedModuleName), `${buildGNPath}/${nestedModuleName}`);
    });
  }

  fs.readdirSync(FRONTEND_PATH).forEach(moduleName => {
    traverseDirectoriesForModuleJSONFiles(path.join(FRONTEND_PATH, moduleName), moduleName);
  });

  for (const file of moduleFiles) {
    if (!gnFiles.has(file)) {
      errors.push(`Missing file in BUILD.gn for ${gnVariable}: ` + file);
    }
  }

  return errors;
}

function selectGNLines(startLine, endLine, linesToCheck = gnLines) {
  const lines = linesToCheck.map(line => line.trim());
  const startIndex = lines.indexOf(startLine);
  if (startIndex === -1) {
    return [];
  }
  const endIndex = lines.indexOf(endLine, startIndex);
  if (endIndex === -1) {
    return [];
  }
  return lines.slice(startIndex + 1, endIndex);
}

function main() {
  const errors = [
    ...checkAllDevToolsFiles(),
  ];
  if (errors.length) {
    console.log('DevTools BUILD.gn checker detected errors!');
    console.log(`There's an issue with: ${gnPath}`);
    console.log(errors.join('\n'));
    process.exit(1);
  }
  console.log('DevTools BUILD.gn checker passed');
}

main();

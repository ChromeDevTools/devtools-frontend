// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
'use strict';

const fs = require('fs');
const path = require('path');

const FRONTEND_PATH = path.resolve(__dirname, '..', 'front_end');

const manifestModules = [];
for (const config
         of ['inspector.json', 'devtools_app.json', 'js_app.json', 'node_app.json', 'shell.json', 'worker_app.json']) {
  manifestModules.push(...require(path.resolve(FRONTEND_PATH, config)).modules);
}

const gnPath = path.resolve(__dirname, '..', 'BUILD.gn');
const gnFile = fs.readFileSync(gnPath, 'utf-8');
const gnLines = gnFile.split('\n');

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

  const missingModules = modules.filter(m => !text.includes(`${m}/${m}_module.js`));
  if (missingModules.length) {
    errors.push(`Check that you've included [${missingModules.join(', ')}] modules in: ` + gnVariable);
  }

  // e.g. "$resources_out_dir/lighthouse/lighthouse_module.js" => "lighthouse"
  const mapLineToModuleName = line => line.split('/')[2].split('_module')[0];

  const extraneousModules = lines.map(mapLineToModuleName).filter(module => !modules.includes(module));
  if (extraneousModules.length) {
    errors.push(`Found extraneous modules [${extraneousModules.join(', ')}] in: ` + gnVariable);
  }

  return errors;
}

/**
 * Ensures that all source files (according to the various module.json files) are
 * listed in BUILD.gn.
 */
function checkAllDevToolsFiles() {
  return checkGNVariable('all_devtools_files', moduleJSON => {
    const scripts = moduleJSON.scripts || [];
    const resources = moduleJSON.resources || [];
    return [
      'module.json',
      ...scripts,
      ...resources,
    ];
  });
}

const EXCLUDED_FOLDERS = ['elements', 'sdk', 'generated'];
const EXCLUDED_FILE_NAMES = [
  // This file is pre-generated and copied outside of a regular `devtools_entrypoint`.
  'wasm_source_map/pkg/wasm_source_map.js',
  // Included as part of `elements`
  '../generated/SupportedCSSProperties.js',
];
const allDevToolsModulesPath = path.resolve(__dirname, '..', 'all_devtools_modules.gni');
const allDevToolsModulesFile = fs.readFileSync(allDevToolsModulesPath, 'utf-8');
const allDevToolsModulesLines = allDevToolsModulesFile.split('\n');

function checkAllDevToolsModules() {
  return checkGNVariable(
      'all_devtools_modules',
      (moduleJSON, folderName) => {
        if (EXCLUDED_FOLDERS.includes(folderName)) {
          return [];
        }
        return (moduleJSON.modules || []).filter(fileName => {
          return fileName !== `${folderName}.js` && fileName !== `${folderName}-legacy.js`;
        });
      },
      buildGNPath => filename => {
        const relativePath = path.normalize(`${buildGNPath}/${filename}`);
        return `"${relativePath}",`;
      },
      allDevToolsModulesLines);
}

function checkAllTypescriptModules() {
  return checkGNVariable(
      'all_typescript_modules',
      (moduleJSON, folderName) => {
        // Elements has both TypeScript and JavaScript, so it is a bit special.
        if (folderName === 'elements' || !EXCLUDED_FOLDERS.includes(folderName)) {
          return [];
        }
        return (moduleJSON.modules || []).filter(fileName => {
          if (EXCLUDED_FILE_NAMES.includes(fileName)) {
            return false;
          }
          return fileName !== `${folderName}.js` && fileName !== `${folderName}-legacy.js`;
        });
      },
      buildGNPath => filename => {
        const relativePath = path.normalize(`${buildGNPath}/${filename}`);
        return `"${relativePath}",`;
      });
}

function checkDevtoolsModuleEntrypoints() {
  return checkGNVariable(
      'devtools_module_entrypoints',
      (moduleJSON, folderName) => {
        return (moduleJSON.modules || []).filter(fileName => {
          // TODO(crbug.com/1101738): Remove the exemption and change the variable to
          // `generated_typescript_entrypoints` instead.
          return (!EXCLUDED_FOLDERS.includes(folderName) && fileName === `${folderName}.js`) ||
              fileName === `${folderName}-legacy.js`;
        });
      },
      buildGNPath => filename => {
        const relativePath = path.normalize(`${buildGNPath}/${filename}`);
        return `"${relativePath}",`;
      });
}
function checkGeneratedTypescriptEntrypoints() {
  return checkGNVariable(
      'generated_typescript_entrypoints',
      (moduleJSON, folderName) => {
        return (moduleJSON.modules || []).filter(fileName => {
          // TODO(crbug.com/1101738): Remove the exemption and change the variable to
          // `generated_typescript_entrypoints` instead.
          return (EXCLUDED_FOLDERS.includes(folderName) && fileName === `${folderName}.js`);
        });
      },
      buildGNPath => filename => {
        const relativePath = path.normalize(`$resources_out_dir/${buildGNPath}/${filename}`);
        return `"${relativePath}",`;
      });
}

const VARIABLE_TO_FILE_MAPPGING = new Map([
  ['all_typescript_modules', 'all_devtools_modules.gni'],
  ['generated_typescript_entrypoints', 'devtools_module_entrypoints.gni'],
]);

function checkGNVariable(gnVariable, obtainFiles, obtainRelativePath) {
  let gniFileLocation = `${gnVariable}.gni`;
  if (VARIABLE_TO_FILE_MAPPGING.has(gnVariable)) {
    gniFileLocation = VARIABLE_TO_FILE_MAPPGING.get(gnVariable);
  }
  const filePath = path.resolve(__dirname, '..', gniFileLocation);
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const linesToCheck = fileContent.split('\n');

  const errors = [];
  const excludedFiles = ['axe.js', 'formatter_worker/', 'third_party/lighthouse/'].map(path.normalize);
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
    ...checkNonAutostartNonRemoteModules(),
    ...checkAllDevToolsFiles(),
    ...checkAllDevToolsModules(),
    ...checkAllTypescriptModules(),
    ...checkDevtoolsModuleEntrypoints(),
    ...checkGeneratedTypescriptEntrypoints(),
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

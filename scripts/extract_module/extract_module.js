// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
'use strict';
const fs = require('fs');
const path = require('path');

const utils = require('../utils');

const FRONTEND_PATH = path.resolve(__dirname, '..', '..', 'front_end');
const BUILD_GN_PATH = path.resolve(__dirname, '..', '..', 'BUILD.gn');
const SPECIAL_CASE_NAMESPACES_PATH = path.resolve(__dirname, '..', 'special_case_namespaces.json');

const APPLICATION_DESCRIPTORS = [
  'inspector.json',
  'toolbox.json',
  'unit_test_runner.json',
  'formatter_worker.json',
  'heap_snapshot_worker.json',
  'utility_shared_worker.json',
];

// Replace based on specified transformation
const MODULES_TO_REMOVE = [];

const JS_FILES_MAPPING = [
  {file: 'components/CustomPreviewComponent.js', new: 'object_ui'},
  {file: 'components/ObjectPopoverHelper.js', new: 'object_ui'},
  {file: 'components/ObjectPropertiesSection.js', new: 'object_ui'},
  {file: 'components/JavaScriptAutocomplete.js', new: 'object_ui'},
  {file: 'components/RemoteObjectPreviewFormatter.js', new: 'object_ui'},
];

const MODULE_MAPPING = {
  object_ui: {
    dependencies: ['ui', 'sdk', 'components'],
    dependents: ['console', 'sources', 'extensions', 'event_listeners', 'resources', 'profiler', 'network'],
    applications: ['inspector.json'],
    autostart: true,  // set to autostart because of extensions
  },
};

const NEW_DEPENDENCIES_BY_EXISTING_MODULES = {
    // resources: ['components'],
};

const REMOVE_DEPENDENCIES_BY_EXISTING_MODULES = {};

const DEPENDENCIES_BY_MODULE = Object.keys(MODULE_MAPPING).reduce((acc, module) => {
  acc[module] = MODULE_MAPPING[module].dependencies;
  return acc;
}, {});

const APPLICATIONS_BY_MODULE = Object.keys(MODULE_MAPPING).reduce((acc, module) => {
  acc[module] = MODULE_MAPPING[module].applications;
  return acc;
}, {});

const DEPENDENTS_BY_MODULE = Object.keys(MODULE_MAPPING).reduce((acc, module) => {
  acc[module] = MODULE_MAPPING[module].dependents;
  return acc;
}, {});

function extractModule() {
  const modules = new Set();
  for (let fileObj of JS_FILES_MAPPING) {
    let moduleName = fileObj.file.split('/')[0];
    modules.add(moduleName);
  }
  const newModuleSet = JS_FILES_MAPPING.reduce((acc, file) => file.new ? acc.add(file.new) : acc, new Set());
  const targetToOriginalFilesMap = JS_FILES_MAPPING.reduce((acc, f) => {
    let components = f.file.split('/');
    components[0] = f.new || f.existing;
    acc.set(components.join('/'), f.file);
    return acc;
  }, new Map());

  const cssFilesMapping = findCSSFiles();
  console.log('cssFilesMapping', cssFilesMapping);
  const identifiersByFile = calculateIdentifiers();
  const identifierMap = mapIdentifiers(identifiersByFile, cssFilesMapping);
  console.log('identifierMap', identifierMap);
  const extensionMap = removeFromExistingModuleDescriptors(modules, identifierMap, cssFilesMapping);

  // Find out which files are moving extensions
  for (let e of extensionMap.keys()) {
    for (let [f, identifiers] of identifiersByFile) {
      if (identifiers.includes(e))
        console.log(`extension: ${e} in file: ${f}`);
    }
  }

  moveFiles(cssFilesMapping);
  createNewModuleDescriptors(extensionMap, cssFilesMapping, identifiersByFile, targetToOriginalFilesMap);
  updateExistingModuleDescriptors(extensionMap, cssFilesMapping, identifiersByFile, targetToOriginalFilesMap);
  addDependenciesToDescriptors();
  renameIdentifiers(identifierMap);
  updateBuildGNFile(cssFilesMapping, newModuleSet);
  for (let descriptor of APPLICATION_DESCRIPTORS)
    updateApplicationDescriptor(descriptor, newModuleSet);

  for (let m of MODULES_TO_REMOVE)
    utils.removeRecursive(path.resolve(FRONTEND_PATH, m));
}

String.prototype.replaceAll = function(search, replacement) {
  let target = this;
  return target.replace(new RegExp('\\b' + search + '\\b', 'g'), replacement);
};

Set.prototype.union = function(setB) {
  let union = new Set(this);
  for (let elem of setB)
    union.add(elem);

  return union;
};

function mapModuleToNamespace(module) {
  const specialCases = require(SPECIAL_CASE_NAMESPACES_PATH);
  return specialCases[module] || toCamelCase(module);

  function toCamelCase(module) {
    return module.split('_').map(a => a.substring(0, 1).toUpperCase() + a.substring(1)).join('');
  }
}

function findCSSFiles() {
  let cssFilesMapping = new Map();
  for (let fileObj of JS_FILES_MAPPING)
    cssFilesMapping.set(fileObj.file, scrapeCSSFile(fileObj.file));


  function scrapeCSSFile(filePath) {
    let cssFiles = new Set();
    const fullPath = path.resolve(FRONTEND_PATH, filePath);
    let content = fs.readFileSync(fullPath).toString();
    let lines = content.split('\n');
    for (let line of lines) {
      let match = line.match(/'(.+\.css)'/);
      if (!match)
        continue;
      let matchPath = match[1];
      cssFiles.add(path.basename(path.resolve(FRONTEND_PATH, matchPath)));
    }
    return cssFiles;
  }

  return cssFilesMapping;
}

function calculateIdentifiers() {
  const identifiersByFile = new Map();
  for (let fileObj of JS_FILES_MAPPING) {
    const fullPath = path.resolve(FRONTEND_PATH, fileObj.file);
    let content = fs.readFileSync(fullPath).toString();
    identifiersByFile.set(fileObj.file, scrapeIdentifiers(content, fileObj));
  }
  return identifiersByFile;

  function scrapeIdentifiers(content, fileObj) {
    let identifiers = [];
    let lines = content.split('\n');
    for (let line of lines) {
      let match = line.match(new RegExp(`^([a-z_A-Z0-9\.]+)\\s=`)) || line.match(new RegExp(`^([a-z_A-Z0-9\.]+);`));
      if (!match)
        continue;
      let name = match[1];

      var currentModule = fileObj.file.split('/')[0];
      if (name.split('.')[0] !== mapModuleToNamespace(currentModule)) {
        console.log(`POSSIBLE ISSUE: identifier: ${name} found in ${currentModule}`);
        // one-off
        if (name.includes('UI.')) {
          console.log(`including ${name} anyways`);
          identifiers.push(name);
        }
      } else {
        identifiers.push(name);
      }
    }
    return identifiers;
  }
}

function moveFiles(cssFilesMapping) {
  for (let fileObj of JS_FILES_MAPPING) {
    let sourceFilePath = path.resolve(FRONTEND_PATH, fileObj.file);
    let targetFilePath = getMappedFilePath(fileObj);
    let moduleDir = path.resolve(targetFilePath, '..');
    if (!fs.existsSync(moduleDir))
      fs.mkdirSync(moduleDir);

    move(sourceFilePath, targetFilePath);
    if (cssFilesMapping.has(fileObj.file)) {
      cssFilesMapping.get(fileObj.file).forEach((file) => {
        let module = fileObj.new || fileObj.existing;
        move(path.resolve(FRONTEND_PATH, fileObj.file.split('/')[0], file), path.resolve(FRONTEND_PATH, module, file));
      });
    }
  }

  function move(sourceFilePath, targetFilePath) {
    try {
      fs.writeFileSync(targetFilePath, fs.readFileSync(sourceFilePath));
      fs.unlinkSync(sourceFilePath);
    } catch (err) {
      console.log(`error moving ${sourceFilePath} -> ${targetFilePath}`);
    }
  }

  function getMappedFilePath(fileObj) {
    let components = fileObj.file.split('/');
    components[0] = fileObj.existing || fileObj.new;
    return path.resolve(FRONTEND_PATH, components.join('/'));
  }
}

function updateBuildGNFile(cssFilesMapping, newModuleSet) {
  let content = fs.readFileSync(BUILD_GN_PATH).toString();
  let newSourcesToAdd = [];
  let partialPathMapping = calculatePartialPathMapping();
  for (let module of MODULES_TO_REMOVE) {
    partialPathMapping.set(`"front_end/${module}/module.json",\n`, '');
    partialPathMapping.set(`"$resources_out_dir/${module}/${module}_module.js",\n`, '');
  }
  const newNonAutostartModules = [...newModuleSet]
                                     .filter(module => !MODULE_MAPPING[module].autostart)
                                     .map(module => `"$resources_out_dir/${module}/${module}_module.js",`);

  let newContent = addContentToLinesInSortedOrder({
    content,
    startLine: '# this contains non-autostart non-remote modules only.',
    endLine: ']',
    linesToInsert: newNonAutostartModules,
  });

  for (let pair of partialPathMapping.entries())
    newContent = newContent.replace(pair[0], pair[1]);

  newContent = addContentToLinesInSortedOrder({
    content: newContent,
    startLine: 'all_devtools_files = [',
    endLine: ']',
    linesToInsert: newSourcesToAdd.concat([...newModuleSet].map(module => `"front_end/${module}/module.json",`)),
  });

  fs.writeFileSync(BUILD_GN_PATH, newContent);

  function calculatePartialPathMapping() {
    let partialPathMapping = new Map();
    for (let fileObj of JS_FILES_MAPPING) {
      let components = fileObj.file.split('/');
      let sourceModule = components[0];
      let targetModule = fileObj.existing || fileObj.new;
      components[0] = targetModule;
      partialPathMapping.set(`"front_end/${fileObj.file}",\n`, '');
      newSourcesToAdd.push(`"front_end/${components.join('/')}",`);
      if (cssFilesMapping.has(fileObj.file)) {
        for (let cssFile of cssFilesMapping.get(fileObj.file)) {
          partialPathMapping.set(`"front_end/${sourceModule}/${cssFile}",\n`, '');
          newSourcesToAdd.push(`"front_end/${targetModule}/${cssFile}",`);
        }
      }
    }
    return partialPathMapping;
  }

  function top(array) {
    return array[array.length - 1];
  }

  function addContentToLinesInSortedOrder({content, startLine, endLine, linesToInsert}) {
    if (linesToInsert.length === 0)
      return content;
    let lines = content.split('\n');
    let seenStartLine = false;
    let contentStack = linesToInsert.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase())).reverse();
    for (var i = 0; i < lines.length; i++) {
      let line = lines[i].trim();
      let nextLine = lines[i + 1].trim();
      if (line === startLine)
        seenStartLine = true;

      if (line === endLine && seenStartLine)
        break;

      if (!seenStartLine)
        continue;

      const nextContent = top(contentStack) ? top(contentStack).toLowerCase() : '';
      if ((line === startLine || nextContent >= line.toLowerCase()) &&
          (nextLine === endLine || nextContent <= nextLine.toLowerCase()))
        lines.splice(i + 1, 0, contentStack.pop());
    }
    if (contentStack.length)
      lines.splice(i, 0, ...contentStack);
    return lines.join('\n');
  }
}

function mapIdentifiers(identifiersByFile, cssFilesMapping) {
  const filesToTargetModule = new Map();
  for (let fileObj of JS_FILES_MAPPING)
    filesToTargetModule.set(fileObj.file, fileObj.existing || fileObj.new);


  const map = new Map();
  for (let [file, identifiers] of identifiersByFile) {
    let targetModule = filesToTargetModule.get(file);
    for (let identifier of identifiers) {
      let components = identifier.split('.');
      components[0] = mapModuleToNamespace(targetModule);
      let newIdentifier = components.join('.');
      map.set(identifier, newIdentifier);
    }
  }
  for (let [jsFile, cssFiles] of cssFilesMapping) {
    let fileObj = JS_FILES_MAPPING.filter(f => f.file === jsFile)[0];
    let sourceModule = fileObj.file.split('/')[0];
    let targetModule = fileObj.existing || fileObj.new;
    for (let cssFile of cssFiles) {
      let key = `${sourceModule}/${cssFile}`;
      let value = `${targetModule}/${cssFile}`;
      map.set(key, value);
    }
  }
  return map;
}

function renameIdentifiers(identifierMap) {
  walkSync('front_end', write, true);

  walkSync('../../LayoutTests/http/tests/inspector', write, false);
  walkSync('../../LayoutTests/http/tests/inspector-enabled', write, false);
  walkSync('../../LayoutTests/http/tests/inspector-protocol', write, false);
  walkSync('../../LayoutTests/http/tests/inspector-unit', write, false);
  walkSync('../../LayoutTests/inspector', write, false);
  walkSync('../../LayoutTests/inspector-enabled', write, false);
  walkSync('../../LayoutTests/inspector-protocol', write, false);

  function walkSync(currentDirPath, process, json) {
    fs.readdirSync(currentDirPath).forEach(function(name) {
      let filePath = path.join(currentDirPath, name);
      let stat = fs.statSync(filePath);
      if (stat.isFile() && (filePath.endsWith('.js') || filePath.endsWith('.html') || filePath.endsWith('.xhtml') ||
                            filePath.endsWith('-expected.txt') || (json && filePath.endsWith('.json')))) {
        if (filePath.includes('ExtensionAPI.js'))
          return;
        if (filePath.includes('externs.js'))
          return;
        if (filePath.includes('eslint') || filePath.includes('lighthouse-background.js') || filePath.includes('/cm/') ||
            filePath.includes('/xterm.js/') || filePath.includes('/acorn/') || filePath.includes('/gonzales-scss'))
          return;
        if (filePath.includes('/cm_modes/') && !filePath.includes('DefaultCodeMirror') &&
            !filePath.includes('module.json'))
          return;
        process(filePath);
      } else if (stat.isDirectory()) {
        walkSync(filePath, process, json);
      }
    });
  }

  function write(filePath) {
    let content = fs.readFileSync(filePath).toString();
    let newContent = content;
    for (let key of identifierMap.keys()) {
      let originalIdentifier = key;
      let newIdentifier = identifierMap.get(key);
      newContent = newContent.replaceAll(originalIdentifier, newIdentifier);
    }

    if (content !== newContent)
      fs.writeFileSync(filePath, newContent);
  }
}

function removeFromExistingModuleDescriptors(modules, identifierMap, cssFilesMapping) {
  let extensionMap = new Map();
  let moduleFileMap = new Map();

  for (let fileObj of JS_FILES_MAPPING) {
    let components = fileObj.file.split('/');
    let module = components[0];
    let fileName = components[1];

    if (!moduleFileMap.get(module))
      moduleFileMap.set(module, []);

    moduleFileMap.set(module, moduleFileMap.get(module).concat(fileName));
  }

  for (let module of modules) {
    let moduleJSONPath = path.resolve(FRONTEND_PATH, module, 'module.json');
    let content = fs.readFileSync(moduleJSONPath).toString();
    let moduleObj = parseJSON(content);
    let removedScripts = removeScripts(moduleObj, module);
    removeResources(moduleObj, removedScripts);
    removeExtensions(moduleObj);
    fs.writeFileSync(moduleJSONPath, stringifyJSON(moduleObj));
  }

  return extensionMap;

  function removeScripts(moduleObj, module) {
    let remainingScripts = [];
    let removedScripts = [];
    let moduleFiles = moduleFileMap.get(module);
    for (let script of moduleObj.scripts) {
      if (!moduleFiles.includes(script))
        remainingScripts.push(script);
      else
        removedScripts.push(module + '/' + script);
    }
    moduleObj.scripts = remainingScripts;
    return removedScripts;
  }

  function removeResources(moduleObj, removedScripts) {
    if (!moduleObj.resources)
      return;
    let remainingResources = [];
    let removedResources = new Set();
    for (let script of removedScripts)
      removedResources = removedResources.union(cssFilesMapping.get(script));


    for (let resource of moduleObj.resources) {
      if (!removedResources.has(resource))
        remainingResources.push(resource);
    }
    moduleObj.resources = remainingResources;
  }

  function removeExtensions(moduleObj) {
    if (!moduleObj.extensions)
      return;
    let remainingExtensions = [];
    for (let extension of moduleObj.extensions) {
      if (!objectIncludesIdentifier(extension)) {
        remainingExtensions.push(extension);
      } else {
        if (extensionMap.has(objectIncludesIdentifier(extension))) {
          let existingExtensions = extensionMap.get(objectIncludesIdentifier(extension));
          extensionMap.set(objectIncludesIdentifier(extension), existingExtensions.concat(extension));
        } else {
          extensionMap.set(objectIncludesIdentifier(extension), [extension]);
        }
      }
    }
    moduleObj.extensions = remainingExtensions;
  }

  function objectIncludesIdentifier(object) {
    for (let key in object) {
      let value = object[key];
      if (identifierMap.has(value))
        return value;
    }
    return false;
  }
}

function createNewModuleDescriptors(extensionMap, cssFilesMapping, identifiersByFile, targetToOriginalFilesMap) {
  let filesByNewModule = getFilesByNewModule();

  for (let module of filesByNewModule.keys()) {
    let moduleObj = {};

    let scripts = getModuleScripts(module);
    let extensions = getModuleExtensions(scripts, module);
    if (extensions.length)
      moduleObj.extensions = extensions;

    moduleObj.dependencies = DEPENDENCIES_BY_MODULE[module];

    moduleObj.scripts = scripts;

    let resources = getModuleResources(moduleObj.scripts, module);
    if (resources.length)
      moduleObj.resources = resources;

    let moduleJSONPath = path.resolve(FRONTEND_PATH, module, 'module.json');
    fs.writeFileSync(moduleJSONPath, stringifyJSON(moduleObj));
  }

  function getFilesByNewModule() {
    let filesByNewModule = new Map();
    for (let fileObj of JS_FILES_MAPPING) {
      if (!fileObj.new)
        continue;
      if (!filesByNewModule.has(fileObj.new))
        filesByNewModule.set(fileObj.new, []);

      filesByNewModule.set(fileObj.new, filesByNewModule.get(fileObj.new).concat([fileObj.file]));
    }
    return filesByNewModule;
  }

  function getModuleScripts(module) {
    return filesByNewModule.get(module).map((file) => file.split('/')[1]);
  }

  function getModuleResources(scripts, module) {
    let resources = [];
    scripts.map(script => module + '/' + script).forEach((script) => {
      script = targetToOriginalFilesMap.get(script);
      if (!cssFilesMapping.has(script))
        return;

      resources = resources.concat([...cssFilesMapping.get(script)]);
    });
    return resources;
  }

  function getModuleExtensions(scripts, module) {
    let extensions = [];
    let identifiers =
        scripts.map(script => module + '/' + script)
            .reduce((acc, file) => acc.concat(identifiersByFile.get(targetToOriginalFilesMap.get(file))), []);
    for (let identifier of identifiers) {
      if (extensionMap.has(identifier))
        extensions = extensions.concat(extensionMap.get(identifier));
    }
    return extensions;
  }
}

function calculateFilesByModuleType(type) {
  let filesByNewModule = new Map();
  for (let fileObj of JS_FILES_MAPPING) {
    if (!fileObj[type])
      continue;
    if (!filesByNewModule.has(fileObj[type]))
      filesByNewModule.set(fileObj[type], []);

    filesByNewModule.set(fileObj[type], filesByNewModule.get(fileObj[type]).concat([fileObj.file]));
  }
  return filesByNewModule;
}

function updateExistingModuleDescriptors(extensionMap, cssFilesMapping, identifiersByFile, targetToOriginalFilesMap) {
  let filesByExistingModule = calculateFilesByModuleType('existing');
  for (let module of filesByExistingModule.keys()) {
    let moduleJSONPath = path.resolve(FRONTEND_PATH, module, 'module.json');
    let content = fs.readFileSync(moduleJSONPath).toString();
    let moduleObj = parseJSON(content);

    let scripts = getModuleScripts(module);
    let existingExtensions = moduleObj.extensions || [];
    let extensions = existingExtensions.concat(getModuleExtensions(scripts, module));
    if (extensions.length)
      moduleObj.extensions = extensions;

    moduleObj.scripts = moduleObj.scripts.concat(scripts);

    let existingResources = moduleObj.resources || [];
    let resources = existingResources.concat(getModuleResources(scripts, module));
    if (resources.length)
      moduleObj.resources = resources;

    fs.writeFileSync(moduleJSONPath, stringifyJSON(moduleObj));
  }


  function getModuleScripts(module) {
    return filesByExistingModule.get(module).map((file) => file.split('/')[1]);
  }

  function getModuleResources(scripts, module) {
    let resources = [];
    scripts.map(script => module + '/' + script).forEach((script) => {
      script = targetToOriginalFilesMap.get(script);
      if (!cssFilesMapping.has(script))
        return;

      resources = resources.concat([...cssFilesMapping.get(script)]);
    });
    return resources;
  }

  function getModuleExtensions(scripts, module) {
    let extensions = [];
    let identifiers =
        scripts.map(script => module + '/' + script)
            .reduce((acc, file) => acc.concat(identifiersByFile.get(targetToOriginalFilesMap.get(file))), []);
    for (let identifier of identifiers) {
      if (extensionMap.has(identifier))
        extensions = extensions.concat(extensionMap.get(identifier));
    }
    return extensions;
  }
}

function addDependenciesToDescriptors() {
  for (let module of getModules()) {
    let moduleJSONPath = path.resolve(FRONTEND_PATH, module, 'module.json');
    let content = fs.readFileSync(moduleJSONPath).toString();
    let moduleObj = parseJSON(content);

    let existingDependencies = moduleObj.dependencies || [];
    let dependencies =
        existingDependencies.concat(getModuleDependencies(module))
            .filter((depModule) => !MODULES_TO_REMOVE.includes(depModule))
            .filter((depModule) => !(REMOVE_DEPENDENCIES_BY_EXISTING_MODULES[module] || []).includes(depModule));
    let newDependenciesForExistingModule = NEW_DEPENDENCIES_BY_EXISTING_MODULES[module];
    if (newDependenciesForExistingModule)
      dependencies = dependencies.concat(newDependenciesForExistingModule);
    if (dependencies.length)
      moduleObj.dependencies = dependencies;
    let newStringified = stringifyJSON(moduleObj);
    if (stringifyJSON(moduleObj) !== stringifyJSON(parseJSON(content)))
      fs.writeFileSync(moduleJSONPath, newStringified);
  }

  function getModuleDependencies(existingModule) {
    let newDeps = [];
    for (let newModule in DEPENDENTS_BY_MODULE) {
      let dependents = DEPENDENTS_BY_MODULE[newModule];
      if (dependents.includes(existingModule))
        newDeps.push(newModule);
    }
    return newDeps;
  }
}

function updateApplicationDescriptor(descriptorFileName, newModuleSet) {
  let descriptorPath = path.join(FRONTEND_PATH, descriptorFileName);
  let newModules = [...newModuleSet].filter(m => APPLICATIONS_BY_MODULE[m].includes(descriptorFileName));
  if (newModules.length === 0)
    return;
  let includeNewModules = (acc, line) => {
    if (line.includes('{') && line.endsWith('}')) {
      line += ',';
      acc.push(line);
      return acc.concat(newModules.map((m, i) => {
        // Need spacing to preserve indentation
        let string;
        if (MODULE_MAPPING[m].autostart)
          string = `        { "name": "${m}", "type": "autostart"}`;
        else
          string = `        { "name": "${m}" }`;
        if (i !== newModules.length - 1)
          string += ',';
        return string;
      }));
    }
    return acc.concat([line]);
  };
  let removeModules = (acc, line) => MODULES_TO_REMOVE.every(m => !line.includes(m)) ? acc.concat([line]) : acc;
  let lines =
      fs.readFileSync(descriptorPath).toString().split('\n').reduce(includeNewModules, []).reduce(removeModules, []);
  fs.writeFileSync(descriptorPath, lines.join('\n'));
}

function getModules() {
  return fs.readdirSync(FRONTEND_PATH).filter(function(file) {
    return fs.statSync(path.join(FRONTEND_PATH, file)).isDirectory() &&
        utils.isFile(path.join(FRONTEND_PATH, file, 'module.json'));
  });
}

function parseJSON(string) {
  return JSON.parse(string);
}

function stringifyJSON(obj) {
  return unicodeEscape(JSON.stringify(obj, null, 4) + '\n');
}

// http://stackoverflow.com/questions/7499473/need-to-escape-non-ascii-characters-in-javascript
function unicodeEscape(string) {
  function padWithLeadingZeros(string) {
    return new Array(5 - string.length).join('0') + string;
  }

  function unicodeCharEscape(charCode) {
    return '\\u' + padWithLeadingZeros(charCode.toString(16));
  }

  return string.split('')
      .map(function(char) {
        var charCode = char.charCodeAt(0);
        return charCode > 127 ? unicodeCharEscape(charCode) : char;
      })
      .join('');
}

if (require.main === module)
  extractModule();

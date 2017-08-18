/**
 * Create the fake namespaces
 */

const path = require('path');
const fs = require('fs');

const utils = require('../utils');

const FRONT_END_PATH = path.resolve(__dirname, '..', '..', 'front_end');

function main() {
  const identifierMap = generateTestHelperMap();
  renameIdentifiers(identifierMap);
}

String.prototype.replaceAll = function(search, replacement) {
  let target = this;
  return target.replace(new RegExp('\\b' + search + '\\b', 'g'), replacement);
};

main();

function generateTestHelperMap() {
  const map = new Map();
  for (const folder of fs.readdirSync(FRONT_END_PATH)) {
    if (folder.indexOf('test_runner') === -1) {
      continue;
    }
    const testRunnerModulePath = path.resolve(FRONT_END_PATH, folder);
    if (!utils.isDir(testRunnerModulePath)) {
      continue;
    }
    for (const filename of fs.readdirSync(testRunnerModulePath)) {
      if (filename === 'module.json') {
        continue;
      }
      scrapeTestHelperIdentifiers(path.resolve(testRunnerModulePath, filename));
    }
  }

  // Manual overrides
  map.set('InspectorTest.consoleModel', 'TestRunner.consoleModel');
  map.set('InspectorTest.networkLog', 'TestRunner.networkLog');

  return map;

  function scrapeTestHelperIdentifiers(filePath) {
    var content = fs.readFileSync(filePath).toString();
    var lines = content.split('\n');
    for (var line of lines) {
      var line = line.trim();
      if (line.indexOf('TestRunner.') === -1)
        continue;
      var match = line.match(/^\s*(\b\w*TestRunner.[a-z_A-Z0-9]+)\s*(\=[^,}]|[;])/) ||
          line.match(/^(\b\w*TestRunner.[a-z_A-Z0-9]+)\s*\=$/);
      if (!match)
        continue;
      var name = match[1];
      var components = name.split('.');
      if (components.length !== 2) {
        console.log('BAD', name);
        continue;
      }
      map.set(['InspectorTest', components[1]].join('.'), name);
    }
  }
}

function renameIdentifiers(identifierMap) {
  walkSync('../../../../LayoutTests/http/tests/inspector', write);
  walkSync('../../../../LayoutTests/http/tests/inspector-enabled', write);
  walkSync('../../../../LayoutTests/http/tests/inspector-unit', write);
  walkSync('../../../../LayoutTests/inspector-enabled', write);
  walkSync('../../../../LayoutTests/inspector', write);

  function walkSync(currentDirPath, process) {
    fs.readdirSync(currentDirPath).forEach(function(name) {
      let filePath = path.join(currentDirPath, name);
      let stat = fs.statSync(filePath);
      if (stat.isFile() &&
          (filePath.endsWith('.html') || filePath.endsWith('.xhtml') || filePath.endsWith('.xsl') ||
           filePath.endsWith('-expected.txt'))) {
        // This file causes issues with renaming namespace
        if (filePath.endsWith('heap-snapshot.html'))
          return;
        process(filePath);
      } else if (stat.isDirectory()) {
        walkSync(filePath, process);
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

    const ignoreBindContent = newContent.replace(/.bind\(InspectorTest/g, '.bind(IGNOREDIT');
    if (ignoreBindContent.indexOf('InspectorTest') !== -1) {
      console.log('WARNING', filePath, 'has old inspector test references remaining');
      console.log(ignoreBindContent);
    }

    if (content !== newContent)
      fs.writeFileSync(filePath, newContent);
  }
}

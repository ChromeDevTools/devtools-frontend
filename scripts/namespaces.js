const fs = require('fs');

const TARGET_MODULE = 'UI';

function depends(module, from) {
  if (module === from)
    return true;
  var desc = descriptors[module];
  if (!desc)
    return false;
  for (var dep of desc.dependencies || []) {
    if (dep === from)
      return true;
    if (depends(dep, from))
      return true;
  }
  return false;
}

var map = new Map();
var sortedKeys;
var moduleNames = new Set();

String.prototype.replaceAll = function(a, b) {
  var result = this;
  return result.split(a).join(b);
};

function read(filePath) {
  var content = fs.readFileSync(filePath).toString();

  var oldModuleName = filePath.replace(/front_end\/([^/]+)\/.*/, '$1');
  if (oldModuleName.endsWith('_lazy'))
    oldModuleName = oldModuleName.substring(0, oldModuleName.length - '_lazy'.length);

  var moduleName = oldModuleName;

  if (moduleName === 'sdk' || moduleName == 'ui')
    moduleName = moduleName.toUpperCase();
  moduleName = moduleName.split('_').map(a => a.substring(0, 1).toUpperCase() + a.substring(1)).join('');
  if (moduleName.includes('/'))
    return;
  moduleNames.add(moduleName);

  var lines = content.split('\n');
  for (var line of lines) {
    // Replace with your own logic
    if (!line.startsWith('var '))
      continue;
    var globalVariableMatch = line.match(/^var ([a-z_A-Z0-9]+)\s*(\=)/);
    var match = globalVariableMatch;

    if (!match)
      continue;
    var name = match[1];
    var weight = line.endsWith(name + ';') ? 2 : 1;

    var newName;

    newName = TARGET_MODULE + '.' + name;
    var existing = map.get(name);
    if (existing && existing.weight > weight)
      continue;
    if (existing && existing.weight === weight && newName !== existing.name)
      console.log('Conflict: ' + newName + ' vs ' + existing.name + ' ' + weight);
    map.set(name, {name: newName, weight});
  }
}

function write(filePath) {
  var content = fs.readFileSync(filePath).toString();
  var newContent = content;
  for (var key of sortedKeys) {
    var originalIdentifier = key;
    var newIdentifier = map.get(key).name;
    newContent = newContent.split('\n').map(line => processLine(line, originalIdentifier, newIdentifier)).join('\n');
  }

  if (content !== newContent)
    fs.writeFileSync(filePath, newContent);
}

function processLine(line, originalIdentifier, newIdentifier) {
  return line.replace(new RegExp(`^var ${originalIdentifier}`, 'g'), `${newIdentifier}`)
      .replace(new RegExp(`^function ${originalIdentifier}`, 'g'), `${newIdentifier} = function`)
      .replace(new RegExp(`^${originalIdentifier}\\.`, 'g'), `${newIdentifier}.`)
      .replace(new RegExp(`([^."'])(\\b${originalIdentifier}\\b)(?!(\.js|[ ]|[']))`, 'g'), usageReplacer);

  function usageReplacer(match, p1) {
    return [p1, newIdentifier].join('');
  }
}

function walkSync(currentDirPath, process, json) {
  var path = require('path');
  fs.readdirSync(currentDirPath).forEach(function(name) {
    var filePath = path.join(currentDirPath, name);
    var stat = fs.statSync(filePath);
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

walkSync('front_end', read);

sortedKeys = Array.from(map.keys());
sortedKeys.sort((a, b) => a.localeCompare(b));
sortedKeys = ['Size', 'Insets', 'Constraints'];
for (var key of sortedKeys)
  console.log(key + ' => ' + map.get(key).name);

walkSync('front_end', write, true);

walkSync('../../LayoutTests/http/tests/inspector', write, false);
walkSync('../../LayoutTests/http/tests/inspector-enabled', write, false);
walkSync('../../LayoutTests/http/tests/inspector-protocol', write, false);
walkSync('../../LayoutTests/http/tests/inspector-unit', write, false);
walkSync('../../LayoutTests/inspector', write, false);
walkSync('../../LayoutTests/inspector-enabled', write, false);
walkSync('../../LayoutTests/inspector-protocol', write, false);

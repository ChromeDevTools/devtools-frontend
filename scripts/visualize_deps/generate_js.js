"use strict";

const fs = require('fs');
const path = require('path');

const utils = require('../utils');

const FRONTEND_PATH = path.resolve(__dirname, '..', '..', 'front_end');
const OUT = path.resolve(__dirname, 'out', 'modules.js');

function main() {
  const modules = new Set();
  const moduleToDependencyList = [];
  fs.readdirSync(FRONTEND_PATH).forEach(function(file) {
    const moduleJSONPath = path.join(FRONTEND_PATH, file, 'module.json');
    if (fs.statSync(path.join(FRONTEND_PATH, file)).isDirectory() &&
      utils.isFile(moduleJSONPath)) {
      const module = file;
      modules.add(module);
      const moduleJSON = require(moduleJSONPath);
      if (moduleJSON.dependencies) {
        for (let d of moduleJSON.dependencies) {
          moduleToDependencyList.push([module, d]);
        }
      }
    }
  });
  const nodes = Array.from(modules);
  fs.writeFileSync(OUT, `var modules = ${JSON.stringify(moduleToDependencyList)}; var nodes = ${JSON.stringify(nodes)};`);
}

if (require.main === module)
  main();
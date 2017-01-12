// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

"use strict";

const fs = require('fs');
const path = require('path');

const utils = require('../utils');

const FRONTEND_PATH = path.resolve(__dirname, '..', '..', 'front_end');
const OUT = path.resolve(__dirname, 'out', 'dependencies.dot');

function main() {
  const modules = new Set();
  const moduleToDependencyList = ['digraph dependencies {'];
  moduleToDependencyList.push('fixedsize = true;')
  fs.readdirSync(FRONTEND_PATH).forEach(function(file) {
    const moduleJSONPath = path.join(FRONTEND_PATH, file, 'module.json');
    if (fs.statSync(path.join(FRONTEND_PATH, file)).isDirectory() &&
      utils.isFile(moduleJSONPath)) {
      const module = file;
      if (module === 'audits2_worker')
        return;
      modules.add(module);
      const moduleJSON = require(moduleJSONPath);
      let moduleSize = 0;

      let resources = (moduleJSON.scripts || []).concat((moduleJSON.resources || []));
      for (let script of resources) {
        if (fs.existsSync(path.join(FRONTEND_PATH, module, script))) {
          console.log(path.join(FRONTEND_PATH, module, script));
          moduleSize += fs.statSync(path.join(FRONTEND_PATH, module, script)).size;
        }
      }
      moduleSize /= 200000;
      moduleSize = Math.max(0.5, moduleSize);
      let fontSize = Math.max(moduleSize*14, 14);

      moduleToDependencyList.push(`${module} [width=${moduleSize}, height=${moduleSize} fontsize=${fontSize}];`);

      if (moduleJSON.dependencies) {
        for (let d of moduleJSON.dependencies) {
          moduleToDependencyList.push(`  ${module} -> ${d}`);
        }
      }
    }
  });
  moduleToDependencyList.push('}');
  const content = moduleToDependencyList.join('\n');
  fs.writeFileSync(OUT, content);
}

if (require.main === module)
  main();
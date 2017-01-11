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
  fs.readdirSync(FRONTEND_PATH).forEach(function(file) {
    const moduleJSONPath = path.join(FRONTEND_PATH, file, 'module.json');
    if (fs.statSync(path.join(FRONTEND_PATH, file)).isDirectory() &&
      utils.isFile(moduleJSONPath)) {
      const module = file;
      modules.add(module);
      const moduleJSON = require(moduleJSONPath);
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
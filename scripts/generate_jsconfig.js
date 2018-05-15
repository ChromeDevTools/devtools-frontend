// Copyright 2018 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// This file generates jsconfig.json to improve VSCode autocomplete in the DevTools codebase.
const fs = require('fs');
const path = require('path');
const utils = require('./utils');

const FRONTEND_PATH = path.resolve(__dirname, '..', 'front_end');

const modulePaths = [];
for (let dir of fs.readdirSync(FRONTEND_PATH)) {
  if (!utils.isDir(path.resolve(FRONTEND_PATH, dir)))
    continue;
  const modulePath = path.resolve(dir, 'module.json');
  if (utils.isFile(path.resolve(FRONTEND_PATH, dir, 'module.json')))
    modulePaths.push(dir);
}
const modules = new Map();
for (const modulePath of modulePaths) {
  const moduleObject = JSON.parse(fs.readFileSync(path.resolve(FRONTEND_PATH, modulePath, 'module.json')));
  modules.set(modulePath, moduleObject);
}

for (const [name, moduleJSON] of modules) {
  const jsconfig = {
    compilerOptions: {
      target: 'esnext',
      lib: ['esnext', 'dom']
    },
    include: [
      '**/*',
      '../Runtime.js',
      '../externs.js'
    ],
    exclude: (moduleJSON.skip_compilation || [])
  };
  for (const dependency of dependencyChain(name)) {
    jsconfig.include.push('../' + dependency + '/**/*');
    for (const file of modules.get(dependency).skip_compilation || [])
      jsconfig.exclude.push(path.posix.join('..',dependency, file));
  }
  fs.writeFileSync(path.resolve(FRONTEND_PATH, name, 'jsconfig.json'), JSON.stringify(jsconfig, undefined, 2));
}

/**
 * @param {string} moduleName
 * @return {!Set<string>}
 */
function dependencyChain(moduleName) {
  const dependencies = new Set();
  for (const dependency of modules.get(moduleName).dependencies || []){
    dependencies.add(dependency);
    for (const innerDependency of dependencyChain(dependency))
      dependencies.add(innerDependency);
  }
  return dependencies;
}
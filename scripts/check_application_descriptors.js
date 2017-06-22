// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

const inspectorManifest = require('../front_end/inspector.json');
const testManifest = require('../front_end/integration_test_runner.json');

function main() {
  const testModules = new Set();
  for (const module of testManifest.modules) {
    testModules.add(serialize(module));
  }
  const missingModules = [];
  for (const module of inspectorManifest.modules) {
    if (!testModules.has(serialize(module))) {
      missingModules.push(JSON.stringify(module));
    }
  }
  if (missingModules.length) {
    console.log('DevTools application descriptor checker found an error!');
    console.log('integration_test_runner.json is missing the following modules:');
    console.log(missingModules.join('\n'));
    process.exit(1);
  }
  console.log('DevTools application descriptor checker passed');
}

main();

// Only works for shallow objects
// See: https://stackoverflow.com/questions/16167581/sort-object-properties-and-json-stringify
function serialize(object) {
  return JSON.stringify(object, Object.keys(object).sort())
}

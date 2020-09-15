// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const fs = require('fs');
const path = require('path');
const {argv} = require('yargs');

const ENTRYPOINTS = [
  'devtools_app',
  'inspector',
  'js_app',
  'ndb_app',
  'node_app',
  'toolbox',
  'worker_app',
];

const {template} = argv;

if (!template) {
  throw new Error('Must specify --template location with the location of the HTML entrypoint template.');
}

const {outDirectory} = argv;

if (!outDirectory) {
  throw new Error('Must specify --out-directory location where the outputs must live.');
}

const templateContent = fs.readFileSync(template, 'utf-8');

for (const entrypoint of ENTRYPOINTS) {
  const rewrittenTemplateContent = templateContent.replace('%ENTRYPOINT_NAME%', entrypoint);
  fs.writeFileSync(path.join(outDirectory, `${entrypoint}.html`), rewrittenTemplateContent);
}

// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const fs = require('fs');
const path = require('path');
const {argv} = require('yargs');
const {writeIfChanged} = require('./ninja/write-if-changed.js');

const {template} = argv;

if (!template) {
  throw new Error('Must specify --template location with the location of the HTML entrypoint template.');
}

const {outDirectory} = argv;

if (!outDirectory) {
  throw new Error('Must specify --out-directory location where the outputs must live.');
}

const {entrypoints} = argv;

if (!entrypoints) {
  throw new Error('Must specify at least one entrypoint name.');
}

if (!Array.isArray(entrypoints)) {
  throw new Error('Must specify multiple entrypoints as array');
}

const templateContent = fs.readFileSync(template, 'utf-8');

for (const entrypoint of entrypoints) {
  const rewrittenTemplateContent = templateContent.replace(new RegExp('%ENTRYPOINT_NAME%', 'g'), entrypoint);
  writeIfChanged(path.join(outDirectory, `${entrypoint}.html`), rewrittenTemplateContent);
}

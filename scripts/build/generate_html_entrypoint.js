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

const REACT_NATIVE_ENTRYPOINT_TO_TITLE = new Map([
  ['rn_inspector', 'DevTools (React Native)'],
  ['rn_fusebox', 'React Native DevTools (Fusebox ⚡)']
]);

for (const entrypoint of entrypoints) {
  let rewrittenTemplateContent = templateContent.replace(new RegExp('%ENTRYPOINT_NAME%', 'g'), entrypoint);
  if (REACT_NATIVE_ENTRYPOINT_TO_TITLE.has(entrypoint)) {
    const rewrittenTitle = REACT_NATIVE_ENTRYPOINT_TO_TITLE.get(entrypoint);
    rewrittenTemplateContent = rewrittenTemplateContent.replace(
      new RegExp('(?<=<title>)(.*)(?=</title>)', 'g'),
      rewrittenTitle
    );
  }

  writeIfChanged(path.join(outDirectory, `${entrypoint}.html`), rewrittenTemplateContent);
}

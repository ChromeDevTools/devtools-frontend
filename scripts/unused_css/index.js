// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const fs = require('fs');
const path = require('path');
const css = require('css');
const cssWhat = require('css-what');
const acorn = require('acorn');

const utils = require('../utils');
const promisify = require('util').promisify;
const readFile = promisify(fs.readFile);
const FRONTEND_PATH = path.join(__dirname, '..', '..', 'front_end');

const classes = new Set();
const strings = new Set();
const trickyStrings = new Set([
  'crc-node__tree-hostname',
  'tooltip-boundary',
  'terminal',
  'terminal-cursor',
  'composition-view'
]);
(async function() {
  await Promise.all(fs.readdirSync(FRONTEND_PATH).map(dir => processFolder(dir)));
  const unused = [];
  for (const className of classes) {
    if (strings.has(className) || trickyStrings.has(className)) {
      continue;
    }
    if (className.startsWith('CodeMirror')) {
      continue;
    }
    if (className.startsWith('xterm-')) {
      continue;
    }
    if (className.startsWith('lh-')) {
      continue;
    }
    if (className.startsWith('cm-')) {
      continue;
    }
    if (className.startsWith('navigator-')) {
      continue;
    }
    if (className.startsWith('object-value-')) {
      continue;
    }
    if (className.startsWith('security-summary-')) {
      continue;
    }
    if (className.startsWith('security-explanation-title-')) {
      continue;
    }
    if (className.startsWith('security-explanation-')) {
      continue;
    }
    if (className.startsWith('lock-icon-')) {
      continue;
    }
    if (className.startsWith('security-property-')) {
      continue;
    }
    if (className.startsWith('url-scheme-')) {
      continue;
    }
    if (className.startsWith('infobar-')) {
      continue;
    }
    if (className.startsWith('shadow-root-depth-')) {
      continue;
    }
    if (className.startsWith('timeline-overview-')) {
      continue;
    }
    if (className.startsWith('spritesheet-')) {
      continue;
    }
    if (className.startsWith('report-icon--')) {
      continue;
    }

    if (checkSuffix('-start')) {
      continue;
    }
    if (checkSuffix('-end')) {
      continue;
    }
    if (checkSuffix('-column')) {
      continue;
    }
    if (checkSuffix('-overview-grid')) {
      continue;
    }
    if (checkSuffix('-overview-container')) {
      continue;
    }
    if (checkSuffix('-icon')) {
      continue;
    }
    unused.push(className);

    function checkSuffix(suffix) {
      return className.endsWith(suffix) && strings.has(className.substring(0, className.length - suffix.length));
    }
  }
  console.log(unused);
  console.log(unused.length);
})();


async function processFolder(dir) {
  if (!utils.isDir(path.join(FRONTEND_PATH, dir))) {
    return;
  }
  const modulePath = path.join(FRONTEND_PATH, dir, 'module.json');
  if (!utils.isFile(modulePath)) {
    return;
  }
  const content = JSON.parse(await readFile(modulePath, 'utf8'));
  const promises = [];
  for (const resource of content.resources || []) {
    if (!resource.endsWith('.css')) {
      continue;
    }
    promises.push(processCSSFile(path.join(FRONTEND_PATH, dir, resource)));
  }
  const skips = new Set(content.skip_compilation || []);
  for (const script of content.scripts || []) {
    if (skips.has(script)) {
      continue;
    }
    promises.push(processScriptFile(path.join(FRONTEND_PATH, dir, script)));
  }
  await Promise.all(promises);
}

async function processCSSFile(cssFile) {
  const content = await readFile(cssFile, 'utf8');
  try {
    const ast = css.parse(content);
    for (const rule of ast.stylesheet.rules) {
      for (const selector of rule.selectors || []) {
        for (const token of parseSimpleSelector(selector)) {
          if (token.name === 'class' || token.name === 'id') {
            classes.add(token.value);
          }
        }
      }
    }
  } catch (e) {
    console.log(cssFile, e);
  }
}

function parseSimpleSelector(selector) {
  // css-what isn't the best. Try catch.
  try {
    const parsed = cssWhat(selector);
    return parsed[0] || [];
  } catch (e) {
    return [];
  }
}

async function processScriptFile(scriptFile) {
  const content = await readFile(scriptFile, 'utf8');
  const tokens = acorn.tokenizer(content);
  for (const token of tokens) {
    if (token.type.label === 'string' || token.type.label === 'template') {
      for (const word of token.value.split(' ')) {
        strings.add(word);
      }
      const regex = /class\s*=\s*['"]?([\w\-_ ]*)/ig;
      let result;
      while ((result = regex.exec(token.value))) {
        for (const word of result[1].split(' ')) {
          strings.add(word);
        }
      }
    }
  }
}

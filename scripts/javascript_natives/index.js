// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as fs from 'fs';
import glob from 'glob';
import ts from 'typescript';
import * as WebIDL2 from 'webidl2';

import {parseTSFunction, postProcess, walkRoot} from './helpers.js';

if (process.argv.length !== 4) {
  throw new Error('Please provide path to chromium/src and devtools-frontend');
}

const chromiumSource = process.argv[2];
const REL_TS_LIB_PATH = '/node_modules/typescript/lib/';
const typescriptSources =
    fs.readdirSync(process.argv[3] + REL_TS_LIB_PATH).map(name => process.argv[3] + REL_TS_LIB_PATH + name);

const program = ts.createProgram({rootNames: typescriptSources, options: {noResolve: true, types: []}});

for (const file of program.getSourceFiles()) {
  ts.forEachChild(file, node => {
    if (node.kind === ts.SyntaxKind.InterfaceDeclaration) {
      for (const member of node.members) {
        if (member.kind === ts.SyntaxKind.MethodSignature) {
          parseTSFunction(member, node);
        }
      }
    }
    if (node.kind === ts.SyntaxKind.FunctionDeclaration) {
      parseTSFunction(node, {name: {text: 'Window'}});
    }
  });
}

// Assume the DevTools front-end repository is at
// `devtools/devtools-frontend`, where `devtools` is on the same level
// as `chromium`. This matches `scripts/npm_test.js`.
const files =
    glob.sync(`${chromiumSource}/third_party/blink/renderer/+(core|modules)/**/*.idl`, {cwd: process.env.PWD});

for (const file of files) {
  if (file.includes('testing')) {
    continue;
  }
  const data = fs.readFileSync(file, 'utf8');
  const lines = data.split('\n');
  const newLines = [];
  for (const line of lines) {
    if (!line.includes(' attribute ')) {
      newLines.push(line);
    }
  }

  try {
    WebIDL2.parse(newLines.join('\n')).forEach(walkRoot);
  } catch (e) {
    // console.error(file);
  }

  // Source for Console spec: https://console.spec.whatwg.org/#idl-index
  WebIDL2
      .parse(`
[Exposed=(Window,Worker,Worklet)]
namespace console { // but see namespace object requirements below
  // Logging
  undefined assert(optional boolean condition = false, any... data);
  undefined clear();
  undefined debug(any... data);
  undefined error(any... data);
  undefined info(any... data);
  undefined log(any... data);
  undefined table(optional any tabularData, optional sequence<DOMString> properties);
  undefined trace(any... data);
  undefined warn(any... data);
  undefined dir(optional any item, optional object? options);
  undefined dirxml(any... data);

  // Counting
  undefined count(optional DOMString label = "default");
  undefined countReset(optional DOMString label = "default");

  // Grouping
  undefined group(any... data);
  undefined groupCollapsed(any... data);
  undefined groupEnd();

  // Timing
  undefined time(optional DOMString label = "default");
  undefined timeLog(optional DOMString label = "default", any... data);
  undefined timeEnd(optional DOMString label = "default");
};
`).forEach(walkRoot);
}
postProcess();

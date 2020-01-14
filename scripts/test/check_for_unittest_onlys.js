// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const ts = require('typescript');
const fs = require('fs');
const files = process.argv.slice(2);

const instances = [];
for (const file of files) {
  const sourceFile = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.ESNext, true);

  function visit(node) {
    switch (node.kind) {
      case ts.SyntaxKind.Identifier:
        if (node.escapedText === 'only') {
          // Ensure the parent of the `only` is a `describe` or `it` call.
          const {parent} = node;
          if (!parent.expression || !parent.expression.escapedText) {
            break;
          }

          const {escapedText} = parent.expression;
          if (escapedText !== 'it' && escapedText !== 'describe') {
            break;
          }

          const instance = {file, ...sourceFile.getLineAndCharacterOfPosition(node.pos)};
          instances.push(instance);
        }
        break;
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
}

if (instances.length) {
  for (const instance of instances) {
    const {file, line, character} = instance;
    console.log(`Use of .only found in ${file} at ${line + 1}:${character + 1}`);
  }
  process.exit(1);
}
process.exit(0);

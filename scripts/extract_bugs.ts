// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {readFileSync} from 'fs';
import glob from 'glob';
import * as ts from 'typescript';
import yargs from 'yargs';
import {hideBin} from 'yargs/helpers';

const argv = yargs(hideBin(process.argv))
                 .option('format', {
                   alias: 'f',
                   describe: 'Output format',
                   choices: ['list', 'b'],
                   default: 'list',
                 })
                 .parseSync();

/**
 * Usage: node --no-warnings --experimental-strip-types
 * scripts/extract_bugs.ts
 *
 * Finds all skipped tests and returns associated bug IDs and the test
 * files (tab-separated).
 */

const bugs = new Set<string>();
const bugToFile = new Map<string, string>();

function extract(sourceFile: ts.SourceFile) {
  extractBugs(sourceFile);

  function isSkipCall(node: ts.Node) {
    if (node.getChildAt(0).kind === ts.SyntaxKind.PropertyAccessExpression) {
      const propAccess = node.getChildAt(0);
      const skipCalls = new Set(['it.skip', 'describe.skip', 'itScreenshot.skip']);
      if (skipCalls.has(propAccess.getText())) {
        return true;
      }
    }
    return false;
  }

  function isSkipOnPlatformsCall(node: ts.Node) {
    if (node.getChildAt(0).kind === ts.SyntaxKind.PropertyAccessExpression) {
      const propAccess = node.getChildAt(0);
      const skipOnPlatformCalls =
          new Set(['it.skipOnPlatforms', 'describe.skipOnPlatforms', 'itScreenshot.skipOnPlatforms']);
      if (skipOnPlatformCalls.has(propAccess.getText())) {
        return true;
      }
    }
    return false;
  }

  function extractBugs(node: ts.Node) {
    switch (node.kind) {
      case ts.SyntaxKind.CallExpression: {
        let description;
        if (isSkipCall(node)) {
          description = node.getChildAt(2).getChildAt(0).getText();
        } else if (isSkipOnPlatformsCall(node)) {
          description = node.getChildAt(2).getChildAt(2).getText();
        }
        if (!description) {
          break;
        }
        const match = description.match(/crbug.com\/(\d+)/);
        if (!match) {
          break;
        }
        bugs.add(match[1]);
        bugToFile.set(match[1], sourceFile.fileName);
        break;
      }
    }

    ts.forEachChild(node, extractBugs);
  }
}

const files = [
  ...glob.sync('front_end/**/*.test.ts'),
  ...glob.sync('test/**/*test.ts'),
];

for (const file of files) {
  extract(ts.createSourceFile(
      file, readFileSync(file).toString(), ts.ScriptTarget.ESNext,
      /* setParentNodes */ true));
}

if (argv.format === 'b') {
  console.log(`id: (${Array.from(bugs).join('|')})`);
} else {
  for (const bug of bugs) {
    console.log(`crbug.com/${bug}\t${bugToFile.get(bug)}`);
  }
}

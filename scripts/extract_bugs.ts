// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {existsSync, globSync, readFileSync} from 'node:fs';
import * as ts from 'typescript';
import yargs from 'yargs';
import {hideBin} from 'yargs/helpers';

import {parseExpectations} from '../test/conductor/test_expectations_parser.js';

const argv = yargs(hideBin(process.argv))
                 .option('format', {
                   alias: 'f',
                   describe: 'Output format',
                   choices: ['list', 'b', 'json'],
                   default: 'list',
                 })
                 .option('sources', {
                   type: 'array',
                   alias: 's',
                   describe: 'Sources',
                   choices: ['devtools', 'chromium'],
                   default: ['devtools', 'chromium'],
                 })
                 .parseSync();

/**
 * Node v24 expected.
 * Usage: node scripts/extract_bugs.ts
 *
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
      const skipCalls = new Set(['it.skip', 'describe.skip']);
      if (skipCalls.has(propAccess.getText())) {
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

if (argv.sources.includes('devtools')) {
  const files = [
    ...globSync('front_end/**/*.test.ts'),
    ...globSync('test/**/*test.ts'),
  ];

  for (const file of files) {
    extract(ts.createSourceFile(
        file, readFileSync(file).toString(), ts.ScriptTarget.ESNext,
        /* setParentNodes */ true));
  }

  const devtoolsExpectationsPath = 'test/TestExpectations';
  if (existsSync(devtoolsExpectationsPath)) {
    const content = readFileSync(devtoolsExpectationsPath, 'utf-8');
    const expectations = parseExpectations(content);
    for (const exp of expectations) {
      if (!exp.isCommentOrEmpty && exp.results?.includes('Skip')) {
        for (const bug of exp.bugs || []) {
          const bugId = bug.replace('crbug.com/', '');
          bugs.add(bugId);
          bugToFile.set(bugId, exp.testName || '');
        }
      }
    }
  }
}

if (argv.sources.includes('chromium')) {
  const expectations = readFileSync('../../chromium/src/third_party/blink/web_tests/TestExpectations', 'utf-8');
  const lines = expectations.split('\n');

  for (const line of lines) {
    if (line.includes('/tests/devtools/')) {
      const parts = line.split(' ');
      const crbug = parts.shift() ?? '';
      const match = crbug.match(/crbug.com\/(\d+)/);
      if (!match) {
        continue;
      }
      bugs.add(match[1]);
      bugToFile.set(match[1], parts.find(part => part.includes('/tests/devtools/')) ?? '');
    }
  }
}

if (argv.format === 'json') {
  const result = Array.from(bugs).map(bug => ({
                                        bug: `crbug.com/${bug}`,
                                        file: bugToFile.get(bug) ?? '',
                                      }));
  console.log(JSON.stringify(result, null, 2));
} else if (argv.format === 'b') {
  console.log(`id: (${Array.from(bugs).join('|')})`);
} else {
  for (const bug of bugs) {
    console.log(`crbug.com/${bug}\t${bugToFile.get(bug)}`);
  }
}

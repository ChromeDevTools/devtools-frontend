// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

var childProcess = require('child_process');
const path = require('path');
const fs = require('fs');

const recast = require('recast');
var Linter = require('eslint').Linter;

const utils = require('../utils');

const TEMP_JS_FILE = path.resolve(__dirname, 'temp.js');
const TEST_FUNCTION_SENTINEL = 'TEST_FUNCTION_SENTINEL();';

function main() {
  const args = process.argv;
  if (args.length > 2) {
    formatFile(args[2], true);
    return;
  }
  walkSync('../../../../LayoutTests/http/tests/inspector');
  walkSync('../../../../LayoutTests/http/tests/inspector-enabled');
  walkSync('../../../../LayoutTests/http/tests/inspector-unit');
  walkSync('../../../../LayoutTests/inspector-enabled');
  walkSync('../../../../LayoutTests/inspector');
}

function walkSync(currentDirPath) {
  fs.readdirSync(currentDirPath).forEach(function(name) {
    if (name === 'resources') {
      return;
    }
    let filePath = path.join(currentDirPath, name);
    let stat = fs.statSync(filePath);
    if (stat.isFile() && (filePath.endsWith('.html'))) {
      try {
        formatFile(filePath);
      } catch (err) {
        console.log(filePath, 'has err:', err);
      }
    } else if (stat.isDirectory()) {
      walkSync(filePath);
    }
  });
}

function formatFile(filePath, isDryRun) {
  let htmlContents = fs.readFileSync(filePath, 'utf-8');
  const scriptContents = htmlContents.match(/<script.*?>([\S\s]*?)<\/script>/g);

  let functionNode;
  let testScript;
  for (const script of scriptContents) {
    const regex = /<script.*?>([\S\s]*?)<\/script>/
    const innerScript = script.match(regex)[1];
    if (!innerScript)
      continue;
    const ast = recast.parse(innerScript);
    const sentinelNode = createExpressionNode(TEST_FUNCTION_SENTINEL);

    let index =
        ast.program.body.findIndex(n => n.type === 'VariableDeclaration' && n.declarations[0].id.name === 'test');
    if (index > -1) {
      functionNode = ast.program.body[index];
      testScript = innerScript;
    }

    index = ast.program.body.findIndex(n => n.type === 'FunctionDeclaration' && n.id.name === 'test');
    if (index > -1) {
      functionNode = ast.program.body[index];
      testScript = innerScript;
    }
  }

  if (!functionNode) {
    console.log('ERROR with: ', filePath);
    return;
  }

  let locStart = functionNode.loc.start;
  let locEnd = functionNode.loc.end;

  (functionNode.comments || []).forEach(comment => {
    if ((comment.loc.start.line === locStart.line && comment.loc.start.column < locStart.column) ||
        comment.loc.start.line < locStart.line) {
      locStart = comment.loc.start;
    }
    if ((comment.loc.end.line === locEnd.line && comment.loc.end.column > locEnd.column) ||
        comment.loc.end.line > locEnd.line) {
      locEnd = comment.loc.end;
    }
  });

  let newTestScript = testScript.split('\n')
                          .map((line, index) => {
                            const lineNumber = index + 1;

                            if (lineNumber === locStart.line) {
                              return line.split('')
                                  .map((char, columnNumber) => {
                                    if (columnNumber === locStart.column) {
                                      return '@@START_TEST_FUNCTION@@' + char;
                                    }
                                    return char;
                                  })
                                  .join('');
                            }

                            if (lineNumber === locEnd.line) {
                              return line.split('')
                                  .map((char, columnNumber) => {
                                    if (columnNumber === locEnd.column - 1) {
                                      return char + '@@END_TEST_FUNCTION@@';
                                    }
                                    return char;
                                  })
                                  .join('');
                            }

                            return line;
                          })
                          .join('\n');

  newTestScript =
      escapedReplace(newTestScript, /@@START_TEST_FUNCTION@@[\S\s]*@@END_TEST_FUNCTION@@/, TEST_FUNCTION_SENTINEL);
  htmlContents = escapedReplace(htmlContents, testScript, newTestScript);

  let linter = new Linter();
  let result = linter.verifyAndFix(recast.print(functionNode).code, {
    envs: ['browser'],
    useEslintrc: false,
    parserOptions: {
      ecmaVersion: 8,
    },
    rules: {
      semi: 2,
    }
  });
  if (result.messages.length) {
    console.log('Issue with eslint', result.messages, 'for file: ', filePath);
    process.exit(1);
  }
  fs.writeFileSync(TEMP_JS_FILE, result.output);
  const formattedTestcode = shellOutput(`clang-format ${TEMP_JS_FILE} --style=FILE`);
  fs.unlinkSync(TEMP_JS_FILE);
  const newContents = escapedReplace(htmlContents, TEST_FUNCTION_SENTINEL, formattedTestcode);

  if (isDryRun) {
    console.log(newContents);
    return;
  }
  fs.writeFileSync(filePath, newContents);
}

main();

function shellOutput(command) {
  return childProcess.execSync(command).toString();
}

function createExpressionNode(code) {
  return recast.parse(code).program.body[0];
}

function escapedReplace(source, target, replacement) {
  replacement = replacement
                    // Need to escape $ symbol
                    .split('$')
                    .join('$$');
  return source.replace(target, replacement);
}
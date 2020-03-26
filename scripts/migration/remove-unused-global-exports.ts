// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {MemberExpressionKind} from 'ast-types/gen/kinds';
import child_process from 'child_process';
import fs from 'fs';
import path from 'path';
import {parse, print, types} from 'recast';
import {promisify} from 'util';

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);

const FRONT_END_FOLDER = path.join(process.env.PWD!, '..', '..', 'front_end');
const TEST_FOLDER =
    path.join(process.env.PWD!, '..', '..', '..', '..', 'blink', 'web_tests', 'http', 'tests', 'devtools');

function capitalizeFirstLetter(string: string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

const FOLDER_MAPPING: {[name: string]: string} = require(path.join('..', 'build', 'special_case_namespaces.json'));

function computeNamespaceName(folderName: string): string {
  if (folderName in FOLDER_MAPPING) {
    return FOLDER_MAPPING[folderName];
  }
  return capitalizeFirstLetter(folderName);
}

// Transform an expression of UI.ARIAUtils.Foo to its string representation
function getFullTypeName(expression: MemberExpressionKind): any {
  let name = '';

  while (expression.object.type === 'MemberExpression') {
    name = `${(expression.property as any).name}${name && `.${name}` || ''}`;
    expression = expression.object;
  }

  return `${(expression.property as any).name}${name && `.${name}` || ''}`;
}

const b = types.builders;

function rewriteSource(refactoringNamespace: string, source: string) {
  const ast = parse(source);

  const removedExports: string[] = [];

  // Remove global exports
  ast.program.body = ast.program.body.map((statement: any) => {
    // UI.ARIAUtils.Foo = 5;
    if (statement.type === 'ExpressionStatement') {
      // UI.ARIAUtils.Foo = 5
      if (statement.expression.type === 'AssignmentExpression') {
        const assignment = statement.expression;

        if (assignment.left.type === 'MemberExpression') {
          // UI.ARIAUtils
          const topLevelAssignment = assignment.left;

          // UI.ARIAUtils.Foo
          const fullName = `${computeNamespaceName(refactoringNamespace)}.${getFullTypeName(topLevelAssignment)}`;

          try {
            const usedInModuleJson = !!child_process.execSync(
                `grep --include=\*module.json -r ${fullName} ${FRONT_END_FOLDER} || true`, {encoding: 'utf8'});
            const usedInLayoutTests =
                !!child_process.execSync(`grep -r ${fullName} ${TEST_FOLDER} || true`, {encoding: 'utf8'});
            const usedInLayoutTestRunners = !!child_process.execSync(
                `grep --include=\*test_runner\*.js -r ${fullName} ${FRONT_END_FOLDER} || true`, {encoding: 'utf8'});

            if (!usedInModuleJson && !usedInLayoutTests && !usedInLayoutTestRunners) {
              removedExports.push(assignment.right.name);
              return b.emptyStatement();
            }
          } catch (e) {
            console.log(e);
            return statement;
          }
        }
      }
    }

    return statement;
  });

  // Remove ES exports
  ast.program.body = ast.program.body.map((statement: any) => {
    if (statement.type === 'ExportNamedDeclaration') {
      if (statement.declaration) {
        switch (statement.declaration.type) {
          case 'ClassDeclaration':
            if (removedExports.includes(statement.declaration.id.name)) {
              return b.classDeclaration.from({
                ...statement.declaration,
                comments: statement.comments || [],
              });
            }
            break;
          case 'VariableDeclaration':
            if (removedExports.includes(statement.declaration.declarations[0].id.name)) {
              return b.variableDeclaration.from({
                ...statement.declaration,
                comments: statement.comments || [],
              });
            }
            break;
          case 'FunctionDeclaration':
            if (removedExports.includes(statement.declaration.id.name)) {
              return b.functionDeclaration.from({
                ...statement.declaration,
                comments: statement.comments || [],
              });
            }
            break;
          default:
            throw new Error(`Unknown type: ${statement.declaration.type}`);
        }
      }
    }

    return statement;
  });

  return print(ast).code;
}

async function main(refactoringNamespace: string) {
  const folderName = path.join(FRONT_END_FOLDER, refactoringNamespace);
  for (const file of fs.readdirSync(folderName, {withFileTypes: true})) {
    if (!file.name.endsWith('-legacy.js')) {
      continue;
    }
    const pathName = path.join(folderName, file.name);
    const source = await readFile(pathName, {encoding: 'utf-8'});

    const rewrittenSource = rewriteSource(refactoringNamespace, source);

    await writeFile(pathName, rewrittenSource);
  }
}

if (!process.argv[2]) {
  console.error('No arguments specified. Run this script with "<folder-name>". For example: "common"');
  process.exit(1);
}

if (process.argv[2].endsWith('test_runner')) {
  process.exit(0);
}

main(process.argv[2]);

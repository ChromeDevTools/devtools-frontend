// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import fs from 'fs';
import path from 'path';
import {parse, print, types} from 'recast';
import {promisify} from 'util';

const readDir = promisify(fs.readdir);
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const b = types.builders;

const FRONT_END_FOLDER = path.join(__dirname, '..', '..', 'front_end');

let legacyStatements: any[] = [];
let legacyTypeDefs: any[] = [];
let targetNamespace = '';
function rewriteSource(source: string, fileName: string) {
  const ast = parse(source);
  const statements: any[] = [];
  const typeDefs: any[] = [];

  ast.program.body = ast.program.body.map((statement: any) => {
    try {
      switch (statement.type) {
        case 'ExpressionStatement':
          if (statement.expression.type === 'CallExpression') {
            break;
          }

          // Remove Foo = Foo || {}
          if (statement.expression.type === 'AssignmentExpression') {
            if (statement.expression.left.name === targetNamespace) {
              return b.emptyStatement();
            }
          }

          // Remove typedefs of the type Foo.ThingName;
          if (statement.expression.type === 'MemberExpression') {
            // Keep going to the left of namespaces to check the leftmost,
            // and if it is the target namespace, pull it.
            let current = statement.expression.object;
            while (current.object) {
              current = current.object;
            }

            if (current.name === targetNamespace) {
              typeDefs.push(statement);
              return b.emptyStatement();
            }
          }

          if (statement.expression.left.type === 'MemberExpression') {
            // Remove self.Foo = self.Foo || {}
            if (statement.expression.left.object.name === 'self') {
              // Make sure to only grab the statement if it follows the self.X = self.X || {} pattern.
              if (statement.expression.right.type !== 'LogicalExpression' || statement.expression.right.operator !== '||') {
                break;
              }

              // Grab the namespace from the RHS of self.[Namespace]
              if (statement.expression.right.type === 'LogicalExpression') {
                targetNamespace = statement.expression.right.left.property.name;
              }
              return b.emptyStatement();
            }

            // Keep going to the left of namespaces to check the leftmost,
            // and if it is the target namespace, pull it.
            let current = statement.expression.left.object;
            while (current.object) {
              current = current.object;
            }

            if (current.name === targetNamespace) {
              statements.push(statement);
              return b.emptyStatement();
            }

          }
          break;
      }
    } catch (e) {
      console.warn(`Unexpected expression in ${fileName}:`);
      console.warn(print(statement).code);
      console.log(statement);
      process.exit(1);
    }

    return statement;
  });


  // Rewrite legacy RHS to use module name.
  const remappedStatements = statements.map(statement => {
    if (statement.expression.type === 'AssignmentExpression') {
      const { name } = statement.expression.right;
      const innerNamespace = capitalizeFirstLetter(fileName).replace(/.js$/, '');
      statement.expression.right.name = `${targetNamespace}Module.${innerNamespace}.${name}`;
    }

    return statement;
  });

  legacyStatements = [...legacyStatements, ...remappedStatements];
  legacyTypeDefs = [...legacyTypeDefs, ...typeDefs];

  return print(ast).code;
}

function createLegacy() {
  const ast = parse('');
  ast.program.body = legacyStatements.concat(legacyTypeDefs);
  return print(ast).code;
}

function capitalizeFirstLetter(string: string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

async function main(folder: string) {
  const pathName = path.join(FRONT_END_FOLDER, folder);
  const srcDir = await readDir(pathName);
  for (const srcFile of srcDir) {
    if (srcFile !== 'ARIAUtils.js' && !srcFile.endsWith('.js')) {
      continue;
    }

    const filePath = path.join(pathName, srcFile);
    const srcFileContents = await readFile(filePath, { encoding: 'utf-8' });
    const dstFileContents = rewriteSource(srcFileContents, srcFile);

    await writeFile(filePath, dstFileContents);
  }

  // Create a foo-legacy.js file
  const dstLegacy = path.join(pathName, `${folder}-legacy.js`);
  const legacyContents = `// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as ${targetNamespace}Module from './${folder}.js';

self.${targetNamespace} = self.${targetNamespace} || {};
${targetNamespace} = ${targetNamespace} || {};

${createLegacy()}
`;
  await writeFile(dstLegacy, legacyContents);
}

if (!process.argv[2]) {
  console.error('No arguments specified. Run this script with "<folder-name>". For example: "ui"');
  process.exit(1);
}

main(process.argv[2]);

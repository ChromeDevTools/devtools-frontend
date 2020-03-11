// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {CommentKind, IdentifierKind, MemberExpressionKind} from 'ast-types/gen/kinds';
import fs from 'fs';
import path from 'path';
import {parse, print, types} from 'recast';
import {promisify} from 'util';

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);

const FRONT_END_FOLDER = path.join(__dirname, '..', '..', 'front_end');

function capitalizeFirstLetter(string: string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

const b = types.builders;

function createReplacementDeclaration(propertyName: IdentifierKind, declaration: any): any {
  // UI.ARIAUtils.Foo = class {} -> export class Foo {}
  if (declaration.type === 'ClassExpression') {
    return b.exportDeclaration(false, b.classDeclaration(propertyName, declaration.body));
  }
  // UI.ARIAUtils.Foo = expression; -> export const Foo = expression;
  if (declaration.type === 'Literal' || declaration.type.endsWith('Expression')) {
    return b.exportNamedDeclaration(b.variableDeclaration('const', [b.variableDeclarator(propertyName, declaration)]));
  }
  console.error(`Unable to refactor declaration of type "${declaration.type}" named "${propertyName.name}"`);
}

function getTopLevelMemberExpression(expression: MemberExpressionKind): any {
  while (expression.object.type === 'MemberExpression') {
    expression = expression.object;
  }

  return expression;
}

function rewriteSource(source: string, refactoringNamespace: string, refactoringFileName: string) {
  const exportedMembers: {prop: IdentifierKind, comments: CommentKind[]}[] = [];
  const ast = parse(source);

  ast.program.body = ast.program.body.map((expression: any) => {
    // UI.ARIAUtils.Foo = 5;
    if (expression.type === 'ExpressionStatement') {
      // UI.ARIAUtils.Foo = 5
      if (expression.expression.type === 'AssignmentExpression') {
        const assignment = expression.expression;

        // UI.ARIAUtils.Foo
        if (assignment.left.type === 'MemberExpression') {
          // UI.ARIAUtils.Foo -> UI.ARIAUtils
          // UI.ARIAUtils.Nested.Foo -> UI.ARIAUtils
          const topLevelAssignment = getTopLevelMemberExpression(assignment.left);

          // If there is a nested export, such as `UI.ARIAUtils.Nested.Field`
          if (topLevelAssignment !== assignment.left.object) {
            // Exports itself. E.g. `UI.ARIAUtils = <...>`
            if (assignment.left.object.name === refactoringNamespace && assignment.left.property.name === refactoringFileName) {
              const {declaration} = createReplacementDeclaration(assignment.left.property, assignment.right);
              // If it is a variable declaration, we need to use the actual variabledeclator. E.g.:
              // UI.ARIAUtils = 5; -> export ARIAUtils = 5; instead of "export const ARIAUtils = 5;"
              const declarationStatement = b.exportDefaultDeclaration(declaration.type === 'VariableDeclaration' ? declaration.declarations[0].init : declaration);

              declarationStatement.comments = expression.comments;

              return declarationStatement;
            }

            console.error(`Nested field "${assignment.left.property.name}" detected! Requires manual changes.`);
            expression.comments = expression.comments || [];
            expression.comments.push(b.commentLine(' TODO(http://crbug.com/1006759): Fix exported symbol'));
            return expression;
          }

          const propertyName = assignment.left.property;
          const {object, property} = topLevelAssignment;


          if (object.type === 'Identifier' && property.type === 'Identifier') {
            // UI
            const namespace = object.name;
            // ARIAUtils
            const fileName = property.name;

            if (namespace === refactoringNamespace && fileName === refactoringFileName) {
              const declaration = createReplacementDeclaration(propertyName, assignment.right);

              if (declaration) {
                exportedMembers.push({prop: propertyName, comments: expression.comments || [b.commentLine(' TODO(http://crbug.com/1006759): Add type information if necessary')]});
                declaration.comments = expression.comments;
                return declaration;
              }
            }
          }
        }
      }
    }

    return expression;
  });

  // self.UI = self.UI || {};
  {
    const legacyNamespaceName = b.memberExpression(b.identifier('self'), b.identifier(refactoringNamespace), false);
    const legacyNamespaceOr = b.logicalExpression('||', legacyNamespaceName, b.objectExpression([]));
    ast.program.body.push(b.expressionStatement.from({
      expression: b.assignmentExpression('=', legacyNamespaceName, legacyNamespaceOr),
      comments: [b.commentBlock(' Legacy exported object ', true, false)],
    }));
  }

  // UI = UI || {};
  const legacyNamespaceName = b.identifier(refactoringNamespace);
  {
    const legacyNamespaceOr = b.logicalExpression('||', legacyNamespaceName, b.objectExpression([]));
    ast.program.body.push(b.expressionStatement.from({
      expression: b.assignmentExpression('=', legacyNamespaceName, legacyNamespaceOr),
      comments: [b.commentBlock(' Legacy exported object ', true, false)],
    }));
  }

  // UI.ARIAUtils = ARIAUtils;
  const legacyNamespaceExport = b.memberExpression(b.identifier(refactoringNamespace), b.identifier(refactoringFileName), false);

  ast.program.body.push(b.expressionStatement(b.assignmentExpression.from({
    operator: '=',
    left: legacyNamespaceExport,
    right: b.identifier(refactoringFileName),
    comments: [b.commentLine(' TODO(http://crbug.com/1006759): Add type information if necessary')],
  })));

  // UI.ARIAUtils.Foo = Foo;
  exportedMembers.forEach(({prop, comments}) => {
    const legacyExportedProperty = b.memberExpression(legacyNamespaceExport, b.identifier(prop.name), false);

    ast.program.body.push(b.expressionStatement(b.assignmentExpression.from({
      operator: '=',
      left: legacyExportedProperty,
      right: b.identifier(prop.name),
      comments,
    })));
  });

  return print(ast).code;
}

const FOLDER_MAPPING: {[name: string]: string} = require(path.join('..', 'build', 'special_case_namespaces.json'));

function computeNamespaceName(folderName: string): string {
  if (folderName in FOLDER_MAPPING) {
    return FOLDER_MAPPING[folderName];
  }
  return capitalizeFirstLetter(folderName);
}

async function main(refactoringNamespace: string, refactoringFileName: string) {
  const pathName = path.join(FRONT_END_FOLDER, refactoringNamespace, `${refactoringFileName}.js`);
  const source = await readFile(pathName, {encoding: 'utf-8'});

  const rewrittenSource = rewriteSource(source, computeNamespaceName(process.argv[2]), refactoringFileName);

  await writeFile(pathName, rewrittenSource);

  // console.log(`Succesfully written source to "${pathName}". Make sure that no other errors are reported before submitting!`);
}

if (!process.argv[2]) {
  console.error('No arguments specified. Run this script with "<folder-name> <filename>". For example: "common Color"');
  process.exit(1);
}

main(process.argv[2], process.argv[3]);

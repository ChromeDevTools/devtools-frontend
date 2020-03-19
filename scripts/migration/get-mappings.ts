// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import fs from 'fs';
import path from 'path';
import {parse, print} from 'recast';
import {promisify} from 'util';

const readFile = promisify(fs.readFile);
const stat = promisify(fs.stat);

const FRONT_END_FOLDER = path.join(__dirname, '..', '..', 'front_end');

export async function getMappings(namespace: string, mappings: Map<string, any>, useExternalRefs = false) {
  const src = namespace.toLocaleLowerCase();
  const externalModule = path.join(FRONT_END_FOLDER, src, `${src}.js`);
  const legacy = path.join(FRONT_END_FOLDER, src, `${src}-legacy.js`);

  if (!(await stat(legacy))) {
    console.error(`Unable to find legacy file: ${legacy}`);
    process.exit(1);
  }

  const legacyFileContents = await readFile(legacy, { encoding: 'utf-8' });
  const ast = parse(legacyFileContents);

  for (const statement of ast.program.body) {
    if (statement.type !== 'ExpressionStatement') {
      continue;
    }

    // We need to check that we have an assignment expression, of which the left and right are both member expressions.
    // This allows us to extract things like Foo.Bar = FooModule.Bar.Bar from the legacy file, while ignoring self.Foo
    // and Foo = Foo || {} statements.
    const isMemberExpressionOnLeftAndRight = statement.expression && statement.expression.left &&
        statement.expression.right && statement.expression.type === 'AssignmentExpression' &&
        statement.expression.left.type === 'MemberExpression' && statement.expression.right.type === 'MemberExpression';

    if (isMemberExpressionOnLeftAndRight) {
      // Rename FooModule back to Foo because we know we will want to use the latter when doing replacements.
      if (statement.expression.right.object && statement.expression.right.object.object &&
          statement.expression.right.object.object.type === 'Identifier') {
        statement.expression.right.object.object.name = statement.expression.right.object.object.name.replace(/Module$/, '');
      }

      const leftSide = print(statement.expression.left).code;
      const rightSide = print(statement.expression.right).code;
      const rightSideParts = rightSide.split('.');
      const file = useExternalRefs ? externalModule : path.join(FRONT_END_FOLDER, src, rightSideParts[1] + '.js');

      if (rightSideParts[0] === 'Protocol') {
        rightSideParts[0] = 'ProtocolClient';
      }

      mappings.set(leftSide, {
        file,
        replacement: rightSideParts.join('.'),
        sameFolderReplacement: rightSideParts[rightSideParts.length - 1],
      });
    }
  }

  return mappings;
}

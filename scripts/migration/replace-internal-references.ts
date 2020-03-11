// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import { parse, print, types, visit } from 'recast';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { getMappings } from './get-mappings.js';

const readDir = promisify(fs.readdir);
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const b = types.builders;

const FRONT_END_FOLDER = path.join(__dirname, '..', '..', 'front_end');

async function rewriteSource(pathName: string, srcFile: string, mappings:Map<string, any>, useExternalRefs = false) {
  const filePath = path.join(pathName, srcFile);
  const srcFileContents = await readFile(filePath, { encoding: 'utf-8' });
  const ast = parse(srcFileContents);

  const importsRequired = new Set<{file: string, replacement: string, sameFolderReplacement: string}>();

  visit(ast, {
    visitComment(path) {
      const comments = (path.node as any).comments;
      for (const comment of comments) {

        if (comment.loc) {
          (comment.loc as any).indent = 0;
        }

        for (const [str, value] of mappings.entries()) {
          const containsString = new RegExp(`${str}([^\\.\\w])`, 'g');
          const stringMatches = containsString.exec(comment.value);

          if (!stringMatches) {
            continue;
          }

          const replacement = useExternalRefs ? value.replacement : value.sameFolderReplacement;

          importsRequired.add(value);
          comment.value = comment.value.replace(stringMatches[0], replacement + stringMatches[0].slice(-1));
        }
      }

      this.traverse(path);
    },

    visitMemberExpression(path) {
      const node = path.node;
      const nodeCopy = b.memberExpression.from({...node, comments: []});
      const nodeAsCode = print(nodeCopy).code;

      for (const [str, value] of mappings.entries()) {
        if (nodeAsCode !== str) {
          continue;
        }

        const name = useExternalRefs ? value.replacement : value.sameFolderReplacement;

        importsRequired.add(value);
        return b.identifier.from({ name, comments: node.comments || [] });
      }

      this.traverse(path);
    },
  });

  const importMap = new Map<string, any[]>();
  for (const { file, sameFolderReplacement, replacement } of importsRequired) {
    if (filePath === file) {
      continue;
    }

    const src = path.dirname(filePath);
    const dst = path.dirname(file);

    let replacementIdentifier = '';
    let relativePath = path.relative(src, dst);
    const isSameFolder = relativePath === '';
    if (isSameFolder) {
      relativePath = './';
      replacementIdentifier = sameFolderReplacement;
    } else {
      relativePath += '/';
      replacementIdentifier = replacement;
    }

    const targetImportFile = relativePath + path.basename(file);

    if (!importMap.has(targetImportFile)) {
      importMap.set(targetImportFile, []);
    }

    const imports = importMap.get(targetImportFile)!;
    if (useExternalRefs) {
      if (imports.length === 0) {
        // We are creating statements like import * as Foo from '../foo/foo.js' so
        // here we take the first part of the identifier, e.g. Foo.Bar.Bar gives us
        // Foo so we can make import * as Foo from that.
        const namespaceIdentifier = replacementIdentifier.split('.')[0];
        imports.push(b.importNamespaceSpecifier(b.identifier(namespaceIdentifier)));
      }

      // Make sure there is only one import * from Foo import added.
      continue;
    }

    imports.push(b.importSpecifier(b.identifier(replacementIdentifier)));
  }

  // Add missing imports.
  for (const [targetImportFile, specifiers] of importMap) {
    const newImport = b.importDeclaration.from({
      specifiers,
      comments: ast.program.body[0].comments,
      source: b.literal(targetImportFile),
    });

    // Remove any file comments.
    ast.program.body[0].comments = [];

    // Add the import statements.
    ast.program.body.unshift(newImport);
  }

  return print(ast).code;
}

async function main(folder: string, namespaces?: string[]) {
  const pathName = path.join(FRONT_END_FOLDER, folder);
  const srcDir = await readDir(pathName);
  const useExternalRefs = namespaces !== undefined && (namespaces[0] !== folder);
  let mappings = new Map();
  if (namespaces && namespaces.length) {
    for (const namespace of namespaces) {
      mappings = await getMappings(namespace, mappings, useExternalRefs);
    }
  } else {
    mappings = await getMappings(folder, mappings, useExternalRefs);
  }

  for (const srcFile of srcDir) {
    if (srcFile === `${folder}.js` || srcFile === `${folder}-legacy.js` || !srcFile.endsWith('.js')) {
      continue;
    }

    const distFileContents = await rewriteSource(pathName, srcFile, mappings, useExternalRefs);
    await writeFile(path.join(pathName, `${srcFile}`), distFileContents);
  }
}

if (!process.argv[2]) {
  console.error('No arguments specified. Run this script with "<folder-name>". For example: "ui"');
  process.exit(1);
}

main(process.argv[2], process.argv[3] && process.argv[3].split(',') || undefined);

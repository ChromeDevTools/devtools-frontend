// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {existsSync, readFileSync} from 'node:fs';
import * as path from 'node:path';
import {fileURLToPath} from 'node:url';
import * as ts from 'typescript';

import {generateExactTestId} from '../front_end/testing/TestIdGeneration.ts';

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);
const REPO_ROOT = path.resolve(dirname, '..');

const [filePath, lineStr, colStr] = process.argv.slice(2);

if (!filePath || !lineStr || !colStr) {
  console.error('Usage: node scripts/get_test_id.ts <file> <line> <column>');
  process.exit(1);
}

const line = parseInt(lineStr, 10);
const column = parseInt(colStr, 10);

const absFilePath = path.resolve(process.cwd(), filePath);
if (!existsSync(absFilePath)) {
  console.error(`Error: File not found at '${absFilePath}'`);
  process.exit(1);
}

const fileContent = readFileSync(absFilePath, 'utf-8');
const sourceFile = ts.createSourceFile(
    absFilePath,
    fileContent,
    ts.ScriptTarget.ESNext,
    /* setParentNodes */ true,
);

const lineIndex = Math.max(0, line - 1);
const colIndex = Math.max(0, column - 1);
const targetOffset = sourceFile.getPositionOfLineAndCharacter(lineIndex, colIndex);

function findTestTitlePath(sf: ts.SourceFile, offset: number): string[] {
  const titlePath: string[] = [];

  function isTestOrSuiteCall(node: ts.Node): node is ts.CallExpression {
    if (!ts.isCallExpression(node)) {
      return false;
    }
    const exprText = node.expression.getText(sf);
    return /^(describe|it)($|\.|\w+)/.test(exprText);
  }

  function getStringArgument(callNode: ts.CallExpression): string|null {
    if (callNode.arguments.length === 0) {
      return null;
    }
    const firstArg = callNode.arguments[0];
    if (ts.isStringLiteral(firstArg) || ts.isNoSubstitutionTemplateLiteral(firstArg)) {
      return firstArg.text;
    }
    if (ts.isTemplateExpression(firstArg)) {
      return firstArg.getText(sf).replace(/^`|`$/g, '');
    }
    return null;
  }

  function visit(node: ts.Node) {
    if (node.getStart(sf) <= offset && offset <= node.getEnd()) {
      if (isTestOrSuiteCall(node)) {
        const title = getStringArgument(node);
        if (title !== null) {
          titlePath.push(title);
        }
      }
      ts.forEachChild(node, visit);
    }
  }

  visit(sourceFile);
  return titlePath;
}

const titlePath = findTestTitlePath(sourceFile, targetOffset);
const relativeSourceFile = path.relative(REPO_ROOT, absFilePath).replace(/\\/g, '/');

const {exactTestId} = generateExactTestId(REPO_ROOT, relativeSourceFile, titlePath);

console.log(exactTestId);

// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// @ts-nocheck we're not TypeScripting our tooling yet

/*
 * this code takes TypeScript files and looks for calls to an `ls`
 * function as a tagged template e.g.: ls`blah` or ls`blah ${x}`
 *
 * In JS land we support a few localization functions such as
 * Common.UIString('...'), but in our efforts to simplify the new
 * TypeScript codebase we will only support localization through an `ls`
 * call.
 *
 * if you're working on this file you might find parses a TypeScript
 * file to look for calls to an ls function https://ts-ast-viewer.com/
 * useful for debugging
*/

const ts = require('typescript');
const fs = require('fs');
const path = require('path');
const {promisify} = require('util');

const readFile = promisify(fs.readFile);

/**
 * generate a GRDP match for a static usage of ls
 * e.g. one with no expressions: ls`foo`
 */
function matchForStaticUsage({node, sourceFile}) {
  const nodeStart = sourceFile.getLineAndCharacterOfPosition(node.getStart());
  const nodeEnd = sourceFile.getLineAndCharacterOfPosition(node.getEnd());

  return {
    cooked: node.template.text,
    code: node.getFullText().trim(),
    loc: {
      start: {
        line: nodeStart.line,
        column: nodeStart.character,
      },
      end: {
        line: nodeEnd.line,
        column: nodeEnd.character,
      },
    },
    parsedArguments: [],
  };
}

/**
 * generate a GRDP match for a call to ls with expressions inside
 * e.g.: ls`foo ${x}`
 */
function matchForDynamicUsage({node, sourceFile}) {
  const nodeStart = sourceFile.getLineAndCharacterOfPosition(node.getStart());
  const nodeEnd = sourceFile.getLineAndCharacterOfPosition(node.getEnd());

  const printer = ts.createPrinter();

  const parsedArguments = node.template.templateSpans.map(span => {
    return printer.printNode(ts.EmitHint.Unspecified, span.expression, sourceFile);
  });

  let cookedText = node.template.head.text;

  node.template.templateSpans.forEach(span => {
    cookedText += '%s';
    cookedText += span.literal.text;
  });


  return {
    cooked: cookedText,
    code: node.getFullText().trim(),
    loc: {
      start: {
        line: nodeStart.line,
        column: nodeStart.character,
      },
      end: {
        line: nodeEnd.line,
        column: nodeEnd.character,
      },
    },
    parsedArguments,
  };
}

/**
 * takes a TaggedTemplateExpression node that calls `ls` and turns it into a GRDP match
 */
function processUsage({node, sourceFile}) {
  if (node.template.kind === ts.SyntaxKind.NoSubstitutionTemplateLiteral) {
    return matchForStaticUsage({node, sourceFile});
  }

  return matchForDynamicUsage({node, sourceFile});
}

function walkTree({node, foundUsages, sourceFile}) {
  switch (node.kind) {
    case ts.SyntaxKind.TaggedTemplateExpression: {
      const tag = node.tag.escapedText;
      if (tag === 'ls') {
        const newUsage = processUsage({node, sourceFile});
        foundUsages.push(newUsage);
        break;
      }
    }
  }

  node.forEachChild(child => {
    walkTree({node: child, foundUsages, sourceFile});
  });
}

/**
 * takes in a TypeScript file and walks the AST to find any TaggedTemplateExpressions we need to deal with
 */
async function parseLocalizableStringFromTypeScriptFile(filePath) {
  if (filePath.endsWith('.d.ts')) {
    return [];
  }

  const sourceCode = await readFile(filePath, {encoding: 'utf8'});
  const sourceFile = ts.createSourceFile(filePath, sourceCode, ts.ScriptTarget.ESNext, true);

  const foundUsages = [];

  walkTree({
    node: sourceFile,
    foundUsages,
    sourceFile,
  });

  foundUsages.forEach(usage => {
    usage.filePath = path.resolve(filePath);
  });

  return foundUsages;
}

module.exports = {parseLocalizableStringFromTypeScriptFile};

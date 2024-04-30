// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

const fs = require('fs');
const path = require('path');
const ts = require('typescript');

function findEnumNode(root, predicate) {
  const nodesToVisit = [root];
  while (nodesToVisit.length) {
    const currentNode = nodesToVisit.shift();
    if (predicate(currentNode)) {
      return currentNode;
    }
    nodesToVisit.push(...currentNode.getChildren());
  }
}

function extractHistogramsFromHostApi(nodes) {
  const histograms = new Map();
  for (const node of nodes) {
    const stringLiteralNode = node.getChildren()[2];
    if (stringLiteralNode.kind === ts.SyntaxKind.StringLiteral) {
      histograms.set(node.name.escapedText, stringLiteralNode.getText().replace(/(^')|('$)/g, ''));
    }
  }
  return histograms;
}

function extractHistogramsFromCompatibility(root) {
  const histograms = new Map();
  const nodesToVisit = [root];
  while (nodesToVisit.length) {
    const currentNode = nodesToVisit.shift();
    if (ts.isPropertyAssignment(currentNode)) {
      histograms.set(currentNode.name.escapedText, currentNode.initializer.text);
    }
    nodesToVisit.push(...currentNode.getChildren());
  }
  return histograms;
}

function compare(hostApiHistograms, compatibilityHistograms) {
  const errorMessages = [];
  for (const [id, value] of hostApiHistograms) {
    if (!compatibilityHistograms.has(id)) {
      errorMessages.push(`The enum in 'devtools_compatibility.js' is missing a '${id}' entry.`);
    } else if (compatibilityHistograms.get(id) !== value) {
      errorMessages.push(`The values for '${id}' are not equal: '${value}' vs. '${compatibilityHistograms.get(id)}'.`);
    }
  }
  for (const id of compatibilityHistograms.keys()) {
    if (!hostApiHistograms.has(id)) {
      errorMessages.push(`The enum in 'InspectorFrontendHostAPI.ts' is missing a '${id}' entry.`);
    }
  }

  if (errorMessages.length) {
    console.error(
        '\'EnumeratedHistogram\` enums in \'InspectorFrontendHostAPI.ts\' and \'devtools_compatibility.js\' do not have the same content:');
    for (const errorMessage of errorMessages) {
      console.error(errorMessage);
    }
    console.error('Please ensure both enums have exactly the same content.');
    process.exit(1);
  }
}

function main() {
  const hostApiPath = path.resolve(__dirname, '..', 'front_end', 'core', 'host', 'InspectorFrontendHostAPI.ts');
  const hostApiFile = fs.readFileSync(hostApiPath, 'utf8');
  const hostApiSourceFile = ts.createSourceFile(hostApiPath, hostApiFile, ts.ScriptTarget.ESNext, true);
  const hostApiEnumNode = findEnumNode(
      hostApiSourceFile, node => ts.isEnumDeclaration(node) && node.name.escapedText === 'EnumeratedHistogram');
  const hostApiHistograms = extractHistogramsFromHostApi(hostApiEnumNode.members);
  if (!hostApiHistograms.size) {
    console.error('Could not find \'EnumeratedHistogram\` enum entries in \'InspectorFrontendHostAPI.ts\'.');
    process.exit(1);
  }

  const compatibilityPath = path.resolve(__dirname, '..', 'front_end', 'devtools_compatibility.js');
  const compatibilityFile = fs.readFileSync(compatibilityPath, 'utf8');
  const compatibilitySourceFile =
      ts.createSourceFile(compatibilityPath, compatibilityFile, ts.ScriptTarget.ESNext, true);
  const compatibilityEnumNode = findEnumNode(
      compatibilitySourceFile,
      node => ts.isVariableDeclaration(node) && node.name.escapedText === 'EnumeratedHistogram');
  const compatibilityHistograms = extractHistogramsFromCompatibility(compatibilityEnumNode);
  if (!compatibilityHistograms.size) {
    console.error('Could not find \'EnumeratedHistogram\` enum entries in \'devtools_compatibility.js\'.');
    process.exit(1);
  }

  compare(hostApiHistograms, compatibilityHistograms);
  console.log('DevTools UMA Enumerated Histograms checker passed.');
}

main();

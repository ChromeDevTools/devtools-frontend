// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

function isUIStringsIdentifier(node) {
  return node.type === 'Identifier' && node.name === 'UIStrings';
}

function isModuleScope(context) {
  return context.getScope().type === 'module';
}

function isUIStringsVariableDeclarator(context, variableDeclarator) {
  if (!isModuleScope(context)) {
    return false;
  }

  if (!isUIStringsIdentifier(variableDeclarator.id)) {
    return false;
  }

  return variableDeclarator.init?.type === 'ObjectExpression';
}

exports.isUIStringsIdentifier = isUIStringsIdentifier;
exports.isUIStringsVariableDeclarator = isUIStringsVariableDeclarator;

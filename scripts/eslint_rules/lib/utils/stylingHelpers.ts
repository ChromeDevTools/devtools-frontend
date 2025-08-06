// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type {TSESTree} from '@typescript-eslint/utils';

/**
 * Checks if an expression node is a call to `UI.Widget.widgetScoped(...)`.
 * @param expression The expression AST node to check.
 * @returns True if the expression is the specific widgetScoped call.
 */
export function isWidgetScopedCall(expression: TSESTree.Expression): boolean {
  if (expression.type !== 'CallExpression') {
    return false;
  }
  const callee = expression.callee;
  // Checks for the direct `widgetScoped` call.
  const isDirectCall = callee.type === 'Identifier' && callee.name === 'widgetScoped';
  // Checks for the full `UI.Widget.widgetScoped` member expression chain.
  const isCallThroughUIWidget = callee.type === 'MemberExpression' && callee.property.type === 'Identifier' &&
      callee.property.name === 'widgetScoped' && callee.object.type === 'MemberExpression' &&
      callee.object.property.type === 'Identifier' && callee.object.property.name === 'Widget';
  return isDirectCall || isCallThroughUIWidget;
}

// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type {TSESLint, TSESTree} from '@typescript-eslint/utils';

type RuleContext = TSESLint.RuleContext<string, unknown[]>;
// Type alias for AST Node, using TSESTree for better compatibility with @typescript-eslint
type Node = TSESTree.Node;
type Identifier = TSESTree.Identifier;
type VariableDeclarator = TSESTree.VariableDeclarator;

/**
 * Checks if a node is an Identifier whose name starts with "UIStrings".
 */
export function isUIStringsIdentifier(node: Node): node is Identifier&{
  name: `UIStrings${string}`,
}
{
  return node.type === 'Identifier' && node.name.startsWith('UIStrings');
}
/**
 * Checks if a node is within the module scope.
 */
export function isModuleScope(context: RuleContext, node: Node): boolean {
  // Prefer context.sourceCode, fallback to getSourceCode() for compatibility
  const sourceCode = context.sourceCode;
  // Prefer sourceCode.getScope if available
  const scope = sourceCode.getScope(node);
  return scope.type === 'module';
}

/**
 * Checks if a VariableDeclarator is defining a UIStrings object
 * (module scope, identifier starts with UIStrings, initializer is a TSAsExpression).
 */
export function isUIStringsVariableDeclarator(context: RuleContext, variableDeclarator: VariableDeclarator): boolean {
  if (!isModuleScope(context, variableDeclarator)) {
    return false;
  }

  if (!isUIStringsIdentifier(variableDeclarator.id)) {
    return false;
  }

  // Check if the initializer exists and is a TSAsExpression
  return variableDeclarator.init?.type === 'TSAsExpression';
}

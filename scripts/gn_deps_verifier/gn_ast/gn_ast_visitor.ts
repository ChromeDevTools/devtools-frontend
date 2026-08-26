// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {unquoteFromGn} from './gn_ast_factory.ts';
import type {GnAstNode} from './gn_ast_types.ts';

/**
 * Depth-first AST visitor.
 */
export function findFirstNode<T>(
    node: GnAstNode,
    callback: (node: GnAstNode) => T | undefined,
    ): T|undefined {
  const result = callback(node);
  if (result !== undefined) {
    return result;
  }
  if (node.child && node.child.length > 0) {
    for (const child of node.child) {
      const childResult = findFirstNode(child, callback);
      if (childResult !== undefined) {
        return childResult;
      }
    }
  }
  return undefined;
}

/**
 * Extracts string values from literals, lists, binary +/- expressions, and variable references.
 */
export function extractStringValues(
    node?: GnAstNode,
    variables = new Map<string, string[]>(),
    ): string[] {
  if (!node) {
    return [];
  }
  if (node.type === 'LITERAL') {
    return [unquoteFromGn(node.value)];
  }
  if (node.type === 'LIST' && node.child) {
    return node.child.flatMap(child => extractStringValues(child, variables));
  }
  if (node.type === 'BINARY' && node.child) {
    if (node.value === '-') {
      const lhsValues = extractStringValues(node.child[0], variables);
      const rhsValues = new Set(extractStringValues(node.child[1], variables));
      return lhsValues.filter(val => !rhsValues.has(val));
    }
    return node.child.flatMap(child => extractStringValues(child, variables));
  }
  if (node.type === 'IDENTIFIER' && node.value) {
    return variables.get(node.value) || [];
  }
  return [];
}

/**
 * Recursively walks statements in blocks, condition bodies, and function bodies.
 */
export function walkStatements(
    nodes: GnAstNode[],
    callback: (statement: GnAstNode) => void,
    ): void {
  for (const node of nodes) {
    callback(node);
    if ((node.type === 'BLOCK' || node.type === 'CONDITION' || node.type === 'FUNCTION') && node.child) {
      walkStatements(node.child, callback);
    }
  }
}

/**
 * Finds assignment nodes (`=` or `+=`), filtered by LHS variable name.
 */
export function findAssignments(
    statements: GnAstNode[],
    variableName: string,
    ): GnAstNode[] {
  const assignments: GnAstNode[] = [];
  walkStatements(statements, statement => {
    if (statement.type === 'BINARY' && (statement.value === '=' || statement.value === '+=')) {
      const lhs = statement.child?.[0]?.value;
      if (lhs === variableName) {
        assignments.push(statement);
      }
    }
  });
  return assignments;
}

/**
 * Recursively visits all LIST nodes inside an expression tree.
 */
export function walkListNodes(
    node: GnAstNode|undefined,
    callback: (listNode: GnAstNode) => void,
    ): void {
  if (!node) {
    return;
  }
  if (node.type === 'LIST') {
    callback(node);
    return;
  }
  if (node.child) {
    for (const child of node.child) {
      walkListNodes(child, callback);
    }
  }
}

/**
 * Finds the first LIST node in an expression tree, ignoring sub-expressions being subtracted.
 */
export function findFirstListNode(node?: GnAstNode): GnAstNode|undefined {
  if (!node) {
    return undefined;
  }
  if (node.type === 'LIST') {
    return node;
  }
  if (node.type === 'BINARY' && node.value === '-') {
    return findFirstListNode(node.child?.[0]);
  }
  if (node.child) {
    for (const child of node.child) {
      const found = findFirstListNode(child);
      if (found) {
        return found;
      }
    }
  }
  return undefined;
}

/**
 * Finds the FUNCTION AST node corresponding to targetName.
 */
export function findTargetNode(
    ast: GnAstNode,
    targetName: string,
    ): GnAstNode|undefined {
  return findFirstNode(ast, node => {
    if (node.type === 'FUNCTION') {
      const args = node.child?.[0]?.child;
      if (args && args.length > 0 && unquoteFromGn(args[0].value) === targetName) {
        return node;
      }
    }
    return undefined;
  });
}

// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {unquoteFromGn} from './gn_ast_factory.ts';
import type {AstTargetInfo, GnAstNode} from './gn_ast_types.ts';

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
 * Walks statements in blocks, condition bodies, and function bodies.
 * Set recursive to false to only walk top-level statements.
 */
export function walkStatements(
    nodes: GnAstNode[],
    callback: (statement: GnAstNode) => void,
    recursive = true,
    ): void {
  for (const node of nodes) {
    callback(node);
    if (!recursive) {
      continue;
    }
    if ((node.type === 'BLOCK' || node.type === 'CONDITION' || node.type === 'FUNCTION') && node.child) {
      walkStatements(node.child, callback, recursive);
    }
  }
}

/**
 * Finds assignment nodes (`=`, `+=`, or `-=`), filtered by LHS variable name.
 * Set recursive to false to only find top-level assignments.
 */
export function findAssignments(
    statements: GnAstNode[],
    variableName: string,
    recursive = true,
    ): GnAstNode[] {
  const assignments: GnAstNode[] = [];
  walkStatements(
      statements,
      statement => {
        if (statement.type === 'BINARY' &&
            (statement.value === '=' || statement.value === '+=' || statement.value === '-=')) {
          const lhs = statement.child?.[0]?.value;
          if (lhs === variableName) {
            assignments.push(statement);
          }
        }
      },
      recursive,
  );
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

/**
 * Applies a binary assignment (`=`, `+=`, or `-=`) node to a variables map.
 * Returns true if the node was an assignment and was applied, false otherwise.
 */
export function applyAssignment(
    variables: Map<string, string[]>,
    node: GnAstNode,
    ): boolean {
  if (node.type !== 'BINARY' || (node.value !== '=' && node.value !== '+=' && node.value !== '-=')) {
    return false;
  }

  const lhs = node.child?.[0];
  const rhs = node.child?.[1];
  if (!lhs || lhs.type !== 'IDENTIFIER' || !lhs.value || !rhs) {
    return false;
  }

  const varName = lhs.value;
  if (node.value === '=') {
    variables.set(varName, [...extractStringValues(rhs, variables)]);
    return true;
  }

  if (node.value === '+=') {
    const vals = extractStringValues(rhs, variables);
    const existing = variables.get(varName) || [];
    variables.set(varName, [...existing, ...vals]);
    return true;
  }

  if (node.value === '-=') {
    const vals = extractStringValues(rhs, variables);
    const existing = variables.get(varName) || [];
    variables.set(
        varName,
        existing.filter(val => !vals.includes(val)),
    );
    return true;
  }

  return false;
}

/**
 * Extracts target metadata from a FUNCTION node.
 */
export function extractTargetFromFunctionNode(
    node: GnAstNode,
    baseLabel: string,
    buildFilePath: string,
    variables: Map<string, string[]>,
    ): AstTargetInfo|null {
  if (node.type !== 'FUNCTION') {
    return null;
  }

  const args = node.child?.[0]?.child;
  const targetNameNode = args?.[0];
  if (!targetNameNode || targetNameNode.type !== 'LITERAL') {
    return null;
  }

  const block = node.child?.[1];
  if (!block || block.type !== 'BLOCK' || !block.child) {
    return null;
  }

  const templateName = node.value || '';
  const targetName = unquoteFromGn(targetNameNode.value);
  const label = `${baseLabel}:${targetName}`;

  const scopedVariables = new Map(variables);
  walkStatements(block.child, statement => {
    applyAssignment(scopedVariables, statement);
  });

  const sources = [
    ...(scopedVariables.get('sources') || []),
    ...(scopedVariables.get('inputs') || []),
    ...(scopedVariables.get('entrypoint') || []),
  ];
  const deps = [
    ...(scopedVariables.get('deps') || []),
    ...(scopedVariables.get('ts_deps') || []),
    // TODO: Investigate if we need to add public_deps
    // ...(scopedVariables.get('public_deps') || []),
  ];

  return {
    label,
    templateName,
    buildFile: buildFilePath,
    sources: Array.from(new Set(sources)),
    deps: Array.from(new Set(deps)),
  };
}

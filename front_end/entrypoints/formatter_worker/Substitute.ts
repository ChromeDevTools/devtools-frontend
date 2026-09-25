// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Acorn from '../../third_party/acorn/acorn.js';
import {DefinitionKind, type ScopeVariableMapping} from '../formatter_actions/formatter_actions.js';

import {ECMA_VERSION} from './AcornTokenizer.js';
import {ScopeVariableAnalysis, type VariableUses} from './ScopeParser.js';

export function substituteExpression(expression: string, scopes: ScopeVariableMapping[]): string {
  const replacements = computeSubstitution(expression, scopes);
  return applySubstitution(expression, replacements);
}

interface Replacement {
  from: string;
  to: string;
  offset: number;
  isShorthandAssignmentProperty: boolean;
}

function parseBindingExpression(expression: string): {
  replacement: string,
  freeVariables: string[],
  allNames: Set<string>,
} {
  const options = {
    ecmaVersion: ECMA_VERSION,
    allowAwaitOutsideFunction: true,
    allowImportExportEverywhere: true,
    checkPrivateFields: false,
    ranges: false,
  } as const;
  const root = Acorn.parse(`(${expression})`, options);
  const exprAt = Acorn.Parser.parseExpressionAt(expression, 0, options);
  if (root.body.length !== 1 || root.body[0].type !== 'ExpressionStatement') {
    throw new SyntaxError(`Invalid binding expression '${expression}'`);
  }
  const expr = root.body[0].expression;
  if (exprAt.start !== expr.start - 1 || exprAt.end !== expr.end - 1) {
    throw new SyntaxError(`Invalid binding expression '${expression}'`);
  }
  const analysis = new ScopeVariableAnalysis(root as Acorn.ESTree.Node, `(${expression})`);
  analysis.run();
  const needsParens = expr.type !== 'Identifier' && expr.type !== 'MemberExpression' && expr.type !== 'ThisExpression';
  return {
    replacement: needsParens ? `(${expression})` : expression,
    freeVariables: [...analysis.getFreeVariables().keys()],
    allNames: analysis.getAllNames(),
  };
}

/**
 * Given an |expression| and a list of |scopes| (from inner-most to outer-most), the |computeSubstitution|
 * function returns a list of replacements sorted by the offset. The function throws if
 * it cannot parse the expression or the substitution is impossible to perform (for example
 * if the substitution target is 'this' within a function, it would become bound there).
 **/
function computeSubstitution(expression: string, scopes: ScopeVariableMapping[]): Replacement[] {
  // Parse the expression and find variables and scopes.
  const root = Acorn.parse(expression, {
    ecmaVersion: ECMA_VERSION,
    allowAwaitOutsideFunction: true,
    allowImportExportEverywhere: true,
    checkPrivateFields: false,
    ranges: false,
  }) as Acorn.ESTree.Node;
  const scopeVariables = new ScopeVariableAnalysis(root, expression);
  scopeVariables.run();
  const freeVariables = scopeVariables.getFreeVariables();
  const result: Replacement[] = [];

  // Prepare the machinery for generating fresh names (to avoid variable captures).
  const allNames = scopeVariables.getAllNames();
  const nameMap = new Map<string, string|null>();
  const parsedBindings = new Map<string, ReturnType<typeof parseBindingExpression>>();
  // Generated identifiers declared by the scopes visited so far. Outer bindings referring to them are shadowed.
  const shadowedNames = new Set<string>();
  for (const {bindings, generatedNames} of scopes) {
    const scopeNames = new Set<string>(generatedNames);
    for (const [name, rename] of bindings.entries()) {
      let parsed: ReturnType<typeof parseBindingExpression>|undefined;
      if (rename !== null) {
        try {
          parsed = parseBindingExpression(rename);
          parsed.allNames.forEach(id => allNames.add(id));
          parsed.freeVariables.forEach(id => scopeNames.add(id));
        } catch (error) {
          if (!nameMap.has(name) && freeVariables.has(name)) {
            throw error;
          }
        }
      }
      if (!nameMap.has(name)) {
        const isShadowed = parsed?.freeVariables.some(id => shadowedNames.has(id));
        nameMap.set(name, isShadowed ? null : rename);
        if (parsed && !isShadowed) {
          parsedBindings.set(name, parsed);
        }
      }
    }
    scopeNames.forEach(id => shadowedNames.add(id));
  }
  function getNewName(base: string): string {
    let i = 1;
    while (allNames.has(`${base}_${i}`)) {
      i++;
    }
    const newName = `${base}_${i}`;
    allNames.add(newName);
    return newName;
  }

  // Perform the substitutions.
  const capturedBinders = new Map<VariableUses, string>();
  for (const [name, rename] of nameMap.entries()) {
    const defUse = freeVariables.get(name);
    if (!defUse) {
      continue;
    }

    if (rename === null) {
      throw new Error(`Cannot substitute '${name}' as the underlying variable '${rename}' is unavailable`);
    }

    const parsed = parsedBindings.get(name);
    if (!parsed) {
      continue;
    }
    const freeIds = [...parsed.freeVariables];
    for (const use of defUse) {
      result.push({
        from: name,
        to: parsed.replacement,
        offset: use.offset,
        isShorthandAssignmentProperty: use.isShorthandAssignmentProperty,
      });
      for (const freeId of freeIds) {
        for (const binder of use.scope.findBinders(freeId)) {
          capturedBinders.set(binder, freeId);
        }
      }
    }
  }

  // If there is a capturing binder, rename the bound variable.
  for (const [binder, freeId] of capturedBinders.entries()) {
    if (binder.definitionKind === DefinitionKind.FIXED) {
      // If the identifier is bound to a fixed name, such as 'this',
      // then refuse to do the substitution.
      throw new Error(`Cannot avoid capture of '${freeId}'`);
    }
    const newName = getNewName(freeId);
    for (const use of binder.uses) {
      result.push({
        from: freeId,
        to: newName,
        offset: use.offset,
        isShorthandAssignmentProperty: use.isShorthandAssignmentProperty,
      });
    }
  }
  result.sort((l, r) => l.offset - r.offset);
  return result;
}

function applySubstitution(expression: string, replacements: Replacement[]): string {
  const accumulator = [];
  let last = 0;
  for (const r of replacements) {
    accumulator.push(expression.slice(last, r.offset));
    let replacement = r.to;
    if (r.isShorthandAssignmentProperty) {
      // Let us expand the shorthand to full assignment.
      replacement = `${r.from}: ${r.to}`;
    }
    accumulator.push(replacement);
    last = r.offset + r.from.length;
  }
  accumulator.push(expression.slice(last));
  return accumulator.join('');
}

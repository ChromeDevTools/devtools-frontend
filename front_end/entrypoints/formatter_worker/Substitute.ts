// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Acorn from '../../third_party/acorn/acorn.js';

import {ECMA_VERSION} from './AcornTokenizer.js';

export interface Replacement {
  from: string;
  to: string;
  offset: number;
  isShorthandAssignmentProperty: boolean;
}

// Given an |expression| and a mapping from names to new names, the |computeSubstitution|
// function returns a list of replacements sorted by the offset. The function throws if
// it cannot parse the expression or the substitution is impossible to perform (for example
// if the substitution target is 'this' within a function, it would become bound there).
export function computeSubstitution(expression: string, nameMap: Map<string, string>): Replacement[] {
  // Parse the expression and find variables and scopes.
  const root = Acorn.parse(expression, {ecmaVersion: ECMA_VERSION, allowAwaitOutsideFunction: true, ranges: false}) as
      Acorn.ESTree.Node;
  const scopeVariables = new ScopeVariableAnalysis();
  scopeVariables.processNode(root);
  const freeVariables = scopeVariables.getFreeVariables();
  const result: Replacement[] = [];

  // Prepare the machinery for generating fresh names (to avoid variable captures).
  const allNames = scopeVariables.getAllNames();
  for (const rename of nameMap.values()) {
    allNames.add(rename);
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
  for (const [name, rename] of nameMap.entries()) {
    const defUse = freeVariables.get(name);
    if (!defUse) {
      continue;
    }

    const binders = [];
    for (const use of defUse) {
      result.push({
        from: name,
        to: rename,
        offset: use.offset,
        isShorthandAssignmentProperty: use.isShorthandAssignmentProperty,
      });
      binders.push(...use.scope.findBinders(rename));
    }
    // If there is a capturing binder, rename the bound variable.
    for (const binder of binders) {
      if (binder.definitionKind === DefinitionKind.Fixed) {
        // If the identifier is bound to a fixed name, such as 'this',
        // then refuse to do the substitution.
        throw new Error(`Cannot avoid capture of '${rename}'`);
      }
      const newName = getNewName(rename);
      for (const use of binder.uses) {
        result.push({
          from: rename,
          to: newName,
          offset: use.offset,
          isShorthandAssignmentProperty: use.isShorthandAssignmentProperty,
        });
      }
    }
  }
  result.sort((l, r) => l.offset - r.offset);
  return result;
}

export function applySubstitution(expression: string, replacements: Replacement[]): string {
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

interface Use {
  offset: number;
  scope: Scope;
  isShorthandAssignmentProperty: boolean;
}

const enum DefinitionKind {
  None = 0,
  Let = 1,
  Var = 2,
  Fixed = 3,
}

interface VariableUses {
  definitionKind: DefinitionKind;
  uses: Use[];
}

class Scope {
  readonly variables = new Map<string, VariableUses>();
  readonly parent: Scope|null;

  constructor(parent: Scope|null) {
    this.parent = parent;
  }

  addVariable(name: string, offset: number, definitionKind: DefinitionKind, isShorthandAssignmentProperty: boolean):
      void {
    const variable = this.variables.get(name);
    const use = {offset, scope: this, isShorthandAssignmentProperty};
    if (!variable) {
      this.variables.set(name, {definitionKind, uses: [use]});
      return;
    }
    if (variable.definitionKind === DefinitionKind.None) {
      variable.definitionKind = definitionKind;
    }
    variable.uses.push(use);
  }

  findBinders(name: string): VariableUses[] {
    const result = [];
    let scope: Scope|null = this;
    while (scope !== null) {
      const defUse = scope.variables.get(name);
      if (defUse && defUse.definitionKind !== DefinitionKind.None) {
        result.push(defUse);
      }
      scope = scope.parent;
    }
    return result;
  }

  #mergeChildDefUses(name: string, defUses: VariableUses): void {
    const variable = this.variables.get(name);
    if (!variable) {
      this.variables.set(name, defUses);
      return;
    }
    variable.uses.push(...defUses.uses);
    if (defUses.definitionKind === DefinitionKind.Var) {
      console.assert(variable.definitionKind !== DefinitionKind.Let);
      if (variable.definitionKind === DefinitionKind.None) {
        variable.definitionKind = defUses.definitionKind;
      }
    } else {
      console.assert(defUses.definitionKind === DefinitionKind.None);
    }
  }

  finalizeToParent(isFunctionScope: boolean): void {
    if (!this.parent) {
      console.error('Internal error: wrong nesting in scope analysis.');
      throw new Error('Internal error');
    }

    // Move all unbound variables to the parent (also move var-bound variables
    // if the parent is not a function).
    const keysToRemove = [];
    for (const [name, defUse] of this.variables.entries()) {
      if (defUse.definitionKind === DefinitionKind.None ||
          (defUse.definitionKind === DefinitionKind.Var && !isFunctionScope)) {
        this.parent.#mergeChildDefUses(name, defUse);
        keysToRemove.push(name);
      }
    }
    keysToRemove.forEach(k => this.variables.delete(k));
  }
}

class ScopeVariableAnalysis {
  readonly #rootScope = new Scope(null);
  readonly #allNames = new Set<string>();
  #currentScope = this.#rootScope;

  processNode(node: Acorn.ESTree.Node|null): void {
    if (node === null) {
      return;
    }
    switch (node.type) {
      case 'AwaitExpression':
        this.processNode(node.argument);
        break;
      case 'ArrayExpression':
        node.elements.forEach(item => this.processNode(item));
        break;
      case 'ExpressionStatement':
        this.processNode(node.expression);
        break;
      case 'Program':
        console.assert(this.#currentScope === this.#rootScope);
        node.body.forEach(item => this.processNode(item));
        console.assert(this.#currentScope === this.#rootScope);
        break;
      case 'ArrayPattern':
        node.elements.forEach(item => this.processNode(item));
        break;
      case 'ArrowFunctionExpression':
        this.#pushScope();
        node.params.forEach(this.#processNodeAsDefinition.bind(this, DefinitionKind.Var));
        this.processNode(node.body);
        this.#popScope(true);
        break;
      case 'AssignmentExpression':
      case 'AssignmentPattern':
      case 'BinaryExpression':
      case 'LogicalExpression':
        this.processNode(node.left);
        this.processNode(node.right);
        break;
      case 'BlockStatement':
        this.#pushScope();
        node.body.forEach(this.processNode.bind(this));
        this.#popScope(false);
        break;
      case 'CallExpression':
        this.processNode(node.callee);
        node.arguments.forEach(this.processNode.bind(this));
        break;
      case 'VariableDeclaration': {
        const definitionKind = node.kind === 'var' ? DefinitionKind.Var : DefinitionKind.Let;
        node.declarations.forEach(this.#processVariableDeclarator.bind(this, definitionKind));
        break;
      }
      case 'CatchClause':
        this.#pushScope();
        this.#processNodeAsDefinition(DefinitionKind.Let, node.param);
        node.body.body.forEach(this.processNode.bind(this));
        this.#popScope(false);
        break;
      case 'ClassBody':
        node.body.forEach(this.processNode.bind(this));
        break;
      case 'ClassDeclaration':
        this.#processNodeAsDefinition(DefinitionKind.Let, node.id);
        this.#pushScope();
        this.processNode(node.superClass ?? null);
        this.processNode(node.body);
        this.#popScope(false);
        break;
      case 'ClassExpression':
        this.#pushScope();
        // Intentionally ignore the id.
        this.processNode(node.superClass ?? null);
        this.processNode(node.body);
        this.#popScope(false);
        break;
      case 'ChainExpression':
        this.processNode(node.expression);
        break;
      case 'ConditionalExpression':
        this.processNode(node.test);
        this.processNode(node.consequent);
        this.processNode(node.alternate);
        break;
      case 'DoWhileStatement':
        this.processNode(node.body);
        this.processNode(node.test);
        break;
      case 'ForInStatement':
      case 'ForOfStatement':
        this.#pushScope();
        this.processNode(node.left);
        this.processNode(node.right);
        this.processNode(node.body);
        this.#popScope(false);
        break;
      case 'ForStatement':
        this.#pushScope();
        this.processNode(node.init ?? null);
        this.processNode(node.test ?? null);
        this.processNode(node.update ?? null);
        this.processNode(node.body);
        this.#popScope(false);
        break;
      case 'FunctionDeclaration':
        this.#processNodeAsDefinition(DefinitionKind.Var, node.id);
        this.#pushScope();
        this.#addVariable('this', node.start, DefinitionKind.Fixed);
        this.#addVariable('arguments', node.start, DefinitionKind.Fixed);
        node.params.forEach(this.#processNodeAsDefinition.bind(this, DefinitionKind.Let));
        this.processNode(node.body);
        this.#popScope(true);
        break;
      case 'FunctionExpression':
        // Id is intentionally ignored in function expressions.
        this.#pushScope();
        this.#addVariable('this', node.start, DefinitionKind.Fixed);
        this.#addVariable('arguments', node.start, DefinitionKind.Fixed);
        node.params.forEach(this.#processNodeAsDefinition.bind(this, DefinitionKind.Let));
        this.processNode(node.body);
        this.#popScope(true);
        break;
      case 'Identifier':
        this.#addVariable(node.name, node.start);
        break;
      case 'IfStatement':
        this.processNode(node.test);
        this.processNode(node.consequent);
        this.processNode(node.alternate ?? null);
        break;
      case 'LabeledStatement':
        this.processNode(node.body);
        break;
      case 'MetaProperty':
        break;
      case 'MethodDefinition':
        if (node.computed) {
          this.processNode(node.key);
        }
        this.processNode(node.value);
        break;
      case 'NewExpression':
        this.processNode(node.callee);
        node.arguments.forEach(this.processNode.bind(this));
        break;
      case 'MemberExpression':
        this.processNode(node.object);
        if (node.computed) {
          this.processNode(node.property);
        }
        break;
      case 'ObjectExpression':
        node.properties.forEach(this.processNode.bind(this));
        break;
      case 'ObjectPattern':
        node.properties.forEach(this.processNode.bind(this));
        break;
      case 'PrivateIdentifier':
        break;
      case 'PropertyDefinition':
        if (node.computed) {
          this.processNode(node.key);
        }
        this.processNode(node.value ?? null);
        break;
      case 'Property':
        if (node.shorthand) {
          console.assert(node.value === node.key);
          console.assert(node.value.type === 'Identifier');
          this.#addVariable((node.value as Acorn.ESTree.Identifier).name, node.value.start, DefinitionKind.None, true);
        } else {
          if (node.computed) {
            this.processNode(node.key);
          }
          this.processNode(node.value);
        }
        break;
      case 'RestElement':
        this.#processNodeAsDefinition(DefinitionKind.Let, node.argument);
        break;
      case 'ReturnStatement':
        this.processNode(node.argument ?? null);
        break;
      case 'SequenceExpression':
        node.expressions.forEach(this.processNode.bind(this));
        break;
      case 'SpreadElement':
        this.processNode(node.argument);
        break;
      case 'SwitchCase':
        this.processNode(node.test ?? null);
        node.consequent.forEach(this.processNode.bind(this));
        break;
      case 'SwitchStatement':
        this.processNode(node.discriminant);
        node.cases.forEach(this.processNode.bind(this));
        break;
      case 'TaggedTemplateExpression':
        this.processNode(node.tag);
        this.processNode(node.quasi);
        break;
      case 'TemplateLiteral':
        node.expressions.forEach(this.processNode.bind(this));
        break;
      case 'ThisExpression':
        this.#addVariable('this', node.start);
        break;
      case 'ThrowStatement':
        this.processNode(node.argument);
        break;
      case 'TryStatement':
        this.processNode(node.block);
        this.processNode(node.handler ?? null);
        this.processNode(node.finalizer ?? null);
        break;
      case 'WithStatement':
        this.processNode(node.object);
        // TODO jarin figure how to treat the with body.
        this.processNode(node.body);
        break;
      case 'YieldExpression':
        this.processNode(node.argument ?? null);
        break;
      case 'UnaryExpression':
      case 'UpdateExpression':
        this.processNode(node.argument);
        break;
      case 'WhileStatement':
        this.processNode(node.test);
        this.processNode(node.body);
        break;

      // Ignore, no expressions involved.
      case 'BreakStatement':
      case 'ContinueStatement':
      case 'DebuggerStatement':
      case 'EmptyStatement':
      case 'Literal':
      case 'Super':
      case 'TemplateElement':
        break;
        // Ignore, cannot be used outside of a module.
      case 'ImportDeclaration':
      case 'ImportDefaultSpecifier':
      case 'ImportNamespaceSpecifier':
      case 'ImportSpecifier':
      case 'ImportExpression':
      case 'ExportAllDeclaration':
      case 'ExportDefaultDeclaration':
      case 'ExportNamedDeclaration':
      case 'ExportSpecifier':
        break;

      case 'VariableDeclarator':
        console.error('Should not encounter VariableDeclarator in general traversal.');
        break;
    }
  }

  getFreeVariables(): Map<string, Use[]> {
    const result = new Map<string, Use[]>();
    for (const [name, defUse] of this.#rootScope.variables) {
      if (defUse.definitionKind !== DefinitionKind.None) {
        // Skip bound variables.
        continue;
      }
      result.set(name, defUse.uses);
    }
    return result;
  }

  getAllNames(): Set<string> {
    return this.#allNames;
  }

  #pushScope(): void {
    this.#currentScope = new Scope(this.#currentScope);
  }

  #popScope(isFunctionContext: boolean): void {
    if (this.#currentScope.parent === null) {
      console.error('Internal error: wrong nesting in scope analysis.');
      throw new Error('Internal error');
    }
    this.#currentScope.finalizeToParent(isFunctionContext);
    this.#currentScope = this.#currentScope.parent;
  }

  #addVariable(
      name: string, offset: number, definitionKind: DefinitionKind = DefinitionKind.None,
      isShorthandAssignmentProperty: boolean = false): void {
    this.#allNames.add(name);
    this.#currentScope.addVariable(name, offset, definitionKind, isShorthandAssignmentProperty);
  }

  #processNodeAsDefinition(
      definitionKind: DefinitionKind.Let|DefinitionKind.Var,
      node: Acorn.ESTree.Pattern|Acorn.ESTree.AssignmentProperty|null): void {
    if (node === null) {
      return;
    }
    switch (node.type) {
      case 'ArrayPattern':
        node.elements.forEach(this.#processNodeAsDefinition.bind(this, definitionKind));
        break;
      case 'AssignmentPattern':
        this.#processNodeAsDefinition(definitionKind, node.left);
        this.processNode(node.right);
        break;
      case 'Identifier':
        this.#addVariable(node.name, node.start, definitionKind);
        break;
      case 'MemberExpression':
        this.processNode(node.object);
        if (node.computed) {
          this.processNode(node.property);
        }
        break;
      case 'ObjectPattern':
        node.properties.forEach(this.#processNodeAsDefinition.bind(this, definitionKind));
        break;
      case 'Property':
        // This is AssignmentProperty inside an object pattern.
        if (node.shorthand) {
          console.assert(node.value === node.key);
          console.assert(node.value.type === 'Identifier');
          this.#addVariable((node.value as Acorn.ESTree.Identifier).name, node.value.start, definitionKind, true);
        } else {
          if (node.computed) {
            this.processNode(node.key);
          }
          this.#processNodeAsDefinition(definitionKind, node.value);
        }
        break;
      case 'RestElement':
        this.#processNodeAsDefinition(definitionKind, node.argument);
        break;
    }
  }

  #processVariableDeclarator(
      definitionKind: DefinitionKind.Let|DefinitionKind.Var, decl: Acorn.ESTree.VariableDeclarator): void {
    this.#processNodeAsDefinition(definitionKind, decl.id);
    this.processNode(decl.init ?? null);
  }
}

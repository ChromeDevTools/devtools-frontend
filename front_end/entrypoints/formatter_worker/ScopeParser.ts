// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Acorn from '../../third_party/acorn/acorn.js';

import {ECMA_VERSION} from './AcornTokenizer.js';

import {DefinitionKind, type ScopeTreeNode} from './FormatterActions.js';

export function parseScopes(expression: string): Scope|null {
  // Parse the expression and find variables and scopes.
  let root: Acorn.ESTree.Node|null = null;
  try {
    root = Acorn.parse(expression, {ecmaVersion: ECMA_VERSION, allowAwaitOutsideFunction: true, ranges: false}) as
        Acorn.ESTree.Node;
  } catch {
    return null;
  }
  return new ScopeVariableAnalysis(root).run();
}

export interface Use {
  offset: number;
  scope: Scope;
  isShorthandAssignmentProperty: boolean;
}

export interface VariableUses {
  definitionKind: DefinitionKind;
  uses: Use[];
}

export class Scope {
  readonly variables = new Map<string, VariableUses>();
  readonly parent: Scope|null;
  readonly start: number;
  readonly end: number;
  readonly children: Scope[] = [];

  constructor(start: number, end: number, parent: Scope|null) {
    this.start = start;
    this.end = end;
    this.parent = parent;
    if (parent) {
      parent.children.push(this);
    }
  }

  export(): ScopeTreeNode {
    const variables = [];
    for (const variable of this.variables) {
      const offsets = [];
      for (const use of variable[1].uses) {
        offsets.push(use.offset);
      }
      variables.push({name: variable[0], kind: variable[1].definitionKind, offsets});
    }
    const children = this.children.map(c => c.export());
    return {
      start: this.start,
      end: this.end,
      variables,
      children,
    };
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

export class ScopeVariableAnalysis {
  readonly #rootScope: Scope;
  readonly #allNames = new Set<string>();
  #currentScope: Scope;
  readonly #rootNode: Acorn.ESTree.Node;

  constructor(node: Acorn.ESTree.Node) {
    this.#rootNode = node;
    this.#rootScope = new Scope(node.start, node.end, null);
    this.#currentScope = this.#rootScope;
  }

  run(): Scope {
    this.#processNode(this.#rootNode);
    return this.#rootScope;
  }

  #processNode(node: Acorn.ESTree.Node|null): void {
    if (node === null) {
      return;
    }
    switch (node.type) {
      case 'AwaitExpression':
        this.#processNode(node.argument);
        break;
      case 'ArrayExpression':
        node.elements.forEach(item => this.#processNode(item));
        break;
      case 'ExpressionStatement':
        this.#processNode(node.expression);
        break;
      case 'Program':
        console.assert(this.#currentScope === this.#rootScope);
        node.body.forEach(item => this.#processNode(item));
        console.assert(this.#currentScope === this.#rootScope);
        break;
      case 'ArrayPattern':
        node.elements.forEach(item => this.#processNode(item));
        break;
      case 'ArrowFunctionExpression': {
        this.#pushScope(node.start, node.end);
        node.params.forEach(this.#processNodeAsDefinition.bind(this, DefinitionKind.Var, false));
        if (node.body.type === 'BlockStatement') {
          // Include the body of the arrow function in the same scope as the arguments.
          node.body.body.forEach(this.#processNode.bind(this));
        } else {
          this.#processNode(node.body);
        }
        this.#popScope(true);
        break;
      }
      case 'AssignmentExpression':
      case 'AssignmentPattern':
      case 'BinaryExpression':
      case 'LogicalExpression':
        this.#processNode(node.left);
        this.#processNode(node.right);
        break;
      case 'BlockStatement':
        this.#pushScope(node.start, node.end);
        node.body.forEach(this.#processNode.bind(this));
        this.#popScope(false);
        break;
      case 'CallExpression':
        this.#processNode(node.callee);
        node.arguments.forEach(this.#processNode.bind(this));
        break;
      case 'VariableDeclaration': {
        const definitionKind = node.kind === 'var' ? DefinitionKind.Var : DefinitionKind.Let;
        node.declarations.forEach(this.#processVariableDeclarator.bind(this, definitionKind));
        break;
      }
      case 'CatchClause':
        this.#pushScope(node.start, node.end);
        this.#processNodeAsDefinition(DefinitionKind.Let, false, node.param);
        this.#processNode(node.body);
        this.#popScope(false);
        break;
      case 'ClassBody':
        node.body.forEach(this.#processNode.bind(this));
        break;
      case 'ClassDeclaration':
        this.#processNodeAsDefinition(DefinitionKind.Let, false, node.id);
        this.#processNode(node.superClass ?? null);
        this.#processNode(node.body);
        break;
      case 'ClassExpression':
        // Intentionally ignore the id.
        this.#processNode(node.superClass ?? null);
        this.#processNode(node.body);
        break;
      case 'ChainExpression':
        this.#processNode(node.expression);
        break;
      case 'ConditionalExpression':
        this.#processNode(node.test);
        this.#processNode(node.consequent);
        this.#processNode(node.alternate);
        break;
      case 'DoWhileStatement':
        this.#processNode(node.body);
        this.#processNode(node.test);
        break;
      case 'ForInStatement':
      case 'ForOfStatement':
        this.#pushScope(node.start, node.end);
        this.#processNode(node.left);
        this.#processNode(node.right);
        this.#processNode(node.body);
        this.#popScope(false);
        break;
      case 'ForStatement':
        this.#pushScope(node.start, node.end);
        this.#processNode(node.init ?? null);
        this.#processNode(node.test ?? null);
        this.#processNode(node.update ?? null);
        this.#processNode(node.body);
        this.#popScope(false);
        break;
      case 'FunctionDeclaration':
        this.#processNodeAsDefinition(DefinitionKind.Var, false, node.id);
        this.#pushScope(node.id?.end ?? node.start, node.end);
        this.#addVariable('this', node.start, DefinitionKind.Fixed);
        this.#addVariable('arguments', node.start, DefinitionKind.Fixed);
        node.params.forEach(this.#processNodeAsDefinition.bind(this, DefinitionKind.Let, false));
        // Process the body of the block statement directly to avoid creating new scope.
        node.body.body.forEach(this.#processNode.bind(this));
        this.#popScope(true);
        break;
      case 'FunctionExpression':
        this.#pushScope(node.id?.end ?? node.start, node.end);
        this.#addVariable('this', node.start, DefinitionKind.Fixed);
        this.#addVariable('arguments', node.start, DefinitionKind.Fixed);
        node.params.forEach(this.#processNodeAsDefinition.bind(this, DefinitionKind.Let, false));
        // Process the body of the block statement directly to avoid creating new scope.
        node.body.body.forEach(this.#processNode.bind(this));
        this.#popScope(true);
        break;
      case 'Identifier':
        this.#addVariable(node.name, node.start);
        break;
      case 'IfStatement':
        this.#processNode(node.test);
        this.#processNode(node.consequent);
        this.#processNode(node.alternate ?? null);
        break;
      case 'LabeledStatement':
        this.#processNode(node.body);
        break;
      case 'MetaProperty':
        break;
      case 'MethodDefinition':
        if (node.computed) {
          this.#processNode(node.key);
        }
        this.#processNode(node.value);
        break;
      case 'NewExpression':
        this.#processNode(node.callee);
        node.arguments.forEach(this.#processNode.bind(this));
        break;
      case 'MemberExpression':
        this.#processNode(node.object);
        if (node.computed) {
          this.#processNode(node.property);
        }
        break;
      case 'ObjectExpression':
        node.properties.forEach(this.#processNode.bind(this));
        break;
      case 'ObjectPattern':
        node.properties.forEach(this.#processNode.bind(this));
        break;
      case 'PrivateIdentifier':
        break;
      case 'PropertyDefinition':
        if (node.computed) {
          this.#processNode(node.key);
        }
        this.#processNode(node.value ?? null);
        break;
      case 'Property':
        if (node.shorthand) {
          console.assert(node.value.type === 'Identifier');
          console.assert(node.key.type === 'Identifier');
          console.assert((node.value as Acorn.ESTree.Identifier).name === (node.key as Acorn.ESTree.Identifier).name);
          this.#addVariable((node.value as Acorn.ESTree.Identifier).name, node.value.start, DefinitionKind.None, true);
        } else {
          if (node.computed) {
            this.#processNode(node.key);
          }
          this.#processNode(node.value);
        }
        break;
      case 'RestElement':
        this.#processNodeAsDefinition(DefinitionKind.Let, false, node.argument);
        break;
      case 'ReturnStatement':
        this.#processNode(node.argument ?? null);
        break;
      case 'SequenceExpression':
        node.expressions.forEach(this.#processNode.bind(this));
        break;
      case 'SpreadElement':
        this.#processNode(node.argument);
        break;
      case 'SwitchCase':
        this.#processNode(node.test ?? null);
        node.consequent.forEach(this.#processNode.bind(this));
        break;
      case 'SwitchStatement':
        this.#processNode(node.discriminant);
        node.cases.forEach(this.#processNode.bind(this));
        break;
      case 'TaggedTemplateExpression':
        this.#processNode(node.tag);
        this.#processNode(node.quasi);
        break;
      case 'TemplateLiteral':
        node.expressions.forEach(this.#processNode.bind(this));
        break;
      case 'ThisExpression':
        this.#addVariable('this', node.start);
        break;
      case 'ThrowStatement':
        this.#processNode(node.argument);
        break;
      case 'TryStatement':
        this.#processNode(node.block);
        this.#processNode(node.handler ?? null);
        this.#processNode(node.finalizer ?? null);
        break;
      case 'WithStatement':
        this.#processNode(node.object);
        // TODO jarin figure how to treat the with body.
        this.#processNode(node.body);
        break;
      case 'YieldExpression':
        this.#processNode(node.argument ?? null);
        break;
      case 'UnaryExpression':
      case 'UpdateExpression':
        this.#processNode(node.argument);
        break;
      case 'WhileStatement':
        this.#processNode(node.test);
        this.#processNode(node.body);
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

  #pushScope(start: number, end: number): void {
    this.#currentScope = new Scope(start, end, this.#currentScope);
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
      definitionKind: DefinitionKind.Let|DefinitionKind.Var, isShorthandAssignmentProperty: boolean,
      node: Acorn.ESTree.Pattern|Acorn.ESTree.AssignmentProperty|null): void {
    if (node === null) {
      return;
    }
    switch (node.type) {
      case 'ArrayPattern':
        node.elements.forEach(this.#processNodeAsDefinition.bind(this, definitionKind, false));
        break;
      case 'AssignmentPattern':
        this.#processNodeAsDefinition(definitionKind, isShorthandAssignmentProperty, node.left);
        this.#processNode(node.right);
        break;
      case 'Identifier':
        this.#addVariable(node.name, node.start, definitionKind, isShorthandAssignmentProperty);
        break;
      case 'MemberExpression':
        this.#processNode(node.object);
        if (node.computed) {
          this.#processNode(node.property);
        }
        break;
      case 'ObjectPattern':
        node.properties.forEach(this.#processNodeAsDefinition.bind(this, definitionKind, false));
        break;
      case 'Property':
        if (node.computed) {
          this.#processNode(node.key);
        }
        this.#processNodeAsDefinition(definitionKind, node.shorthand, node.value);
        break;
      case 'RestElement':
        this.#processNodeAsDefinition(definitionKind, false, node.argument);
        break;
    }
  }

  #processVariableDeclarator(
      definitionKind: DefinitionKind.Let|DefinitionKind.Var, decl: Acorn.ESTree.VariableDeclarator): void {
    this.#processNodeAsDefinition(definitionKind, false, decl.id);
    this.#processNode(decl.init ?? null);
  }
}

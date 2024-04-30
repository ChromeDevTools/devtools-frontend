// Copyright (c) 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Acorn from '../../third_party/acorn/acorn.js';

const SkipSubTreeObject: Object = {};

export class ESTreeWalker {
  readonly #beforeVisit: (arg0: Acorn.ESTree.Node) => (Object | undefined);
  readonly #afterVisit: Function;
  #walkNulls: boolean;

  constructor(
      beforeVisit: (arg0: Acorn.ESTree.Node) => (Object | undefined),
      afterVisit?: ((arg0: Acorn.ESTree.Node) => void)) {
    this.#beforeVisit = beforeVisit;
    this.#afterVisit = afterVisit || function(): void {};
    this.#walkNulls = false;
  }

  // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
  // eslint-disable-next-line @typescript-eslint/naming-convention
  static get SkipSubtree(): Object {
    return SkipSubTreeObject;
  }

  setWalkNulls(value: boolean): void {
    this.#walkNulls = value;
  }

  walk(ast: Acorn.ESTree.Node): void {
    this.#innerWalk(ast, null);
  }

  #innerWalk(node: Acorn.ESTree.Node, parent: Acorn.ESTree.Node|null): void {
    if (!node && parent && this.#walkNulls) {
      const result = ({raw: 'null', value: null, parent: null} as Acorn.ESTree.SimpleLiteral);
      // Otherwise Closure can't handle the definition
      result.type = 'Literal';

      node = result;
    }

    if (!node) {
      return;
    }
    node.parent = parent;

    if (this.#beforeVisit.call(null, node) === ESTreeWalker.SkipSubtree) {
      this.#afterVisit.call(null, node);
      return;
    }

    const walkOrder = _walkOrder[node.type];
    if (!walkOrder) {
      console.error('Walk order not defined for ' + node.type);
      return;
    }

    if (node.type === 'TemplateLiteral') {
      const templateLiteral = (node as Acorn.ESTree.TemplateLiteral);
      const expressionsLength = templateLiteral.expressions.length;
      for (let i = 0; i < expressionsLength; ++i) {
        this.#innerWalk(templateLiteral.quasis[i], templateLiteral);
        this.#innerWalk(templateLiteral.expressions[i], templateLiteral);
      }
      this.#innerWalk(templateLiteral.quasis[expressionsLength], templateLiteral);
    } else {
      for (let i = 0; i < walkOrder.length; ++i) {
        // @ts-ignore We are doing type traversal here, but the strings
        // in _walkOrder are not mapping. Preferably, we would use the
        // properties as defined in the types, but we can't do that yet.
        // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const entity = (node[walkOrder[i]] as any);
        if (Array.isArray(entity)) {
          this.#walkArray((entity as Acorn.ESTree.Node[]), node);
        } else {
          this.#innerWalk((entity as Acorn.ESTree.Node), node);
        }
      }
    }

    this.#afterVisit.call(null, node);
  }

  #walkArray(nodeArray: Acorn.ESTree.Node[], parentNode: Acorn.ESTree.Node|null): void {
    for (let i = 0; i < nodeArray.length; ++i) {
      this.#innerWalk(nodeArray[i], parentNode);
    }
  }
}

// TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
// eslint-disable-next-line @typescript-eslint/naming-convention
const _walkOrder = {
  'AwaitExpression': ['argument'],
  'ArrayExpression': ['elements'],
  'ArrayPattern': ['elements'],
  'ArrowFunctionExpression': ['params', 'body'],
  'AssignmentExpression': ['left', 'right'],
  'AssignmentPattern': ['left', 'right'],
  'BinaryExpression': ['left', 'right'],
  'BlockStatement': ['body'],
  'BreakStatement': ['label'],
  'CallExpression': ['callee', 'arguments'],
  'CatchClause': ['param', 'body'],
  'ClassBody': ['body'],
  'ClassDeclaration': ['id', 'superClass', 'body'],
  'ClassExpression': ['id', 'superClass', 'body'],
  'ChainExpression': ['expression'],
  'ConditionalExpression': ['test', 'consequent', 'alternate'],
  'ContinueStatement': ['label'],
  'DebuggerStatement': [],
  'DoWhileStatement': ['body', 'test'],
  'EmptyStatement': [],
  'ExpressionStatement': ['expression'],
  'ForInStatement': ['left', 'right', 'body'],
  'ForOfStatement': ['left', 'right', 'body'],
  'ForStatement': ['init', 'test', 'update', 'body'],
  'FunctionDeclaration': ['id', 'params', 'body'],
  'FunctionExpression': ['id', 'params', 'body'],
  'Identifier': [],
  'ImportDeclaration': ['specifiers', 'source'],
  'ImportDefaultSpecifier': ['local'],
  'ImportNamespaceSpecifier': ['local'],
  'ImportSpecifier': ['imported', 'local'],
  'ImportExpression': ['source'],
  'ExportAllDeclaration': ['source'],
  'ExportDefaultDeclaration': ['declaration'],
  'ExportNamedDeclaration': ['specifiers', 'source', 'declaration'],
  'ExportSpecifier': ['exported', 'local'],
  'IfStatement': ['test', 'consequent', 'alternate'],
  'LabeledStatement': ['label', 'body'],
  'Literal': [],
  'LogicalExpression': ['left', 'right'],
  'MemberExpression': ['object', 'property'],
  'MetaProperty': ['meta', 'property'],
  'MethodDefinition': ['key', 'value'],
  'NewExpression': ['callee', 'arguments'],
  'ObjectExpression': ['properties'],
  'ObjectPattern': ['properties'],
  'ParenthesizedExpression': ['expression'],
  'PrivateIdentifier': [],
  'PropertyDefinition': ['key', 'value'],
  'Program': ['body'],
  'Property': ['key', 'value'],
  'RestElement': ['argument'],
  'ReturnStatement': ['argument'],
  'SequenceExpression': ['expressions'],
  'SpreadElement': ['argument'],
  'StaticBlock': ['body'],
  'Super': [],
  'SwitchCase': ['test', 'consequent'],
  'SwitchStatement': ['discriminant', 'cases'],
  'TaggedTemplateExpression': ['tag', 'quasi'],
  'TemplateElement': [],
  'TemplateLiteral': ['quasis', 'expressions'],
  'ThisExpression': [],
  'ThrowStatement': ['argument'],
  'TryStatement': ['block', 'handler', 'finalizer'],
  'UnaryExpression': ['argument'],
  'UpdateExpression': ['argument'],
  'VariableDeclaration': ['declarations'],
  'VariableDeclarator': ['id', 'init'],
  'WhileStatement': ['test', 'body'],
  'WithStatement': ['object', 'body'],
  'YieldExpression': ['argument'],
};

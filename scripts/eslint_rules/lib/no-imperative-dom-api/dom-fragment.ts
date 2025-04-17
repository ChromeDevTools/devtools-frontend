// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @fileoverview A library to associate DOM fragments with their construction code.
 */

import type {TSESLint, TSESTree} from '@typescript-eslint/utils';

import {getEnclosingProperty} from './ast.ts';
import {ClassMember} from './class-member.ts';

type Variable = TSESLint.Scope.Variable;
type Node = TSESTree.Node;
type Identifier = TSESTree.Identifier;
type SourceCode = TSESLint.SourceCode;
type Scope = TSESLint.Scope.Scope;

const domFragments = new Map<Node|ClassMember|Variable, DomFragment>();

export class DomFragment {
  tagName?: string;
  classList: Array<Node|string> = [];
  attributes: Array<{key: string, value: Node|string}> = [];
  booleanAttributes: Array<{key: string, value: Node|string}> = [];
  style: Array<{key: string, value: Node}> = [];
  eventListeners: Array<{key: string, value: Node}> = [];
  bindings: Array<{key: string, value: Node|string}> = [];
  directives: Array<{name: string, arguments: Node[]}> = [];
  textContent?: Node|string;
  children: DomFragment[] = [];
  parent?: DomFragment;
  expression?: string;
  replacementLocation?: Node;
  initializer?: Node;
  references: Array<{node: Node, processed?: boolean}> = [];

  static getOrCreate(node: Node, sourceCode: SourceCode): DomFragment {
    const key = getKey(node, sourceCode);

    let result = domFragments.get(key);
    if (!result) {
      result = new DomFragment();
      domFragments.set(key, result);
      if ('parent' in key) {
        result.expression = sourceCode.getText(node);
        result.references.push({node});
      } else if (key instanceof ClassMember) {
        result.replacementLocation = key.classDeclaration;
        result.expression = sourceCode.getText(node);
      } else if ('references' in key) {
        result.references = key.references.filter(r => !key.identifiers.includes(r.identifier as Identifier))
                                .map(r => ({node: r.identifier}));
        const initializer = key.identifiers[0];
        if (initializer?.parent?.type === 'VariableDeclarator') {
          result.initializer = initializer;
        }
        result.replacementLocation = result.initializer?.parent;
        result.expression = key.name;
      }
    }
    if (key instanceof ClassMember) {
      result.references = [...key.references].map(r => ({
                                                    node: r,
                                                  }));
      result.initializer = key.initializer;
    }
    return result;
  }

  static clear() {
    domFragments.clear();
  }

  static values() {
    return domFragments.values();
  }

  toTemplateLiteral(sourceCode: Readonly<SourceCode>, indent = 4): string[] {
    if (this.expression && !this.tagName) {
      const value = this.initializer?.parent?.type === 'VariableDeclarator' ? this.initializer?.parent?.init : null;
      const expression =
          (this.references.every(r => r.processed) && value) ? sourceCode.getText(value) : this.expression;
      return [`\n${' '.repeat(indent)}`, '${', expression, '}'];
    }

    function toOutputString(node: Node|string, quoteLiterals = false): string {
      if (typeof node === 'string') {
        return node;
      }
      if (node.type === 'Literal' && !quoteLiterals) {
        return node.value?.toString() ?? '';
      }
      if (node.type === 'UnaryExpression' && node.operator === '-' && node.argument.type === 'Literal') {
        return '-' + node.argument.value;
      }
      const text = sourceCode.getText(node);
      if (node.type === 'TemplateLiteral') {
        return text.substr(1, text.length - 2);
      }
      return '${' + text + '}';
    }

    const components: string[] = [];
    const MAX_LINE_LENGTH = 100;
    components.push(`\n${' '.repeat(indent)}`);
    let lineLength = indent;

    function appendExpression(expression) {
      if (lineLength + expression.length + 1 > MAX_LINE_LENGTH) {
        components.push(`\n${' '.repeat(indent + 4)}`);
        lineLength = expression.length + indent + 4;
      } else {
        components.push(' ');
        lineLength += expression.length + 1;
      }
      components.push(expression);
    }

    if (this.tagName) {
      components.push('<', this.tagName);
      lineLength += this.tagName.length + 1;
    }
    if (this.classList.length) {
      appendExpression(
          `class="${this.classList.map(c => toOutputString(c)).join(' ')}"`,
      );
    }
    for (const attribute of this.attributes || []) {
      const value = attribute.value;
      const valueEmpty = typeof value === 'string' ? value === '' : value.type === 'Literal' && value.value === '';
      if (valueEmpty) {
        appendExpression(attribute.key);
      } else {
        appendExpression(`${attribute.key}=${attributeValue(toOutputString(value))}`);
      }
    }
    for (const attribute of this.booleanAttributes || []) {
      appendExpression(
          `?${attribute.key}=${attributeValue(toOutputString(attribute.value, /* quoteLiterals=*/ true))}`,
      );
    }
    for (const eventListener of this.eventListeners || []) {
      appendExpression(
          `@${eventListener.key}=${
              attributeValue(
                  toOutputString(eventListener.value),
                  )}`,
      );
    }
    for (const binding of this.bindings || []) {
      appendExpression(
          `.${binding.key}=${
              toOutputString(
                  binding.value,
                  /* quoteLiterals=*/ true,
                  )}`,
      );
    }
    for (const directive of this.directives || []) {
      appendExpression(`\${${directive.name}(${directive.arguments.map(a => sourceCode.getText(a)).join(', ')})}`);
    }
    if (this.style.length) {
      const style = this.style.map(s => `${s.key}:${toOutputString(s.value)}`).join('; ');
      appendExpression(`style="${style}"`);
    }
    if (lineLength > MAX_LINE_LENGTH) {
      components.push(`\n${' '.repeat(indent)}`);
    }
    components.push('>');
    if (this.textContent) {
      components.push(toOutputString(this.textContent));
    }
    if (this.children?.length) {
      for (const child of this.children || []) {
        components.push(...child.toTemplateLiteral(sourceCode, indent + 2));
      }
      components.push(`\n${' '.repeat(indent)}`);
    }
    if (this.tagName && this.tagName !== 'input') {
      components.push('</', this.tagName, '>');
    }
    return components;
  }

  appendChild(node: Node, sourceCode: SourceCode, processed = true): DomFragment {
    return this.insertChildAt(node, this.children.length, sourceCode, processed);
  }

  insertChildAt(node: Node, index: number, sourceCode: SourceCode, processed = true): DomFragment {
    const child = DomFragment.getOrCreate(node, sourceCode);
    this.children.splice(index, 0, child);
    child.parent = this;
    if (processed) {
      for (const reference of child.references) {
        if (reference.node === node) {
          reference.processed = true;
        }
      }
    }
    return child;
  }
}

function getEnclosingVariable(node: Node, sourceCode: SourceCode): Variable|null {
  if (node.type === 'Identifier') {
    let scope: Scope|null = sourceCode.getScope(node);
    const variableName = node.name;
    while (scope) {
      const variable = scope.variables.find(v => v.name === variableName);
      if (variable) {
        return variable;
      }
      scope = scope.upper;
    }
  }
  if (node.parent?.type === 'VariableDeclarator') {
    const variables = sourceCode.getDeclaredVariables(node.parent);
    if (variables.length > 1) {
      return null;  // Destructuring assignment
    }
    return variables[0];
  }
  return null;
}

function attributeValue(outputString: string): string {
  if (outputString.startsWith('${') && outputString.endsWith('}')) {
    return outputString;
  }
  return '"' + outputString + '"';
}

function getKey(node: Node, sourceCode: SourceCode): Node|ClassMember|Variable {
  const variable = getEnclosingVariable(node, sourceCode);
  if (variable) {
    return variable;
  }
  const property = getEnclosingProperty(node);
  if (property) {
    const classMember = ClassMember.getOrCreate(property, sourceCode);
    if (classMember) {
      return classMember;
    }
  }
  return node;
}

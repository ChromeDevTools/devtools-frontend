// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @file A library to associate DOM fragments with their construction code.
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
  widgetClass?: Node;
  replacer?: (fixer: TSESLint.RuleFixer, template: string) => TSESLint.RuleFix;
  initializer?: Node;
  references: Array<{node: Node, processed?: boolean}> = [];

  static get(node: Node, sourceCode: SourceCode): DomFragment|undefined {
    return domFragments.get(getKey(node, sourceCode));
  }

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
        result.expression = sourceCode.getText(node);
        const references: Array<{node: Node, processed?: boolean}> = [];
        Object.defineProperty(result, 'references', {
          get: () => {
            if (key.references.size === references.length) {
              return references;
            }
            for (const reference of key.references) {
              if (!references.some(r => r.node === reference)) {
                references.push({node: reference});
              }
            }
            return references;
          },
          set: () => {},
        });
        Object.defineProperty(result, 'initializer', {
          get: () => key.initializer,
          set: () => {},
        });
      } else if ('references' in key) {
        result.references = key.references.filter(r => !key.identifiers.includes(r.identifier as Identifier))
                                .map(r => ({node: r.identifier}));
        const initializer = key.identifiers[0];
        if (initializer?.parent?.type === 'VariableDeclarator') {
          result.initializer = initializer.parent?.init ?? undefined;
          if (result.initializer?.type === 'TSAsExpression') {
            result.initializer = result.initializer.expression;
          }
        }
        result.expression = key.name;
      }
    }
    return result;
  }

  static set(node: Node, sourceCode: SourceCode, domFragment: DomFragment) {
    const key = getKey(node, sourceCode);
    domFragments.set(key, domFragment);
  }

  static clear() {
    domFragments.clear();
  }

  static values() {
    return domFragments.values();
  }

  toTemplateLiteral(sourceCode: Readonly<SourceCode>, indent = 4): string[] {
    const components: string[] = [];
    const MAX_LINE_LENGTH = 100;
    components.push(`\n${' '.repeat(indent)}`);
    let lineLength = indent;
    if (this.expression && !this.tagName) {
      if (this.expression.startsWith('`') && this.expression.endsWith('`')) {
        components.push(this.expression.slice(1, -1).trim());
      } else {
        const expression = (this.references.every(r => r.processed) && this.initializer) ?
            sourceCode.getText(this.initializer) :
            this.expression;
        components.push('${', expression, '}');
      }

      return components;
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

    function appendExpression(expression: string) {
      if (lineLength + expression.length + 1 > MAX_LINE_LENGTH) {
        components.push(`\n${' '.repeat(indent + 4)}`);
        lineLength = expression.length + indent + 4;
      } else {
        if (expression.match(/^[a-zA-Z0-9?.$@]/)) {
          components.push(' ');
          ++lineLength;
        }
        lineLength += expression.length;
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
      const value = attribute.value;
      const isFalse = typeof value === 'string' ? value === 'false' : value.type === 'Literal' && value.value === false;
      if (isFalse) {
        continue;
      }
      const isTrue = typeof value === 'string' ? value === 'true' : value.type === 'Literal' && value.value === true;
      if (isTrue) {
        appendExpression(attribute.key);
      } else {
        appendExpression(`?${attribute.key}=${attributeValue(toOutputString(value))}`);
      }
    }
    for (const eventListener of this.eventListeners || []) {
      appendExpression(
          `@${eventListener.key}=${
              attributeValue(
                  toOutputString(eventListener.value),
                  )}`,
      );
    }
    if (this.widgetClass) {
      appendExpression(`.widgetConfig=\${widgetConfig(${sourceCode.getText(this.widgetClass)}`);
      if (this.bindings.length) {
        appendExpression(',');
        if (this.bindings.length === 1) {
          appendExpression(`{${this.bindings[0].key}: ${
              typeof this.bindings[0].value === 'string' ? this.bindings[0].value :
                                                           sourceCode.getText(this.bindings[0].value)}}`);
        } else {
          appendExpression('{');
          for (const binding of this.bindings) {
            appendExpression(`${binding.key}: ${
                typeof binding.value === 'string' ? binding.value : sourceCode.getText(binding.value)},`);
          }
          appendExpression('}');
        }
      }
      appendExpression(')}');
    } else {
      for (const binding of this.bindings || []) {
        appendExpression(
            `.${binding.key}=${
                toOutputString(
                    binding.value,
                    /* quoteLiterals=*/ true,
                    )}`,
        );
      }
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

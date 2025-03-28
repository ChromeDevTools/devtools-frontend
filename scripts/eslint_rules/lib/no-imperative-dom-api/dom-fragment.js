// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @fileoverview A library to associate DOM fragments with their construction code.
 */
'use strict';

const {getEnclosingProperty} = require('./ast.js');
const {ClassMember} = require('./class-member.js');

/** @typedef {import('estree').Node} Node */
/** @typedef {import('eslint').Rule.Node} EsLintNode */
/** @typedef {import('eslint').Scope.Variable} Variable */
/** @typedef {import('eslint').SourceCode} SourceCode */

/** @type {Map<EsLintNode|ClassMember|Variable, DomFragment>} */
const domFragments = new Map();

class DomFragment {
  /** @type {string|undefined} */ tagName;
  /** @type {Node[]} */ classList = [];
  /** @type {{key: string, value: Node|string}[]} */ attributes = [];
  /** @type {{key: string, value: Node}[]} */ style = [];
  /** @type {{key: string, value: Node}[]} */ eventListeners = [];
  /** @type {{key: string, value: Node|string}[]} */ bindings = [];
  /** @type {Node} */ textContent;
  /** @type {DomFragment[]} */ children = [];
  /** @type {DomFragment|undefined} */ parent;
  /** @type {string|undefined} */ expression;
  /** @type {EsLintNode|undefined} */ replacementLocation;
  /** @type {EsLintNode|undefined} */ initializer;
  /** @type {{node: EsLintNode, processed?: boolean}[]} */ references = [];

  /**
   * @param {Node} estreeNode
   * @param {SourceCode} sourceCode
   * @return {DomFragment}
   */
  static getOrCreate(estreeNode, sourceCode) {
    const node = /** @type {EsLintNode} */ (estreeNode);
    const key = getKey(node, sourceCode);

    let result = domFragments.get(key);
    if (!result) {
      result = new DomFragment();
      domFragments.set(key, result);
      if ('parent' in key) {
        result.expression = sourceCode.getText(node);
        result.references.push({node});
      } else if (key instanceof ClassMember) {
        result.replacementLocation = /** @type {EsLintNode} */ (key.classDeclaration);
        result.expression = sourceCode.getText(node);
      } else {
        result.references = key.references.filter(r => !key.identifiers.includes(r.identifier))
                                .map(r => ({node: /** @type {EsLintNode} */ (r.identifier)}));
        result.initializer = /** @type {EsLintNode} */ (key.identifiers[0]);
        result.replacementLocation = result.initializer.parent;
        result.expression = key.name;
      }
    }
    if (key instanceof ClassMember) {
      result.references = [...key.references].map(r => ({node: /** @type {EsLintNode} */ (r)}));
      result.initializer = /** @type {EsLintNode} */ (key.initializer);
    }
    return result;
  }

  static clear() {
    domFragments.clear();
  }

  static values() {
    return domFragments.values();
  }

  /** @return {string[]} */
  toTemplateLiteral(sourceCode, indent = 4) {
    if (this.expression && !this.tagName) {
      return [`\n${' '.repeat(indent)}`, '${', this.expression, '}'];
    }

    /**
     * @param {Node|string} node
     * @param {boolean} quoteLiterals
     * @return {string}
     */
    function toOutputString(node, quoteLiterals = false) {
      if (typeof node === 'string') {
        return node;
      }
      if (node.type === 'Literal' && !quoteLiterals) {
        return node.value.toString();
      }
      const text = sourceCode.getText(node);
      if (node.type === 'TemplateLiteral') {
        return text.substr(1, text.length - 2);
      }
      return '${' + text + '}';
    }

    /** @type {string[]} */ const components = [];
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
      appendExpression(`class="${this.classList.map(c => toOutputString(c)).join(' ')}"`);
    }
    for (const attribute of this.attributes || []) {
      appendExpression(`${attribute.key}=${attributeValue(toOutputString(attribute.value))}`);
    }
    for (const eventListener of this.eventListeners || []) {
      appendExpression(`@${eventListener.key}=${attributeValue(toOutputString(eventListener.value))}`);
    }
    for (const binding of this.bindings || []) {
      appendExpression(`.${binding.key}=${toOutputString(binding.value, /* quoteLiterals=*/ true)}`);
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
    } else if (this.children?.length) {
      for (const child of this.children || []) {
        components.push(...child.toTemplateLiteral(sourceCode, indent + 2));
      }
      components.push(`\n${' '.repeat(indent)}`);
    }
    components.push('</', this.tagName, '>');
    return components;
  }

  /**
   *  @param {Node} node
   *  @param {SourceCode} sourceCode
   */
  appendChild(node, sourceCode) {
    const child = DomFragment.getOrCreate(node, sourceCode);
    this.children.push(child);
    child.parent = this;
    for (const reference of child.references) {
      if (reference.node === node) {
        reference.processed = true;
      }
    }
    return child;
  }
}

/**
 * @param {Node} estreeNode
 * @param {SourceCode} sourceCode
 * @return {Variable|null}
 */
function getEnclosingVariable(estreeNode, sourceCode) {
  const node = /** @type {EsLintNode} */ (estreeNode);
  if (node.type === 'Identifier') {
    let scope = sourceCode.getScope(node);
    const variableName = node.name;
    while (scope) {
      const variable = scope.variables.find(v => v.name === variableName);
      if (variable) {
        return variable;
      }
      scope = scope.upper;
    }
  }
  if (node.parent.type === 'VariableDeclarator') {
    const variables = sourceCode.getDeclaredVariables(node.parent);
    if (variables.length > 1) {
      return null;  // Destructuring assignment
    }
    return variables[0];
  }
  return null;
}

/** @param {string} outputString */
function attributeValue(outputString) {
  if (outputString.startsWith('${') && outputString.endsWith('}')) {
    return outputString;
  }
  return '"' + outputString + '"';
}

/**
 * @param {EsLintNode} node
 * @param {SourceCode} sourceCode
 */
function getKey(node, sourceCode) {
  const variable = getEnclosingVariable(node, sourceCode);
  if (variable) {
    return variable;
  }
  const property = getEnclosingProperty(node);
  if (property) {
    return ClassMember.getOrCreate(property, sourceCode);
  }
  return node;
}

exports.DomFragment = DomFragment;

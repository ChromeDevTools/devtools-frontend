// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @fileoverview Rule to identify and templatize manually constructed DOM.
 *
 * To check types, run
 * $ npx tsc --noEmit --allowJS --checkJS --downlevelIteration scripts/eslint_rules/lib/no-imperative-dom-api.js
 */
'use strict';

function isIdentifier(node, name) {
  return node.type === 'Identifier' && (Array.isArray(name) ? name.includes(node.name) : node.name === name);
}

function getEnclosingExpression(node) {
  while (node.parent) {
    if (node.parent.type === 'BlockStatement') {
      return node;
    }
    node = node.parent;
  }
  return null;
}

function getEnclosingClassDeclaration(node) {
  let parent = node.parent;
  while (parent && parent.type !== 'ClassDeclaration') {
    parent = parent.parent;
  }
  return parent;
}

function attributeValue(outputString) {
  if (outputString.startsWith('${') && outputString.endsWith('}')) {
    return outputString;
  }
  return '"' + outputString + '"';
}

/** @typedef {import('eslint').Rule.Node} Node */
/** @typedef {import('eslint').AST.SourceLocation} SourceLocation */
/** @typedef {import('eslint').Scope.Variable} Variable */
/** @typedef {import('eslint').Scope.Reference} Reference*/
/** @typedef {{node: Node, processed?: boolean}} DomFragmentReference*/

class DomFragment {
  /** @type {string|undefined} */ tagName;
  /** @type {Node[]} */ classList = [];
  /** @type {{key: string, value: Node}[]} */ attributes = [];
  /** @type {{key: string, value: Node}[]} */ style = [];
  /** @type {{key: string, value: Node}[]} */ eventListeners = [];
  /** @type {Node} */ textContent;
  /** @type {DomFragment[]} */ children = [];
  /** @type {DomFragment|undefined} */ parent;
  /** @type {string|undefined} */ expression;
  /** @type {Node|undefined} */ replacementLocation;
  /** @type {DomFragmentReference[]} */ references = [];

  /** @return {string[]} */
  toTemplateLiteral(sourceCode, indent = 4) {
    if (this.expression && !this.tagName) {
      return [`\n${' '.repeat(indent)}`, '${', this.expression, '}'];
    }
    function toOutputString(node) {
      if (node.type === 'Literal') {
        return node.value;
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
      appendExpression(`class="${this.classList.map(toOutputString).join(' ')}"`);
    }
    for (const attribute of this.attributes || []) {
      appendExpression(`${attribute.key}=${attributeValue(toOutputString(attribute.value))}`);
    }
    for (const eventListener of this.eventListeners || []) {
      appendExpression(`@${eventListener.key}=${attributeValue(toOutputString(eventListener.value))}`);
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
}

module.exports = {
  meta : {
    type : 'problem',
    docs : {
      description : 'Prefer template literals over imperative DOM API calls',
      category : 'Possible Errors',
    },
    messages: {
      preferTemplateLiterals: 'Prefer template literals over imperative DOM API calls',
    },
    fixable : 'code',
    schema : []  // no options
  },
  create : function(context) {
    /** @type {Array<DomFragment>} */
    const queue = [];
    const sourceCode = context.getSourceCode();

    /** @type {Map<string, DomFragment>} */
    const domFragments = new Map();

    /**
     * @param {Node} node
     * @return {DomFragment}
     */
    function getOrCreateDomFragment(node) {
      const key = sourceCode.getText(node);

      let result = domFragments.get(key);
      if (!result) {
        result = new DomFragment();
        queue.push(result);
        domFragments.set(key, result);
        result.expression = sourceCode.getText(node);
        const classDeclaration = getEnclosingClassDeclaration(node);
        if (classDeclaration) {
          result.replacementLocation = classDeclaration;
        }
      }
      result.references.push({node});
      return result;
    }

    /**
     *  @param {DomFragmentReference} reference
     *  @param {DomFragment} domFragment
     */
    function processReference(reference, domFragment) {
      const parent = reference.node.parent;
      const isAccessed = parent.type === 'MemberExpression' && parent.object === reference.node;
      const property = isAccessed ? parent.property : null;
      const grandParent = parent.parent;
      const isPropertyAssignment =
          isAccessed && grandParent.type === 'AssignmentExpression' && grandParent.left === parent;
      const propertyValue = isPropertyAssignment ? /** @type {Node} */(grandParent.right) : null;
      const isMethodCall = isAccessed && grandParent.type === 'CallExpression' && grandParent.callee === parent;
      const firstArg = isMethodCall ?  /** @type {Node} */(grandParent.arguments[0]) : null;
      const secondArg = isMethodCall ? /** @type {Node} */(grandParent.arguments[1]) : null;
      const grandGrandParent = grandParent.parent;
      const isPropertyMethodCall = isAccessed && grandParent.type === 'MemberExpression' &&
          grandParent.object === parent && grandGrandParent.type === 'CallExpression' &&
          grandGrandParent.callee === grandParent;
      const propertyMethodArgument = isPropertyMethodCall ? /** @type {Node} */ (grandGrandParent.arguments[0]) : null;
      const isSubpropertyAssignment = isAccessed && grandParent.type === 'MemberExpression' &&
          grandParent.object === parent && grandParent.property.type === 'Identifier' &&
          grandGrandParent.type === 'AssignmentExpression' && grandGrandParent.left === grandParent;
      const subproperty =
          isSubpropertyAssignment && grandParent.property.type === 'Identifier' ? grandParent.property : null;
      const subpropertyValue = isSubpropertyAssignment ? /** @type {Node} */ (grandGrandParent.right) : null;
      reference.processed = true;
      if (isPropertyAssignment && isIdentifier(property, 'className')) {
        domFragment.classList.push(propertyValue);
      } else if (isPropertyAssignment && isIdentifier(property, 'textContent')) {
        domFragment.textContent = propertyValue;
      } else if (isMethodCall && isIdentifier(property, 'setAttribute')) {
        const attribute = firstArg;
        const value = secondArg;
        if (attribute.type === 'Literal' && value.type !== 'SpreadElement') {
          domFragment.attributes.push({key: attribute.value.toString(), value});
        }
      } else if (isMethodCall && isIdentifier(property, 'addEventListener')) {
        const event = firstArg;
        const value = secondArg;
        if (event.type === 'Literal' && value.type !== 'SpreadElement') {
          domFragment.eventListeners.push({key: event.value.toString(), value});
        }
      } else if (
          isPropertyMethodCall && isIdentifier(property, 'classList') && isIdentifier(grandParent.property, 'add')) {
        domFragment.classList.push(propertyMethodArgument);
      } else if (isSubpropertyAssignment && isIdentifier(property, 'style')) {
        const property = subproperty.name.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
        if (subpropertyValue.type !== 'SpreadElement') {
          domFragment.style.push({
            key: property,
            value: subpropertyValue,
          });
        }
      } else if (isMethodCall && isIdentifier(property, 'appendChild')) {
        const childFragment = getOrCreateDomFragment(firstArg);
        childFragment.parent = domFragment;
        domFragment.children.push(childFragment);
      } else {
        reference.processed = false;
      }
    }

    function maybeReportDomFragment(domFragment, key) {
      if (!domFragment.replacementLocation || domFragment.parent) {
        return;
      }
      context.report({
        node: domFragment.replacementLocation,
        messageId: 'preferTemplateLiterals',
        fix(fixer) {
          let replacementLocation = /** @type {Node} */(domFragment.replacementLocation);
          if (replacementLocation.parent.type === 'ExportNamedDeclaration') {
            replacementLocation = replacementLocation.parent;
          }
          const template = domFragment.toTemplateLiteral(sourceCode).join('');
          const text = `
export const DEFAULT_VIEW = (input, _output, target) => {
  render(html\`${template}\`,
    target, {host: input});
};

`;
          return [
            fixer.insertTextBefore(replacementLocation, text),
            ...domFragment.references.map(r => getEnclosingExpression(r.node)).filter(Boolean).map(r => {
              const range = r.range;
              while ([' ', '\n'].includes(sourceCode.text[range[0] - 1])) {
                range[0]--;
              }
              return fixer.removeRange(range);
            }),
          ];
        }
      });
    }

    return {
      MemberExpression(node) {
        if (node.object.type === 'ThisExpression' && isIdentifier(node.property, 'contentElement')) {
          const domFragment = getOrCreateDomFragment(node);
          domFragment.tagName = 'div';
        }
        if (isIdentifier(node.object, 'document') && isIdentifier(node.property, 'createElement')
            && node.parent.type === 'CallExpression' && node.parent.callee === node) {
          const domFragment = getOrCreateDomFragment(node.parent);
          if (node.parent.arguments.length >= 1 && node.parent.arguments[0].type === 'Literal') {
            domFragment.tagName = node.parent.arguments[0].value;
          }
        }
      },
      'Program:exit'() {
        while (queue.length) {
          const domFragment = queue.pop();
          for (const reference of domFragment.references) {
            processReference(reference, domFragment);
          }
          domFragment.references = domFragment.references.filter(r => r.processed);
        }

        for (const [key, domFragment] of domFragments.entries()) {
          maybeReportDomFragment(domFragment, key);
        }
        domFragments.clear();
      }
    };
  }
};

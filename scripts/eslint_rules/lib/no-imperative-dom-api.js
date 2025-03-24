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

function isMemberExpression(node, objectPredicate, propertyPredicate) {
  return node.type === 'MemberExpression' && objectPredicate(node.object) && propertyPredicate(node.property);
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
  /** @type {Node[]} */ references = [];

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

    /** @type {Map<string|Variable, DomFragment>} */
    const domFragments = new Map();

    /**
     * @param {Node} node
     * @return {DomFragment}
     */
    function getOrCreateDomFragment(node) {
      const variable = getEnclosingVariable(node);
      const key = variable ?? sourceCode.getText(node);

      let result = domFragments.get(key);
      if (!result) {
        result = new DomFragment();
        queue.push(result);
        domFragments.set(key, result);
        if (variable) {
          result.references = variable.references.map(r => (/** @type {Node} */ (r.identifier)));
          result.references.push(/** @type {Node} */ (variable.identifiers[0]));
        } else {
          result.expression = sourceCode.getText(node);
          const classDeclaration = getEnclosingClassDeclaration(node);
          if (classDeclaration) {
            result.replacementLocation = classDeclaration;
          }
        }
      }
      if (!variable) {
        result.references.push(node);
      }
      return result;
    }

    /**
     * @param {Node} node
     * @return {Variable|null}
     */
    function getEnclosingVariable(node) {
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

    /**
     * @param {Node} event
     * @return {string|null}
     */
    function getEvent(event) {
      switch (sourceCode.getText(event)) {
        case 'UI.Toolbar.ToolbarInput.Event.TEXT_CHANGED':
          return 'change';
        case 'UI.Toolbar.ToolbarInput.Event.ENTER_PRESSED':
          return 'submit';
        default:
          if (event.type === 'Literal') {
            return event.value.toString();
          }
          return null;
      }
    }

    /**
     *  @param {Node} reference
     *  @param {DomFragment} domFragment
     */
    function processReference(reference, domFragment) {
      const parent = reference.parent;
      const isAccessed = parent.type === 'MemberExpression' && parent.object === reference;
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
      if (isPropertyAssignment && isIdentifier(property, 'className')) {
        domFragment.classList.push(propertyValue);
      } else if (isPropertyAssignment && isIdentifier(property, ['textContent', 'innerHTML'])) {
        domFragment.textContent = propertyValue;
      } else if (
          isPropertyAssignment && domFragment.tagName === 'devtools-adorner' && isIdentifier(property, 'data') &&
          propertyValue.type === 'ObjectExpression') {
        for (const property of propertyValue.properties) {
          if (property.type !== 'Property') {
            continue;
          }
          if (isIdentifier(property.key, 'name')) {
            domFragment.attributes.push({
              key: 'aria-label',
              value: /** @type {Node} */ (property.value),
            });
          }
          if (isIdentifier(property.key, 'jslogContext')) {
            domFragment.attributes.push({
              key: 'jslog',
              value: /** @type {Node} */ (
                  {type: 'Literal', value: '${VisualLogging.adorner(' + sourceCode.getText(property.value) + ')}'})
            });
          }
          if (isIdentifier(property.key, 'content')) {
            const childFragment = getOrCreateDomFragment(/** @type {Node} */ (property.value));
            childFragment.parent = domFragment;
            domFragment.children.push(childFragment);
          }
        }
      } else if (isMethodCall && isIdentifier(property, 'setAttribute')) {
        const attribute = firstArg;
        const value = secondArg;
        if (attribute.type === 'Literal' && value.type !== 'SpreadElement') {
          domFragment.attributes.push({key: attribute.value.toString(), value});
        }
      } else if (isMethodCall && isIdentifier(property, 'addEventListener')) {
        const event = getEvent(firstArg);
        const value = secondArg;
        if (event && value.type !== 'SpreadElement') {
          domFragment.eventListeners.push({key: event, value});
        }
      } else if (isMethodCall && isIdentifier(property, 'appendToolbarItem')) {
        const childFragment = getOrCreateDomFragment(firstArg);
        childFragment.parent = domFragment;
        domFragment.children.push(childFragment);
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
      } else if (isMethodCall && isIdentifier(property, 'createChild')) {
        if (firstArg?.type === 'Literal') {
          const childFragment = getOrCreateDomFragment(grandParent);
          childFragment.tagName = String(firstArg.value);
          childFragment.parent = domFragment;
          domFragment.children.push(childFragment);
          if (secondArg) {
            childFragment.classList.push(secondArg);
          }
        }
      } else if (isMethodCall && isIdentifier(property, 'appendChild')) {
        const childFragment = getOrCreateDomFragment(firstArg);
        childFragment.parent = domFragment;
        domFragment.children.push(childFragment);
      }
    }

    /**
     * @param {DomFragment} domFragment
     */
    function getRangesToRemove(domFragment) {
      /** @type {[number, number][]} */
      const ranges = [];
      for (const reference of domFragment.references) {
        const expression = getEnclosingExpression(reference);
        if (!expression) {
          continue;
        }
        const range = expression.range;
        while ([' ', '\n'].includes(sourceCode.text[range[0] - 1])) {
          range[0]--;
        }
        ranges.push(range);
        for (const child of domFragment.children) {
          ranges.push(...getRangesToRemove(child));
        }
      }
      ranges.sort((a, b) => a[0] - b[0]);
      for (let i = 1; i < ranges.length; i++) {
        if (ranges[i][0] < ranges[i - 1][1]) {
          ranges[i] = [ranges[i - 1][1], ranges[i][1]];
        }
      }

      return ranges.filter(r => r[0] < r[1]);
    }

    /**
     * @param {DomFragment} domFragment
     */
    function maybeReportDomFragment(domFragment) {
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
            ...getRangesToRemove(domFragment).map(range => fixer.removeRange(range)),
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
      NewExpression(node) {
        if (isMemberExpression(
                node.callee, n => isMemberExpression(n, n => isIdentifier(n, 'UI'), n => isIdentifier(n, 'Toolbar')),
                n => isIdentifier(n, ['ToolbarFilter', 'ToolbarInput']))) {
          const domFragment = getOrCreateDomFragment(node);
          domFragment.tagName = 'devtools-toolbar-input';
          const type = isIdentifier(node.callee.property, 'ToolbarFilter') ? 'filter' : 'text';
          domFragment.attributes.push({
            key: 'type',
            value: /** @type {Node} */ ({type: 'Literal', value: type}),
          });
          const args = [...node.arguments];
          const placeholder = args.shift();
          if (placeholder && !isIdentifier(placeholder, 'undefined')) {
            domFragment.attributes.push({
              key: 'placeholder',
              value: placeholder,
            });
          }
          if (type === 'text') {
            const accesiblePlaceholder = args.shift();
            if (accesiblePlaceholder && !isIdentifier(accesiblePlaceholder, 'undefined')) {
              domFragment.attributes.push({
                key: 'aria-label',
                value: accesiblePlaceholder,
              });
            }
          }
          const flexGrow = args.shift();
          if (flexGrow && !isIdentifier(flexGrow, 'undefined')) {
            domFragment.style.push({
              key: 'flex-grow',
              value: flexGrow,
            });
          }
          const flexShrink = args.shift();
          if (flexShrink && !isIdentifier(flexShrink, 'undefined')) {
            domFragment.style.push({
              key: 'flex-shrink',
              value: flexShrink,
            });
          }
          const title = args.shift();
          if (title && !isIdentifier(title, 'undefined')) {
            domFragment.attributes.push({
              key: 'title',
              value: title,
            });
          }
          const completions = args.shift();
          if (completions && !isIdentifier(completions, 'undefined')) {
            domFragment.attributes.push({
              key: 'list',
              value: /** @type {Node} */ ({type: 'Literal', value: 'completions'}),
            });
            const dataList = getOrCreateDomFragment(completions);
            dataList.tagName = 'datalist';
            dataList.attributes.push({
              key: 'id',
              value: /** @type {Node} */ ({type: 'Literal', value: 'completions'}),
            });
            dataList.textContent = completions;
            domFragment.children.push(dataList);
            dataList.parent = domFragment;
          }
          args.shift();  // dynamicCompletions is not supported
          const jslogContext = args.shift();
          if (jslogContext && !isIdentifier(jslogContext, 'undefined')) {
            domFragment.attributes.push({
              key: 'id',
              value: jslogContext,
            });
          }
        }
        if (isMemberExpression(
                node.callee,
                n => isMemberExpression(n, n => isIdentifier(n, 'Adorners'), n => isIdentifier(n, 'Adorner')),
                n => isIdentifier(n, 'Adorner'))) {
          const domFragment = getOrCreateDomFragment(node);
          domFragment.tagName = 'devtools-adorner';
        }
      },
      'Program:exit'() {
        while (queue.length) {
          const domFragment = queue.pop();
          for (const reference of domFragment.references) {
            processReference(reference, domFragment);
          }
        }

        for (const domFragment of domFragments.values()) {
          maybeReportDomFragment(domFragment);
        }
        domFragments.clear();
      }
    };
  }
};

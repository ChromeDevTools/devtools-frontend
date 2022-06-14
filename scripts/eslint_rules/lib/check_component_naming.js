// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
'use strict';

module.exports = {
  meta: {
    type: 'problem',

    docs: {
      description: 'check license headers',
      category: 'Possible Errors',
    },
    fixable: 'code',
    schema: [],
    messages: {
      noStaticTagName: 'Found a component class that does not define a static litTagName property.',
      noTSInterface: 'Could not find the TS interface declaration for the component {{ tagName }}.',
      noDefineCall: 'Could not find a defineComponent() call for the component {{ tagName }}.',
      defineCallNonLiteral: 'defineComponent() first argument must be a string literal.',
      staticLiteralInvalid: 'static readonly litTagName must use a literal string, with no interpolation.',
      duplicateStaticLitTagName: 'found a duplicated litTagName: {{ tagName }}',
      litTagNameNotLiteral:
          'litTagName must be defined as a string passed in as LitHtml.literal`component-name`, but no tagged template was found.',
      staticLiteralNotReadonly: 'static litTagName must be readonly.'
    }
  },
  create: function(context) {
    function nodeIsHTMLElementClassDeclaration(node) {
      return node.type === 'ClassDeclaration' && node.superClass && node.superClass.name === 'HTMLElement';
    }

    function findAllComponentClassDefinitions(programNode) {
      const nodesWithClassDeclaration = programNode.body.filter(node => {
        if (node.type === 'ExportNamedDeclaration' && node.declaration) {
          return nodeIsHTMLElementClassDeclaration(node.declaration);
        }
        return nodeIsHTMLElementClassDeclaration(node);
      });

      return nodesWithClassDeclaration.map(node => {
        return node.type === 'ExportNamedDeclaration' ? node.declaration : node;
      });
    }

    function findComponentTagNameFromStaticProperty(classBodyNode) {
      return classBodyNode.body.find(node => {
        return node.type === 'PropertyDefinition' && node.key.name === 'litTagName';
      });
    }

    function findCustomElementsDefineComponentCalls(programNode) {
      return programNode.body.filter(node => {
        if (node.type !== 'ExpressionStatement') {
          return false;
        }

        if (!node.expression.callee) {
          return false;
        }

        if (node.expression.callee.property) {
          // matches ComponentHelpers.CustomElements.defineComponent()
          return node.expression.callee.property.name === 'defineComponent';
        }

        // matches defineComponent() which may have been destructured
        return node.expression.callee.name === 'defineComponent';
      });
    }

    function findTypeScriptDeclareGlobalHTMLInterfaceCalls(programNode) {
      const matchingNode = programNode.body.find(node => {
        // matches `declare global {}`
        const isGlobalCall = node.type === 'TSModuleDeclaration' && node.id.name === 'global';
        if (!isGlobalCall) {
          return false;
        }

        return node.body.body.find(node => {
          return node.type === 'TSInterfaceDeclaration' && node.id.name === 'HTMLElementTagNameMap';
        });
      });

      if (!matchingNode) {
        return [];
      }

      return matchingNode.body.body.filter(node => {
        return node.type === 'TSInterfaceDeclaration' && node.id.name === 'HTMLElementTagNameMap';
      });
    }

    // Map of litTagName to the class node.
    /** @type {Map<string, any}>} */
    const componentClassDefinitionLitTagNameNodes = new Map();

    /** @type {Set<string>} */
    const defineComponentCallsFound = new Set();

    /** @type {Set<string>} */
    const tsInterfaceExtendedEntriesFound = new Set();

    return {
      Program(node) {
        /* We allow there to be multiple components defined in one file.
         * Therefore, this rule gathers all nodes relating to the component
         * definition and then checks that for each class found that extends
         * HTMLElement, we have:
         * 1) the class with a static readonly litTagName
         * 2) The call to defineComponent
         * 3) The global interface extension
         * And that for each of those, the component name string (e.g. 'devtools-foo') is the same.
         */

        const componentClassDefinitions = findAllComponentClassDefinitions(node);
        if (componentClassDefinitions.length === 0) {
          // No components found, our work is done!
          return;
        }

        // Do some checks on the component classes and store the component names that we've found.
        for (const componentClassDefinition of componentClassDefinitions) {
          const componentTagNameNode = findComponentTagNameFromStaticProperty(componentClassDefinition.body);
          if (!componentTagNameNode) {
            context.report({node: componentClassDefinition, messageId: 'noStaticTagName'});
            return;
          }
          if (componentTagNameNode.value.type !== 'TaggedTemplateExpression') {
            // This means that the value is not LitHtml.literal``. Most likely
            // the user forgot to add LitHtml.literal and has defined the value
            // as a regular string.
            context.report({node: componentTagNameNode, messageId: 'litTagNameNotLiteral'});
            return;
          }
          if (componentTagNameNode.value.quasi.quasis.length > 1) {
            // This means that there's >1 template parts, which means they are
            // being split by an interpolated value, which is not allowed.
            context.report({node: componentTagNameNode, messageId: 'staticLiteralInvalid'});
            return;
          }

          // Enforce that the property is declared as readonly (static readonly litTagName = ...)
          if (!componentTagNameNode.readonly) {
            context.report({node: componentTagNameNode, messageId: 'staticLiteralNotReadonly'});
            return;
          }

          // Grab the name of the component, e.g:
          // LitHtml.literal`devtools-foo` will pull "devtools-foo" out.
          const componentTagName = componentTagNameNode.value.quasi.quasis[0].value.cooked;

          // Now we ensure that we haven't found this tag name before. If we
          // have, we have two components with the same litTagName property,
          // which is an error.
          if (componentClassDefinitionLitTagNameNodes.has(componentTagName)) {
            context.report({node: componentClassDefinition, messageId: 'duplicateStaticLitTagName', data: {tagName: componentTagName}});
          }

          componentClassDefinitionLitTagNameNodes.set(componentTagName, componentClassDefinition);
        }

        // Find all defineComponent() calls and store the arguments to them.

        // Now find the CustomElements.defineComponent() line
        const customElementsDefineCalls = findCustomElementsDefineComponentCalls(node);
        for (const customElementsDefineCall of customElementsDefineCalls) {
          const firstArgumentToDefineCall = customElementsDefineCall.expression.arguments[0];
          if (!firstArgumentToDefineCall || firstArgumentToDefineCall.type !== 'Literal') {
            context.report({
              node: customElementsDefineCall,
              messageId: 'defineCallNonLiteral',
            });
            return;
          }
          const tagNamePassedToDefineCall = firstArgumentToDefineCall.value;
          defineComponentCallsFound.add(tagNamePassedToDefineCall);
        }
        const allTSDeclareGlobalInterfaceCalls = findTypeScriptDeclareGlobalHTMLInterfaceCalls(node);

        for (const interfaceDeclaration of allTSDeclareGlobalInterfaceCalls) {
          for (const node of interfaceDeclaration.body.body) {
            if (node.type === 'TSPropertySignature') {
              tsInterfaceExtendedEntriesFound.add(node.key.value);
            }
          }
        }

        for (const [tagName, classNode] of componentClassDefinitionLitTagNameNodes) {
          // Check that each tagName has a matching entry in both other places we expect it.
          if (!defineComponentCallsFound.has(tagName)) {
            context.report({node: classNode, messageId: 'noDefineCall', data: {tagName}});
          }
          if (!tsInterfaceExtendedEntriesFound.has(tagName)) {
            context.report({node: classNode, messageId: 'noTSInterface', data: {tagName}});
          }
        }

        // if we got here, everything is valid and the name is correct in all three locations
      }
    };
  }
};

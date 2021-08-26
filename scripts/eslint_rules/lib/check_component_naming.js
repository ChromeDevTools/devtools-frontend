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
      nonMatchingTagName:
          'Found inconsistent tag names in the component definition. Make sure the static litTagName, the tag in the defineComponent() call and the TS interface key are all identical.',
      noStaticTagName: 'Found a component class that does not define a static litTagName property.',
      noTSInterface: 'Could not find the TS interface declaration for the component.',
      noDefineCall: 'Could not find a defineComponent() call for the component.',
      defineCallNonLiteral: 'defineComponent() first argument must be a string literal.',
      staticLiteralInvalid: 'static readonly litTagName must use a literal string, with no interpolation.',
      litTagNameNotLiteral:
          'litTagName must be defined as a string passed in as LitHtml.literal`component-name`, but no tagged template was found.',
      staticLiteralNotReadonly: 'static litTagName must be readonly.'
    }
  },
  create: function(context) {
    function nodeIsHTMLElementClassDeclaration(node) {
      return node.type === 'ClassDeclaration' && node.superClass && node.superClass.name === 'HTMLElement';
    }

    function findComponentClassDefinition(programNode) {
      const nodeWithClassDeclaration = programNode.body.find(node => {
        if (node.type === 'ExportNamedDeclaration' && node.declaration) {
          return nodeIsHTMLElementClassDeclaration(node.declaration);
        }
        return nodeIsHTMLElementClassDeclaration(node);
      });

      if (!nodeWithClassDeclaration) {
        return null;
      }

      return nodeWithClassDeclaration.type === 'ExportNamedDeclaration' ? nodeWithClassDeclaration.declaration :
                                                                          nodeWithClassDeclaration;
    }

    function findComponentTagNameFromStaticProperty(classBodyNode) {
      return classBodyNode.body.find(node => {
        return node.type === 'ClassProperty' && node.key.name === 'litTagName';
      });
    }

    function findCustomElementsDefineComponentCall(programNode) {
      return programNode.body.find(node => {
        if (node.type !== 'ExpressionStatement') {
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

    function findTypeScriptDeclareGlobalHTMLInterfaceCall(programNode) {
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
        return undefined;
      }

      return matchingNode.body.body.find(node => {
        return node.type === 'TSInterfaceDeclaration' && node.id.name === 'HTMLElementTagNameMap';
      });
    }

    return {
      Program(node) {
        const componentClassDefinition = findComponentClassDefinition(node);
        if (!componentClassDefinition) {
          return;
        }

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

        // Now find the CustomElements.defineComponent() line
        const customElementsDefineCall = findCustomElementsDefineComponentCall(node);
        if (!customElementsDefineCall) {
          context.report({node, messageId: 'noDefineCall'});
          return;
        }

        const firstArgumentToDefineCall = customElementsDefineCall.expression.arguments[0];
        if (!firstArgumentToDefineCall || firstArgumentToDefineCall.type !== 'Literal') {
          context.report({
            node: customElementsDefineCall,
            messageId: 'defineCallNonLiteral',
          });
          return;
        }
        const tagNamePassedToDefineCall = firstArgumentToDefineCall.value;

        if (tagNamePassedToDefineCall !== componentTagName) {
          context.report({node: customElementsDefineCall, messageId: 'nonMatchingTagName'});
          return;
        }

        const typeScriptInterfaceDeclare = findTypeScriptDeclareGlobalHTMLInterfaceCall(node);
        if (!typeScriptInterfaceDeclare) {
          context.report({
            node,
            messageId: 'noTSInterface',
          });
          return;
        }
        const keyForComponent = typeScriptInterfaceDeclare.body.body.find(node => {
          // Find the declaration line for the component tag name.
          return node.type === 'TSPropertySignature' && node.key.value === componentTagName;
        });
        // If we didn't find it, that means it's either not there or it's there
        // but doesn't have the right name, so error.
        if (!keyForComponent) {
          context.report({node: typeScriptInterfaceDeclare, messageId: 'nonMatchingTagName'});
          return;
        }

        // if we got here, everything is valid and the name is correct in all three locations
      }
    };
  }
};

// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type {TSESTree} from '@typescript-eslint/utils';

import {createRule} from './utils/ruleCreator.ts';

function hasPublicMethodForUnderscoredProperty(node: TSESTree.PropertyDefinition|TSESTree.MethodDefinition) {
  if (node.key.type !== 'Identifier') {
    return false;
  }
  const nodeName = node.key.name;
  // We allow a property to start with an underscore if the class defines a public getter without an underscore.
  const methodsDeclared = node.parent.body.filter(item => item.type === 'MethodDefinition');
  const hasMethodDeclaredWithNonUnderscoredName = methodsDeclared.find(method => {
    if (method.key.type !== 'Identifier') {
      return false;
    }
    const methodName = method.key.name;
    return nodeName.slice(1) === methodName;
  });
  return hasMethodDeclaredWithNonUnderscoredName;
}

export default createRule({
  name: 'no-underscored-properties',
  meta: {
    type: 'problem',
    docs: {
      description: 'enforce that class properties and methods do not start with an underscore',
      category: 'Possible Errors',
    },
    messages: {
      underscorePrefix: 'Class {{typeOfNode}} {{propName}} should not begin with an underscore.',
    },
    fixable: 'code',
    schema: []  // no options
  },
  defaultOptions: [],
  create: function(context) {
    function checkNodeForUnderscoredProperties(
        node: TSESTree.PropertyDefinition|TSESTree.MethodDefinition, typeOfNode: string) {
      if (node.key.type !== 'Identifier') {
        return;
      }

      const nodeName = node.key.name;
      if (!nodeName.startsWith('_')) {
        return;
      }

      // We allow a property to start with an underscore if the class defines a public getter without an underscore.
      if (hasPublicMethodForUnderscoredProperty(node)) {
        return;
      }

      context.report({
        node,
        data: {propName: nodeName, typeOfNode},
        messageId: 'underscorePrefix',
      });
    }

    return {
      PropertyDefinition(node) {
        checkNodeForUnderscoredProperties(node, 'property');
      },
      MethodDefinition(node) {
        if (node.parent.type !== 'ClassBody') {
          // We only want to check method declarations within classes.
          return;
        }
        checkNodeForUnderscoredProperties(node, 'method');
      }
    };
  }
});

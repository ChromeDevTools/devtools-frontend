// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

function hasPublicMethodForUnderscoredProperty(node) {
  const nodeName = node.key.name;
  // We allow a property to start with an underscore if the class defines a public getter without an underscore.
  const methodsDeclared =
      node.parent.body.filter(item => item.type === 'MethodDefinition' && item.key.type === 'Identifier');
  const hasMethodDeclaredWithNonUnderscoredName = methodsDeclared.find(method => {
    const methodName = method.key.name;
    return (nodeName.slice(1) === methodName);
  });
  return hasMethodDeclaredWithNonUnderscoredName;
}
function checkNodeForUnderscoredProperties(context, node, typeOfNode) {
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
    message: 'Class {{typeOfNode}} {{propName}} should not begin with an underscore.'
  });
}
module.exports = {
  meta: {
    type: 'problem',

    docs: {
      description: 'enforce that class properties and methods do not start with an underscore',
      category: 'Possible Errors',
    },
    fixable: 'code',
    schema: []  // no options
  },
  create: function(context) {
    return {
      PropertyDefinition(node) {
        checkNodeForUnderscoredProperties(context, node, 'property');
      },
      MethodDefinition(node) {
        if (node.parent.type !== 'ClassBody') {
          // We only want to check method declarations within classes.
          return;
        }
        checkNodeForUnderscoredProperties(context, node, 'method');
      }
    };
  }
};

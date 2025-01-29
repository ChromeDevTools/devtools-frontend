// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @type {import('eslint').Rule.RuleModule}
 */
module.exports = {
  meta: {
    type: 'problem',

    docs: {
      description: 'Usage of Lit.html',
      category: 'Possible Errors',
    },
    fixable: 'code',
    schema: []  // no options
  },
  create: function(context) {
    const sourceCode = context.sourceCode ?? context.getSourceCode();
    let lastImport = null;
    let shortandDefined = false;
    return {
      ImportDeclaration(node) {
        lastImport = node;
      },
      VariableDeclarator(node) {
        if ((sourceCode.getScope ? sourceCode.getScope(node) : context.getScope()).type !== 'module') {
          return;
        }
        if (node.id.name === 'html') {
          shortandDefined = true;
        }
        for (const property of node.id.properties || []) {
          if (property.key.name === 'html') {
            shortandDefined = true;
          }
        }
      },
      TaggedTemplateExpression(node) {
        const tag = node.tag;
        if (tag.type === 'MemberExpression' && tag.object.name === 'Lit' && tag.property.name === 'html') {
          context.report({
            node,
            message: 'Use unqualified html tagged template for compatibility with lit-analyzer',
            fix(fixer) {
              const result = [fixer.removeRange([tag.object.range[0], tag.property.range[0]])];
              if (lastImport && !shortandDefined) {
                result.push(fixer.insertTextAfter(lastImport, '\n\nconst {html} = Lit;'));
                shortandDefined = true;
              }
              return result;
            }
          });
        }
      }
    };
  }
};

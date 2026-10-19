// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {AST_NODE_TYPES, type TSESLint, type TSESTree} from '@typescript-eslint/utils';

import {createRule} from './utils/ruleCreator.ts';

type PrivateMemberNode =|TSESTree.MethodDefinition|TSESTree.PropertyDefinition|TSESTree.AccessorProperty;

export default createRule({
  name: 'prefer-private-class-members',
  meta: {
    type: 'problem',
    docs: {
      description: 'Prefer private properties over regular properties with `private` modifier',
      category: 'Possible Errors',
    },
    fixable: 'code',
    schema: [],  // no options
    messages: {
      doNotUsePrivate: 'Use private properties (starting with `#`) rather than the `private` modifier.',
    },
  },
  defaultOptions: [],
  create: function(context) {
    const sourceCode = context.sourceCode;

    function buildAutofix(node: PrivateMemberNode): TSESLint.ReportFixFunction|undefined {
      if (node.computed || node.key.type !== AST_NODE_TYPES.Identifier || node.override || node.decorators.length > 0) {
        return undefined;
      }
      if (node.parent.type !== AST_NODE_TYPES.ClassBody) {
        return undefined;
      }

      const classBody = node.parent;
      const classNode = classBody.parent;
      const memberName = node.key.name;

      // Find the `private` keyword token before the member key.
      const tokensBeforeKey = sourceCode.getTokensBefore(node.key, {
        filter: token => token.range[0] >= node.range[0],
      });
      const privateToken = tokensBeforeKey.find(token => token.type === 'Keyword' && token.value === 'private' ||
                                                    token.type === 'Identifier' && token.value === 'private');
      if (!privateToken) {
        return undefined;
      }

      // Check for duplicate declarations (e.g. overloaded methods or getter+setter pairs).
      const matchingMembers = classBody.body.filter(element => {
        if ((element.type === AST_NODE_TYPES.MethodDefinition || element.type === AST_NODE_TYPES.PropertyDefinition ||
             element.type === AST_NODE_TYPES.AccessorProperty) &&
            !element.computed) {
          if (element.key.type === AST_NODE_TYPES.Identifier && element.key.name === memberName) {
            return true;
          }
          if (element.key.type === AST_NODE_TYPES.PrivateIdentifier && element.key.name === memberName) {
            return true;
          }
        }
        return false;
      });
      if (matchingMembers.length !== 1) {
        return undefined;
      }

      const memberFixes: TSESTree.Identifier[] = [];
      let isSafe = true;

      function visit(current: TSESTree.Node, inStaticContext = false, inReboundThis = false): void {
        if (!isSafe) {
          return;
        }
        // Do not descend into nested classes; if a nested class references the member, bail out of autofix.
        if (current !== classNode &&
            (current.type === AST_NODE_TYPES.ClassDeclaration || current.type === AST_NODE_TYPES.ClassExpression)) {
          const text = sourceCode.getText(current);
          if (text.includes(memberName)) {
            isSafe = false;
          }
          return;
        }

        if (current.parent === classBody) {
          if (current.type === AST_NODE_TYPES.StaticBlock) {
            inStaticContext = true;
          } else if (current.type === AST_NODE_TYPES.MethodDefinition ||
                     current.type === AST_NODE_TYPES.PropertyDefinition ||
                     current.type === AST_NODE_TYPES.AccessorProperty) {
            inStaticContext = current.static;
          }
        }

        if (current.type === AST_NODE_TYPES.FunctionDeclaration ||
            (current.type === AST_NODE_TYPES.FunctionExpression &&
             !(current.parent.type === AST_NODE_TYPES.MethodDefinition && current.parent.parent === classBody))) {
          inReboundThis = true;
        }

        if (current.type === AST_NODE_TYPES.ObjectPattern) {
          for (const prop of current.properties) {
            if (prop.type === AST_NODE_TYPES.Property) {
              if ((!prop.computed && prop.key.type === AST_NODE_TYPES.Identifier && prop.key.name === memberName) ||
                  (prop.computed && prop.key.type === AST_NODE_TYPES.Literal && prop.key.value === memberName)) {
                isSafe = false;
                return;
              }
            }
          }
        }

        if (current.type === AST_NODE_TYPES.MemberExpression) {
          if (current.computed) {
            if (current.property.type === AST_NODE_TYPES.Literal && current.property.value === memberName) {
              isSafe = false;
              return;
            }
          } else if (current.property.type === AST_NODE_TYPES.Identifier && current.property.name === memberName) {
            if (current.parent.type === AST_NODE_TYPES.UnaryExpression && current.parent.operator === 'delete') {
              isSafe = false;
              return;
            }
            const isValidThis = !inReboundThis && current.object.type === AST_NODE_TYPES.ThisExpression &&
                Boolean(node.static) === Boolean(inStaticContext);
            const isValidStaticClassRef = Boolean(node.static) && current.object.type === AST_NODE_TYPES.Identifier &&
                (classNode.type === AST_NODE_TYPES.ClassDeclaration ||
                 classNode.type === AST_NODE_TYPES.ClassExpression) &&
                classNode.id?.name === current.object.name;
            if (isValidThis || isValidStaticClassRef) {
              memberFixes.push(current.property);
            } else {
              // Cross-instance, mismatched static/instance `this`, rebound `this`, or external object property access.
              isSafe = false;
              return;
            }
          }
        }

        if (current.type === AST_NODE_TYPES.TSQualifiedName) {
          if (current.right.type === AST_NODE_TYPES.Identifier && current.right.name === memberName) {
            isSafe = false;
            return;
          }
        }

        if (current.type === AST_NODE_TYPES.BinaryExpression && current.operator === 'in' &&
            current.left.type === AST_NODE_TYPES.Literal && current.left.value === memberName) {
          isSafe = false;
          return;
        }

        for (const key of sourceCode.visitorKeys[current.type] ?? []) {
          const child = (current as unknown as Record<string, TSESTree.Node|TSESTree.Node[]|null|undefined>)[key];
          if (Array.isArray(child)) {
            for (const item of child) {
              if (item && typeof item.type === 'string') {
                visit(item, inStaticContext, inReboundThis);
              }
            }
          } else if (child && typeof child.type === 'string') {
            visit(child, inStaticContext, inReboundThis);
          }
        }
      }

      visit(classBody);
      if (!isSafe) {
        return undefined;
      }

      return fixer => {
        const fixes: TSESLint.RuleFix[] = [];
        const nextToken = sourceCode.getTokenAfter(privateToken, {includeComments: true});
        const removeEnd =
            nextToken && nextToken.range[0] > privateToken.range[1] ? nextToken.range[0] : privateToken.range[1];
        fixes.push(fixer.removeRange([privateToken.range[0], removeEnd]));
        fixes.push(fixer.insertTextBefore(node.key, '#'));
        for (const prop of memberFixes) {
          fixes.push(fixer.insertTextBefore(prop, '#'));
        }
        return fixes;
      };
    }

    function checkMember(node: PrivateMemberNode): void {
      if (node.type === AST_NODE_TYPES.MethodDefinition && node.kind === 'constructor') {
        return;
      }
      if (node.accessibility === 'private') {
        context.report({
          node: node.key,
          messageId: 'doNotUsePrivate',
          fix: buildAutofix(node),
        });
      }
    }

    return {
      MethodDefinition(node) {
        checkMember(node);
      },
      PropertyDefinition(node) {
        checkMember(node);
      },
      AccessorProperty(node) {
        checkMember(node);
      },
    };
  },
});

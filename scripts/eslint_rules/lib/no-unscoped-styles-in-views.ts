// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @file Rule to identify `<style>` usages without wrapping them in `UI.Widget.widgetScoped` in view functions.
 */
import type {TSESTree} from '@typescript-eslint/utils';

import {isLitHtmlRenderCall, isLitHtmlTemplateCall, isViewFunction} from './utils/lit.ts';
import {createRule} from './utils/ruleCreator.ts';
import {isWidgetScopedCall} from './utils/stylingHelpers.ts';

type CallExpression = TSESTree.CallExpression;

function containsMeaningfulCss(text: string): boolean {
  const noComments = text.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
  const noWhitespace = noComments.trim();
  return noWhitespace.length > 0;
}

export default createRule({
  name: 'no-unscoped-styles-in-views',
  meta: {
    type: 'problem',
    docs: {
      description: 'Enforce UI.Widget.widgetScoped for <style> tags within Lit HTML templates in view functions',
      category: 'Best Practices',
    },
    messages: {
      styleTagMissingWidgetScoped: 'Styles within <style> tags in view functions must use UI.Widget.widgetScoped.',
    },
    schema: [],
  },
  defaultOptions: [],
  create: function(context) {
    return {
      CallExpression(node: CallExpression) {
        // 1. Check if this is a `Lit.render` call.
        if (!isLitHtmlRenderCall(node)) {
          return;
        }

        // 2. Check that the first argument is an `html` template literal.
        const htmlTemplateArg = node.arguments[0];
        if (!htmlTemplateArg || !isLitHtmlTemplateCall(htmlTemplateArg)) {
          return;
        }

        // 3. Find the enclosing function and check if it's a "view function".
        let functionAncestor: TSESTree.Node|undefined = node.parent;
        while (
            functionAncestor &&
            !['FunctionDeclaration', 'FunctionExpression', 'ArrowFunctionExpression'].includes(functionAncestor.type)) {
          functionAncestor = functionAncestor.parent;
        }

        if (!functionAncestor || !isViewFunction(functionAncestor)) {
          return;
        }

        // 4. Analyze the template literal for unscoped styles.
        const {quasis, expressions} = htmlTemplateArg.quasi;
        let inStyleTag = false;
        let hasReportedForBlock = false;

        for (let i = 0; i < quasis.length; i++) {
          const quasi = quasis[i];
          let quasiText = quasi.value.raw;

          // A single static block (quasi) can contain multiple tags or parts of tags.
          while (quasiText.length > 0) {
            if (inStyleTag) {
              const endTagIndex = quasiText.indexOf('</style>');
              if (endTagIndex === -1) {
                // The style tag does not close in this static block.
                // If it contains meaningful CSS, it's an unscoped static style.
                if (!hasReportedForBlock && containsMeaningfulCss(quasiText)) {
                  context.report({node: quasi, messageId: 'styleTagMissingWidgetScoped'});
                  hasReportedForBlock = true;
                }
                quasiText = '';  // The rest of the text is consumed.
              } else {
                // The style tag closes here. Check the content before it.
                const styleContent = quasiText.substring(0, endTagIndex);
                if (!hasReportedForBlock && containsMeaningfulCss(styleContent)) {
                  context.report({node: quasi, messageId: 'styleTagMissingWidgetScoped'});
                  hasReportedForBlock = true;
                }
                // We are now outside a style tag. Reset state for the next potential block.
                inStyleTag = false;
                hasReportedForBlock = false;
                quasiText = quasiText.substring(endTagIndex + '</style>'.length);
              }
            } else {
              // We are not in a style tag; look for the next opening tag.
              const startTagMatch = quasiText.match(/<style(?:\s[^>]*)?>/);
              if (!startTagMatch) {
                quasiText = '';  // No more style tags in this static block.
              } else {
                // Found a new style tag. Enter style mode and reset the report flag.
                inStyleTag = true;
                hasReportedForBlock = false;
                // Continue processing from *after* the opening tag.
                quasiText = quasiText.substring((startTagMatch.index as number) + startTagMatch[0].length);
              }
            }
          }

          // After processing a static part, check the dynamic expression that follows.
          const expression = expressions[i];
          if (expression && inStyleTag) {
            if (!isWidgetScopedCall(expression)) {
              // This is a dynamic expression inside a style tag that is not a widgetScoped call.
              if (!hasReportedForBlock) {
                context.report({node: expression, messageId: 'styleTagMissingWidgetScoped'});
                hasReportedForBlock = true;
              }
            }
          }
        }
      },
    };
  }
});

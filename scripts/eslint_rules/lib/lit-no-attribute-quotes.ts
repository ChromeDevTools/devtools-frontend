// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import type {TSESLint, TSESTree} from '@typescript-eslint/utils';

import {isLitHtmlTemplateCall} from './utils/lit.ts';
import {createRule} from './utils/ruleCreator.ts';

// Define types based on TSESTree
type TemplateElement = TSESTree.TemplateElement;
type RuleFixer = TSESLint.RuleFixer;
type RuleFix = TSESLint.RuleFix;  // Type for individual fixes

// Define MessageIds used in the rule
type MessageIds = 'attributeQuotesNotRequired';

function templateElementPartStartsWithDoubleQuote(templateElementPartNode: TemplateElement): boolean {
  return templateElementPartNode.value.raw.startsWith('"');
}
function templateElementPartEndsWithEqualsDoubleQuote(templateElementPartNode: TemplateElement): boolean {
  return templateElementPartNode.value.raw.endsWith('="');
}

interface RemoveQuotesParams {
  fixer: RuleFixer;
  firstPart: TemplateElement;
  secondPart: TemplateElement;
}

// Return type is an array of fixes or potentially null/empty if ranges are invalid
function removeQuotesFromAttribute({fixer, firstPart, secondPart}: RemoveQuotesParams): RuleFix[]|null {
  const [, rangeOfOpeningTemplatePartEnd] = firstPart.range;
  // From the first part, we need to remove the last character, which is the double quote.
  // We can do this by fetching the range of the node (range = start and end position on the line)
  // However, for the template part with the opening quote, the range will also contain the ${ of the interpolation:
  // <p class="${
  // ^^^^^^^^^^^^ this is the text covered by the [start, end] range.
  // So what we need to do is remove the quote, and leave the last two characters alone.
  // Therefore we remove the third character back from the end, and only remove a single character, leaving the ${ part alone.
  const startingQuoteRangeToRemove: [number, number] =
      [rangeOfOpeningTemplatePartEnd - 3, rangeOfOpeningTemplatePartEnd - 2];

  const [rangeOfClosingTemplatePartStart] = secondPart.range;
  // It's a similar story for the second part where the range includes the }:
  // }">foo</p>
  // ^^^^^^^^^^ this is the range
  // So therefore we get the start of the range, and add one to it, to dodge the } character, and then remove only the quote.
  const endingQuoteRangeToRemove: [number, number] =
      [rangeOfClosingTemplatePartStart + 1, rangeOfClosingTemplatePartStart + 2];

  return [fixer.removeRange(startingQuoteRangeToRemove), fixer.removeRange(endingQuoteRangeToRemove)];
}

export default createRule<[], MessageIds>({
  name: 'lit-no-attribute-quotes',
  meta: {
    type: 'problem',

    docs: {
      description: 'ensure no extra quotes around attributes when the value is interpolated',
      category: 'Possible Errors',
    },
    fixable: 'code',
    messages: {
      attributeQuotesNotRequired:
          'When interpolating a value as an attribute in Lit you do not need double quotes around it.',
    },
    schema: []
  },
  defaultOptions: [],
  create: function(context) {
    return {
      TaggedTemplateExpression(node) {
        if (!isLitHtmlTemplateCall(node)) {
          return;
        }

        // quasis here = the static parts of a template expression
        // expressions = the dynamic parts of a template expression
        // For example, given: <p class="${foo}"> we will have:
        // quasis: ['<p class="', '">']
        // expressions: ['foo'] (it's actually an AST node representing ${foo})
        // So what we do is walk through and look for quasi pairs where:
        // 1. the first ends with ="
        // 2. the second begins with "
        // We can then be confident that we have found an attribute with quotes around it.
        node.quasi.quasis.forEach((templateElement, index) => {
          if (templateElementPartEndsWithEqualsDoubleQuote(templateElement)) {
            const nextElement = node.quasi.quasis[index + 1];
            if (nextElement && templateElementPartStartsWithDoubleQuote(nextElement)) {
              const expressionBetweenTheParts = node.quasi.expressions?.[index];
              if (expressionBetweenTheParts) {
                context.report({
                  node: expressionBetweenTheParts,
                  messageId: 'attributeQuotesNotRequired',
                  fix(fixer) {
                    return removeQuotesFromAttribute({
                      fixer,
                      firstPart: templateElement,
                      secondPart: nextElement,
                    });
                  }
                });
              }
            }
          }
        });
      },
    };
  }
});

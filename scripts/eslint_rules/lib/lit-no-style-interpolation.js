// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
'use strict';

const {isLitHtmlTemplateCall} = require('./utils.js');

function countOccurencesOfSubstring(string, subString) {
  let count = 0;
  let i = string.indexOf(subString);
  while (i > -1) {
    count++;
    i = string.indexOf(subString, i + 1);
  }

  return count;
}

function nodeHasStyleTagsWithInterpolation(taggedTemplateExpression) {
  const STYLE_START = '<style>';
  const STYLE_END = '</style>';

  const templateParts = taggedTemplateExpression.quasi.quasis;
  for (const part of templateParts) {
    const valueOfPart = part.value.raw;
    /**
     * We take the tagged template part and look for the same number of opening
     * <style> blocks as there are closing ones. This might seem like overkill
     * but consider this LitHtml call:
     * LitHtml.html`<style>div{}</style><style>p * { color: ${RED}; }</style>`
     *
     * Whose first template part in the AST is:
     * "<style>div{}</style><style>"
     *
     * If we base our check just on having a
     * <style> and a </style> tag, this code will pass, because the first part
     * does have those. We need to make sure the amount of opening and closing
     * <style> tags lines up.
     *
     */
    const styleOpeningTagCount = countOccurencesOfSubstring(valueOfPart, STYLE_START);
    const styleClosingTagCount = countOccurencesOfSubstring(valueOfPart, STYLE_END);

    if (styleClosingTagCount !== styleOpeningTagCount) {
      return true;
    }
  }
  return false;
}

module.exports = {
  meta: {
    type: 'problem',

    docs: {
      description: 'ensure no interpolation in Lit style tags',
      category: 'Possible Errors',
    },
    fixable: 'code',
    schema: []  // no options
  },
  create: function(context) {
    return {
      TaggedTemplateExpression(node) {
        const isLitHtmlCall = isLitHtmlTemplateCall(node);
        if (!isLitHtmlCall) {
          return;
        }

        if (nodeHasStyleTagsWithInterpolation(node)) {
          context.report({
            node,
            message:
                '<style> tag must not have data interpolated into it. Use CSS custom properties if you need to share data between CSS and JS in a component.'
          });
        }
      },
    };
  }
};

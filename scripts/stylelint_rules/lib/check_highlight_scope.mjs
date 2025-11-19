// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import stylelint from 'stylelint';

const {
  createPlugin,
  utils: { report, ruleMessages },
} = stylelint;

const RULE_NAME = 'plugin/check_highlight_scope';

const messages = ruleMessages(RULE_NAME, {
  expected: selector =>
    `::highlight not be scoped in "${selector}". Observed performance regressions (https://crbug.com/461462682).`,
});

const ruleFunction = () => {
  return function (postcssRoot, postcssResult) {
    postcssRoot.walkRules(rule => {
      rule.selectors.forEach(selector => {
        const normalizedSelector = selector.trim();

        if (!normalizedSelector.includes('::highlight(')) {
          return;
        }

        // Regex: Matches ::highlight if it is at the start of the string (^)
        // OR if it is preceded by a combinator (space, >, +, ~).
        // This bans: "::highlight", "div > ::highlight", "div ::highlight"
        // This allows: "div::highlight", ":host::highlight"
        const isUnattached = /(?:^|[\s>+~])::highlight\(/.test(
          normalizedSelector,
        );

        if (isUnattached) {
          report({
            message: messages.expected(normalizedSelector),
            ruleName: RULE_NAME,
            node: rule,
            result: postcssResult,
            word: selector,
          });
        }
      });
    });
  };
};

ruleFunction.ruleName = RULE_NAME;
ruleFunction.messages = messages;

export default createPlugin(RULE_NAME, ruleFunction);

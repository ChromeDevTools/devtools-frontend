// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import stylelint from 'stylelint';

const {
  createPlugin,
  utils: { report, ruleMessages },
} = stylelint;

const RULE_NAME = 'plugin/use_monospace_font';

const messages = ruleMessages(RULE_NAME, {
  expected: () =>
    'Expected "font-family: var(--monospace-font-family)" instead of "font-family: monospace". Provided for test screenshots consistency',
});

const ruleFunction = (primary, secondary, context) => {
  return function (postcssRoot, postcssResult) {
    postcssRoot.walkDecls('font-family', decl => {
      const parts = decl.value.split(',').map(p => p.trim());
      if (parts.includes('monospace')) {
        if (context.fix) {
          decl.value = parts
            .map(p => (p === 'monospace' ? 'var(--monospace-font-family)' : p))
            .join(', ');
          return;
        }

        report({
          message: messages.expected(),
          ruleName: RULE_NAME,
          node: decl,
          result: postcssResult,
          word: 'monospace',
        });
      }
    });
  };
};

ruleFunction.ruleName = RULE_NAME;
ruleFunction.messages = messages;

export default createPlugin(RULE_NAME, ruleFunction);

// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import stylelint from 'stylelint';

const {
  createPlugin,
  utils: { report, ruleMessages },
} = stylelint;

const RULE_NAME = 'plugin/check_scope_selectors';

const messages = ruleMessages(RULE_NAME, {
  unexpected: selector =>
    `Unexpected selector "${selector}" inside @scope. Selectors targeting host, root, html, body, theme, or platform classes cannot match inside @scope without :scope or &.`,
});

const KEYFRAMES_REGEX = /^(?:-\w+-)?keyframes$/i;
const SCOPE_OR_AMPERSAND_REGEX = /(?<![\w-]):scope(?![\w-])|&/;

// Bare :host / :host(...) never matches inside @scope, even when :scope or & is
// present (e.g. `:host &`, `& :host`, `:scope :host`), because the scoping root
// is already inside or below the shadow root.
const HOST_PATTERN = /(?<![\w-]):host(?![\w-])/;

// :host-context(...) is allowed when accompanied by & or :scope because some
// shadow root components intentionally use `:host-context(.theme-with-dark-background) & ...`
// to evaluate ancestor context for a scoped descendant.
const OFFENDING_ANCESTOR_PATTERNS = [
  /(?<![\w-]):host-context(?![\w-])/,
  /(?<![\w-]):root(?![\w-])/,
  /(?:^|[\s>+~,(])(?:html|body)(?![\w-])/i,
  /\.theme-with-dark-background(?![\w-])/,
  /\.platform-(?:mac|windows|linux|chromeos|android)(?![\w-])/,
  /\.overlay-scrollbar-enabled(?![\w-])/,
];

const CSS_COMMENT_REGEX = /\/\*[\s\S]*?\*\//g;
const QUOTED_STRING_REGEX = /"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/g;

const ruleFunction = () => {
  return function (postcssRoot, postcssResult) {
    postcssRoot.walkRules(rule => {
      let current = rule.parent;
      let insideScope = false;
      let insideKeyframes = false;

      while (current) {
        if (current.type === 'atrule') {
          const atRuleName = current.name.toLowerCase();
          if (atRuleName === 'scope') {
            insideScope = true;
          }
          if (KEYFRAMES_REGEX.test(current.name)) {
            insideKeyframes = true;
          }
        }
        current = current.parent;
      }

      if (!insideScope || insideKeyframes) {
        return;
      }

      rule.selectors.forEach(selector => {
        const normalizedSelector = selector.trim();
        const sanitized = normalizedSelector
          .replace(CSS_COMMENT_REGEX, '')
          .replace(QUOTED_STRING_REGEX, '');

        if (HOST_PATTERN.test(sanitized)) {
          report({
            message: messages.unexpected(normalizedSelector),
            ruleName: RULE_NAME,
            node: rule,
            result: postcssResult,
            word: selector,
          });
          return;
        }

        if (SCOPE_OR_AMPERSAND_REGEX.test(sanitized)) {
          return;
        }

        const isOffending = OFFENDING_ANCESTOR_PATTERNS.some(pattern => pattern.test(sanitized));
        if (isOffending) {
          report({
            message: messages.unexpected(normalizedSelector),
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

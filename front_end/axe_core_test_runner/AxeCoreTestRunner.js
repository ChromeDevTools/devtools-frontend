// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @fileoverview using private properties isn't a Closure violation in tests.
 * @suppress {accessControls}
 */

// These rules are disabled for one or more of the following reasons:
// * The rule is slow enough to cause flaky timeouts.
// * The rule has known issues.
// * The rule is low value so we disable it to improve overall test time.
// For performance issues see:
//
const DISABLED_RULES = {
  // Slow rules
  // https://github.com/dequelabs/axe-core/blob/develop/doc/API.md#section-4-performance
  // (more performance investigation) https://github.com/dequelabs/axe-core/pull/1503
  'color-contrast': {
    enabled: false,
  },
  'image-redundant-alt': {
    enabled: false,
  },
  // Rules with issues
  // https://github.com/dequelabs/axe-core/issues/1444
  'aria-required-children': {
    enabled: false,
  },
  // Low value rules
  'audio-caption': {
    enabled: false,
  },
  'blink': {
    enabled: false,
  },
  'html-has-lang': {
    enabled: false,
  },
  'html-lang-valid': {
    enabled: false,
  },
  'marquee': {
    enabled: false,
  },
  'meta-refresh': {
    enabled: false,
  },
  'meta-viewport': {
    enabled: false,
  },
  'meta-viewport-large': {
    enabled: false,
  },
  'object-alt': {
    enabled: false,
  },
  'video-caption': {
    enabled: false,
  },
  'video-description': {
    enabled: false,
  },
  'valid-lang': {
    enabled: false,
  },
};

const DEFAULT_CONFIG = {
  checks: [
    // This is a workaround for a bug in our version of axe-core
    // which does not support aria-placeholder.
    // Any attribute included in the options array will be
    // ignored by the 'aria-valid-attr' rule.
    // This should be removed after axe-core is updated.
    // See: https://github.com/dequelabs/axe-core/issues/1457
    {id: 'aria-valid-attr', options: ['aria-placeholder']}
  ]
};

AxeCoreTestRunner.processAxeResult = function(violations) {
  const result = violations.map(function(rule) {
    return {
      ruleDescription: rule.description,
      helpUrl: rule.helpUrl,
      ruleId: rule.id,
      impact: rule.impact,
      failedNodes: AxeCoreTestRunner.processAxeResultNodesArray(rule.nodes)
    };
  });
  return JSON.stringify(result, undefined, 2);
};

AxeCoreTestRunner.processAxeResultNodesArray = function(nodes) {
  const list = nodes.map(function(node) {
    return {
      target: node.target,
      html: node.html,
      failureSummary: node.failureSummary,
    };
  });
  return list;
};

AxeCoreTestRunner.runValidation = async function(element, rules, config) {
  axe.configure({...DEFAULT_CONFIG, ...config});

  try {
    const results = await axe.run(element, {rules: {...DISABLED_RULES, ...rules}});
    const violations = AxeCoreTestRunner.processAxeResult(results.violations);
    TestRunner.addResult(`aXe violations: ${violations}\n`);
  } catch (e) {
    TestRunner.addResult(`aXe threw an error: '${e}'`);
  }
};

// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import '../third_party/axe-core/axe.js';
// These rules are disabled for one or more of the following reasons:
// * The rule is slow enough to cause flaky timeouts.
// * The rule has known issues.
// * The rule is low value so we disable it to improve overall test time.
export const DISABLED_RULES = {
    // Slow rules:
    // https://github.com/dequelabs/axe-core/blob/develop/doc/API.md#section-4-performance
    // https://github.com/dequelabs/axe-core/pull/1503
    'aria-hidden-focus': {
        enabled: false,
    },
    'aria-input-field-name': {
        enabled: false,
    },
    'aria-toggle-field-name': {
        enabled: false,
    },
    'color-contrast': {
        enabled: false,
    },
    'image-redundant-alt': {
        enabled: false,
    },
    // Rules with issues:
    // https://github.com/dequelabs/axe-core/issues/1444
    'aria-required-children': {
        enabled: false,
    },
    // Low value rules:
    'aria-allowed-role': {
        enabled: false,
    },
    'aria-dpub-role-fallback': {
        enabled: false,
    },
    'audio-caption': {
        enabled: false,
    },
    blink: {
        enabled: false,
    },
    'form-field-multiple-labels': {
        enabled: false,
    },
    'frame-tested': {
        enabled: false,
    },
    'html-has-lang': {
        enabled: false,
    },
    'html-lang-valid': {
        enabled: false,
    },
    'html-xml-lang-mismatch': {
        enabled: false,
    },
    'landmark-banner-is-top-level': {
        enabled: false,
    },
    'landmark-complementary-is-top-level': {
        enabled: false,
    },
    'landmark-contentinfo-is-top-level': {
        enabled: false,
    },
    'landmark-main-is-top-level': {
        enabled: false,
    },
    'landmark-no-duplicate-banner': {
        enabled: false,
    },
    'landmark-no-duplicate-contentinfo': {
        enabled: false,
    },
    'landmark-one-main': {
        enabled: false,
    },
    'landmark-unique': {
        enabled: false,
    },
    marquee: {
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
    'page-has-heading-one': {
        enabled: false,
    },
    'scrollable-region-focusable': {
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
export const DEFAULT_CONFIG = {
    checks: [
        // This is a workaround for a bug in our version of axe-core which does not support aria-placeholder.
        // Any attribute included in the options array will be ignored by the 'aria-valid-attr' rule.
        // This should be removed after axe-core is updated.
        // https://github.com/dequelabs/axe-core/issues/1457
        { id: 'aria-valid-attr', options: ['aria-placeholder', 'aria-description'] },
    ],
    runOnly: { type: 'tags', values: { include: ['wcag2a', 'best-practice'], exclude: ['experimental'] } },
};
export async function getAxeViolations(element, rules) {
    const axeInstance = globalThis.axe;
    if (!axeInstance) {
        throw new Error('axe-core is not loaded.');
    }
    axeInstance.configure({ ...DEFAULT_CONFIG });
    const target = element instanceof ShadowRoot ? element.host : element;
    const results = await axeInstance.run(target, { rules: { ...DISABLED_RULES, ...rules } });
    return results.violations.map(violation => ({
        ruleId: violation.id,
        ruleDescription: violation.description,
        impact: violation.impact,
        failedNodes: violation.nodes.map(node => ({
            target: node.target,
            html: node.html,
            failureSummary: node.failureSummary,
        })),
    }));
}
//# sourceMappingURL=AxeHelpers.js.map
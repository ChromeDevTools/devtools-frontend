// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {
  ACTIVE_STARTING_STYLE_ADORNER_SELECTOR,
  expandSelectedNodeRecursively,
  INACTIVE_STARTING_STYLE_ADORNER_SELECTOR,
  waitForAndClickTreeElementWithPartialText,
  waitForElementsStyleSection,
} from '../helpers/elements-helpers.js';
import {togglePreferenceInSettingsTab} from '../helpers/settings-helpers.js';
import type {DevToolsPage} from '../shared/DevToolsPage.js';

// Return the full list of {selector: string, active: boolean}
async function getRuleActivity(devToolsPage: DevToolsPage) {
  const sections = await devToolsPage.$$('.styles-section', undefined, 'pierce');
  const results: Array<{selector: string, active: boolean}> = [];
  for (const section of sections) {
    const isInactive = await section.evaluate(s => s.classList.contains('styles-section-inactive'));
    const selText = await section.evaluate(s => {
      const ancestorRules =
          Array.from(s.querySelectorAll('.ancestor-rule-list > *'))
              .map(c => {
                if (c.tagName.toLowerCase() === 'devtools-css-query') {
                  return c.shadowRoot?.querySelector('.query')?.textContent?.replace(/\{$/, '').trim() || '';
                }
                const sel = c.querySelector('.selector');
                if (sel) {
                  return sel.textContent?.trim() || '';
                }
                return c.textContent?.replace(/\{$/, '').trim() || '';
              })
              .filter(Boolean);
      const el = s.querySelector('[aria-label="CSS selector"]');
      const selector = el ? el.textContent?.trim() || '' : null;
      if (selector === null && ancestorRules.length === 0) {
        return null;
      }
      return [...ancestorRules, selector].filter(Boolean).join(' ');
    });
    if (selText) {
      results.push({selector: selText, active: !isInactive});
    }
  }
  return results;
}

async function waitForActiveRule(devToolsPage: DevToolsPage, expectedText: string) {
  await devToolsPage.waitFor(`[aria-label="${expectedText}, css selector"]:not(.styles-section-inactive)`);
}

describe('The Elements tab', function() {
  it('correctly handles inherited styles, pseudo elements, and highlight pseudos on focus change',
     async ({devToolsPage, inspectedPage}) => {
       await inspectedPage.goToResource('elements/inactive-styles.html');
       await togglePreferenceInSettingsTab(devToolsPage, 'Show inactive CSS rules', true);

       await expandSelectedNodeRecursively(devToolsPage);
       await waitForAndClickTreeElementWithPartialText(devToolsPage, 'id=\u200B"inherited-target"');
       await waitForElementsStyleSection(devToolsPage, 'inherited-target');
       await waitForActiveRule(devToolsPage, '.parent-inherited');

       // Unfocused state: only parent-inherited has inherited styles and highlight pseudo styles
       let rules = await getRuleActivity(devToolsPage);
       assert.deepEqual(rules, [
         {selector: 'element.style', active: true},
         {selector: 'button', active: true},
         {selector: '.parent-inherited', active: true},
         {selector: '.parent-inherited::selection', active: true},
         {selector: '--my-prop', active: true},
       ]);

       // Focus the target button
       await inspectedPage.click('#inherited-target');
       await waitForActiveRule(devToolsPage, '.intermediate-inherited:focus-within');

       rules = await getRuleActivity(devToolsPage);
       assert.deepEqual(rules, [
         {selector: 'element.style', active: true},
         {selector: 'button:enabled:hover', active: true},
         {selector: 'button', active: true},
         {selector: '.intermediate-inherited:focus-within', active: true},
         {selector: '.parent-inherited', active: true},
         {selector: '.inherited-target:focus::before', active: true},
         {selector: '.intermediate-inherited:focus-within::selection', active: true},
         {selector: '.parent-inherited::selection', active: true},
         {selector: '--my-prop', active: true},
       ]);

       // Unfocus by clicking another element
       await inspectedPage.click('#other');
       await devToolsPage.waitFor(
           '[aria-label=".intermediate-inherited:focus-within, css selector"].styles-section-inactive');

       rules = await getRuleActivity(devToolsPage);
       assert.deepEqual(rules, [
         {selector: 'element.style', active: true},
         {selector: 'button:enabled:hover', active: false},
         {selector: 'button', active: true},
         {selector: '.intermediate-inherited:focus-within', active: false},
         {selector: '.parent-inherited', active: true},
         {selector: '.inherited-target:focus::before', active: false},
         {selector: '.intermediate-inherited:focus-within::selection', active: false},
         {selector: '.parent-inherited::selection', active: true},
         {selector: '--my-prop', active: true},
       ]);

       // Re-focus the target button and ensure no duplicate rules or stale inactive blocks remain
       await inspectedPage.click('#inherited-target');
       await waitForActiveRule(devToolsPage, '.intermediate-inherited:focus-within');

       rules = await getRuleActivity(devToolsPage);
       assert.deepEqual(rules, [
         {selector: 'element.style', active: true},
         {selector: 'button:enabled:hover', active: true},
         {selector: 'button', active: true},
         {selector: '.intermediate-inherited:focus-within', active: true},
         {selector: '.parent-inherited', active: true},
         {selector: '.inherited-target:focus::before', active: true},
         {selector: '.intermediate-inherited:focus-within::selection', active: true},
         {selector: '.parent-inherited::selection', active: true},
         {selector: '--my-prop', active: true},
       ]);
     });

  it('correctly marks @starting-style rules as inactive when disabled', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToResource('elements/inactive-styles.html');
    await togglePreferenceInSettingsTab(devToolsPage, 'Show inactive CSS rules', true);

    await expandSelectedNodeRecursively(devToolsPage);
    await waitForAndClickTreeElementWithPartialText(devToolsPage, 'id=\u200B"starting-style-target"');
    await waitForElementsStyleSection(devToolsPage, 'starting-style-target');
    await waitForActiveRule(devToolsPage, '.starting-style-target');

    // Initially starting-style mode is off
    let rules = await getRuleActivity(devToolsPage);
    assert.deepEqual(rules, [
      {selector: 'element.style', active: true},
      {selector: '.starting-style-target', active: true},
      {selector: 'div', active: true},
      {selector: '--my-prop', active: true},
    ]);

    // Enable @starting-style mode via adorner
    await devToolsPage.click(INACTIVE_STARTING_STYLE_ADORNER_SELECTOR);
    await devToolsPage.waitFor(ACTIVE_STARTING_STYLE_ADORNER_SELECTOR);
    await devToolsPage.waitForFunction(async () => {
      const currentRules = await getRuleActivity(devToolsPage);
      return currentRules.length > 4;
    });

    rules = await getRuleActivity(devToolsPage);
    assert.deepEqual(rules, [
      {selector: 'element.style', active: true},
      {selector: '@starting-style .starting-style-target', active: true},
      {selector: '.starting-style-target @starting-style', active: true},
      {selector: '.starting-style-target', active: true},
      {selector: 'div', active: true},
      {selector: '--my-prop', active: true},
    ]);

    // Measure header height of outer @starting-style rule while active (not collapsible)
    let sectionHandles = await devToolsPage.$$('.styles-section', undefined, 'pierce');
    const activeHeaderHeight = await sectionHandles[1].evaluate(section => {
      const container = section.querySelector('.selector-container');
      return container?.getBoundingClientRect().height ?? 0;
    });
    assert.isAbove(activeHeaderHeight, 0, 'Active header height should be positive');

    // Disable @starting-style mode via adorner
    await devToolsPage.click(ACTIVE_STARTING_STYLE_ADORNER_SELECTOR);
    await devToolsPage.waitFor(INACTIVE_STARTING_STYLE_ADORNER_SELECTOR);

    // There should be an inactive @starting-style { .starting-style-target {}}
    // and also an active .starting-style-target rule
    await devToolsPage.waitFor(
        '.styles-section-inactive[aria-label=".starting-style-target, css selector"]:has(.ancestor-rule-list devtools-css-query)');
    await devToolsPage.waitFor('[aria-label=".starting-style-target, css selector"]:not(.styles-section-inactive)');

    rules = await getRuleActivity(devToolsPage);
    assert.deepEqual(rules, [
      {selector: 'element.style', active: true},
      {selector: '@starting-style .starting-style-target', active: false},
      {selector: '.starting-style-target @starting-style', active: false},
      {selector: '.starting-style-target', active: true},
      {selector: 'div', active: true},
      {selector: '--my-prop', active: true},
    ]);

    // Verify both outer and inner @starting-style sections have visible warning status icons and collapse icons,
    // and that becoming collapsible does not increase the header height.
    sectionHandles = await devToolsPage.$$('.styles-section', undefined, 'pierce');
    const outerDetails = await sectionHandles[1].evaluate(section => {
      const isVisible = (el: Element|null|undefined) => {
        if (!el) {
          return false;
        }
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      };
      return {
        headerHeight: section.querySelector('.selector-container')?.getBoundingClientRect().height ?? 0,
        statusVisible: isVisible(section.querySelector('devtools-icon.styles-section-status')),
        collapseVisible: isVisible(section.querySelector('devtools-icon.section-collapse-icon')),
      };
    });
    const innerDetails = await sectionHandles[2].evaluate(section => {
      const isVisible = (el: Element|null|undefined) => {
        if (!el) {
          return false;
        }
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      };
      return {
        statusVisible: isVisible(section.querySelector('devtools-icon.styles-section-status')),
        collapseVisible: isVisible(section.querySelector('devtools-icon.section-collapse-icon')),
      };
    });

    assert.strictEqual(outerDetails.headerHeight, activeHeaderHeight);
    assert.isTrue(outerDetails.statusVisible, 'Outer @starting-style status icon should be visible');
    assert.isTrue(outerDetails.collapseVisible, 'Outer @starting-style collapse icon should be visible');
    assert.isTrue(innerDetails.statusVisible, 'Inner @starting-style status icon should be visible');
    assert.isTrue(innerDetails.collapseVisible, 'Inner @starting-style collapse icon should be visible');
  });
  it('correctly marks styles as inactive based on focus state', async ({devToolsPage, inspectedPage}) => {
    // Navigate to page
    await inspectedPage.goToResource('elements/inactive-styles.html');
    await togglePreferenceInSettingsTab(devToolsPage, 'Show inactive CSS rules', true);

    // Select the target element
    await expandSelectedNodeRecursively(devToolsPage);

    await waitForAndClickTreeElementWithPartialText(devToolsPage, 'id=\u200B"target"');
    await waitForElementsStyleSection(devToolsPage, 'target-element');

    await waitForActiveRule(devToolsPage, '.target-element:not(:focus)');

    // Unfocused state tests
    let rules = await getRuleActivity(devToolsPage);
    assert.deepEqual(rules, [
      {selector: 'element.style', active: true},
      {selector: '.target-element:not(:focus)', active: true},
      {selector: 'button', active: true},
      {selector: '.container:not(:focus-within)', active: true},
      {selector: '@font-palette-values --my-palette-2', active: true},
      {selector: '--my-prop', active: true},
      {selector: '--my-other-func(--a)', active: true},
    ]);

    // Focus the target element in the inspected page
    await inspectedPage.click('#target');
    await waitForActiveRule(devToolsPage, '.target-element:focus');

    rules = await getRuleActivity(devToolsPage);
    assert.deepEqual(rules, [
      {selector: 'element.style', active: true},
      {selector: '.target-element:not(:focus)', active: false},
      {selector: '.target-element:focus', active: true},
      {selector: 'button:enabled:hover', active: true},
      {selector: 'button', active: true},
      {selector: '.container:not(:focus-within)', active: false},
      {selector: '.container:focus-within', active: true},
      {selector: '@font-palette-values --my-palette-2', active: false},
      {selector: '@font-palette-values --my-palette-1', active: true},
      {selector: '--my-prop', active: true},
      {selector: '--my-other-func(--a)', active: false},
      {selector: '--my-func()', active: true},
    ]);

    // Focus another element
    await inspectedPage.click('#other');
    await waitForActiveRule(devToolsPage, '.target-element:not(:focus)');

    rules = await getRuleActivity(devToolsPage);

    // Order is preserved, only active/inactive state changes
    assert.deepEqual(rules, [
      {selector: 'element.style', active: true},
      {selector: '.target-element:not(:focus)', active: true},
      {selector: '.target-element:focus', active: false},
      {selector: 'button:enabled:hover', active: false},
      {selector: 'button', active: true},
      {selector: '.container:not(:focus-within)', active: true},
      {selector: '.container:focus-within', active: false},
      {selector: '@font-palette-values --my-palette-2', active: true},
      {selector: '@font-palette-values --my-palette-1', active: false},
      {selector: '--my-prop', active: true},
      {selector: '--my-other-func(--a)', active: true},
      {selector: '--my-func()', active: false},
    ]);
  });

  it('correctly shows only active rules when feature is disabled', async ({devToolsPage, inspectedPage}) => {
    // Navigate to page
    await inspectedPage.goToResource('elements/inactive-styles.html');

    // Select the target element
    await expandSelectedNodeRecursively(devToolsPage);

    await waitForAndClickTreeElementWithPartialText(devToolsPage, 'id=\u200B"target"');
    await waitForElementsStyleSection(devToolsPage, 'target-element');

    await waitForActiveRule(devToolsPage, '.target-element:not(:focus)');

    // Unfocused state tests
    let rules = await getRuleActivity(devToolsPage);
    assert.deepEqual(rules, [
      {selector: 'element.style', active: true},
      {selector: '.target-element:not(:focus)', active: true},
      {selector: 'button', active: true},
      {selector: '.container:not(:focus-within)', active: true},
      {selector: '@font-palette-values --my-palette-2', active: true},
      {selector: '--my-prop', active: true},
      {selector: '--my-other-func(--a)', active: true},
    ]);

    // Focus the target element in the inspected page
    await inspectedPage.click('#target');
    await waitForActiveRule(devToolsPage, '.target-element:focus');

    rules = await getRuleActivity(devToolsPage);
    assert.deepEqual(rules, [
      {selector: 'element.style', active: true},
      {selector: '.target-element:focus', active: true},
      {selector: 'button:enabled:hover', active: true},
      {selector: 'button', active: true},
      {selector: '.container:focus-within', active: true},
      {selector: '@font-palette-values --my-palette-1', active: true},
      {selector: '--my-prop', active: true},
      {selector: '--my-func()', active: true},
    ]);

    // Focus another element
    await inspectedPage.click('#other');
    await waitForActiveRule(devToolsPage, '.target-element:not(:focus)');

    rules = await getRuleActivity(devToolsPage);

    assert.deepEqual(rules, [
      {selector: 'element.style', active: true},
      {selector: '.target-element:not(:focus)', active: true},
      {selector: 'button', active: true},
      {selector: '.container:not(:focus-within)', active: true},
      {selector: '@font-palette-values --my-palette-2', active: true},
      {selector: '--my-prop', active: true},
      {selector: '--my-other-func(--a)', active: true},
    ]);
  });

  it('correctly marks animation styles as inactive', async ({devToolsPage, inspectedPage}) => {
    // Navigate to page
    await inspectedPage.goToResource('elements/inactive-styles.html');
    // Remember to turn off the "Show animation styles only when the Animations tab is open" feature.
    await togglePreferenceInSettingsTab(devToolsPage, 'Show animation styles only when the Animations tab is open',
                                        false);
    await togglePreferenceInSettingsTab(devToolsPage, 'Show inactive CSS rules', true);

    // Actually click the element with the exact text "id="animated""
    await waitForAndClickTreeElementWithPartialText(devToolsPage, 'id=\u200B"animated"');
    await waitForElementsStyleSection(devToolsPage, 'animated-element');

    async function waitForInactiveRule(expectedText: string) {
      await devToolsPage.waitFor(`[aria-label="${expectedText}, css selector"].styles-section-inactive`);
    }

    // Inspect the element while it is not animated
    await waitForActiveRule(devToolsPage, 'div');
    let rules = await getRuleActivity(devToolsPage);
    assert.deepEqual(rules, [
      {selector: 'element.style', active: true},
      {selector: 'div', active: true},
      {selector: '--my-prop', active: true},
    ]);

    // Hover the animated element to trigger the animation
    await inspectedPage.click('#animated');
    await waitForActiveRule(devToolsPage, '100%');

    rules = await getRuleActivity(devToolsPage);
    assert.deepEqual(rules, [
      {selector: 'my-animation animation', active: true},
      {selector: 'element.style', active: true},
      {selector: '.animated-element.animating', active: true},
      {selector: 'div', active: true},
      {selector: '0%', active: true},
      {selector: '100%', active: true},
      {selector: '--my-prop', active: true},
    ]);

    // Un-click the animated element to stop the animation
    await inspectedPage.click('#animated');
    await waitForInactiveRule('100%');
    await waitForActiveRule(devToolsPage, 'div');

    // Keyframes section remains above the properties section, though there are
    // no active rules in it.
    rules = await getRuleActivity(devToolsPage);
    assert.deepEqual(rules, [
      {selector: 'my-animation animation', active: false},  // if there's a link header/section
      {selector: 'element.style', active: true},
      {selector: '.animated-element.animating', active: false},
      {selector: 'div', active: true},
      {selector: '0%', active: false},
      {selector: '100%', active: false},
      {selector: '--my-prop', active: true},
    ]);
  });

  it('correctly reorders rules when simultaneously active', async ({devToolsPage, inspectedPage}) => {
    // Navigate to page
    await inspectedPage.goToResource('elements/inactive-styles.html');
    await togglePreferenceInSettingsTab(devToolsPage, 'Show inactive CSS rules', true);

    // Select the ab element
    await waitForAndClickTreeElementWithPartialText(devToolsPage, 'id=\u200B"ab-target"');
    await waitForElementsStyleSection(devToolsPage, 'ab-element');

    // Initially State A
    await waitForActiveRule(devToolsPage, '.ab-element.state-a');  // poll until DevTools refreshes the style pane

    let rules = await getRuleActivity(devToolsPage);
    assert.deepEqual(rules, [
      {selector: 'element.style', active: true},
      {selector: '.ab-element.state-a', active: true},
      {selector: 'div', active: true},
      {selector: '--my-prop', active: true},
    ]);

    // Click to transition to State B
    await inspectedPage.click('#ab-target');
    await waitForActiveRule(devToolsPage, '.ab-element.state-b');

    rules = await getRuleActivity(devToolsPage);
    assert.deepEqual(rules, [
      {selector: 'element.style', active: true},
      {selector: '.ab-element.state-a', active: false},
      {selector: '.ab-element.state-b', active: true},
      {selector: 'div', active: true},
      {selector: '--my-prop', active: true},
    ]);

    // Click to transition to State A + B
    await inspectedPage.click('#ab-target');
    await waitForActiveRule(devToolsPage, '.ab-element.state-a');  // state-a becomes active again!

    // Now that both state-a and state-b are active, we discover the correct order
    rules = await getRuleActivity(devToolsPage);
    assert.deepEqual(rules, [
      {selector: 'element.style', active: true},
      {selector: '.ab-element.state-b', active: true},
      {selector: '.ab-element.state-a', active: true},
      {selector: 'div', active: true},
      {selector: '--my-prop', active: true},
    ]);
  });
});

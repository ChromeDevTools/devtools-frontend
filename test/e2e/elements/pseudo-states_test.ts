// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {debuggerStatement, getBrowserAndPages, goToResource, step, waitFor} from '../../shared/helper.js';
import {
  assertGutterDecorationForDomNodeExists,
  EMULATE_FOCUSED_PAGE,
  findElementById,
  forcePseudoState,
  getComputedStylesForDomNode,
  removePseudoState,
  waitForContentOfSelectedElementsNode,
  waitForDomNodeToBeHidden,
  waitForDomNodeToBeVisible,
  waitForElementsStyleSection,
  waitForPartialContentOfSelectedElementsNode,
} from '../helpers/elements-helpers.js';

const TARGET_SHOWN_ON_HOVER_SELECTOR = '.show-on-hover';
const TARGET_SHOWN_ON_FOCUS_SELECTOR = '.show-on-focus';
const TARGET_SHOWN_ON_TARGET_SELECTOR = '#show-on-target';

describe('The Elements tab', () => {
  // Flaky test
  it.skipOnPlatforms(['mac'], '[crbug.com/1280763]: can force :hover state for selected DOM node', async () => {
    const {frontend} = getBrowserAndPages();

    await goToResource('elements/hover.html');

    await waitForElementsStyleSection();

    await step('Ensure the correct node is selected after opening a file', async () => {
      await waitForContentOfSelectedElementsNode('<body>\u200B');
    });

    await step('Select div that we can focus', async () => {
      await frontend.keyboard.press('ArrowRight');
      await waitForContentOfSelectedElementsNode('<div id=\u200B"hover">\u200B…\u200B</div>\u200B');
    });

    await forcePseudoState(':hover');
    await assertGutterDecorationForDomNodeExists();
    await waitForDomNodeToBeVisible(TARGET_SHOWN_ON_HOVER_SELECTOR);

    const displayComputedStyle = await getComputedStylesForDomNode(TARGET_SHOWN_ON_HOVER_SELECTOR, 'display');
    assert.strictEqual(displayComputedStyle, 'inline');
  });

  // Flaky test
  it.skipOnPlatforms(['mac'], '[crbug.com/1280763]: can force :target state for selected DOM node', async () => {
    const {frontend} = getBrowserAndPages();

    await goToResource('elements/target.html');

    await waitForElementsStyleSection();

    await step('Ensure the correct node is selected after opening a file', async () => {
      await waitForContentOfSelectedElementsNode('<body>\u200B');
    });

    await step('Select element that we can target', async () => {
      await frontend.keyboard.press('ArrowRight');
      await waitForContentOfSelectedElementsNode(
          '<span id=\u200B"show-on-target">\u200BSome text here, only shown on :target\u200B</span>\u200B');
    });

    await forcePseudoState(':target');
    await assertGutterDecorationForDomNodeExists();
    await waitForDomNodeToBeVisible(TARGET_SHOWN_ON_TARGET_SELECTOR);

    const displayComputedStyle = await getComputedStylesForDomNode(TARGET_SHOWN_ON_TARGET_SELECTOR, 'display');
    assert.strictEqual(displayComputedStyle, 'inline');
  });

  // Flaky test
  it.skipOnPlatforms(['mac'], '[crbug.com/1280763]: can force :focus state for selected DOM node', async () => {
    const {frontend} = getBrowserAndPages();

    await goToResource('elements/focus.html');

    await waitForElementsStyleSection();

    await step('Ensure the correct node is selected after opening a file', async () => {
      await waitForContentOfSelectedElementsNode('<body>\u200B');
    });

    await step('Select div that we can focus', async () => {
      await frontend.keyboard.press('ArrowRight');
      await waitForContentOfSelectedElementsNode('<div id=\u200B"focus" tabindex=\u200B"0">\u200B…\u200B</div>\u200B');
    });

    await forcePseudoState(':focus');
    await assertGutterDecorationForDomNodeExists();
    await waitForDomNodeToBeVisible(TARGET_SHOWN_ON_FOCUS_SELECTOR);

    const displayComputedStyle = await getComputedStylesForDomNode(TARGET_SHOWN_ON_FOCUS_SELECTOR, 'display');
    assert.strictEqual(displayComputedStyle, 'inline');

    const backgroundColorComputedStyle = await getComputedStylesForDomNode('#focus', 'backgroundColor');
    assert.strictEqual(backgroundColorComputedStyle, 'rgb(0, 128, 0)');
  });

  // Flaky test
  it.skipOnPlatforms(['mac'], '[crbug.com/1280763]: can remove :focus state', async () => {
    const {frontend} = getBrowserAndPages();

    await goToResource('elements/focus.html');

    await waitForElementsStyleSection();

    await step('Ensure the correct node is selected after opening a file', async () => {
      await waitForContentOfSelectedElementsNode('<body>\u200B');
    });

    await step('Select div that we can focus', async () => {
      await frontend.keyboard.press('ArrowRight');
      await waitForContentOfSelectedElementsNode('<div id=\u200B"focus" tabindex=\u200B"0">\u200B…\u200B</div>\u200B');
    });

    await forcePseudoState(':focus');
    await assertGutterDecorationForDomNodeExists();
    await waitForDomNodeToBeVisible(TARGET_SHOWN_ON_FOCUS_SELECTOR);

    const displayComputedStyle = await getComputedStylesForDomNode(TARGET_SHOWN_ON_FOCUS_SELECTOR, 'display');
    assert.strictEqual(displayComputedStyle, 'inline');

    const backgroundColorComputedStyle = await getComputedStylesForDomNode('#focus', 'backgroundColor');
    assert.strictEqual(backgroundColorComputedStyle, 'rgb(0, 128, 0)');

    await removePseudoState(':focus');
    await waitForDomNodeToBeHidden(TARGET_SHOWN_ON_FOCUS_SELECTOR);

    await debuggerStatement(frontend);

    const hiddenDisplayStyle = await getComputedStylesForDomNode(TARGET_SHOWN_ON_FOCUS_SELECTOR, 'display');
    assert.strictEqual(hiddenDisplayStyle, 'none');
  });

  // Flaky test
  it.skipOnPlatforms(['mac'], '[crbug.com/1280763]: can toggle emulate a focused page', async () => {
    const {frontend, target} = getBrowserAndPages();

    await goToResource('elements/dissapearing-popup.html');
    await waitForElementsStyleSection();

    await step('Ensure the correct node is selected after opening a file', async () => {
      await waitForContentOfSelectedElementsNode('<body>\u200B');
    });

    await step('Navigate to #query input', async () => {
      await frontend.keyboard.press('ArrowRight');
      await waitForContentOfSelectedElementsNode('<input id=\u200B"query" type=\u200B"text">\u200B');
    });

    await step('Verify #result is hidden', async () => {
      await frontend.keyboard.press('ArrowDown');
      await waitForPartialContentOfSelectedElementsNode('<p id=\u200B"result" class=\u200B"hide">\u200B');
    });

    await step('Verify #result is visible', async () => {
      await forcePseudoState(EMULATE_FOCUSED_PAGE);
      await target.keyboard.press('Tab');
      await waitForPartialContentOfSelectedElementsNode('<p id=\u200B"result" class>\u200B');
    });

    await step('Verify #result is hidden', async () => {
      await removePseudoState(EMULATE_FOCUSED_PAGE);
      await target.keyboard.press('Tab');
      await waitForPartialContentOfSelectedElementsNode('<p id=\u200B"result" class=\u200B"hide">\u200B');
    });
  });

  const dualCasesOneCheckbox = [
    {start: 'enabled', dual: 'disabled', elementCount: 9},
    {start: 'disabled', dual: 'enabled', elementCount: 6},
    {start: 'read-only', dual: 'read-write', elementCount: 12},
    {start: 'read-write', dual: 'read-only', elementCount: 6},
    {start: 'required', dual: 'optional', elementCount: 2},
    {start: 'optional', dual: 'required', elementCount: 13},
  ];
  for (const {start, dual, elementCount} of dualCasesOneCheckbox) {
    // Flaky test
    it.skipOnPlatforms(['mac'], `[crbug.com/1280763]: can force ${start} elements to be :${dual}`, async () => {
      const {target} = getBrowserAndPages();

      await goToResource('elements/specific-pseudo-states.html');
      await waitForElementsStyleSection();

      // Verify assumptions behind our test file.

      // These combinations should not exist.
      assert.deepEqual(await target.$$(`.start-${start}:${dual}`), []);
      assert.deepEqual(await target.$$(`.test-case:not(.start-${start}):${start}`), []);

      // Before we do anything, pseudoClasses should be as expected.
      const cls = `.start-${start}`;
      const ids = await Promise.all((await target.$$(cls)).map(el => el.evaluate(node => node.id)));
      const byPseudoClass = await target.$$(`${cls}:${start}`);
      assert.strictEqual(ids.length, byPseudoClass.length);
      assert.strictEqual(ids.length, elementCount);

      const id = ids[0];
      await findElementById(id);
      const unforcedSelector = `#${id}:${start}`;
      const forcedSelector = `#${id}:${dual}`;
      assert.deepEqual(await target.$$(forcedSelector), []);
      assert.strictEqual((await target.$$(unforcedSelector)).length, 1);

      await forcePseudoState(':' + dual, true);

      assert.deepEqual(await target.$$(unforcedSelector), []);
      assert.strictEqual((await target.$$(forcedSelector)).length, 1);

      await removePseudoState(':' + dual);

      assert.deepEqual(await target.$$(forcedSelector), []);
      assert.strictEqual((await target.$$(unforcedSelector)).length, 1);
    });
  }

  const dualCasesTwoCheckboxes = [
    {start: 'valid', dual: 'invalid', elementCount: 6},
    {start: 'invalid', dual: 'valid', elementCount: 1},
    {start: 'in-range', dual: 'out-of-range', elementCount: 1},
    {start: 'out-of-range', dual: 'in-range', elementCount: 1},
  ];
  for (const {start, dual, elementCount} of dualCasesTwoCheckboxes) {
    // Flaky test
    it.skipOnPlatforms(
        ['mac'], `[crbug.com/1280763]: can force ${start} elements to be :${dual} but not both`, async () => {
          const {target} = getBrowserAndPages();

          await goToResource('elements/specific-pseudo-states.html');
          await waitForElementsStyleSection();

          // Verify assumptions behind our test file.
          // These combinations should not exist.
          assert.deepEqual(await target.$$(`.start-${start}:${dual}`), []);
          assert.deepEqual(await target.$$(`.test-case:not(.start-${start}):${start}`), []);

          // Before we do anything, pseudoClasses should be as expected.
          const cls = `.start-${start}`;
          const ids = await Promise.all((await target.$$(cls)).map(el => el.evaluate(node => node.id)));
          const byPseudoClass = await target.$$(`${cls}:${start}`);
          assert.strictEqual(ids.length, byPseudoClass.length);
          assert.strictEqual(ids.length, elementCount);

          const id = ids[0];
          await findElementById(id);
          const unforcedSelector = `#${id}:${start}`;
          const forcedSelector = `#${id}:${dual}`;
          assert.deepEqual(await target.$$(forcedSelector), []);
          assert.strictEqual((await target.$$(unforcedSelector)).length, 1);

          await forcePseudoState(':' + dual, true);
          await waitFor(`input[type="checkbox"][title=":${dual}"]:checked`);

          assert.deepEqual(await target.$$(unforcedSelector), []);
          assert.strictEqual((await target.$$(forcedSelector)).length, 1);

          await forcePseudoState(':' + start, true);
          await waitFor(`input[type="checkbox"][title=":${start}"]:checked`);
          await waitFor(`input[type="checkbox"][title=":${dual}"]:not(:checked)`);

          assert.deepEqual(await target.$$(forcedSelector), []);
          assert.strictEqual((await target.$$(unforcedSelector)).length, 1);
        });
  }
});

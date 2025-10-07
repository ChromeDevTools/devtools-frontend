// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

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
  waitForPartialContentOfSelectedElementsNode
} from '../../e2e/helpers/elements-helpers.js';

const TARGET_SHOWN_ON_HOVER_SELECTOR = '.show-on-hover';
const TARGET_SHOWN_ON_FOCUS_SELECTOR = '.show-on-focus';
const TARGET_SHOWN_ON_TARGET_SELECTOR = '#show-on-target';

describe('The Elements tab', function() {
  setup({});
  if (this.timeout()) {
    this.timeout(20000);
  }

  it('can force :hover state for selected DOM node', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToResource('elements/hover.html');

    await waitForElementsStyleSection('<body', devToolsPage);

    await devToolsPage.pressKey('ArrowRight');
    await waitForContentOfSelectedElementsNode('<div id=\u200B"hover">\u200B…\u200B</div>\u200B', devToolsPage);

    await forcePseudoState(':hover', undefined, devToolsPage);
    await assertGutterDecorationForDomNodeExists(devToolsPage);
    await waitForDomNodeToBeVisible(TARGET_SHOWN_ON_HOVER_SELECTOR, inspectedPage);

    const displayComputedStyle =
        await getComputedStylesForDomNode(TARGET_SHOWN_ON_HOVER_SELECTOR, 'display', inspectedPage);
    assert.strictEqual(displayComputedStyle, 'inline');
  });

  it('can force :target state for selected DOM node', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToResource('elements/target.html');

    await waitForElementsStyleSection('<body', devToolsPage);

    await devToolsPage.pressKey('ArrowRight');
    await waitForContentOfSelectedElementsNode(
        '<span id=\u200B"show-on-target">\u200BSome text here, only shown on :target\u200B</span>\u200B', devToolsPage);

    await forcePseudoState(':target', undefined, devToolsPage);
    await assertGutterDecorationForDomNodeExists(devToolsPage);
    await waitForDomNodeToBeVisible(TARGET_SHOWN_ON_TARGET_SELECTOR, inspectedPage);

    const displayComputedStyle =
        await getComputedStylesForDomNode(TARGET_SHOWN_ON_TARGET_SELECTOR, 'display', inspectedPage);
    assert.strictEqual(displayComputedStyle, 'inline');
  });

  it('can force :focus state for selected DOM node', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToResource('elements/focus.html');

    await waitForElementsStyleSection('<body', devToolsPage);

    await devToolsPage.pressKey('ArrowRight');
    await waitForContentOfSelectedElementsNode(
        '<div id=\u200B"focus" tabindex=\u200B"0">\u200B…\u200B</div>\u200B', devToolsPage);

    await forcePseudoState(':focus', undefined, devToolsPage);
    await assertGutterDecorationForDomNodeExists(devToolsPage);
    await waitForDomNodeToBeVisible(TARGET_SHOWN_ON_FOCUS_SELECTOR, inspectedPage);

    const displayComputedStyle =
        await getComputedStylesForDomNode(TARGET_SHOWN_ON_FOCUS_SELECTOR, 'display', inspectedPage);
    assert.strictEqual(displayComputedStyle, 'inline');

    const backgroundColorComputedStyle = await getComputedStylesForDomNode('#focus', 'backgroundColor', inspectedPage);
    assert.strictEqual(backgroundColorComputedStyle, 'rgb(0, 128, 0)');
  });

  it('can remove :focus state', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToResource('elements/focus.html');

    await waitForElementsStyleSection('<body', devToolsPage);

    await devToolsPage.pressKey('ArrowRight');
    await waitForContentOfSelectedElementsNode(
        '<div id=\u200B"focus" tabindex=\u200B"0">\u200B…\u200B</div>\u200B', devToolsPage);

    await forcePseudoState(':focus', undefined, devToolsPage);
    await assertGutterDecorationForDomNodeExists(devToolsPage);
    await waitForDomNodeToBeVisible(TARGET_SHOWN_ON_FOCUS_SELECTOR, inspectedPage);

    const displayComputedStyle =
        await getComputedStylesForDomNode(TARGET_SHOWN_ON_FOCUS_SELECTOR, 'display', inspectedPage);
    assert.strictEqual(displayComputedStyle, 'inline');

    const backgroundColorComputedStyle = await getComputedStylesForDomNode('#focus', 'backgroundColor', inspectedPage);
    assert.strictEqual(backgroundColorComputedStyle, 'rgb(0, 128, 0)');

    await removePseudoState(':focus', devToolsPage);
    await waitForDomNodeToBeHidden(TARGET_SHOWN_ON_FOCUS_SELECTOR, inspectedPage);

    const hiddenDisplayStyle =
        await getComputedStylesForDomNode(TARGET_SHOWN_ON_FOCUS_SELECTOR, 'display', inspectedPage);
    assert.strictEqual(hiddenDisplayStyle, 'none');
  });

  it('can toggle emulate a focused page', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToResource('elements/dissapearing-popup.html');
    await waitForElementsStyleSection('<body', devToolsPage);

    // Navigate to #query input
    await devToolsPage.pressKey('ArrowRight');
    await waitForContentOfSelectedElementsNode('<input id=\u200B"query" type=\u200B"text">\u200B', devToolsPage);

    // Verify #result is hidden
    await devToolsPage.pressKey('ArrowDown');
    await waitForPartialContentOfSelectedElementsNode('<p id=\u200B"result" class=\u200B"hide">\u200B', devToolsPage);

    // Verify #result is visible
    await forcePseudoState(EMULATE_FOCUSED_PAGE, undefined, devToolsPage);
    await inspectedPage.pressKey('Tab');
    await waitForPartialContentOfSelectedElementsNode('<p id=\u200B"result" class>\u200B', devToolsPage);

    // Verify #result is hidden
    await removePseudoState(EMULATE_FOCUSED_PAGE, devToolsPage);
    await inspectedPage.pressKey('Tab');
    await waitForPartialContentOfSelectedElementsNode('<p id=\u200B"result" class=\u200B"hide">\u200B', devToolsPage);
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
    it(`can force ${start} elements to be :${dual}`, async ({devToolsPage, inspectedPage}) => {
      await inspectedPage.goToResource('elements/specific-pseudo-states.html');
      await waitForElementsStyleSection('<body', devToolsPage);

      // Verify assumptions behind our test file.

      // These combinations should not exist.
      assert.deepEqual(await inspectedPage.page.$$(`.start-${start}:${dual}`), []);
      assert.deepEqual(await inspectedPage.page.$$(`.test-case:not(.start-${start}):${start}`), []);

      // Before we do anything, pseudoClasses should be as expected.
      const cls = `.start-${start}`;
      const ids = await Promise.all((await inspectedPage.page.$$(cls)).map(el => el.evaluate(node => node.id)));
      const byPseudoClass = await inspectedPage.page.$$(`${cls}:${start}`);
      assert.strictEqual(ids.length, byPseudoClass.length);
      assert.strictEqual(ids.length, elementCount);

      const id = ids[0];
      await findElementById(id, devToolsPage);
      const unforcedSelector = `#${id}:${start}`;
      const forcedSelector = `#${id}:${dual}`;
      assert.deepEqual(await inspectedPage.page.$$(forcedSelector), []);
      assert.lengthOf(await inspectedPage.page.$$(unforcedSelector), 1);

      await forcePseudoState(':' + dual, true, devToolsPage);

      assert.deepEqual(await inspectedPage.page.$$(unforcedSelector), []);
      assert.lengthOf(await inspectedPage.page.$$(forcedSelector), 1);

      await removePseudoState(':' + dual, devToolsPage);

      assert.deepEqual(await inspectedPage.page.$$(forcedSelector), []);
      assert.lengthOf(await inspectedPage.page.$$(unforcedSelector), 1);
    });
  }

  const dualCasesTwoCheckboxes = [
    {start: 'valid', dual: 'invalid', elementCount: 6},
    {start: 'invalid', dual: 'valid', elementCount: 1},
    {start: 'in-range', dual: 'out-of-range', elementCount: 1},
    {start: 'out-of-range', dual: 'in-range', elementCount: 1},
  ];
  for (const {start, dual, elementCount} of dualCasesTwoCheckboxes) {
    it(`can force ${start} elements to be :${dual} but not both`, async ({devToolsPage, inspectedPage}) => {
      await inspectedPage.goToResource('elements/specific-pseudo-states.html');
      await waitForElementsStyleSection('<body', devToolsPage);

      // Verify assumptions behind our test file.
      // These combinations should not exist.
      assert.deepEqual(await inspectedPage.page.$$(`.start-${start}:${dual}`), []);
      assert.deepEqual(await inspectedPage.page.$$(`.test-case:not(.start-${start}):${start}`), []);

      // Before we do anything, pseudoClasses should be as expected.
      const cls = `.start-${start}`;
      const ids = await Promise.all((await inspectedPage.page.$$(cls)).map(el => el.evaluate(node => node.id)));
      const byPseudoClass = await inspectedPage.page.$$(`${cls}:${start}`);
      assert.strictEqual(ids.length, byPseudoClass.length);
      assert.strictEqual(ids.length, elementCount);

      const id = ids[0];
      await findElementById(id, devToolsPage);
      const unforcedSelector = `#${id}:${start}`;
      const forcedSelector = `#${id}:${dual}`;
      assert.deepEqual(await inspectedPage.page.$$(forcedSelector), []);
      assert.lengthOf(await inspectedPage.page.$$(unforcedSelector), 1);

      await forcePseudoState(':' + dual, true, devToolsPage);
      await devToolsPage.waitFor(`input[type="checkbox"][title=":${dual}"]:checked`);

      assert.deepEqual(await inspectedPage.page.$$(unforcedSelector), []);
      assert.lengthOf(await inspectedPage.page.$$(forcedSelector), 1);

      await forcePseudoState(':' + start, true, devToolsPage);
      await devToolsPage.waitFor(`input[type="checkbox"][title=":${start}"]:checked`);
      await devToolsPage.waitFor(`input[type="checkbox"][title=":${dual}"]:not(:checked)`);

      assert.deepEqual(await inspectedPage.page.$$(forcedSelector), []);
      assert.lengthOf(await inspectedPage.page.$$(unforcedSelector), 1);
    });
  }
});

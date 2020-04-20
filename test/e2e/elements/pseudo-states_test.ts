// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {describe, it} from 'mocha';

import {debuggerStatement, getBrowserAndPages, resourcesPath} from '../../shared/helper.js';
import {assertContentOfSelectedElementsNode, assertGutterDecorationForDomNodeExists, forcePseudoState, getComputedStylesForDomNode, removePseudoState, waitForDomNodeToBeHidden, waitForDomNodeToBeVisible, waitForElementsStyleSection} from '../helpers/elements-helpers.js';

const TARGET_SHOWN_ON_HOVER_SELECTOR = '.show-on-hover';
const TARGET_SHOWN_ON_FOCUS_SELECTOR = '.show-on-focus';

describe('The Elements tab', async () => {
  it('can force :hover state for selected DOM node', async () => {
    const {target, frontend} = getBrowserAndPages();

    await target.goto(`${resourcesPath}/elements/hover.html`);

    await waitForElementsStyleSection();

    // Sanity check to make sure we have the correct node selected after opening a file
    await assertContentOfSelectedElementsNode('<body>\u200B');

    // Select div that we can hover on
    await frontend.keyboard.press('ArrowRight');
    await assertContentOfSelectedElementsNode('<div id=\u200B"hover">\u200B…\u200B</div>\u200B');

    await forcePseudoState(':hover');
    await assertGutterDecorationForDomNodeExists();
    await waitForDomNodeToBeVisible(TARGET_SHOWN_ON_HOVER_SELECTOR);

    const displayComputedStyle = await getComputedStylesForDomNode(TARGET_SHOWN_ON_HOVER_SELECTOR, 'display');
    assert.equal(displayComputedStyle, 'inline');
  });

  it('can force :focus state for selected DOM node', async () => {
    const {target, frontend} = getBrowserAndPages();

    await target.goto(`${resourcesPath}/elements/focus.html`);

    await waitForElementsStyleSection();

    // Sanity check to make sure we have the correct node selected after opening a file
    await assertContentOfSelectedElementsNode('<body>\u200B');

    // Select div that we can focus
    await frontend.keyboard.press('ArrowRight');
    await assertContentOfSelectedElementsNode('<div id=\u200B"focus" tabindex=\u200B"0">\u200B…\u200B</div>\u200B');

    await forcePseudoState(':focus');
    await assertGutterDecorationForDomNodeExists();
    await waitForDomNodeToBeVisible(TARGET_SHOWN_ON_FOCUS_SELECTOR);

    const displayComputedStyle = await getComputedStylesForDomNode(TARGET_SHOWN_ON_FOCUS_SELECTOR, 'display');
    assert.equal(displayComputedStyle, 'inline');

    const backgroundColorComputedStyle = await getComputedStylesForDomNode('#focus', 'backgroundColor');
    assert.equal(backgroundColorComputedStyle, 'rgb(0, 128, 0)');
  });

  it('can remove :focus state', async () => {
    const {target, frontend} = getBrowserAndPages();

    await target.goto(`${resourcesPath}/elements/focus.html`);

    await waitForElementsStyleSection();

    // Sanity check to make sure we have the correct node selected after opening a file
    await assertContentOfSelectedElementsNode('<body>\u200B');

    // Select div that we can focus
    await frontend.keyboard.press('ArrowRight');
    await assertContentOfSelectedElementsNode('<div id=\u200B"focus" tabindex=\u200B"0">\u200B…\u200B</div>\u200B');

    await forcePseudoState(':focus');
    await assertGutterDecorationForDomNodeExists();
    await waitForDomNodeToBeVisible(TARGET_SHOWN_ON_FOCUS_SELECTOR);

    const displayComputedStyle = await getComputedStylesForDomNode(TARGET_SHOWN_ON_FOCUS_SELECTOR, 'display');
    assert.equal(displayComputedStyle, 'inline');

    const backgroundColorComputedStyle = await getComputedStylesForDomNode('#focus', 'backgroundColor');
    assert.equal(backgroundColorComputedStyle, 'rgb(0, 128, 0)');

    await removePseudoState(':focus');
    await waitForDomNodeToBeHidden(TARGET_SHOWN_ON_FOCUS_SELECTOR);

    await debuggerStatement(frontend);

    const hiddenDisplayStyle = await getComputedStylesForDomNode(TARGET_SHOWN_ON_FOCUS_SELECTOR, 'display');
    assert.equal(hiddenDisplayStyle, 'none');
  });
});

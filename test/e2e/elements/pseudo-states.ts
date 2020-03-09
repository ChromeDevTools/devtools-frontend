// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {describe, it} from 'mocha';

import {getBrowserAndPages, resetPages, resourcesPath} from '../../shared/helper.js';
import {assertContentOfSelectedElementsNode, ensureGutterDecorationForDOMNodeExists, forcePseudoState, obtainComputedStylesForVisibleDOMNode, waitForElementsStyleSection} from '../helpers/elements-helpers.js';

describe('The Elements Tab', async () => {
  beforeEach(async () => {
    await resetPages();
  });

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
    await ensureGutterDecorationForDOMNodeExists();

    const displayComputedStyle = await obtainComputedStylesForVisibleDOMNode('.show-on-hover', 'display');
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
    await ensureGutterDecorationForDOMNodeExists();

    const displayComputedStyle = await obtainComputedStylesForVisibleDOMNode('.show-on-focus', 'display');
    assert.equal(displayComputedStyle, 'inline');

    const backgroundColorComputedStyle = await obtainComputedStylesForVisibleDOMNode('#focus', 'backgroundColor');
    assert.equal(backgroundColorComputedStyle, 'rgb(0, 128, 0)');
  });
});

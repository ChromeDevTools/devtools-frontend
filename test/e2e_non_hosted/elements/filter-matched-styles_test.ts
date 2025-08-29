// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {
  goToResourceAndWaitForStyleSection,
} from '../../e2e/helpers/elements-helpers.js';

describe('Filtering in the styles tab', () => {
  it('filters and highlights styles', async ({devToolsPage, inspectedPage}) => {
    await goToResourceAndWaitForStyleSection('elements/filter-matched-styles.html', devToolsPage, inspectedPage);
    const stylesTab = await devToolsPage.waitForAria('Styles panel');
    // Wait for rules to appear
    await devToolsPage.waitForAria('body, css selector');
    const filter = await devToolsPage.waitForAria('Filter', stylesTab);
    await filter.type('padding');
    const matches = await devToolsPage.waitForMany('.filter-match', 5, stylesTab);

    const matchesExpanded =
        await Promise.all(matches.map(node => node.evaluate(node => node.getAttribute('aria-expanded'))));
    assert.deepEqual(matchesExpanded, ['true', null, null, null, null]);

    const matchesText = await Promise.all(matches.map(node => node.evaluate(node => node.textContent)));
    assert.deepEqual(
        matchesText.map(v => v?.trim()),
        ['padding: 1px;', 'padding-top: 1px;', 'padding-right: 1px;', 'padding-bottom: 1px;', 'padding-left: 1px;']);
  });

  it('auto-expands and collapses shorthands when filtering', async ({devToolsPage, inspectedPage}) => {
    await goToResourceAndWaitForStyleSection('elements/filter-matched-styles.html', devToolsPage, inspectedPage);
    const stylesTab = await devToolsPage.waitForAria('Styles panel');
    // Wait for rules to appear
    await devToolsPage.waitForAria('body, css selector');
    const filter = await devToolsPage.waitForAria('Filter', stylesTab);
    await filter.type('-top');
    const matches = await devToolsPage.waitForMany('.filter-match', 6, stylesTab);
    const matchesExpanded =
        await Promise.all(matches.map(node => node.evaluate(node => node.getAttribute('aria-expanded'))));
    assert.deepEqual(matchesExpanded, [null, null, null, null, null, null]);
    const matchesParentsExpanded = await Promise.all(matches.map(
        node => node.evaluate(node => node.parentElement?.previousElementSibling?.getAttribute('aria-expanded'))));
    assert.deepEqual(matchesParentsExpanded, ['true', 'true', 'true', 'true', 'true', 'true']);

    const matchesText = await Promise.all(matches.map(node => node.evaluate(node => node.textContent)));
    assert.deepEqual(matchesText.map(v => v?.trim()), [
      'margin-top: 1px;',
      'padding-top: 1px;',
      'border-top-width: 1px;',
      'border-top-style: solid;',
      'border-top-color: black;',
      'margin-top: ;',
    ]);
  });
});

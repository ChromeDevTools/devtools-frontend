// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {openPanelViaMoreTools} from '../../e2e/helpers/settings-helpers.js';

describe('Rendering pane', () => {
  it('includes UI for simulating vision deficiencies', async ({devToolsPage}) => {
    await openPanelViaMoreTools('Rendering', devToolsPage);

    const option = await devToolsPage.waitFor('option[value="achromatopsia"]');
    const actual = await option.evaluate(node => {
      const select = node.closest('select');
      return select ? select.textContent : '';
    });
    const expected = [
      'No emulation',
      'Blurred vision',
      'Reduced contrast',
      'Protanopia (no red)',
      'Deuteranopia (no green)',
      'Tritanopia (no blue)',
      'Achromatopsia (no color)',
    ].join('');
    assert.deepEqual(actual, expected);
  });

  it('includes UI for emulating color-gamut media feature', async ({devToolsPage}) => {
    await openPanelViaMoreTools('Rendering', devToolsPage);

    const option = await devToolsPage.waitFor('option[value="rec2020"]');
    const actual = await option.evaluate(node => {
      const select = node.closest('select');
      return select ? select.textContent : '';
    });
    const expected = [
      'No emulation',
      'color-gamut: srgb',
      'color-gamut: p3',
      'color-gamut: rec2020',
    ].join('');
    assert.deepEqual(actual, expected);
  });

  it('includes UI for emulating prefers-contrast media feature', async function({devToolsPage}) {
    await openPanelViaMoreTools('Rendering', devToolsPage);

    const option = await devToolsPage.waitFor('option[value="custom"]');
    const actual = await option.evaluate(node => {
      const select = node.closest('select');
      return select ? select.textContent : '';
    });
    const expected = [
      'No emulation',
      'prefers-contrast: more',
      'prefers-contrast: less',
      'prefers-contrast: custom',
    ].join('');
    assert.deepEqual(actual, expected);
  });

  it('includes UI for emulating auto dark mode', async ({devToolsPage}) => {
    await openPanelViaMoreTools('Rendering', devToolsPage);
    await devToolsPage.waitFor('[title="Enable automatic dark mode"]');
  });
});

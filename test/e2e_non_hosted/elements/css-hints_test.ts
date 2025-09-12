// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {
  focusCSSPropertyValue,
  getPropertiesWithHints,
  goToResourceAndWaitForStyleSection,
  waitForAndClickTreeElementWithPartialText,
  waitForStyleRule,
} from '../../e2e/helpers/elements-helpers.js';

describe('CSS hints in the Styles panel', () => {
  it('can detect inactive CSS', async ({devToolsPage, inspectedPage}) => {
    await goToResourceAndWaitForStyleSection('elements/inactive-css-page.html', devToolsPage, inspectedPage);
    await waitForStyleRule('body', devToolsPage);
    await waitForAndClickTreeElementWithPartialText('wrapper', devToolsPage);
    await waitForStyleRule('#wrapper', devToolsPage);

    const propertiesWithHints = await getPropertiesWithHints(devToolsPage);
    assert.deepEqual(propertiesWithHints, ['align-content']);
  });

  it('does not show authoring hint when property value is invalid', async ({devToolsPage, inspectedPage}) => {
    await goToResourceAndWaitForStyleSection(
        'elements/inactive-css-with-invalid-value.html', devToolsPage, inspectedPage);
    await waitForStyleRule('body', devToolsPage);
    await waitForAndClickTreeElementWithPartialText('wrapper', devToolsPage);
    await waitForStyleRule('#wrapper', devToolsPage);

    const propertiesWithHints = await getPropertiesWithHints(devToolsPage);
    assert.deepEqual(propertiesWithHints, []);
  });

  it('updates the hint if the styles are edited', async ({devToolsPage, inspectedPage}) => {
    await goToResourceAndWaitForStyleSection('elements/inactive-css-page.html', devToolsPage, inspectedPage);
    await waitForStyleRule('body', devToolsPage);
    await waitForAndClickTreeElementWithPartialText('wrapper', devToolsPage);
    await waitForStyleRule('#wrapper', devToolsPage);

    assert.deepEqual(await getPropertiesWithHints(devToolsPage), ['align-content']);

    await focusCSSPropertyValue('#wrapper', 'flex-wrap', devToolsPage);
    await devToolsPage.typeText('wrap', {delay: 100});
    await devToolsPage.pressKey('Enter');

    await devToolsPage.waitForFunction(async () => {
      const propertiesWithHints = await getPropertiesWithHints(devToolsPage);
      return propertiesWithHints.length === 0;
    });
  });
});

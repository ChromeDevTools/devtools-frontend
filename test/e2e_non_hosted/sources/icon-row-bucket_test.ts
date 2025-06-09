// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {openSourcesPanel} from '../../e2e/helpers/sources-helpers.js';

describe('The row\'s icon bucket', function() {
  it('should use the correct error icon', async ({devToolsPage, inspectedPage}) => {
    const errorIconSelector = '.cm-messageIcon-error[name="cross-circle-filled"]';
    await inspectedPage.goToResource('network/trusted-type-violations-enforced.rawresponse');
    await openSourcesPanel(devToolsPage);
    const element = await devToolsPage.waitFor('[aria-label="trusted-type-violations-enforced.rawresponse, file"]');
    await element.click();

    await devToolsPage.waitFor(errorIconSelector);
    const iconsInSource = await devToolsPage.$$(errorIconSelector);
    assert.lengthOf(iconsInSource, 1);
    await devToolsPage.hover(errorIconSelector);
    const glassPane = await devToolsPage.waitFor('div.vbox.flex-auto.no-pointer-events');
    const icons = await devToolsPage.$$('.text-editor-row-message-icon[name="cross-circle-filled"]', glassPane);
    assert.lengthOf(icons, 2);
  });
});

// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {expectError} from '../../conductor/events.js';
import {$textContent, click, getBrowserAndPages, reloadDevTools, waitForAria} from '../../shared/helper.js';
import {
  navigateToSecurityTab,
} from '../helpers/security-helpers.js';

let preloadScriptId: string;

async function addPrivacyUIToHostConfig() {
  const {frontend} = getBrowserAndPages();
  const {identifier} = await frontend.evaluateOnNewDocument(`globalThis.hostConfigForTesting = {
    ...globalThis.hostConfigForTesting,
    devToolsPrivacyUI: {enabled: ${true}},
  };`);
  preloadScriptId = identifier;
}

async function removeScript() {
  // The tests end but DevTools might be still doing things resulting
  // in an error caused by the test runner closing or navigating the
  // target page.
  expectError('Inspected target navigated or closed');
  if (!preloadScriptId) {
    return;
  }
  const {frontend} = getBrowserAndPages();
  await frontend.removeScriptToEvaluateOnNewDocument(preloadScriptId);
}

describe('The controls tool without the Privacy and security panel open', function() {
  beforeEach(async () => {
    const {frontend} = getBrowserAndPages();

    await addPrivacyUIToHostConfig();
    await frontend.evaluate(`(async () => {
      const Common = await import('./core/common/common.js');
      const setting = Common.Settings.Settings.instance().createSetting('cookie-control-override-enabled', true);
      setting.set(true);
    })()`);
  });

  afterEach(async () => {
    await removeScript();
  });

  it('will remove reload bar without privacy module loaded', async () => {
    // Reload to give toolbar chance to spawn
    await reloadDevTools();

    // Infobar should be presenet since the setting was set in the before
    const infoBar = await waitForAria('To apply your updated controls, reload the page');
    assert.isNotNull(infoBar);

    const {target} = getBrowserAndPages();
    await target.reload();

    // Infobar should be gone after reloading the page
    assert.isNull(await $textContent('To apply your updated controls, reload the page'));
  });
});

describe('The Privacy and security panel', function() {
  before(async () => {
    await addPrivacyUIToHostConfig();
    await reloadDevTools();
  });

  after(async () => {
    await removeScript();
    await reloadDevTools();
  });

  it('shows reload bar when controls are changed', async () => {
    await navigateToSecurityTab(/* privcayEnabled=*/ true);
    await click('[aria-label="Temporarily limit third-party cookies, only when DevTools is open"]');

    // Infobar should appear after changing control
    const infoBar = await waitForAria('To apply your updated controls, reload the page');
    assert.isNotNull(infoBar);

    // Allow time for infobar to animate in before clicking the button
    await new Promise<void>(resolve => setTimeout(resolve, 550));
    await click('.infobar-main-row .close-button', {root: infoBar});

    // Infobar should be gone after clicking the close button
    assert.isNull(await $textContent('To apply your updated controls, reload the page'));
  });
});

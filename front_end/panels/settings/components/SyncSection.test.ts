// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {renderElementIntoDOM} from '../../../testing/DOMHelpers.js';
import {createFakeSetting, describeWithLocale} from '../../../testing/EnvironmentHelpers.js';
import * as RenderCoordinator from '../../../ui/components/render_coordinator/render_coordinator.js';
import * as SettingComponents from '../../../ui/components/settings/settings.js';

import * as PanelComponents from './components.js';

async function renderSyncSection(data: PanelComponents.SyncSection.SyncSectionData):
    Promise<{section: PanelComponents.SyncSection.SyncSection, shadowRoot: ShadowRoot}> {
  const section = new PanelComponents.SyncSection.SyncSection();
  renderElementIntoDOM(section);
  section.data = data;
  await RenderCoordinator.done();
  assert.isNotNull(section.shadowRoot);
  return {section, shadowRoot: section.shadowRoot};
}

describeWithLocale('SyncSection', () => {
  it('shows a warning tooltip when sync is not active and the user is signed in', async () => {
    const syncSetting = createFakeSetting<boolean>('setting', true);
    const {shadowRoot} = await renderSyncSection({
      syncInfo: {
        isSyncActive: false,
        accountEmail: 'user@gmail.com',
      },
      syncSetting
    });
    const warning = shadowRoot.querySelector('devtools-tooltip');
    assert.instanceOf(warning, HTMLElement);
    assert.include(warning.innerText, 'To turn this setting on');
  });

  it('shows a warning tooltip when sync is active but preferences bucket is not synced', async () => {
    const syncSetting = createFakeSetting<boolean>('setting', true);
    const {shadowRoot} = await renderSyncSection({
      syncInfo: {
        isSyncActive: true,
        arePreferencesSynced: false,
        accountEmail: 'user@gmail.com',
      },
      syncSetting
    });

    const warning = shadowRoot.querySelector('devtools-tooltip');
    assert.instanceOf(warning, HTMLElement);

    assert.include(warning.innerText, 'To turn this setting on');
  });

  it('disables the checkbox when sync is not active', async () => {
    const syncSetting = createFakeSetting<boolean>('setting', true);
    const {shadowRoot} = await renderSyncSection({
      syncInfo: {
        isSyncActive: false,
        accountEmail: 'user@gmail.com',
      },
      syncSetting
    });

    const settingCheckbox = shadowRoot.querySelector('setting-checkbox');
    assert.instanceOf(settingCheckbox, SettingComponents.SettingCheckbox.SettingCheckbox);
    assert.isNotNull(settingCheckbox.shadowRoot);

    const checkbox = settingCheckbox.shadowRoot.querySelector('input');
    assert.instanceOf(checkbox, HTMLInputElement);

    assert.isTrue(checkbox.disabled);
  });

  it('shows the avatar and email of the logged in user', async () => {
    const syncSetting = createFakeSetting<boolean>('setting', true);
    const {shadowRoot} = await renderSyncSection({
      syncInfo: {
        isSyncActive: true,
        arePreferencesSynced: true,
        accountEmail: 'user@gmail.com',
        accountImage: '<png encoded as base64>',
      },
      syncSetting,
    });

    const image = shadowRoot.querySelector('img');
    assert.instanceOf(image, HTMLImageElement);

    const email = shadowRoot.querySelector('.account-email');
    assert.instanceOf(email, HTMLElement);

    assert.include(email.innerText, 'user@gmail.com');
  });

  it('shows not signed in if the user is not logged in', async () => {
    const syncSetting = createFakeSetting<boolean>('setting', true);
    const {shadowRoot} = await renderSyncSection({
      syncInfo: {
        isSyncActive: false,
        arePreferencesSynced: false,
      },
      syncSetting,
    });

    const email = shadowRoot.querySelector('.not-signed-in');
    assert.instanceOf(email, HTMLElement);

    assert.include(email.innerText, 'not signed into Chrome');
  });
});

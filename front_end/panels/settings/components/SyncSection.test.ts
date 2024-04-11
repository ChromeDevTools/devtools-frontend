// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {renderElementIntoDOM} from '../../../testing/DOMHelpers.js';
import {createFakeSetting, describeWithLocale} from '../../../testing/EnvironmentHelpers.js';
import * as Coordinator from '../../../ui/components/render_coordinator/render_coordinator.js';
import * as SettingComponents from '../../../ui/components/settings/settings.js';

import * as PanelComponents from './components.js';

async function renderSyncSection(data: PanelComponents.SyncSection.SyncSectionData):
    Promise<{section: PanelComponents.SyncSection.SyncSection, shadowRoot: ShadowRoot}> {
  const section = new PanelComponents.SyncSection.SyncSection();
  renderElementIntoDOM(section);
  section.data = data;
  await Coordinator.RenderCoordinator.RenderCoordinator.instance().done();
  assert.isNotNull(section.shadowRoot);
  return {section, shadowRoot: section.shadowRoot};
}

describeWithLocale('SyncSection', () => {
  it('shows a warning when sync is not active', async () => {
    const syncSetting = createFakeSetting<boolean>('setting', true);
    const {shadowRoot} = await renderSyncSection({syncInfo: {isSyncActive: false}, syncSetting});
    const warning = shadowRoot.querySelector('.warning');
    assert.instanceOf(warning, HTMLElement);
    assert.include(warning.innerText, 'To turn this setting on');
  });

  it('shows a warning when sync is active but preferences bucket is not synced', async () => {
    const syncSetting = createFakeSetting<boolean>('setting', true);
    const {shadowRoot} =
        await renderSyncSection({syncInfo: {isSyncActive: true, arePreferencesSynced: false}, syncSetting});

    const warning = shadowRoot.querySelector('.warning');
    assert.instanceOf(warning, HTMLElement);

    assert.include(warning.innerText, 'To turn this setting on');
  });

  it('disables the checkbox when sync is not active', async () => {
    const syncSetting = createFakeSetting<boolean>('setting', true);
    const {shadowRoot} = await renderSyncSection({syncInfo: {isSyncActive: false}, syncSetting});

    const settingCheckbox = shadowRoot.querySelector('setting-checkbox');
    assert.instanceOf(settingCheckbox, SettingComponents.SettingCheckbox.SettingCheckbox);
    assert.isNotNull(settingCheckbox.shadowRoot);

    const checkbox = settingCheckbox.shadowRoot.querySelector('input');
    assert.instanceOf(checkbox, HTMLInputElement);

    assert.isTrue(checkbox.disabled);
  });

  it('shows the avatar and email of the logged in user when sync is active', async () => {
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
});

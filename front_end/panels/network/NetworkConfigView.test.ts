// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import * as Common from '../../core/common/common.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import {assertScreenshot, renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {createTarget, describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import {MockCDPConnection} from '../../testing/MockCDPConnection.js';
import * as UI from '../../ui/legacy/legacy.js';

import * as Network from './network.js';

describe('userAgentGroups', () => {
  it('Chrome UAs all have placeholder for major version patching', () => {
    const {userAgentGroups} = Network.NetworkConfigView;
    const chromeUAs = userAgentGroups.map(g => g.values).flat().filter(v => v.value.includes(' Chrome/'));
    assert.isAtLeast(chromeUAs.length, 10);
    // We should not add any new UAs without the %s that gets patched via `patchUserAgentWithChromeVersion`
    assert.isTrue(chromeUAs.every(v => v.value.includes('Chrome/%s')));
  });
});

describeWithEnvironment('NetworkConfigView', () => {
  it('renders the network config view', async () => {
    const networkConfigView = Network.NetworkConfigView.NetworkConfigView.instance({forceNew: true});
    renderElementIntoDOM(networkConfigView);
    await UI.Widget.Widget.allUpdatesComplete;

    await assertScreenshot('network/network_config_view.png');
  });

  it('supports enabling data saver emulation', async () => {
    const connection = new MockCDPConnection();
    const target = createTarget({connection});
    const saveDataSpy = Promise.withResolvers<Protocol.Emulation.SetDataSaverOverrideRequest|undefined>();
    connection.setSuccessHandler('Emulation.setDataSaverOverride', request => {
      saveDataSpy.resolve(request);
      const {promise, resolve} = Promise.withResolvers<Protocol.Emulation.SetDataSaverOverrideRequest|undefined>();
      saveDataSpy.promise = promise;
      saveDataSpy.resolve = resolve;
      return {};
    });

    const networkConfigView = Network.NetworkConfigView.NetworkConfigView.instance({forceNew: true});
    renderElementIntoDOM(networkConfigView);
    await UI.Widget.Widget.allUpdatesComplete;

    const saveDataSelect = networkConfigView.contentElement.querySelector(
        'select[aria-label="Override the value reported by navigator.connection.saveData on the page"]');
    assert.exists(saveDataSelect);
    assert.instanceOf(saveDataSelect, HTMLSelectElement);

    const select = (index: number): Promise<Protocol.Emulation.SetDataSaverOverrideRequest|undefined> => {
      const {promise} = saveDataSpy;
      saveDataSelect.selectedIndex = index;
      saveDataSelect.dispatchEvent(new Event('change'));
      return promise;
    };

    assert.deepEqual(await select(1), {dataSaverEnabled: true});
    assert.deepEqual(await select(2), {dataSaverEnabled: false});
    assert.deepEqual(await select(0), {dataSaverEnabled: undefined});
    target.dispose('test');
  });

  it('supports toggling disable cache setting', async () => {
    const networkConfigView = Network.NetworkConfigView.NetworkConfigView.instance({forceNew: true});
    renderElementIntoDOM(networkConfigView);
    await UI.Widget.Widget.allUpdatesComplete;

    const cacheDisabledSetting =
        Common.Settings.Settings.instance().resolve(SDK.SDKSettings.cacheDisabledSettingDescriptor);
    cacheDisabledSetting.set(false);

    const disableCacheCheckbox =
        networkConfigView.contentElement.querySelector('.network-config-disable-cache devtools-checkbox');
    assert.exists(disableCacheCheckbox);
    assert.instanceOf(disableCacheCheckbox, UI.UIUtils.CheckboxLabel);
    assert.isFalse(disableCacheCheckbox.checked);

    disableCacheCheckbox.click();
    assert.isTrue(cacheDisabledSetting.get());
    assert.isTrue(disableCacheCheckbox.checked);
  });

  it('supports toggling browser default user agent', async () => {
    const networkConfigView = Network.NetworkConfigView.NetworkConfigView.instance({forceNew: true});
    renderElementIntoDOM(networkConfigView);
    await UI.Widget.Widget.allUpdatesComplete;

    const autoCheckbox = networkConfigView.contentElement.querySelector('.network-config-ua devtools-checkbox');
    assert.exists(autoCheckbox);
    assert.instanceOf(autoCheckbox, UI.UIUtils.CheckboxLabel);
    assert.isTrue(autoCheckbox.checked);

    const customSection = networkConfigView.contentElement.querySelector('.network-config-ua-custom');
    assert.exists(customSection);
    assert.isFalse(customSection.classList.contains('checked'));

    autoCheckbox.click();
    await UI.Widget.Widget.allUpdatesComplete;
    assert.isFalse(autoCheckbox.checked);
    const updatedCustomSection = networkConfigView.contentElement.querySelector('.network-config-ua-custom');
    assert.exists(updatedCustomSection);
    assert.isTrue(updatedCustomSection.classList.contains('checked'));
  });

  it('supports selecting a user agent preset', async () => {
    const networkConfigView = Network.NetworkConfigView.NetworkConfigView.instance({forceNew: true});
    renderElementIntoDOM(networkConfigView);
    await UI.Widget.Widget.allUpdatesComplete;

    const autoCheckbox = networkConfigView.contentElement.querySelector('.network-config-ua devtools-checkbox') as
        UI.UIUtils.CheckboxLabel;
    if (autoCheckbox.checked) {
      autoCheckbox.click();
      await UI.Widget.Widget.allUpdatesComplete;
    }

    const uaSelect =
        networkConfigView.contentElement.querySelector('.network-config-ua-custom select') as HTMLSelectElement;
    assert.exists(uaSelect);

    uaSelect.selectedIndex = 1;
    uaSelect.dispatchEvent(new Event('change'));
    await UI.Widget.Widget.allUpdatesComplete;

    const uaInput = networkConfigView.contentElement.querySelector('.network-config-ua-custom input[type="text"]') as
        HTMLInputElement;
    assert.exists(uaInput);

    assert.strictEqual(uaInput.value, uaSelect.value);
    assert.strictEqual(SDK.NetworkManager.MultitargetNetworkManager.instance().currentUserAgent(), uaSelect.value);
  });

  it('shows error validation when custom user agent is empty', async () => {
    const networkConfigView = Network.NetworkConfigView.NetworkConfigView.instance({forceNew: true});
    renderElementIntoDOM(networkConfigView);
    await UI.Widget.Widget.allUpdatesComplete;

    const autoCheckbox = networkConfigView.contentElement.querySelector('.network-config-ua devtools-checkbox') as
        UI.UIUtils.CheckboxLabel;
    if (autoCheckbox.checked) {
      autoCheckbox.click();
      await UI.Widget.Widget.allUpdatesComplete;
    }

    const uaInput = networkConfigView.contentElement.querySelector('.network-config-ua-custom input[type="text"]') as
        HTMLInputElement;
    assert.exists(uaInput);

    uaInput.value = '';
    uaInput.dispatchEvent(new Event('input'));
    await UI.Widget.Widget.allUpdatesComplete;
    const errorElement =
        networkConfigView.contentElement.querySelector('.network-config-input-validation-error') as HTMLElement;
    assert.exists(errorElement);
    assert.strictEqual(errorElement.textContent, 'Custom user agent field is required');

    uaInput.value = 'Custom UA Test';
    uaInput.dispatchEvent(new Event('input'));
    await UI.Widget.Widget.allUpdatesComplete;
    const updatedErrorElement =
        networkConfigView.contentElement.querySelector('.network-config-input-validation-error') as HTMLElement;
    assert.exists(updatedErrorElement);
    assert.strictEqual(updatedErrorElement.textContent, '');
  });
});

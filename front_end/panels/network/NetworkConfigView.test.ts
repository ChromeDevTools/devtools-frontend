// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {describe, it} from 'mocha';
import sinon from 'sinon';

import * as Common from '../../core/common/common.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import {getAxeViolations} from '../../testing/AxeHelpers.js';
import {assertScreenshot, renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {createTarget, describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import {MockCDPConnection} from '../../testing/MockCDPConnection.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as PanelUtils from '../utils/utils.js';

import * as Network from './network.js';

describeWithEnvironment('NetworkConfigView', () => {
  describe('accessibility', () => {
    it('has no aXe violations', async () => {
      const networkConfigView = Network.NetworkConfigView.NetworkConfigView.instance({forceNew: true});
      renderElementIntoDOM(networkConfigView);
      await UI.Widget.Widget.allUpdatesComplete;

      assert.exists(networkConfigView.contentElement.querySelector('.network-config-disable-cache'));
      assert.exists(networkConfigView.contentElement.querySelector('.network-config-throttling'));
      assert.exists(networkConfigView.contentElement.querySelector('.network-config-ua'));
      assert.isEmpty(await getAxeViolations(networkConfigView.element));
    });
  });

  it('renders the network config view', async () => {
    const networkConfigView = Network.NetworkConfigView.NetworkConfigView.instance({forceNew: true});
    renderElementIntoDOM(networkConfigView, {includeCommonStyles: true});
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

  it('sends the Googlebook client hints when that preset is selected', async () => {
    SDK.NetworkManager.MultitargetNetworkManager.instance({forceNew: true});
    const connection = new MockCDPConnection();
    createTarget({connection});
    const {promise: overrideRequest, resolve} = Promise.withResolvers<Protocol.Network.SetUserAgentOverrideRequest>();
    connection.setSuccessHandler('Network.setUserAgentOverride', request => {
      if (request.userAgent.includes('CrOS x86_64 14541.0.0')) {
        resolve(request);
      }
      return {};
    });

    const clock = sinon.useFakeTimers({now: new Date(2026, 9, 1), toFake: ['Date']});
    try {
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
      const googlebookOption = Array.from(uaSelect.options).find(option => option.text === 'Chrome \u2014 Googlebook');
      assert.isOk(googlebookOption);
      uaSelect.value = googlebookOption.value;
      uaSelect.dispatchEvent(new Event('change'));
      await UI.Widget.Widget.allUpdatesComplete;

      const {userAgentMetadata} = await overrideRequest;
      assert.exists(userAgentMetadata);
      assert.strictEqual(userAgentMetadata.platform, 'Android');
      assert.strictEqual(userAgentMetadata.platformVersion, '16.0.0');
      assert.isFalse(userAgentMetadata.mobile);
      assert.isTrue(userAgentMetadata.brands?.every(brand => !brand.version.includes('%s')));
    } finally {
      clock.restore();
    }
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

  it('selects the custom user agent input when the custom option is chosen', async () => {
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
    const uaInput = networkConfigView.contentElement.querySelector('.network-config-ua-custom input[type="text"]') as
        HTMLInputElement;
    assert.exists(uaSelect);
    assert.exists(uaInput);

    uaSelect.selectedIndex = 1;
    uaSelect.dispatchEvent(new Event('change'));
    await UI.Widget.Widget.allUpdatesComplete;
    assert.isNotEmpty(uaInput.value);

    uaSelect.value = 'custom';
    uaSelect.dispatchEvent(new Event('change'));
    assert.strictEqual(uaInput.selectionStart, 0);
    assert.strictEqual(uaInput.selectionEnd, uaInput.value.length);
  });

  it('reveals the custom user agent field', async () => {
    const showViewStub = sinon.stub(UI.ViewManager.ViewManager.instance(), 'showView').resolves();
    const highlightStub = sinon.stub(PanelUtils.PanelUtils, 'highlightElement');
    const networkConfigView = Network.NetworkConfigView.NetworkConfigView.instance({forceNew: true});
    renderElementIntoDOM(networkConfigView);
    await UI.Widget.Widget.allUpdatesComplete;
    const autoCheckbox = networkConfigView.contentElement.querySelector<UI.UIUtils.CheckboxLabel>(
        '.network-config-ua devtools-checkbox');
    assert.isOk(autoCheckbox);
    autoCheckbox.click();
    await UI.Widget.Widget.allUpdatesComplete;
    const uaSelect =
        networkConfigView.contentElement.querySelector<HTMLSelectElement>('.network-config-ua-custom select');
    assert.isOk(uaSelect);

    const revealer = new Network.NetworkConfigView.UserAgentRevealer();
    await revealer.reveal();

    sinon.assert.calledOnceWithExactly(showViewStub, 'network.config');
    assert.strictEqual(networkConfigView.element.shadowRoot?.activeElement, uaSelect);
    sinon.assert.calledOnceWithExactly(highlightStub, uaSelect);
  });
});

// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {describe, it} from 'mocha';
import sinon from 'sinon';

import * as Common from '../../core/common/common.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import {getAxeViolations} from '../../testing/AxeHelpers.js';
import {assertScreenshot, renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {createTarget, describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import {MockCDPConnection} from '../../testing/MockCDPConnection.js';
import * as UI from '../../ui/legacy/legacy.js';

import * as Network from './network.js';

function findGooglebookPreset() {
  const preset = Network.NetworkConfigView.userAgentGroups.map(g => g.values)
                     .flat()
                     .find(v => v.title === 'Chrome \u2014 Googlebook');
  assert.exists(preset);
  return preset;
}

describe('userAgentGroups', () => {
  it('Chrome UAs all have placeholder for major version patching', () => {
    const {userAgentGroups} = Network.NetworkConfigView;
    const chromeUAs = userAgentGroups.map(g => g.values).flat().filter(v => v.value.includes(' Chrome/'));
    assert.isAtLeast(chromeUAs.length, 10);
    // We should not add any new UAs without the %s that gets patched via `patchUserAgentWithChromeVersion`
    assert.isTrue(chromeUAs.every(v => v.value.includes('Chrome/%s')));
  });

  it('has no duplicate UA strings, so each one resolves to its own client hints', () => {
    const {userAgentGroups} = Network.NetworkConfigView;
    const values = userAgentGroups.map(g => g.values).flat().map(v => v.value);
    assert.lengthOf(new Set(values), values.length);
  });

  it('Googlebook sends a Chrome OS UA string and reports desktop Android client hints', () => {
    const googlebook = findGooglebookPreset();
    assert.strictEqual(
        googlebook.value,
        'Mozilla/5.0 (X11; CrOS x86_64 14541.0.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/%s Safari/537.36');
    assert.strictEqual(googlebook.metadata?.platform, 'Android');
    assert.strictEqual(googlebook.metadata?.architecture, 'x86');
    assert.strictEqual(googlebook.metadata?.bitness, '64');
    assert.strictEqual(googlebook.metadata?.model, '');
    assert.isFalse(googlebook.metadata?.mobile);
  });

  it('computes the Googlebook Android version each time its client hints are read', () => {
    const clock = sinon.useFakeTimers({now: new Date(2026, 8, 1), toFake: ['Date']});
    try {
      const googlebook = findGooglebookPreset();
      assert.strictEqual(googlebook.metadata?.platformVersion, '15.0.0');
      clock.setSystemTime(new Date(2026, 9, 1));
      assert.strictEqual(googlebook.metadata?.platformVersion, '16.0.0');
    } finally {
      clock.restore();
    }
  });

  it('patches user agent presets with the runtime Chrome version', () => {
    const chromeMatch = navigator.userAgent.match(/(?:^|\W)(?:Chrome|HeadlessChrome)\/((\d+)\.\S+)/);
    assert.isNotNull(chromeMatch);
    const [, chromeUserAgentVersion, majorVersion] = chromeMatch;

    for (const userAgentDescriptor of Network.NetworkConfigView.userAgentGroups) {
      for (const userAgentVersion of userAgentDescriptor.values) {
        const splitUserAgentVersion = userAgentVersion.value.split('%s');
        assert.isAtMost(splitUserAgentVersion.length, 3,
                        `${userAgentVersion.title}: Too many %s in user agent string.`);
        assert.isTrue(splitUserAgentVersion.length === 1 || splitUserAgentVersion[0].endsWith('Chrome/') ||
                          splitUserAgentVersion[0].endsWith('CriOS/'),
                      `${userAgentVersion.title}: First %s match was not prefixed with either Chrome/ or CriOS/`);

        const expectedPatchedUserAgentVersion = splitUserAgentVersion.length === 1 ?
            splitUserAgentVersion[0] :
            splitUserAgentVersion.length === 2 ?
            `${splitUserAgentVersion[0]}${chromeUserAgentVersion}${splitUserAgentVersion[1]}` :
            `${splitUserAgentVersion[0]}${chromeUserAgentVersion}${splitUserAgentVersion[1]}${majorVersion}.0.100.0${
                splitUserAgentVersion[2]}`;

        const patchedUserAgentVersion =
            SDK.NetworkManager.MultitargetNetworkManager.patchUserAgentWithChromeVersion(userAgentVersion.value);
        assert.strictEqual(patchedUserAgentVersion, expectedPatchedUserAgentVersion, userAgentVersion.title);
      }
    }
  });

  it('formats all user agent presets against a fixed Chrome version', () => {
    sinon.stub(Platform.HostRuntime.HOST_RUNTIME, 'getUserAgent').returns('Mozilla/5.0 Chrome/999.0.0.0');
    const patchedPresets = Network.NetworkConfigView.userAgentGroups.flatMap(
        userAgentDescriptor => userAgentDescriptor.values.map(
            userAgentVersion => ({
              title: userAgentVersion.title,
              value:
                  SDK.NetworkManager.MultitargetNetworkManager.patchUserAgentWithChromeVersion(userAgentVersion.value),
            })));

    assert.deepEqual(patchedPresets, [
      {
        title: 'Android (4.0.2) Browser \u2014 Galaxy Nexus',
        value:
            'Mozilla/5.0 (Linux; U; Android 4.0.2; en-us; Galaxy Nexus Build/ICL53F) AppleWebKit/534.30 (KHTML, like Gecko) Version/4.0 Mobile Safari/534.30',
      },
      {
        title: 'Android (2.3) Browser \u2014 Nexus S',
        value:
            'Mozilla/5.0 (Linux; U; Android 2.3.6; en-us; Nexus S Build/GRK39F) AppleWebKit/533.1 (KHTML, like Gecko) Version/4.0 Mobile Safari/533.1',
      },
      {
        title: 'BlackBerry \u2014 BB10',
        value:
            'Mozilla/5.0 (BB10; Touch) AppleWebKit/537.1+ (KHTML, like Gecko) Version/10.0.0.1337 Mobile Safari/537.1+',
      },
      {
        title: 'BlackBerry \u2014 PlayBook 2.1',
        value:
            'Mozilla/5.0 (PlayBook; U; RIM Tablet OS 2.1.0; en-US) AppleWebKit/536.2+ (KHTML, like Gecko) Version/7.2.1.0 Safari/536.2+',
      },
      {
        title: 'BlackBerry \u2014 9900',
        value:
            'Mozilla/5.0 (BlackBerry; U; BlackBerry 9900; en-US) AppleWebKit/534.11+ (KHTML, like Gecko) Version/7.0.0.187 Mobile Safari/534.11+',
      },
      {
        title: 'Chrome \u2014 Android Mobile',
        value:
            'Mozilla/5.0 (Linux; Android 16; Pixel 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/999.0.0.0 Mobile Safari/537.36',
      },
      {
        title: 'Chrome \u2014 Android Mobile (high-end)',
        value:
            'Mozilla/5.0 (Linux; Android 16; Pixel 10 Pro XL) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/999.0.0.0 Mobile Safari/537.36',
      },
      {
        title: 'Chrome \u2014 Android Tablet',
        value:
            'Mozilla/5.0 (Linux; Android 16; Pixel Tablet) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/999.0.0.0 Safari/537.36',
      },
      {
        title: 'Chrome \u2014 iPhone',
        value:
            'Mozilla/5.0 (iPhone; CPU iPhone OS 26_4_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/999.0.0.0 Mobile/15E148 Safari/604.1',
      },
      {
        title: 'Chrome \u2014 iPad',
        value:
            'Mozilla/5.0 (iPad; CPU OS 26_4_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/999.0.0.0 Mobile/15E148 Safari/604.1',
      },
      {
        title: 'Chrome \u2014 Chrome OS',
        value:
            'Mozilla/5.0 (X11; CrOS x86_64 10066.0.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/999.0.0.0 Safari/537.36',
      },
      {
        title: 'Chrome \u2014 Googlebook',
        value:
            'Mozilla/5.0 (X11; CrOS x86_64 14541.0.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/999.0.0.0 Safari/537.36',
      },
      {
        title: 'Chrome \u2014 Mac',
        value:
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/999.0.0.0 Safari/537.36',
      },
      {
        title: 'Chrome \u2014 Windows',
        value:
            'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/999.0.0.0 Safari/537.36',
      },
      {
        title: 'Firefox \u2014 Android Mobile',
        value: 'Mozilla/5.0 (Android 4.4; Mobile; rv:70.0) Gecko/70.0 Firefox/70.0',
      },
      {
        title: 'Firefox \u2014 Android Tablet',
        value: 'Mozilla/5.0 (Android 4.4; Tablet; rv:70.0) Gecko/70.0 Firefox/70.0',
      },
      {
        title: 'Firefox \u2014 iPhone',
        value:
            'Mozilla/5.0 (iPhone; CPU iPhone OS 8_3 like Mac OS X) AppleWebKit/600.1.4 (KHTML, like Gecko) FxiOS/1.0 Mobile/12F69 Safari/600.1.4',
      },
      {
        title: 'Firefox \u2014 iPad',
        value:
            'Mozilla/5.0 (iPad; CPU iPhone OS 8_3 like Mac OS X) AppleWebKit/600.1.4 (KHTML, like Gecko) FxiOS/1.0 Mobile/12F69 Safari/600.1.4',
      },
      {
        title: 'Firefox \u2014 Mac',
        value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.14; rv:70.0) Gecko/20100101 Firefox/70.0',
      },
      {
        title: 'Firefox \u2014 Windows',
        value: 'Mozilla/5.0 (Windows NT 10.0; WOW64; rv:70.0) Gecko/20100101 Firefox/70.0',
      },
      {
        title: 'Googlebot',
        value: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
      },
      {
        title: 'Googlebot Desktop',
        value:
            'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; Googlebot/2.1; +http://www.google.com/bot.html) Chrome/999.0.0.0 Safari/537.36',
      },
      {
        title: 'Googlebot Smartphone',
        value:
            'Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/999.0.0.0 Mobile Safari/537.36 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
      },
      {
        title: 'Internet Explorer 11',
        value: 'Mozilla/5.0 (Windows NT 10.0; WOW64; Trident/7.0; rv:11.0) like Gecko',
      },
      {
        title: 'Internet Explorer 10',
        value: 'Mozilla/5.0 (compatible; MSIE 10.0; Windows NT 6.1; WOW64; Trident/6.0)',
      },
      {
        title: 'Internet Explorer 9',
        value: 'Mozilla/5.0 (compatible; MSIE 9.0; Windows NT 6.1; Trident/5.0)',
      },
      {
        title: 'Internet Explorer 8',
        value: 'Mozilla/4.0 (compatible; MSIE 8.0; Windows NT 6.0; Trident/4.0)',
      },
      {
        title: 'Internet Explorer 7',
        value: 'Mozilla/4.0 (compatible; MSIE 7.0; Windows NT 6.0)',
      },
      {
        title: 'Microsoft Edge (Chromium) \u2014 Windows',
        value:
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/999.0.0.0 Safari/537.36 Edg/999.0.100.0',
      },
      {
        title: 'Microsoft Edge (Chromium) \u2014 Mac',
        value:
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Chrome/999.0.0.0 Safari/604.1 Edg/999.0.100.0',
      },
      {
        title: 'Microsoft Edge \u2014 iPhone',
        value:
            'Mozilla/5.0 (iPhone; CPU iPhone OS 12_3_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/12.1.1 EdgiOS/44.5.0.10 Mobile/15E148 Safari/604.1',
      },
      {
        title: 'Microsoft Edge \u2014 iPad',
        value:
            'Mozilla/5.0 (iPad; CPU OS 12_3_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/12.0 EdgiOS/44.5.2 Mobile/15E148 Safari/605.1.15',
      },
      {
        title: 'Microsoft Edge \u2014 Android Mobile',
        value:
            'Mozilla/5.0 (Linux; Android 8.1.0; Pixel Build/OPM4.171019.021.D1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/999.0.0.0 Mobile Safari/537.36 EdgA/42.0.0.2057',
      },
      {
        title: 'Microsoft Edge \u2014 Android Tablet',
        value:
            'Mozilla/5.0 (Linux; Android 6.0.1; Nexus 7 Build/MOB30X) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/999.0.0.0 Safari/537.36 EdgA/42.0.0.2057',
      },
      {
        title: 'Microsoft Edge (EdgeHTML) \u2014 Windows',
        value:
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/999.0.0.0 Safari/537.36 Edge/18.19042',
      },
      {
        title: 'Microsoft Edge (EdgeHTML) \u2014 XBox',
        value:
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; Xbox; Xbox One) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/999.0.0.0 Safari/537.36 Edge/18.19041',
      },
      {
        title: 'Opera \u2014 Mac',
        value:
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/999.0.0.0 Safari/537.36 OPR/65.0.3467.48',
      },
      {
        title: 'Opera \u2014 Windows',
        value:
            'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/999.0.0.0 Safari/537.36 OPR/65.0.3467.48',
      },
      {
        title: 'Opera (Presto) \u2014 Mac',
        value: 'Opera/9.80 (Macintosh; Intel Mac OS X 10.9.1) Presto/2.12.388 Version/12.16',
      },
      {
        title: 'Opera (Presto) \u2014 Windows',
        value: 'Opera/9.80 (Windows NT 6.1) Presto/2.12.388 Version/12.16',
      },
      {
        title: 'Opera Mobile \u2014 Android Mobile',
        value: 'Opera/12.02 (Android 4.1; Linux; Opera Mobi/ADR-1111101157; U; en-US) Presto/2.9.201 Version/12.02',
      },
      {
        title: 'Opera Mini \u2014 iOS',
        value: 'Opera/9.80 (iPhone; Opera Mini/8.0.0/34.2336; U; en) Presto/2.8.119 Version/11.10',
      },
      {
        title: 'Safari \u2014 iPad iOS 13.2',
        value:
            'Mozilla/5.0 (iPad; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1',
      },
      {
        title: 'Safari \u2014 iPhone iOS 13.2',
        value:
            'Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1',
      },
      {
        title: 'Safari \u2014 Mac',
        value:
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Safari/605.1.15',
      },
      {
        title: 'UC Browser \u2014 Android Mobile',
        value:
            'Mozilla/5.0 (Linux; U; Android 8.1.0; en-US; Nexus 6P Build/OPM7.181205.001) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/999.0.0.0 UCBrowser/12.11.1.1197 Mobile Safari/537.36',
      },
      {
        title: 'UC Browser \u2014 iOS',
        value:
            'Mozilla/5.0 (iPhone; CPU iPhone OS 12_1 like Mac OS X; zh-CN) AppleWebKit/537.51.1 (KHTML, like Gecko) Mobile/16B92 UCBrowser/12.1.7.1109 Mobile AliApp(TUnionSDK/0.1.20.3)',
      },
      {
        title: 'UC Browser \u2014 Windows Phone',
        value:
            'Mozilla/5.0 (compatible; MSIE 10.0; Windows Phone 8.0; Trident/6.0; IEMobile/10.0; ARM; Touch; NOKIA; Lumia 920) UCBrowser/10.1.0.563 Mobile',
      },
    ]);
  });
});

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
      uaSelect.value =
          SDK.NetworkManager.MultitargetNetworkManager.patchUserAgentWithChromeVersion(findGooglebookPreset().value);
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
});

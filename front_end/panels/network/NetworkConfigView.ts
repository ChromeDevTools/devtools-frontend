// Copyright (c) 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import * as MobileThrottling from '../mobile_throttling/mobile_throttling.js';
import * as EmulationComponents from '../settings/emulation/components/components.js';

import networkConfigViewStyles from './networkConfigView.css.js';

const UIStrings = {
  /**
   *@description Text in Network Config View of the Network panel
   */
  custom: 'Custom...',
  /**
   *@description Other user agent element placeholder in Network Config View of the Network panel
   */
  enterACustomUserAgent: 'Enter a custom user agent',
  /**
   *@description Error message for empty custom user agent input
   */
  customUserAgentFieldIsRequired: 'Custom user agent field is required',
  /**
   *@description Text in Network Config View of the Network panel
   */
  caching: 'Caching',
  /**
   *@description Text in Network Config View of the Network panel
   */
  disableCache: 'Disable cache',
  /**
   *@description Text in Network Config View of the Network panel
   */
  networkThrottling: 'Network throttling',
  /**
   *@description Text in Network Config View of the Network panel
   */
  userAgent: 'User agent',
  /**
   *@description Text in Network Config View of the Network panel
   */
  selectAutomatically: 'Use browser default',
  /**
   * @description Title of a section in the Network conditions view that includes
   * a set of checkboxes to override the content encodings supported by the browser.
   */
  acceptedEncoding: 'Accepted `Content-Encoding`s',
  /**
   * @description Status text for successful update of client hints.
   */
  clientHintsStatusText: 'User agent updated.',
  /**
   * @description The aria alert message when the Network conditions panel is shown.
   */
  networkConditionsPanelShown: 'Network conditions shown',
};
const str_ = i18n.i18n.registerUIStrings('panels/network/NetworkConfigView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

let networkConfigViewInstance: NetworkConfigView;

export class NetworkConfigView extends UI.Widget.VBox {
  constructor() {
    super(true);

    this.element.setAttribute('jslog', `${VisualLogging.panel('network-conditions').track({resize: true})}`);

    this.contentElement.classList.add('network-config');

    this.createCacheSection();
    this.contentElement.createChild('div').classList.add('panel-section-separator');
    this.createNetworkThrottlingSection();
    this.contentElement.createChild('div').classList.add('panel-section-separator');
    this.createUserAgentSection();
    this.contentElement.createChild('div').classList.add('panel-section-separator');
    this.createAcceptedEncodingSection();
  }

  static instance(opts: {
    forceNew: boolean|null,
  } = {forceNew: null}): NetworkConfigView {
    const {forceNew} = opts;
    if (!networkConfigViewInstance || forceNew) {
      networkConfigViewInstance = new NetworkConfigView();
    }
    return networkConfigViewInstance;
  }

  static createUserAgentSelectAndInput(title: string): {
    select: HTMLSelectElement,
    input: HTMLInputElement,
    error: HTMLElement,
  } {
    const userAgentSetting = Common.Settings.Settings.instance().createSetting('custom-user-agent', '');
    const userAgentMetadataSetting =
        Common.Settings.Settings.instance().createSetting<Protocol.Emulation.UserAgentMetadata|null>(
            'custom-user-agent-metadata', null);
    const userAgentSelectElement = document.createElement('select');
    userAgentSelectElement.setAttribute(
        'jslog', `${VisualLogging.dropDown().track({change: true}).context(userAgentSetting.name)}`);
    UI.ARIAUtils.setLabel(userAgentSelectElement, title);

    const customOverride = {title: i18nString(UIStrings.custom), value: 'custom'};
    userAgentSelectElement.appendChild(UI.UIUtils.createOption(customOverride.title, customOverride.value, 'custom'));

    for (const userAgentDescriptor of userAgentGroups) {
      const groupElement = (userAgentSelectElement.createChild('optgroup') as HTMLOptGroupElement);
      groupElement.label = userAgentDescriptor.title;
      for (const userAgentVersion of userAgentDescriptor.values) {
        const userAgentValue =
            SDK.NetworkManager.MultitargetNetworkManager.patchUserAgentWithChromeVersion(userAgentVersion.value);
        groupElement.appendChild(UI.UIUtils.createOption(
            userAgentVersion.title, userAgentValue, Platform.StringUtilities.toKebabCase(userAgentVersion.title)));
      }
    }

    userAgentSelectElement.selectedIndex = 0;

    const otherUserAgentElement = UI.UIUtils.createInput('', 'text');
    otherUserAgentElement.setAttribute(
        'jslog', `${VisualLogging.textField().track({keydown: true}).context(userAgentSetting.name)}`);
    otherUserAgentElement.value = userAgentSetting.get();
    UI.Tooltip.Tooltip.install(otherUserAgentElement, userAgentSetting.get());
    otherUserAgentElement.placeholder = i18nString(UIStrings.enterACustomUserAgent);
    otherUserAgentElement.required = true;
    UI.ARIAUtils.setLabel(otherUserAgentElement, otherUserAgentElement.placeholder);

    const errorElement = document.createElement('div');
    errorElement.classList.add('network-config-input-validation-error');
    UI.ARIAUtils.markAsAlert(errorElement);
    if (!otherUserAgentElement.value) {
      errorElement.textContent = i18nString(UIStrings.customUserAgentFieldIsRequired);
    }

    settingChanged();
    userAgentSelectElement.addEventListener('change', userAgentSelected, false);
    otherUserAgentElement.addEventListener('input', applyOtherUserAgent, false);

    function userAgentSelected(): void {
      const value = userAgentSelectElement.options[userAgentSelectElement.selectedIndex].value;
      if (value !== customOverride.value) {
        userAgentSetting.set(value);
        otherUserAgentElement.value = value;
        UI.Tooltip.Tooltip.install(otherUserAgentElement, value);
        const userAgentMetadata = getUserAgentMetadata(value);
        userAgentMetadataSetting.set(userAgentMetadata);
        SDK.NetworkManager.MultitargetNetworkManager.instance().setCustomUserAgentOverride(value, userAgentMetadata);
      } else {
        userAgentMetadataSetting.set(null);
        otherUserAgentElement.select();
      }
      errorElement.textContent = '';
      const userAgentChangeEvent = new CustomEvent('user-agent-change', {detail: {value}});
      userAgentSelectElement.dispatchEvent(userAgentChangeEvent);
    }

    function settingChanged(): void {
      const value = userAgentSetting.get();
      const options = userAgentSelectElement.options;
      let selectionRestored = false;
      for (let i = 0; i < options.length; ++i) {
        if (options[i].value === value) {
          userAgentSelectElement.selectedIndex = i;
          selectionRestored = true;
          break;
        }
      }

      if (!selectionRestored) {
        userAgentSelectElement.selectedIndex = 0;
      }
    }

    function applyOtherUserAgent(): void {
      if (userAgentSetting.get() !== otherUserAgentElement.value) {
        if (!otherUserAgentElement.value) {
          errorElement.textContent = i18nString(UIStrings.customUserAgentFieldIsRequired);
        } else {
          errorElement.textContent = '';
        }
        userAgentSetting.set(otherUserAgentElement.value);
        UI.Tooltip.Tooltip.install(otherUserAgentElement, otherUserAgentElement.value);
        settingChanged();
      }
    }

    return {select: userAgentSelectElement, input: otherUserAgentElement, error: errorElement};
  }

  private createSection(title: string, className?: string): Element {
    const section = this.contentElement.createChild('section', 'network-config-group');
    if (className) {
      section.classList.add(className);
    }
    section.createChild('div', 'network-config-title').textContent = title;
    return section.createChild('div', 'network-config-fields');
  }

  private createCacheSection(): void {
    const section = this.createSection(i18nString(UIStrings.caching), 'network-config-disable-cache');
    section.appendChild(UI.SettingsUI.createSettingCheckbox(
        i18nString(UIStrings.disableCache), Common.Settings.Settings.instance().moduleSetting('cache-disabled'), true));
  }

  private createNetworkThrottlingSection(): void {
    const title = i18nString(UIStrings.networkThrottling);
    const section = this.createSection(title, 'network-config-throttling');
    const networkThrottlingSelect = (section.createChild('select', 'chrome-select') as HTMLSelectElement);
    MobileThrottling.ThrottlingManager.throttlingManager().decorateSelectWithNetworkThrottling(networkThrottlingSelect);
    UI.ARIAUtils.setLabel(networkThrottlingSelect, title);
  }

  private createUserAgentSection(): void {
    const userAgentMetadataSetting =
        Common.Settings.Settings.instance().createSetting<Protocol.Emulation.UserAgentMetadata|null>(
            'custom-user-agent-metadata', null);
    const customUserAgentSetting = Common.Settings.Settings.instance().createSetting('custom-user-agent', '');

    const title = i18nString(UIStrings.userAgent);
    const section = this.createSection(title, 'network-config-ua');
    const checkboxLabel = UI.UIUtils.CheckboxLabel.create(
        i18nString(UIStrings.selectAutomatically), true, undefined, customUserAgentSetting.name);
    section.appendChild(checkboxLabel);
    const autoCheckbox = checkboxLabel.checkboxElement;

    customUserAgentSetting.addChangeListener(() => {
      if (autoCheckbox.checked) {
        return;
      }
      const customUA = customUserAgentSetting.get();
      const userAgentMetadata = getUserAgentMetadata(customUA);
      SDK.NetworkManager.MultitargetNetworkManager.instance().setCustomUserAgentOverride(customUA, userAgentMetadata);
    });
    const customUserAgentSelectBox = section.createChild('div', 'network-config-ua-custom');
    autoCheckbox.addEventListener('change', userAgentSelectBoxChanged);
    const customSelectAndInput = NetworkConfigView.createUserAgentSelectAndInput(title);
    customSelectAndInput.select.classList.add('chrome-select');
    customUserAgentSelectBox.appendChild(customSelectAndInput.select);
    customUserAgentSelectBox.appendChild(customSelectAndInput.input);
    customUserAgentSelectBox.appendChild(customSelectAndInput.error);

    const clientHintsContainer = customUserAgentSelectBox.createChild('div', 'client-hints-form');
    const clientHints = new EmulationComponents.UserAgentClientHintsForm.UserAgentClientHintsForm();
    const userAgentMetaDataSetting = userAgentMetadataSetting.get();
    const initialUserAgentMetaData = getUserAgentMetadata(customSelectAndInput.select.value);
    clientHints.value = {
      showMobileCheckbox: true,
      showSubmitButton: true,
      metaData: userAgentMetaDataSetting || initialUserAgentMetaData || undefined,
    };
    clientHintsContainer.appendChild(clientHints);

    customSelectAndInput.select.addEventListener('user-agent-change', (event: Event) => {
      const userStringValue = (event as CustomEvent).detail.value;
      const userAgentMetadata = userStringValue ? getUserAgentMetadata(userStringValue) : null;
      clientHints.value = {
        metaData: userAgentMetadata || undefined,
        showMobileCheckbox: true,
        showSubmitButton: true,
      };
      userAgentUpdateButtonStatusText.textContent = '';
    });

    clientHints.addEventListener('clienthintschange', () => {
      customSelectAndInput.select.value = 'custom';
      userAgentUpdateButtonStatusText.textContent = '';
    });

    clientHints.addEventListener('clienthintssubmit', (event: Event) => {
      const metaData: Protocol.Emulation.UserAgentMetadata = (event as CustomEvent).detail.value;
      const customUA = customUserAgentSetting.get();
      userAgentMetadataSetting.set(metaData);
      SDK.NetworkManager.MultitargetNetworkManager.instance().setCustomUserAgentOverride(customUA, metaData);
      userAgentUpdateButtonStatusText.textContent = i18nString(UIStrings.clientHintsStatusText);
    });

    const userAgentUpdateButtonStatusText = section.createChild('span', 'status-text');
    userAgentUpdateButtonStatusText.textContent = '';

    userAgentSelectBoxChanged();

    function userAgentSelectBoxChanged(): void {
      const useCustomUA = !autoCheckbox.checked;
      customUserAgentSelectBox.classList.toggle('checked', useCustomUA);
      customSelectAndInput.select.disabled = !useCustomUA;
      customSelectAndInput.input.disabled = !useCustomUA;
      customSelectAndInput.error.hidden = !useCustomUA;
      clientHints.disabled = !useCustomUA;
      const customUA = useCustomUA ? customUserAgentSetting.get() : '';
      const userAgentMetadata = useCustomUA ? getUserAgentMetadata(customUA) : null;
      SDK.NetworkManager.MultitargetNetworkManager.instance().setCustomUserAgentOverride(customUA, userAgentMetadata);
    }
  }

  private createAcceptedEncodingSection(): void {
    const useCustomAcceptedEncodingSetting =
        Common.Settings.Settings.instance().createSetting('use-custom-accepted-encodings', false);
    const customAcceptedEncodingSetting = Common.Settings.Settings.instance().createSetting(
        'custom-accepted-encodings',
        `${Protocol.Network.ContentEncoding.Gzip},${Protocol.Network.ContentEncoding.Br},${
            Protocol.Network.ContentEncoding.Deflate}`);

    const title = i18nString(UIStrings.acceptedEncoding);
    const section = this.createSection(title, 'network-config-accepted-encoding');
    const checkboxLabel = UI.UIUtils.CheckboxLabel.create(
        i18nString(UIStrings.selectAutomatically), true, undefined, useCustomAcceptedEncodingSetting.name);
    section.appendChild(checkboxLabel);
    const autoCheckbox = checkboxLabel.checkboxElement;

    function onSettingChange(): void {
      if (!useCustomAcceptedEncodingSetting.get()) {
        SDK.NetworkManager.MultitargetNetworkManager.instance().clearCustomAcceptedEncodingsOverride();
      } else {
        SDK.NetworkManager.MultitargetNetworkManager.instance().setCustomAcceptedEncodingsOverride(
            customAcceptedEncodingSetting.get() === '' ?
                [] :
                customAcceptedEncodingSetting.get().split(',') as Protocol.Network.ContentEncoding[]);
      }
    }

    customAcceptedEncodingSetting.addChangeListener(onSettingChange);
    useCustomAcceptedEncodingSetting.addChangeListener(onSettingChange);

    const encodingsSection = section.createChild('div', 'network-config-accepted-encoding-custom');
    encodingsSection.setAttribute('jslog', `${VisualLogging.section().context(customAcceptedEncodingSetting.name)}`);
    autoCheckbox.checked = !useCustomAcceptedEncodingSetting.get();
    autoCheckbox.addEventListener('change', acceptedEncodingsChanged);
    const checkboxes = new Map<Protocol.Network.ContentEncoding, HTMLInputElement>();
    const contentEncodings: Protocol.EnumerableEnum<typeof Protocol.Network.ContentEncoding> = {
      Deflate: Protocol.Network.ContentEncoding.Deflate,
      Gzip: Protocol.Network.ContentEncoding.Gzip,
      Br: Protocol.Network.ContentEncoding.Br,
      Zstd: Protocol.Network.ContentEncoding.Zstd,
    };
    for (const encoding of Object.values(contentEncodings)) {
      const label = UI.UIUtils.CheckboxLabel.create(encoding, true, undefined, encoding);
      encodingsSection.appendChild(label);
      checkboxes.set(encoding, label.checkboxElement);
    }
    for (const [encoding, checkbox] of checkboxes) {
      checkbox.checked = customAcceptedEncodingSetting.get().includes(encoding);
      checkbox.addEventListener('change', acceptedEncodingsChanged);
    }

    acceptedEncodingsChanged();

    function acceptedEncodingsChanged(): void {
      useCustomAcceptedEncodingSetting.set(!autoCheckbox.checked);
      const encodings = [];
      for (const [encoding, checkbox] of checkboxes) {
        checkbox.disabled = autoCheckbox.checked;
        if (checkbox.checked) {
          encodings.push(encoding);
        }
      }
      customAcceptedEncodingSetting.set(encodings.join(','));
    }
  }
  override wasShown(): void {
    super.wasShown();
    this.registerCSSFiles([networkConfigViewStyles]);

    UI.ARIAUtils.alert(i18nString(UIStrings.networkConditionsPanelShown));
  }
}

function getUserAgentMetadata(userAgent: string): Protocol.Emulation.UserAgentMetadata|null {
  for (const userAgentDescriptor of userAgentGroups) {
    for (const userAgentVersion of userAgentDescriptor.values) {
      if (userAgent ===
          SDK.NetworkManager.MultitargetNetworkManager.patchUserAgentWithChromeVersion(userAgentVersion.value)) {
        if (!userAgentVersion.metadata) {
          return null;
        }
        SDK.NetworkManager.MultitargetNetworkManager.patchUserAgentMetadataWithChromeVersion(userAgentVersion.metadata);
        return userAgentVersion.metadata;
      }
    }
  }
  return null;
}

interface UserAgentGroup {
  title: string;
  values: {
    title: string,
    value: string,
    metadata: Protocol.Emulation.UserAgentMetadata|null,
  }[];
}

export const userAgentGroups: UserAgentGroup[] = [
  {
    title: 'Android',
    values: [
      {
        title: 'Android (4.0.2) Browser \u2014 Galaxy Nexus',
        value:
            'Mozilla/5.0 (Linux; U; Android 4.0.2; en-us; Galaxy Nexus Build/ICL53F) AppleWebKit/534.30 (KHTML, like Gecko) Version/4.0 Mobile Safari/534.30',
        metadata: {
          brands: [
            {brand: 'Not A;Brand', version: '99'},
            {brand: 'Chromium', version: '%s'},
            {brand: 'Google Chrome', version: '%s'},
          ],
          fullVersion: '%s',
          platform: 'Android',
          platformVersion: '4.0.2',
          architecture: '',
          model: 'Galaxy Nexus',
          mobile: true,
        },
      },
      {
        title: 'Android (2.3) Browser \u2014 Nexus S',
        value:
            'Mozilla/5.0 (Linux; U; Android 2.3.6; en-us; Nexus S Build/GRK39F) AppleWebKit/533.1 (KHTML, like Gecko) Version/4.0 Mobile Safari/533.1',
        metadata: {
          brands: [
            {brand: 'Not A;Brand', version: '99'},
            {brand: 'Chromium', version: '%s'},
            {brand: 'Google Chrome', version: '%s'},
          ],
          fullVersion: '%s',
          platform: 'Android',
          platformVersion: '2.3.6',
          architecture: '',
          model: 'Nexus S',
          mobile: true,
        },
      },
    ],
  },
  {
    title: 'BlackBerry',
    values: [
      {
        title: 'BlackBerry \u2014 BB10',
        value:
            'Mozilla/5.0 (BB10; Touch) AppleWebKit/537.1+ (KHTML, like Gecko) Version/10.0.0.1337 Mobile Safari/537.1+',
        metadata: null,
      },
      {
        title: 'BlackBerry \u2014 PlayBook 2.1',
        value:
            'Mozilla/5.0 (PlayBook; U; RIM Tablet OS 2.1.0; en-US) AppleWebKit/536.2+ (KHTML, like Gecko) Version/7.2.1.0 Safari/536.2+',
        metadata: null,
      },
      {
        title: 'BlackBerry \u2014 9900',
        value:
            'Mozilla/5.0 (BlackBerry; U; BlackBerry 9900; en-US) AppleWebKit/534.11+ (KHTML, like Gecko) Version/7.0.0.187 Mobile Safari/534.11+',
        metadata: null,
      },
    ],
  },
  {
    title: 'Chrome',
    values: [
      {
        title: 'Chrome \u2014 Android Mobile',
        value:
            'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/%s Mobile Safari/537.36',
        metadata: {
          brands: [
            {brand: 'Not A;Brand', version: '99'},
            {brand: 'Chromium', version: '%s'},
            {brand: 'Google Chrome', version: '%s'},
          ],
          fullVersion: '%s',
          platform: 'Android',
          platformVersion: '6.0',
          architecture: '',
          model: 'Nexus 5',
          mobile: true,
        },
      },
      {
        title: 'Chrome \u2014 Android Mobile (high-end)',
        value:
            'Mozilla/5.0 (Linux; Android 10; Pixel 4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/%s Mobile Safari/537.36',
        metadata: {
          brands: [
            {brand: 'Not A;Brand', version: '99'},
            {brand: 'Chromium', version: '%s'},
            {brand: 'Google Chrome', version: '%s'},
          ],
          fullVersion: '%s',
          platform: 'Android',
          platformVersion: '10',
          architecture: '',
          model: 'Pixel 4',
          mobile: true,
        },
      },
      {
        title: 'Chrome \u2014 Android Tablet',
        value:
            'Mozilla/5.0 (Linux; Android 4.3; Nexus 7 Build/JSS15Q) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/%s Safari/537.36',
        metadata: {
          brands: [
            {brand: 'Not A;Brand', version: '99'},
            {brand: 'Chromium', version: '%s'},
            {brand: 'Google Chrome', version: '%s'},
          ],
          fullVersion: '%s',
          platform: 'Android',
          platformVersion: '4.3',
          architecture: '',
          model: 'Nexus 7',
          mobile: true,
        },
      },
      {
        title: 'Chrome \u2014 iPhone',
        value:
            'Mozilla/5.0 (iPhone; CPU iPhone OS 13_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/%s Mobile/15E148 Safari/604.1',
        metadata: null,
      },
      {
        title: 'Chrome \u2014 iPad',
        value:
            'Mozilla/5.0 (iPad; CPU OS 13_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/%s Mobile/15E148 Safari/604.1',
        metadata: null,
      },
      {
        title: 'Chrome \u2014 Chrome OS',
        value:
            'Mozilla/5.0 (X11; CrOS x86_64 10066.0.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/%s Safari/537.36',
        metadata: {
          brands: [
            {brand: 'Not A;Brand', version: '99'},
            {brand: 'Chromium', version: '%s'},
            {brand: 'Google Chrome', version: '%s'},
          ],
          fullVersion: '%s',
          platform: 'Chrome OS',
          platformVersion: '10066.0.0',
          architecture: 'x86',
          model: '',
          mobile: false,
        },
      },
      {
        title: 'Chrome \u2014 Mac',
        value:
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/%s Safari/537.36',
        metadata: {
          brands: [
            {brand: 'Not A;Brand', version: '99'},
            {brand: 'Chromium', version: '%s'},
            {brand: 'Google Chrome', version: '%s'},
          ],
          fullVersion: '%s',
          platform: 'macOS',
          platformVersion: '10_14_6',
          architecture: 'x86',
          model: '',
          mobile: false,
        },
      },
      {
        title: 'Chrome \u2014 Windows',
        value: 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/%s Safari/537.36',
        metadata: {
          brands: [
            {brand: 'Not A;Brand', version: '99'},
            {brand: 'Chromium', version: '%s'},
            {brand: 'Google Chrome', version: '%s'},
          ],
          fullVersion: '%s',
          platform: 'Windows',
          platformVersion: '10.0',
          architecture: 'x86',
          model: '',
          mobile: false,
        },
      },
    ],
  },
  {
    title: 'Firefox',
    values: [
      {
        title: 'Firefox \u2014 Android Mobile',
        value: 'Mozilla/5.0 (Android 4.4; Mobile; rv:70.0) Gecko/70.0 Firefox/70.0',
        metadata: null,
      },
      {
        title: 'Firefox \u2014 Android Tablet',
        value: 'Mozilla/5.0 (Android 4.4; Tablet; rv:70.0) Gecko/70.0 Firefox/70.0',
        metadata: null,
      },
      {
        title: 'Firefox \u2014 iPhone',
        value:
            'Mozilla/5.0 (iPhone; CPU iPhone OS 8_3 like Mac OS X) AppleWebKit/600.1.4 (KHTML, like Gecko) FxiOS/1.0 Mobile/12F69 Safari/600.1.4',
        metadata: null,
      },
      {
        title: 'Firefox \u2014 iPad',
        value:
            'Mozilla/5.0 (iPad; CPU iPhone OS 8_3 like Mac OS X) AppleWebKit/600.1.4 (KHTML, like Gecko) FxiOS/1.0 Mobile/12F69 Safari/600.1.4',
        metadata: null,
      },
      {
        title: 'Firefox \u2014 Mac',
        value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.14; rv:70.0) Gecko/20100101 Firefox/70.0',
        metadata: null,
      },
      {
        title: 'Firefox \u2014 Windows',
        value: 'Mozilla/5.0 (Windows NT 10.0; WOW64; rv:70.0) Gecko/20100101 Firefox/70.0',
        metadata: null,
      },
    ],
  },
  {
    title: 'Googlebot',
    values: [
      {
        title: 'Googlebot',
        value: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
        metadata: null,
      },
      {
        title: 'Googlebot Desktop',
        value:
            'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; Googlebot/2.1; +http://www.google.com/bot.html) Chrome/%s Safari/537.36',
        metadata: null,
      },
      {
        title: 'Googlebot Smartphone',
        value:
            'Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/%s Mobile Safari/537.36 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
        metadata: null,
      },
    ],
  },
  {
    title: 'Internet Explorer',
    values: [
      {
        title: 'Internet Explorer 11',
        value: 'Mozilla/5.0 (Windows NT 10.0; WOW64; Trident/7.0; rv:11.0) like Gecko',
        metadata: null,
      },
      {
        title: 'Internet Explorer 10',
        value: 'Mozilla/5.0 (compatible; MSIE 10.0; Windows NT 6.1; WOW64; Trident/6.0)',
        metadata: null,
      },
      {
        title: 'Internet Explorer 9',
        value: 'Mozilla/5.0 (compatible; MSIE 9.0; Windows NT 6.1; Trident/5.0)',
        metadata: null,
      },
      {
        title: 'Internet Explorer 8',
        value: 'Mozilla/4.0 (compatible; MSIE 8.0; Windows NT 6.0; Trident/4.0)',
        metadata: null,
      },
      {title: 'Internet Explorer 7', value: 'Mozilla/4.0 (compatible; MSIE 7.0; Windows NT 6.0)', metadata: null},
    ],
  },
  {
    title: 'Microsoft Edge',
    values: [
      {
        title: 'Microsoft Edge (Chromium) \u2014 Windows',
        value:
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/%s Safari/537.36 Edg/%s',
        metadata: {
          brands: [
            {brand: 'Not A;Brand', version: '99'},
            {brand: 'Chromium', version: '%s'},
            {brand: 'Microsoft Edge', version: '%s'},
          ],
          fullVersion: '%s',
          platform: 'Windows',
          platformVersion: '10.0',
          architecture: 'x86',
          model: '',
          mobile: false,
        },
      },
      {
        title: 'Microsoft Edge (Chromium) \u2014 Mac',
        value:
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Chrome/%s Safari/604.1 Edg/%s',
        metadata: {
          brands: [
            {brand: 'Not A;Brand', version: '99'},
            {brand: 'Chromium', version: '%s'},
            {brand: 'Microsoft Edge', version: '%s'},
          ],
          fullVersion: '%s',
          platform: 'macOS',
          platformVersion: '10_14_6',
          architecture: 'x86',
          model: '',
          mobile: false,
        },
      },
      {
        title: 'Microsoft Edge \u2014 iPhone',
        value:
            'Mozilla/5.0 (iPhone; CPU iPhone OS 12_3_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/12.1.1 EdgiOS/44.5.0.10 Mobile/15E148 Safari/604.1',
        metadata: null,
      },
      {
        title: 'Microsoft Edge \u2014 iPad',
        value:
            'Mozilla/5.0 (iPad; CPU OS 12_3_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/12.0 EdgiOS/44.5.2 Mobile/15E148 Safari/605.1.15',
        metadata: null,
      },
      {
        title: 'Microsoft Edge \u2014 Android Mobile',
        value:
            'Mozilla/5.0 (Linux; Android 8.1.0; Pixel Build/OPM4.171019.021.D1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/65.0.3325.109 Mobile Safari/537.36 EdgA/42.0.0.2057',
        metadata: {
          brands: [
            {brand: 'Not A;Brand', version: '99'},
            {brand: 'Chromium', version: '%s'},
            {brand: 'Microsoft Edge', version: '%s'},
          ],
          fullVersion: '%s',
          platform: 'Android',
          platformVersion: '8.1.0',
          architecture: '',
          model: 'Pixel',
          mobile: true,
        },
      },
      {
        title: 'Microsoft Edge \u2014 Android Tablet',
        value:
            'Mozilla/5.0 (Linux; Android 6.0.1; Nexus 7 Build/MOB30X) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/65.0.3325.109 Safari/537.36 EdgA/42.0.0.2057',
        metadata: {
          brands: [
            {brand: 'Not A;Brand', version: '99'},
            {brand: 'Chromium', version: '%s'},
            {brand: 'Microsoft Edge', version: '%s'},
          ],
          fullVersion: '%s',
          platform: 'Android',
          platformVersion: '6.0.1',
          architecture: '',
          model: 'Nexus 7',
          mobile: true,
        },
      },
      {
        title: 'Microsoft Edge (EdgeHTML) \u2014 Windows',
        value:
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/70.0.3538.102 Safari/537.36 Edge/18.19042',
        metadata: null,
      },
      {
        title: 'Microsoft Edge (EdgeHTML) \u2014 XBox',
        value:
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; Xbox; Xbox One) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/70.0.3538.102 Safari/537.36 Edge/18.19041',
        metadata: null,
      },
    ],
  },
  {
    title: 'Opera',
    values: [
      {
        title: 'Opera \u2014 Mac',
        value:
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.97 Safari/537.36 OPR/65.0.3467.48',
        metadata: null,
      },
      {
        title: 'Opera \u2014 Windows',
        value:
            'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.97 Safari/537.36 OPR/65.0.3467.48',
        metadata: null,
      },
      {
        title: 'Opera (Presto) \u2014 Mac',
        value: 'Opera/9.80 (Macintosh; Intel Mac OS X 10.9.1) Presto/2.12.388 Version/12.16',
        metadata: null,
      },
      {
        title: 'Opera (Presto) \u2014 Windows',
        value: 'Opera/9.80 (Windows NT 6.1) Presto/2.12.388 Version/12.16',
        metadata: null,
      },
      {
        title: 'Opera Mobile \u2014 Android Mobile',
        value: 'Opera/12.02 (Android 4.1; Linux; Opera Mobi/ADR-1111101157; U; en-US) Presto/2.9.201 Version/12.02',
        metadata: null,
      },
      {
        title: 'Opera Mini \u2014 iOS',
        value: 'Opera/9.80 (iPhone; Opera Mini/8.0.0/34.2336; U; en) Presto/2.8.119 Version/11.10',
        metadata: null,
      },
    ],
  },
  {
    title: 'Safari',
    values: [
      {
        title: 'Safari \u2014 iPad iOS 13.2',
        value:
            'Mozilla/5.0 (iPad; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1',
        metadata: null,
      },
      {
        title: 'Safari \u2014 iPhone iOS 13.2',
        value:
            'Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1',
        metadata: null,
      },
      {
        title: 'Safari \u2014 Mac',
        value:
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Safari/605.1.15',
        metadata: null,
      },
    ],
  },
  {
    title: 'UC Browser',
    values: [
      {
        title: 'UC Browser \u2014 Android Mobile',
        value:
            'Mozilla/5.0 (Linux; U; Android 8.1.0; en-US; Nexus 6P Build/OPM7.181205.001) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/57.0.2987.108 UCBrowser/12.11.1.1197 Mobile Safari/537.36',
        metadata: null,
      },
      {
        title: 'UC Browser \u2014 iOS',
        value:
            'Mozilla/5.0 (iPhone; CPU iPhone OS 12_1 like Mac OS X; zh-CN) AppleWebKit/537.51.1 (KHTML, like Gecko) Mobile/16B92 UCBrowser/12.1.7.1109 Mobile AliApp(TUnionSDK/0.1.20.3)',
        metadata: null,
      },
      {
        title: 'UC Browser \u2014 Windows Phone',
        value:
            'Mozilla/5.0 (compatible; MSIE 10.0; Windows Phone 8.0; Trident/6.0; IEMobile/10.0; ARM; Touch; NOKIA; Lumia 920) UCBrowser/10.1.0.563 Mobile',
        metadata: null,
      },
    ],
  },
];

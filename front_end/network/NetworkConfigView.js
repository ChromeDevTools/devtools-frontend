// Copyright (c) 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';
import * as i18n from '../i18n/i18n.js';
import * as MobileThrottling from '../mobile_throttling/mobile_throttling.js';
import * as SDK from '../sdk/sdk.js';
import * as UI from '../ui/ui.js';

export const UIStrings = {
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
  selectAutomatically: 'Select automatically',
};
const str_ = i18n.i18n.registerUIStrings('network/NetworkConfigView.js', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

/** @type {!NetworkConfigView} */
let networkConfigViewInstance;

export class NetworkConfigView extends UI.Widget.VBox {
  constructor() {
    super(true);
    this.registerRequiredCSS('network/networkConfigView.css', {enableLegacyPatching: true});
    this.contentElement.classList.add('network-config');

    this._createCacheSection();
    this.contentElement.createChild('div').classList.add('panel-section-separator');
    this._createNetworkThrottlingSection();
    this.contentElement.createChild('div').classList.add('panel-section-separator');
    this._createUserAgentSection();
  }

  /**
   * @param {{forceNew: ?boolean}} opts
   */
  static instance(opts = {forceNew: null}) {
    const {forceNew} = opts;
    if (!networkConfigViewInstance || forceNew) {
      networkConfigViewInstance = new NetworkConfigView();
    }
    return networkConfigViewInstance;
  }

  /**
   * @param {string} title
   * @return {{select: !HTMLSelectElement, input: !HTMLInputElement, error: !HTMLElement}}
   */
  static createUserAgentSelectAndInput(title) {
    const userAgentSetting = Common.Settings.Settings.instance().createSetting('customUserAgent', '');
    /** @type {!HTMLSelectElement} */
    const userAgentSelectElement = /** @type {!HTMLSelectElement} */ (document.createElement('select'));
    UI.ARIAUtils.setAccessibleName(userAgentSelectElement, title);

    const customOverride = {title: i18nString(UIStrings.custom), value: 'custom'};
    userAgentSelectElement.appendChild(new Option(customOverride.title, customOverride.value));

    for (const userAgentDescriptor of userAgentGroups) {
      /** @type {!HTMLOptGroupElement} */
      const groupElement = /** @type {!HTMLOptGroupElement} */ (userAgentSelectElement.createChild('optgroup'));
      groupElement.label = userAgentDescriptor.title;
      for (const userAgentVersion of userAgentDescriptor.values) {
        const userAgentValue =
            SDK.NetworkManager.MultitargetNetworkManager.patchUserAgentWithChromeVersion(userAgentVersion.value);
        groupElement.appendChild(new Option(userAgentVersion.title, userAgentValue));
      }
    }

    userAgentSelectElement.selectedIndex = 0;

    const otherUserAgentElement = UI.UIUtils.createInput('', 'text');
    otherUserAgentElement.value = userAgentSetting.get();
    UI.Tooltip.Tooltip.install(otherUserAgentElement, userAgentSetting.get());
    otherUserAgentElement.placeholder = i18nString(UIStrings.enterACustomUserAgent);
    otherUserAgentElement.required = true;
    UI.ARIAUtils.setAccessibleName(otherUserAgentElement, otherUserAgentElement.placeholder);

    /** @type {!HTMLElement} */
    const errorElement = /** @type {!HTMLElement} */ (document.createElement('div'));
    errorElement.classList.add('network-config-input-validation-error');
    UI.ARIAUtils.markAsAlert(errorElement);
    if (!otherUserAgentElement.value) {
      errorElement.textContent = i18nString(UIStrings.customUserAgentFieldIsRequired);
    }

    settingChanged();
    userAgentSelectElement.addEventListener('change', userAgentSelected, false);
    otherUserAgentElement.addEventListener('input', applyOtherUserAgent, false);

    function userAgentSelected() {
      const value = userAgentSelectElement.options[userAgentSelectElement.selectedIndex].value;
      if (value !== customOverride.value) {
        userAgentSetting.set(value);
        otherUserAgentElement.value = value;
        UI.Tooltip.Tooltip.install(otherUserAgentElement, value);
      } else {
        otherUserAgentElement.select();
      }
      errorElement.textContent = '';
    }

    function settingChanged() {
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

    function applyOtherUserAgent() {
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

  /**
   * @param {string} title
   * @param {string=} className
   * @return {!Element}
   */
  _createSection(title, className) {
    const section = this.contentElement.createChild('section', 'network-config-group');
    if (className) {
      section.classList.add(className);
    }
    section.createChild('div', 'network-config-title').textContent = title;
    return section.createChild('div', 'network-config-fields');
  }

  _createCacheSection() {
    const section = this._createSection(i18nString(UIStrings.caching), 'network-config-disable-cache');
    section.appendChild(UI.SettingsUI.createSettingCheckbox(
        i18nString(UIStrings.disableCache), Common.Settings.Settings.instance().moduleSetting('cacheDisabled'), true));
  }

  _createNetworkThrottlingSection() {
    const title = i18nString(UIStrings.networkThrottling);
    const section = this._createSection(title, 'network-config-throttling');
    const networkThrottlingSelect =
        /** @type {!HTMLSelectElement} */ (section.createChild('select', 'chrome-select'));
    MobileThrottling.ThrottlingManager.throttlingManager().decorateSelectWithNetworkThrottling(networkThrottlingSelect);
    UI.ARIAUtils.setAccessibleName(networkThrottlingSelect, title);
  }

  _createUserAgentSection() {
    const title = i18nString(UIStrings.userAgent);
    const section = this._createSection(title, 'network-config-ua');
    const checkboxLabel = UI.UIUtils.CheckboxLabel.create(i18nString(UIStrings.selectAutomatically), true);
    section.appendChild(checkboxLabel);
    const autoCheckbox = checkboxLabel.checkboxElement;

    const customUserAgentSetting = Common.Settings.Settings.instance().createSetting('customUserAgent', '');
    customUserAgentSetting.addChangeListener(() => {
      if (autoCheckbox.checked) {
        return;
      }
      SDK.NetworkManager.MultitargetNetworkManager.instance().setCustomUserAgentOverride(customUserAgentSetting.get());
    });
    const customUserAgentSelectBox = section.createChild('div', 'network-config-ua-custom');
    autoCheckbox.addEventListener('change', userAgentSelectBoxChanged);
    const customSelectAndInput = NetworkConfigView.createUserAgentSelectAndInput(title);
    customSelectAndInput.select.classList.add('chrome-select');
    customUserAgentSelectBox.appendChild(customSelectAndInput.select);
    customUserAgentSelectBox.appendChild(customSelectAndInput.input);
    customUserAgentSelectBox.appendChild(customSelectAndInput.error);
    userAgentSelectBoxChanged();

    function userAgentSelectBoxChanged() {
      const useCustomUA = !autoCheckbox.checked;
      customUserAgentSelectBox.classList.toggle('checked', useCustomUA);
      customSelectAndInput.select.disabled = !useCustomUA;
      customSelectAndInput.input.disabled = !useCustomUA;
      customSelectAndInput.error.hidden = !useCustomUA;
      const customUA = useCustomUA ? customUserAgentSetting.get() : '';
      SDK.NetworkManager.MultitargetNetworkManager.instance().setCustomUserAgentOverride(customUA);
    }
  }
}

/** @type {!Array.<{title: string, values: !Array.<{title: string, value: string}>}>} */
export const userAgentGroups = [
  {
    title: 'Android',
    values: [
      {
        title: 'Android (4.0.2) Browser \u2014 Galaxy Nexus',
        value:
            'Mozilla/5.0 (Linux; U; Android 4.0.2; en-us; Galaxy Nexus Build/ICL53F) AppleWebKit/534.30 (KHTML, like Gecko) Version/4.0 Mobile Safari/534.30'
      },
      {
        title: 'Android (2.3) Browser \u2014 Nexus S',
        value:
            'Mozilla/5.0 (Linux; U; Android 2.3.6; en-us; Nexus S Build/GRK39F) AppleWebKit/533.1 (KHTML, like Gecko) Version/4.0 Mobile Safari/533.1'
      }
    ]
  },
  {
    title: 'BlackBerry',
    values: [
      {
        title: 'BlackBerry \u2014 BB10',
        value:
            'Mozilla/5.0 (BB10; Touch) AppleWebKit/537.1+ (KHTML, like Gecko) Version/10.0.0.1337 Mobile Safari/537.1+'
      },
      {
        title: 'BlackBerry \u2014 PlayBook 2.1',
        value:
            'Mozilla/5.0 (PlayBook; U; RIM Tablet OS 2.1.0; en-US) AppleWebKit/536.2+ (KHTML, like Gecko) Version/7.2.1.0 Safari/536.2+'
      },
      {
        title: 'BlackBerry \u2014 9900',
        value:
            'Mozilla/5.0 (BlackBerry; U; BlackBerry 9900; en-US) AppleWebKit/534.11+ (KHTML, like Gecko) Version/7.0.0.187 Mobile Safari/534.11+'
      }
    ]
  },
  {
    title: 'Chrome',
    values: [
      {
        title: 'Chrome \u2014 Android Mobile',
        value:
            'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/%s Mobile Safari/537.36'
      },
      {
        title: 'Chrome \u2014 Android Mobile (high-end)',
        value:
            'Mozilla/5.0 (Linux; Android 10; Pixel 4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/%s Mobile Safari/537.36'
      },
      {
        title: 'Chrome \u2014 Android Tablet',
        value:
            'Mozilla/5.0 (Linux; Android 4.3; Nexus 7 Build/JSS15Q) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/%s Safari/537.36'
      },
      {
        title: 'Chrome \u2014 iPhone',
        value:
            'Mozilla/5.0 (iPhone; CPU iPhone OS 13_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/%s Mobile/15E148 Safari/604.1'
      },
      {
        title: 'Chrome \u2014 iPad',
        value:
            'Mozilla/5.0 (iPad; CPU OS 13_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/%s Mobile/15E148 Safari/604.1'
      },
      {
        title: 'Chrome \u2014 Chrome OS',
        value: 'Mozilla/5.0 (X11; CrOS x86_64 10066.0.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/%s Safari/537.36'
      },
      {
        title: 'Chrome \u2014 Mac',
        value:
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/%s Safari/537.36'
      },
      {
        title: 'Chrome \u2014 Windows',
        value: 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/%s Safari/537.36'
      }
    ]
  },
  {
    title: 'Firefox',
    values: [
      {
        title: 'Firefox \u2014 Android Mobile',
        value: 'Mozilla/5.0 (Android 4.4; Mobile; rv:70.0) Gecko/70.0 Firefox/70.0'
      },
      {
        title: 'Firefox \u2014 Android Tablet',
        value: 'Mozilla/5.0 (Android 4.4; Tablet; rv:70.0) Gecko/70.0 Firefox/70.0'
      },
      {
        title: 'Firefox \u2014 iPhone',
        value:
            'Mozilla/5.0 (iPhone; CPU iPhone OS 8_3 like Mac OS X) AppleWebKit/600.1.4 (KHTML, like Gecko) FxiOS/1.0 Mobile/12F69 Safari/600.1.4'
      },
      {
        title: 'Firefox \u2014 iPad',
        value:
            'Mozilla/5.0 (iPad; CPU iPhone OS 8_3 like Mac OS X) AppleWebKit/600.1.4 (KHTML, like Gecko) FxiOS/1.0 Mobile/12F69 Safari/600.1.4'
      },
      {
        title: 'Firefox \u2014 Mac',
        value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.14; rv:70.0) Gecko/20100101 Firefox/70.0'
      },
      {
        title: 'Firefox \u2014 Windows',
        value: 'Mozilla/5.0 (Windows NT 10.0; WOW64; rv:70.0) Gecko/20100101 Firefox/70.0'
      }
    ]
  },
  {
    title: 'Googlebot',
    values: [
      {title: 'Googlebot', value: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'}, {
        title: 'Googlebot Desktop',
        value:
            'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; Googlebot/2.1; +http://www.google.com/bot.html) Chrome/%s Safari/537.36'
      },
      {
        title: 'Googlebot Smartphone',
        value:
            'Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/%s Mobile Safari/537.36 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'
      }
    ]
  },
  {
    title: 'Internet Explorer',
    values: [
      {title: 'Internet Explorer 11', value: 'Mozilla/5.0 (Windows NT 10.0; WOW64; Trident/7.0; rv:11.0) like Gecko'},
      {title: 'Internet Explorer 10', value: 'Mozilla/5.0 (compatible; MSIE 10.0; Windows NT 6.1; WOW64; Trident/6.0)'},
      {title: 'Internet Explorer 9', value: 'Mozilla/5.0 (compatible; MSIE 9.0; Windows NT 6.1; Trident/5.0)'},
      {title: 'Internet Explorer 8', value: 'Mozilla/4.0 (compatible; MSIE 8.0; Windows NT 6.0; Trident/4.0)'},
      {title: 'Internet Explorer 7', value: 'Mozilla/4.0 (compatible; MSIE 7.0; Windows NT 6.0)'}
    ]
  },
  {
    title: 'Microsoft Edge',
    values: [
      {
        title: 'Microsoft Edge (Chromium) \u2014 Windows',
        value:
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/%s Safari/537.36 Edg/%s'
      },
      {
        title: 'Microsoft Edge (Chromium) \u2014 Mac',
        value:
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Chrome/%s Safari/604.1 Edg/%s'
      },
      {
        title: 'Microsoft Edge \u2014 iPhone',
        value:
            'Mozilla/5.0 (iPhone; CPU iPhone OS 12_3_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/12.1.1 EdgiOS/44.5.0.10 Mobile/15E148 Safari/604.1'
      },
      {
        title: 'Microsoft Edge \u2014 iPad',
        value:
            'Mozilla/5.0 (iPad; CPU OS 12_3_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/12.0 EdgiOS/44.5.2 Mobile/15E148 Safari/605.1.15'
      },
      {
        title: 'Microsoft Edge \u2014 Android Mobile',
        value:
            'Mozilla/5.0 (Linux; Android 8.1.0; Pixel Build/OPM4.171019.021.D1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/65.0.3325.109 Mobile Safari/537.36 EdgA/42.0.0.2057'
      },
      {
        title: 'Microsoft Edge \u2014 Android Tablet',
        value:
            'Mozilla/5.0 (Linux; Android 6.0.1; Nexus 7 Build/MOB30X) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/65.0.3325.109 Safari/537.36 EdgA/42.0.0.2057'
      },
      {
        title: 'Microsoft Edge (EdgeHTML) \u2014 Windows',
        value:
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/70.0.3538.102 Safari/537.36 Edge/18.18362'
      },
      {
        title: 'Microsoft Edge (EdgeHTML) \u2014 XBox',
        value:
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; Xbox; Xbox One) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/70.0.3538.102 Safari/537.36 Edge/18.18362'
      }
    ]
  },
  {
    title: 'Opera',
    values: [
      {
        title: 'Opera \u2014 Mac',
        value:
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.97 Safari/537.36 OPR/65.0.3467.48'
      },
      {
        title: 'Opera \u2014 Windows',
        value:
            'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.97 Safari/537.36 OPR/65.0.3467.48'
      },
      {
        title: 'Opera (Presto) \u2014 Mac',
        value: 'Opera/9.80 (Macintosh; Intel Mac OS X 10.9.1) Presto/2.12.388 Version/12.16'
      },
      {title: 'Opera (Presto) \u2014 Windows', value: 'Opera/9.80 (Windows NT 6.1) Presto/2.12.388 Version/12.16'}, {
        title: 'Opera Mobile \u2014 Android Mobile',
        value: 'Opera/12.02 (Android 4.1; Linux; Opera Mobi/ADR-1111101157; U; en-US) Presto/2.9.201 Version/12.02'
      },
      {
        title: 'Opera Mini \u2014 iOS',
        value: 'Opera/9.80 (iPhone; Opera Mini/8.0.0/34.2336; U; en) Presto/2.8.119 Version/11.10'
      }
    ]
  },
  {
    title: 'Safari',
    values: [
      {
        title: 'Safari \u2014 iPad iOS 13.2',
        value:
            'Mozilla/5.0 (iPad; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1'
      },
      {
        title: 'Safari \u2014 iPhone iOS 13.2',
        value:
            'Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1'
      },
      {
        title: 'Safari \u2014 Mac',
        value:
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Safari/605.1.15'
      }
    ]
  },
  {
    title: 'UC Browser',
    values: [
      {
        title: 'UC Browser \u2014 Android Mobile',
        value:
            'Mozilla/5.0 (Linux; U; Android 8.1.0; en-US; Nexus 6P Build/OPM7.181205.001) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/57.0.2987.108 UCBrowser/12.11.1.1197 Mobile Safari/537.36'
      },
      {
        title: 'UC Browser \u2014 iOS',
        value:
            'Mozilla/5.0 (iPhone; CPU iPhone OS 12_1 like Mac OS X; zh-CN) AppleWebKit/537.51.1 (KHTML, like Gecko) Mobile/16B92 UCBrowser/12.1.7.1109 Mobile AliApp(TUnionSDK/0.1.20.3)'
      },
      {
        title: 'UC Browser \u2014 Windows Phone',
        value:
            'Mozilla/5.0 (compatible; MSIE 10.0; Windows Phone 8.0; Trident/6.0; IEMobile/10.0; ARM; Touch; NOKIA; Lumia 920) UCBrowser/10.1.0.563 Mobile'
      }
    ]
  }
];

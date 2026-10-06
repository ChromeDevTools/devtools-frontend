// Copyright 2015 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import '../settings/emulation/components/components.js';
import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as EmulationModel from '../../models/emulation/emulation.js';
import * as UI from '../../ui/legacy/legacy.js';
import { Directives, html, render } from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import * as MobileThrottling from '../mobile_throttling/mobile_throttling.js';
import networkConfigViewStyles from './networkConfigView.css.js';
const { ref } = Directives;
const UIStrings = {
    /**
     * @description Option in network conditions view of the Network panel shown in user agent dropdown.
     */
    custom: 'Custom…',
    /**
     * @description Placeholder text for custom user agent input in network conditions view of the Network panel.
     */
    enterACustomUserAgent: 'Enter a custom user agent',
    /**
     * @description Error message in network conditions view of the Network panel when custom user agent is empty.
     */
    customUserAgentFieldIsRequired: 'Custom user agent field is required',
    /**
     * @description Section header for caching settings in network conditions view of the Network panel.
     */
    caching: 'Caching',
    /**
     * @description Checkbox label to disable cache in network conditions view of the Network panel.
     */
    disableCache: 'Disable cache',
    /**
     * @description Section header for network throttling settings in network conditions view of the Network panel.
     */
    networkThrottling: 'Network',
    /**
     * @description Tooltip and accessible label for the save data override selector.
     */
    saveDataSettingTooltip: 'Override the value reported by navigator.connection.saveData on the page',
    /**
     * @description Section header for user agent settings in network conditions view of the Network panel.
     */
    userAgent: 'User agent',
    /**
     * @description Checkbox label in network conditions view of the Network panel to use browser default user agent.
     */
    selectAutomatically: 'Use browser default',
    /**
     * @description Status message in network conditions view of the Network panel after updating user agent client hints.
     */
    clientHintsStatusText: 'User agent updated',
    /**
     * @description Accessible announcement when network conditions view is shown.
     */
    networkConditionsPanelShown: 'Network conditions shown',
};
const str_ = i18n.i18n.registerUIStrings('panels/network/NetworkConfigView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
// clang-format off
function renderUserAgentSelectAndInput(input, output, title) {
    const customOverride = { title: i18nString(UIStrings.custom), value: 'custom' };
    const { patchUserAgentWithChromeVersion } = SDK.NetworkManager.MultitargetNetworkManager;
    const { toKebabCase } = Platform.StringUtilities;
    return html `
    <select
        jslog=${VisualLogging.dropDown().track({ change: true }).context('custom-user-agent')}
        aria-label=${title}
        ?disabled=${!input.useCustomUA}
        @change=${(e) => input.onUserAgentSelect(e.target.value)}>
      <option
          value=${customOverride.value}
          .selected=${input.customSelectValue === customOverride.value}
          jslog=${VisualLogging.item('custom').track({ click: true })}>
        ${customOverride.title}
      </option>
      ${userAgentGroups.map(group => html `
        <optgroup label=${group.title}>
          ${group.values.map(val => html `
            <option
                value=${patchUserAgentWithChromeVersion(val.value)}
                .selected=${input.customSelectValue === patchUserAgentWithChromeVersion(val.value)}
                jslog=${VisualLogging.item(toKebabCase(val.title)).track({ click: true })}>
              ${val.title}
            </option>
          `)}
        </optgroup>
      `)}
    </select>
    <input
        class="harmony-input"
        type="text"
        spellcheck="false"
        jslog=${VisualLogging.textField().track({ change: true }).context('custom-user-agent')}
        .value=${input.customUserAgent}
        title=${input.customUserAgent}
        placeholder=${i18nString(UIStrings.enterACustomUserAgent)}
        required
        aria-label=${i18nString(UIStrings.enterACustomUserAgent)}
        ?disabled=${!input.useCustomUA}
        @input=${(e) => input.onCustomUserAgentInput(e.target.value)}
        ${ref(el => {
        if (el instanceof HTMLInputElement) {
            output.selectCustomUserAgentInput = () => el.select();
        }
    })}>
    <div
        class="network-config-input-validation-error"
        role="alert"
        aria-live="polite"
        ?hidden=${!input.useCustomUA}>${input.validationError}</div>
  `;
}
function renderSection(title, className, content) {
    return html `
    <section class="network-config-group ${className}">
      <div class="network-config-title">${title}</div>
      <div class="network-config-fields">${content}</div>
    </section>
  `;
}
function renderCacheSection(input) {
    return renderSection(i18nString(UIStrings.caching), 'network-config-disable-cache', html `
    <devtools-checkbox
        name=${i18nString(UIStrings.disableCache)}
        .checked=${input.disableCache}
        @change=${(e) => input.onDisableCacheChange(e.target.checked)}
        jslog=${VisualLogging.toggle().track({ change: true }).context('cache-disabled')}>
      ${i18nString(UIStrings.disableCache)}
    </devtools-checkbox>
  `);
}
function renderNetworkThrottlingSection() {
    const title = i18nString(UIStrings.networkThrottling);
    return renderSection(title, 'network-config-throttling', html `
    <select
        ${UI.Widget.widget(MobileThrottling.NetworkThrottlingSelector.NetworkThrottlingSelect, {
        title,
        bindToGlobalConditions: true,
    })}></select>
    <select
        class="chrome-select"
        title=${i18nString(UIStrings.saveDataSettingTooltip)}
        aria-label=${i18nString(UIStrings.saveDataSettingTooltip)}
        ${UI.Widget.widget(MobileThrottling.ThrottlingManager.SaveDataOverrideSelect)}></select>
  `);
}
function renderUserAgentSection(input, output) {
    const title = i18nString(UIStrings.userAgent);
    return renderSection(title, 'network-config-ua', html `
    <devtools-checkbox
        .checked=${!input.useCustomUA}
        @change=${(e) => input.onAutoCheckboxChange(e.target.checked)}
        jslog=${VisualLogging.toggle().track({ change: true }).context('custom-user-agent')}>
      ${i18nString(UIStrings.selectAutomatically)}
    </devtools-checkbox>
    <div class=${Directives.classMap({ 'network-config-ua-custom': true, checked: input.useCustomUA })}>
      ${renderUserAgentSelectAndInput(input, output, title)}
      <devtools-user-agent-client-hints-form
          .value=${input.clientHintsValue}
          .disabled=${!input.useCustomUA}
          @clienthintschange=${(e) => input.onClientHintsChange(e.target.value.metaData)}
          @clienthintssubmit=${(e) => input.onClientHintsSubmit(e.detail.value)}>
      </devtools-user-agent-client-hints-form>
    </div>
    <span class="status-text">${input.clientHintsStatusText}</span>
  `);
}
export const DEFAULT_VIEW = (input, output, target) => {
    render(html `
    ${renderCacheSection(input)}
    <div class="panel-section-separator"></div>
    ${renderNetworkThrottlingSection()}
    <div class="panel-section-separator"></div>
    ${renderUserAgentSection(input, output)}
  `, target, { container: { classes: ['network-config'] } });
};
// clang-format on
let networkConfigViewInstance;
export class NetworkConfigView extends UI.Widget.VBox {
    #cacheDisabledSetting = Common.Settings.Settings.instance().resolve(SDK.SDKSettings.cacheDisabledSettingDescriptor);
    #customUserAgentSetting = Common.Settings.Settings.instance().createSetting('custom-user-agent', '');
    #customUserAgentMetadataSetting = Common.Settings.Settings.instance().createSetting('custom-user-agent-metadata', null);
    #view;
    #viewOutput = {};
    #useCustomUA = false;
    #customSelectValue = 'custom';
    #validationError = '';
    #clientHintsValue;
    #statusText = '';
    constructor(view = DEFAULT_VIEW) {
        super({
            jslog: `${VisualLogging.panel('network-conditions').track({ resize: true })}`,
            useShadowDom: true,
        });
        this.registerRequiredCSS(networkConfigViewStyles);
        this.#view = view;
        this.#cacheDisabledSetting.addChangeListener(() => this.requestUpdate());
        this.#customUserAgentSetting.addChangeListener(() => {
            if (!this.#useCustomUA) {
                return;
            }
            const customUA = this.#customUserAgentSetting.get();
            const userAgentMetadata = getUserAgentMetadata(customUA);
            SDK.NetworkManager.MultitargetNetworkManager.instance().setCustomUserAgentOverride(customUA, userAgentMetadata);
        });
        this.#updateCustomSelectValue();
        if (!this.#customUserAgentSetting.get()) {
            this.#validationError = i18nString(UIStrings.customUserAgentFieldIsRequired);
        }
        const userAgentMetaDataSetting = this.#customUserAgentMetadataSetting.get();
        const initialUserAgentMetaData = getUserAgentMetadata(this.#customSelectValue);
        this.#clientHintsValue = {
            showMobileCheckbox: true,
            showSubmitButton: true,
            metaData: userAgentMetaDataSetting || initialUserAgentMetaData || undefined,
        };
    }
    static instance(opts = { forceNew: null }) {
        const { forceNew } = opts;
        if (!networkConfigViewInstance || forceNew) {
            networkConfigViewInstance = new NetworkConfigView();
        }
        return networkConfigViewInstance;
    }
    performUpdate() {
        const input = {
            disableCache: this.#cacheDisabledSetting.get(),
            onDisableCacheChange: (checked) => this.#onDisableCacheChange(checked),
            useCustomUA: this.#useCustomUA,
            onAutoCheckboxChange: (checked) => this.#onAutoCheckboxChange(checked),
            customSelectValue: this.#customSelectValue,
            onUserAgentSelect: (value) => this.#onUserAgentSelect(value),
            customUserAgent: this.#customUserAgentSetting.get(),
            onCustomUserAgentInput: (value) => this.#onCustomUserAgentInput(value),
            validationError: this.#validationError,
            clientHintsValue: this.#clientHintsValue,
            clientHintsStatusText: this.#statusText,
            onClientHintsChange: (metaData) => this.#onClientHintsChange(metaData),
            onClientHintsSubmit: (metaData) => this.#onClientHintsSubmit(metaData),
        };
        this.#view(input, this.#viewOutput, this.contentElement);
    }
    #onDisableCacheChange(checked) {
        this.#cacheDisabledSetting.set(checked);
        this.requestUpdate();
    }
    #onAutoCheckboxChange(checked) {
        const useCustomUA = !checked;
        this.#useCustomUA = useCustomUA;
        const customUA = useCustomUA ? this.#customUserAgentSetting.get() : '';
        const userAgentMetadata = useCustomUA ? getUserAgentMetadata(customUA) : null;
        SDK.NetworkManager.MultitargetNetworkManager.instance().setCustomUserAgentOverride(customUA, userAgentMetadata);
        this.requestUpdate();
    }
    #onUserAgentSelect(value) {
        this.#customSelectValue = value;
        const customOverride = 'custom';
        if (value !== customOverride) {
            this.#customUserAgentSetting.set(value);
            const userAgentMetadata = getUserAgentMetadata(value);
            this.#customUserAgentMetadataSetting.set(userAgentMetadata);
            SDK.NetworkManager.MultitargetNetworkManager.instance().setCustomUserAgentOverride(value, userAgentMetadata);
            this.#clientHintsValue = {
                metaData: userAgentMetadata || undefined,
                showMobileCheckbox: true,
                showSubmitButton: true,
            };
        }
        else {
            this.#customUserAgentMetadataSetting.set(null);
            this.#clientHintsValue = {
                showMobileCheckbox: true,
                showSubmitButton: true,
            };
            this.#viewOutput.selectCustomUserAgentInput?.();
        }
        this.#validationError = '';
        this.#statusText = '';
        this.requestUpdate();
    }
    #onCustomUserAgentInput(value) {
        if (this.#customUserAgentSetting.get() !== value) {
            if (!value) {
                this.#validationError = i18nString(UIStrings.customUserAgentFieldIsRequired);
            }
            else {
                this.#validationError = '';
            }
            this.#customUserAgentSetting.set(value);
            this.#updateCustomSelectValue();
            this.requestUpdate();
        }
    }
    #updateCustomSelectValue() {
        const value = this.#customUserAgentSetting.get();
        const { patchUserAgentWithChromeVersion } = SDK.NetworkManager.MultitargetNetworkManager;
        const isPreset = userAgentGroups.some(group => group.values.some(val => patchUserAgentWithChromeVersion(val.value) === value));
        this.#customSelectValue = isPreset ? value : 'custom';
    }
    #onClientHintsChange(metaData) {
        // The view re-assigns the form value on every render, so keep it in sync with the user's edits.
        this.#clientHintsValue = { ...this.#clientHintsValue, metaData };
        this.#customSelectValue = 'custom';
        this.#statusText = '';
        this.requestUpdate();
    }
    #onClientHintsSubmit(metaData) {
        const customUA = this.#customUserAgentSetting.get();
        this.#customUserAgentMetadataSetting.set(metaData);
        SDK.NetworkManager.MultitargetNetworkManager.instance().setCustomUserAgentOverride(customUA, metaData);
        this.#statusText = i18nString(UIStrings.clientHintsStatusText);
        this.requestUpdate();
    }
    wasShown() {
        super.wasShown();
        this.requestUpdate();
        UI.ARIAUtils.LiveAnnouncer.alert(i18nString(UIStrings.networkConditionsPanelShown));
    }
}
function getUserAgentMetadata(userAgent) {
    for (const userAgentDescriptor of userAgentGroups) {
        for (const userAgentVersion of userAgentDescriptor.values) {
            if (userAgent ===
                SDK.NetworkManager.MultitargetNetworkManager.patchUserAgentWithChromeVersion(userAgentVersion.value)) {
                // Read once: a preset can compute its metadata in a getter, so each read is a new object.
                const { metadata } = userAgentVersion;
                if (!metadata) {
                    return null;
                }
                SDK.NetworkManager.MultitargetNetworkManager.patchUserAgentMetadataWithChromeVersion(metadata);
                return metadata;
            }
        }
    }
    return null;
}
export const userAgentGroups = [
    {
        title: 'Android',
        values: [
            {
                title: 'Android (4.0.2) Browser \u2014 Galaxy Nexus',
                value: 'Mozilla/5.0 (Linux; U; Android 4.0.2; en-us; Galaxy Nexus Build/ICL53F) AppleWebKit/534.30 (KHTML, like Gecko) Version/4.0 Mobile Safari/534.30',
                metadata: {
                    brands: [
                        { brand: 'Not A;Brand', version: '99' },
                        { brand: 'Chromium', version: '%s' },
                        { brand: 'Google Chrome', version: '%s' },
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
                value: 'Mozilla/5.0 (Linux; U; Android 2.3.6; en-us; Nexus S Build/GRK39F) AppleWebKit/533.1 (KHTML, like Gecko) Version/4.0 Mobile Safari/533.1',
                metadata: {
                    brands: [
                        { brand: 'Not A;Brand', version: '99' },
                        { brand: 'Chromium', version: '%s' },
                        { brand: 'Google Chrome', version: '%s' },
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
                value: 'Mozilla/5.0 (BB10; Touch) AppleWebKit/537.1+ (KHTML, like Gecko) Version/10.0.0.1337 Mobile Safari/537.1+',
                metadata: null,
            },
            {
                title: 'BlackBerry \u2014 PlayBook 2.1',
                value: 'Mozilla/5.0 (PlayBook; U; RIM Tablet OS 2.1.0; en-US) AppleWebKit/536.2+ (KHTML, like Gecko) Version/7.2.1.0 Safari/536.2+',
                metadata: null,
            },
            {
                title: 'BlackBerry \u2014 9900',
                value: 'Mozilla/5.0 (BlackBerry; U; BlackBerry 9900; en-US) AppleWebKit/534.11+ (KHTML, like Gecko) Version/7.0.0.187 Mobile Safari/534.11+',
                metadata: null,
            },
        ],
    },
    {
        title: 'Chrome',
        values: [
            {
                title: 'Chrome \u2014 Android Mobile',
                value: 'Mozilla/5.0 (Linux; Android 16; Pixel 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/%s Mobile Safari/537.36',
                metadata: {
                    brands: [
                        { brand: 'Not A;Brand', version: '99' },
                        { brand: 'Chromium', version: '%s' },
                        { brand: 'Google Chrome', version: '%s' },
                    ],
                    fullVersion: '%s',
                    platform: 'Android',
                    platformVersion: '16',
                    architecture: '',
                    model: 'Pixel 10',
                    mobile: true,
                },
            },
            {
                title: 'Chrome \u2014 Android Mobile (high-end)',
                value: 'Mozilla/5.0 (Linux; Android 16; Pixel 10 Pro XL) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/%s Mobile Safari/537.36',
                metadata: {
                    brands: [
                        { brand: 'Not A;Brand', version: '99' },
                        { brand: 'Chromium', version: '%s' },
                        { brand: 'Google Chrome', version: '%s' },
                    ],
                    fullVersion: '%s',
                    platform: 'Android',
                    platformVersion: '16',
                    architecture: '',
                    model: 'Pixel 10 Pro XL',
                    mobile: true,
                },
            },
            {
                title: 'Chrome \u2014 Android Tablet',
                value: 'Mozilla/5.0 (Linux; Android 16; Pixel Tablet) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/%s Safari/537.36',
                metadata: {
                    brands: [
                        { brand: 'Not A;Brand', version: '99' },
                        { brand: 'Chromium', version: '%s' },
                        { brand: 'Google Chrome', version: '%s' },
                    ],
                    fullVersion: '%s',
                    platform: 'Android',
                    platformVersion: '16',
                    architecture: '',
                    model: 'Pixel Tablet',
                    mobile: true,
                },
            },
            {
                title: 'Chrome \u2014 iPhone',
                value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 26_4_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/%s Mobile/15E148 Safari/604.1',
                metadata: null,
            },
            {
                title: 'Chrome \u2014 iPad',
                value: 'Mozilla/5.0 (iPad; CPU OS 26_4_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/%s Mobile/15E148 Safari/604.1',
                metadata: null,
            },
            {
                title: 'Chrome \u2014 Chrome OS',
                value: 'Mozilla/5.0 (X11; CrOS x86_64 10066.0.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/%s Safari/537.36',
                metadata: {
                    brands: [
                        { brand: 'Not A;Brand', version: '99' },
                        { brand: 'Chromium', version: '%s' },
                        { brand: 'Google Chrome', version: '%s' },
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
                // Desktop Android with the AndroidDesktopUASpoofAsChromeOS and AndroidDesktopUAPlatform
                // features: the UA string is spoofed as Chrome OS, while UA-CH reports the real Android
                // platform and version.
                title: 'Chrome \u2014 Googlebook',
                value: 'Mozilla/5.0 (X11; CrOS x86_64 14541.0.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/%s Safari/537.36',
                get metadata() {
                    return {
                        brands: [
                            { brand: 'Not A;Brand', version: '99' },
                            { brand: 'Chromium', version: '%s' },
                            { brand: 'Google Chrome', version: '%s' },
                        ],
                        fullVersion: '%s',
                        platform: 'Android',
                        platformVersion: `${EmulationModel.DeviceModeModel.DeviceModeModel.getDynamicAndroidVersion()}.0.0`,
                        architecture: 'x86',
                        bitness: '64',
                        model: '',
                        mobile: false,
                    };
                },
            },
            {
                title: 'Chrome \u2014 Mac',
                value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/%s Safari/537.36',
                metadata: {
                    brands: [
                        { brand: 'Not A;Brand', version: '99' },
                        { brand: 'Chromium', version: '%s' },
                        { brand: 'Google Chrome', version: '%s' },
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
                        { brand: 'Not A;Brand', version: '99' },
                        { brand: 'Chromium', version: '%s' },
                        { brand: 'Google Chrome', version: '%s' },
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
                value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 8_3 like Mac OS X) AppleWebKit/600.1.4 (KHTML, like Gecko) FxiOS/1.0 Mobile/12F69 Safari/600.1.4',
                metadata: null,
            },
            {
                title: 'Firefox \u2014 iPad',
                value: 'Mozilla/5.0 (iPad; CPU iPhone OS 8_3 like Mac OS X) AppleWebKit/600.1.4 (KHTML, like Gecko) FxiOS/1.0 Mobile/12F69 Safari/600.1.4',
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
                value: 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; Googlebot/2.1; +http://www.google.com/bot.html) Chrome/%s Safari/537.36',
                metadata: null,
            },
            {
                title: 'Googlebot Smartphone',
                value: 'Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/%s Mobile Safari/537.36 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
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
            { title: 'Internet Explorer 7', value: 'Mozilla/4.0 (compatible; MSIE 7.0; Windows NT 6.0)', metadata: null },
        ],
    },
    {
        title: 'Microsoft Edge',
        values: [
            {
                title: 'Microsoft Edge (Chromium) \u2014 Windows',
                value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/%s Safari/537.36 Edg/%s',
                metadata: {
                    brands: [
                        { brand: 'Not A;Brand', version: '99' },
                        { brand: 'Chromium', version: '%s' },
                        { brand: 'Microsoft Edge', version: '%s' },
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
                value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Chrome/%s Safari/604.1 Edg/%s',
                metadata: {
                    brands: [
                        { brand: 'Not A;Brand', version: '99' },
                        { brand: 'Chromium', version: '%s' },
                        { brand: 'Microsoft Edge', version: '%s' },
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
                value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 12_3_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/12.1.1 EdgiOS/44.5.0.10 Mobile/15E148 Safari/604.1',
                metadata: null,
            },
            {
                title: 'Microsoft Edge \u2014 iPad',
                value: 'Mozilla/5.0 (iPad; CPU OS 12_3_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/12.0 EdgiOS/44.5.2 Mobile/15E148 Safari/605.1.15',
                metadata: null,
            },
            {
                title: 'Microsoft Edge \u2014 Android Mobile',
                value: 'Mozilla/5.0 (Linux; Android 8.1.0; Pixel Build/OPM4.171019.021.D1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/%s Mobile Safari/537.36 EdgA/42.0.0.2057',
                metadata: {
                    brands: [
                        { brand: 'Not A;Brand', version: '99' },
                        { brand: 'Chromium', version: '%s' },
                        { brand: 'Microsoft Edge', version: '%s' },
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
                value: 'Mozilla/5.0 (Linux; Android 6.0.1; Nexus 7 Build/MOB30X) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/%s Safari/537.36 EdgA/42.0.0.2057',
                metadata: {
                    brands: [
                        { brand: 'Not A;Brand', version: '99' },
                        { brand: 'Chromium', version: '%s' },
                        { brand: 'Microsoft Edge', version: '%s' },
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
                value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/%s Safari/537.36 Edge/18.19042',
                metadata: null,
            },
            {
                title: 'Microsoft Edge (EdgeHTML) \u2014 XBox',
                value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; Xbox; Xbox One) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/%s Safari/537.36 Edge/18.19041',
                metadata: null,
            },
        ],
    },
    {
        title: 'Opera',
        values: [
            {
                title: 'Opera \u2014 Mac',
                value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/%s Safari/537.36 OPR/65.0.3467.48',
                metadata: null,
            },
            {
                title: 'Opera \u2014 Windows',
                value: 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/%s Safari/537.36 OPR/65.0.3467.48',
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
                value: 'Mozilla/5.0 (iPad; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1',
                metadata: null,
            },
            {
                title: 'Safari \u2014 iPhone iOS 13.2',
                value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1',
                metadata: null,
            },
            {
                title: 'Safari \u2014 Mac',
                value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Safari/605.1.15',
                metadata: null,
            },
        ],
    },
    {
        title: 'UC Browser',
        values: [
            {
                title: 'UC Browser \u2014 Android Mobile',
                value: 'Mozilla/5.0 (Linux; U; Android 8.1.0; en-US; Nexus 6P Build/OPM7.181205.001) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/%s UCBrowser/12.11.1.1197 Mobile Safari/537.36',
                metadata: null,
            },
            {
                title: 'UC Browser \u2014 iOS',
                value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 12_1 like Mac OS X; zh-CN) AppleWebKit/537.51.1 (KHTML, like Gecko) Mobile/16B92 UCBrowser/12.1.7.1109 Mobile AliApp(TUnionSDK/0.1.20.3)',
                metadata: null,
            },
            {
                title: 'UC Browser \u2014 Windows Phone',
                value: 'Mozilla/5.0 (compatible; MSIE 10.0; Windows Phone 8.0; Trident/6.0; IEMobile/10.0; ARM; Touch; NOKIA; Lumia 920) UCBrowser/10.1.0.563 Mobile',
                metadata: null,
            },
        ],
    },
];
//# sourceMappingURL=NetworkConfigView.js.map
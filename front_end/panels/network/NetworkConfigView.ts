// Copyright 2015 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import * as EmulationModel from '../../models/emulation/emulation.js';
import * as UI from '../../ui/legacy/legacy.js';
import {Directives, html, type LitTemplate, render} from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import * as MobileThrottling from '../mobile_throttling/mobile_throttling.js';
import * as EmulationComponents from '../settings/emulation/components/components.js';
import * as PanelUtils from '../utils/utils.js';

import networkConfigViewStyles from './networkConfigView.css.js';

const {ref} = Directives;

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
} as const;
const str_ = i18n.i18n.registerUIStrings('panels/network/NetworkConfigView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export interface NetworkConfigViewInput {
  disableCache: boolean;
  onDisableCacheChange: (checked: boolean) => void;
  useCustomUA: boolean;
  onAutoCheckboxChange: (checked: boolean) => void;
  customSelectValue: string;
  onUserAgentSelect: (value: string) => void;
  customUserAgent: string;
  onCustomUserAgentInput: (value: string) => void;
  validationError: string;
  clientHintsValue: EmulationComponents.UserAgentClientHintsForm.UserAgentClientHintsFormData;
  clientHintsStatusText: string;
  onClientHintsChange: (metaData?: Protocol.Emulation.UserAgentMetadata) => void;
  onClientHintsSubmit: (metaData: Protocol.Emulation.UserAgentMetadata) => void;
}

export interface NetworkConfigViewOutput {
  selectCustomUserAgentInput?: () => void;
  focusAndHighlightCustomUserAgentSelect?: () => void;
}

export type View = (input: NetworkConfigViewInput, output: NetworkConfigViewOutput, target: HTMLElement) => void;

// clang-format off
function renderUserAgentSelectAndInput(
    input: NetworkConfigViewInput, output: NetworkConfigViewOutput, title: string): LitTemplate {
  const customOverride = {title: i18nString(UIStrings.custom), value: 'custom'};
  const {patchUserAgentWithChromeVersion} = SDK.NetworkManager.MultitargetNetworkManager;
  const {toKebabCase} = Platform.StringUtilities;
  return html`
    <select
        jslog=${VisualLogging.dropDown().track({change: true}).context('custom-user-agent')}
        aria-label=${title}
        ?disabled=${!input.useCustomUA}
        @change=${(e: Event) => input.onUserAgentSelect((e.target as HTMLSelectElement).value)}
        ${ref(el => {
          output.focusAndHighlightCustomUserAgentSelect = el instanceof HTMLSelectElement ? () => {
            el.focus();
            PanelUtils.PanelUtils.highlightElement(el);
          } : undefined;
        })}>
      <option
          value=${customOverride.value}
          .selected=${input.customSelectValue === customOverride.value}
          jslog=${VisualLogging.item('custom').track({click: true})}>
        ${customOverride.title}
      </option>
      ${EmulationModel.UserAgentGroups.userAgentGroups.map(group => html`
        <optgroup label=${group.title}>
          ${group.values.map(val => html`
            <option
                value=${patchUserAgentWithChromeVersion(val.value)}
                .selected=${input.customSelectValue === patchUserAgentWithChromeVersion(val.value)}
                jslog=${VisualLogging.item(toKebabCase(val.title)).track({click: true})}>
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
        jslog=${VisualLogging.textField().track({change: true}).context('custom-user-agent')}
        .value=${input.customUserAgent}
        title=${input.customUserAgent}
        placeholder=${i18nString(UIStrings.enterACustomUserAgent)}
        required
        aria-label=${i18nString(UIStrings.enterACustomUserAgent)}
        ?disabled=${!input.useCustomUA}
        @input=${(e: Event) => input.onCustomUserAgentInput((e.target as HTMLInputElement).value)}
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

function renderSection(title: string, className: string, content: LitTemplate): LitTemplate {
  return html`
    <section class="network-config-group ${className}">
      <div class="network-config-title">${title}</div>
      <div class="network-config-fields">${content}</div>
    </section>
  `;
}

function renderCacheSection(input: NetworkConfigViewInput): LitTemplate {
  return renderSection(i18nString(UIStrings.caching), 'network-config-disable-cache', html`
    <devtools-checkbox
        name=${i18nString(UIStrings.disableCache)}
        .checked=${input.disableCache}
        @change=${(e: Event) => input.onDisableCacheChange((e.target as UI.UIUtils.CheckboxLabel).checked)}
        jslog=${VisualLogging.toggle().track({change: true}).context('cache-disabled')}>
      ${i18nString(UIStrings.disableCache)}
    </devtools-checkbox>
  `);
}

function renderNetworkThrottlingSection(): LitTemplate {
  const title = i18nString(UIStrings.networkThrottling);
  return renderSection(title, 'network-config-throttling', html`
    <select
        ${UI.Widget.widget(MobileThrottling.NetworkThrottlingSelector.NetworkThrottlingSelect, {
          title,
          bindToGlobalConditions: true,
        })}></select>
    <select
        class="chrome-select"
        ${UI.Widget.widget(MobileThrottling.ThrottlingManager.SaveDataOverrideSelect)}></select>
  `);
}

function renderUserAgentSection(input: NetworkConfigViewInput, output: NetworkConfigViewOutput): LitTemplate {
  const title = i18nString(UIStrings.userAgent);
  return renderSection(title, 'network-config-ua', html`
    <devtools-checkbox
        .checked=${!input.useCustomUA}
        @change=${(e: Event) => input.onAutoCheckboxChange((e.target as UI.UIUtils.CheckboxLabel).checked)}
        jslog=${VisualLogging.toggle().track({change: true}).context('custom-user-agent')}>
      ${i18nString(UIStrings.selectAutomatically)}
    </devtools-checkbox>
    <div class=${Directives.classMap({'network-config-ua-custom': true, checked: input.useCustomUA})}>
      ${renderUserAgentSelectAndInput(input, output, title)}
      <devtools-widget
          class="user-agent-client-hints-form"
          @clienthintschange=${(e: CustomEvent<Protocol.Emulation.UserAgentMetadata>) =>
              input.onClientHintsChange(e.detail)}
          @clienthintssubmit=${(e: CustomEvent<Protocol.Emulation.UserAgentMetadata>) =>
              input.onClientHintsSubmit(e.detail)}
          ${UI.Widget.widget(EmulationComponents.UserAgentClientHintsForm.UserAgentClientHintsForm, {
            value: input.clientHintsValue,
            disabled: !input.useCustomUA,
          })}>
      </devtools-widget>
    </div>
    <span class="status-text">${input.clientHintsStatusText}</span>
  `);
}

export const DEFAULT_VIEW: View = (input, output, target) => {
  render(html`
    <style>${networkConfigViewStyles}</style>
    ${renderCacheSection(input)}
    <div class="panel-section-separator"></div>
    ${renderNetworkThrottlingSection()}
    <div class="panel-section-separator"></div>
    ${renderUserAgentSection(input, output)}
  `, target, {
    container: {
      classes: ['network-config'],
      attributes: {jslog: `${VisualLogging.panel('network-conditions').track({resize: true})}`},
    },
  });
};
// clang-format on

let networkConfigViewInstance: NetworkConfigView;

export class NetworkConfigView extends UI.Widget.VBox {
  readonly #cacheDisabledSetting =
      Common.Settings.Settings.instance().resolve(SDK.SDKSettings.cacheDisabledSettingDescriptor);
  readonly #customUserAgentSetting = Common.Settings.Settings.instance().createSetting('custom-user-agent', '');
  readonly #customUserAgentMetadataSetting =
      Common.Settings.Settings.instance().createSetting<Protocol.Emulation.UserAgentMetadata|null>(
          'custom-user-agent-metadata', null);

  readonly #view: View;
  readonly #viewOutput: NetworkConfigViewOutput = {};
  #customSelectValue = 'custom';
  #validationError = '';
  #clientHintsValue: EmulationComponents.UserAgentClientHintsForm.UserAgentClientHintsFormData;
  #statusText = '';

  constructor(view: View = DEFAULT_VIEW) {
    super({
      useShadowDom: true,
    });
    this.#view = view;

    this.#cacheDisabledSetting.addChangeListener(() => this.requestUpdate());
    this.#customUserAgentSetting.addChangeListener(() => {
      const networkManager = SDK.NetworkManager.MultitargetNetworkManager.instance();
      if (!networkManager.customUserAgentEnabled()) {
        return;
      }
      const customUA = this.#customUserAgentSetting.get();
      const userAgentMetadata = EmulationModel.UserAgentGroups.getUserAgentMetadata(customUA);
      networkManager.setCustomUserAgentOverride(customUA, userAgentMetadata);
    });

    this.#updateCustomSelectValue();
    if (!this.#customUserAgentSetting.get()) {
      this.#validationError = i18nString(UIStrings.customUserAgentFieldIsRequired);
    }

    const userAgentMetaDataSetting = this.#customUserAgentMetadataSetting.get();
    const initialUserAgentMetaData = EmulationModel.UserAgentGroups.getUserAgentMetadata(this.#customSelectValue);
    this.#clientHintsValue = {
      showMobileCheckbox: true,
      showSubmitButton: true,
      metaData: userAgentMetaDataSetting || initialUserAgentMetaData || undefined,
    };
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

  override performUpdate(): void {
    const input: NetworkConfigViewInput = {
      disableCache: this.#cacheDisabledSetting.get(),
      onDisableCacheChange: (checked: boolean) => this.#onDisableCacheChange(checked),
      useCustomUA: SDK.NetworkManager.MultitargetNetworkManager.instance().customUserAgentEnabled(),
      onAutoCheckboxChange: (checked: boolean) => this.#onAutoCheckboxChange(checked),
      customSelectValue: this.#customSelectValue,
      onUserAgentSelect: (value: string) => this.#onUserAgentSelect(value),
      customUserAgent: this.#customUserAgentSetting.get(),
      onCustomUserAgentInput: (value: string) => this.#onCustomUserAgentInput(value),
      validationError: this.#validationError,
      clientHintsValue: this.#clientHintsValue,
      clientHintsStatusText: this.#statusText,
      onClientHintsChange: (metaData?: Protocol.Emulation.UserAgentMetadata) => this.#onClientHintsChange(metaData),
      onClientHintsSubmit: (metaData: Protocol.Emulation.UserAgentMetadata) => this.#onClientHintsSubmit(metaData),
    };
    this.#view(input, this.#viewOutput, this.contentElement);
  }

  #onDisableCacheChange(checked: boolean): void {
    this.#cacheDisabledSetting.set(checked);
    this.requestUpdate();
  }

  #onAutoCheckboxChange(checked: boolean): void {
    const networkManager = SDK.NetworkManager.MultitargetNetworkManager.instance();
    // The checkbox is "Use browser default", so checking it disables the custom user agent.
    const useCustomUA = !checked;
    networkManager.setCustomUserAgentEnabled(useCustomUA);
    if (useCustomUA) {
      const customUA = this.#customUserAgentSetting.get();
      const userAgentMetadata = EmulationModel.UserAgentGroups.getUserAgentMetadata(customUA);
      networkManager.setCustomUserAgentOverride(customUA, userAgentMetadata);
    }
  }

  #onUserAgentSelect(value: string): void {
    this.#customSelectValue = value;
    const customOverride = 'custom';
    if (value !== customOverride) {
      this.#customUserAgentSetting.set(value);
      const userAgentMetadata = EmulationModel.UserAgentGroups.getUserAgentMetadata(value);
      this.#customUserAgentMetadataSetting.set(userAgentMetadata);
      SDK.NetworkManager.MultitargetNetworkManager.instance().setCustomUserAgentOverride(value, userAgentMetadata);
      this.#clientHintsValue = {
        metaData: userAgentMetadata || undefined,
        showMobileCheckbox: true,
        showSubmitButton: true,
      };
    } else {
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

  #onCustomUserAgentInput(value: string): void {
    if (this.#customUserAgentSetting.get() !== value) {
      if (!value) {
        this.#validationError = i18nString(UIStrings.customUserAgentFieldIsRequired);
      } else {
        this.#validationError = '';
      }
      this.#customUserAgentSetting.set(value);
      this.#updateCustomSelectValue();
      this.requestUpdate();
    }
  }

  #updateCustomSelectValue(): void {
    const value = this.#customUserAgentSetting.get();
    this.#customSelectValue = EmulationModel.UserAgentGroups.findUserAgentPreset(value) ? value : 'custom';
  }

  #onClientHintsChange(metaData?: Protocol.Emulation.UserAgentMetadata): void {
    // The view re-assigns the form value on every render, so keep it in sync with the user's edits.
    this.#clientHintsValue = {...this.#clientHintsValue, metaData};
    this.#customSelectValue = 'custom';
    this.#statusText = '';
    this.requestUpdate();
  }

  #onClientHintsSubmit(metaData: Protocol.Emulation.UserAgentMetadata): void {
    const customUA = this.#customUserAgentSetting.get();
    this.#customUserAgentMetadataSetting.set(metaData);
    SDK.NetworkManager.MultitargetNetworkManager.instance().setCustomUserAgentOverride(customUA, metaData);
    this.#statusText = i18nString(UIStrings.clientHintsStatusText);
    this.requestUpdate();
  }

  override wasShown(): void {
    super.wasShown();
    SDK.NetworkManager.MultitargetNetworkManager.instance().addEventListener(
        SDK.NetworkManager.MultitargetNetworkManager.Events.CUSTOM_USER_AGENT_CHANGED, this.requestUpdate, this);
    this.requestUpdate();
    UI.ARIAUtils.LiveAnnouncer.alert(i18nString(UIStrings.networkConditionsPanelShown));
  }

  override willHide(): void {
    super.willHide();
    SDK.NetworkManager.MultitargetNetworkManager.instance().removeEventListener(
        SDK.NetworkManager.MultitargetNetworkManager.Events.CUSTOM_USER_AGENT_CHANGED, this.requestUpdate, this);
  }

  revealUserAgent(): void {
    this.#viewOutput.focusAndHighlightCustomUserAgentSelect?.();
  }
}

export class UserAgentRevealer implements Common.Revealer.Revealer<SDK.NetworkManager.RevealableCustomUserAgent> {
  async reveal(): Promise<void> {
    await UI.ViewManager.ViewManager.instance().showView('network.config');
    const view = NetworkConfigView.instance();
    await view.updateComplete;
    view.revealUserAgent();
  }
}

// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../core/common/common.js';
import * as ComponentHelpers from '../../../ui/components/helpers/helpers.js';
import type * as Host from '../../../core/host/host.js';
import * as i18n from '../../../core/i18n/i18n.js';
import * as LitHtml from '../../../ui/lit-html/lit-html.js';
import * as Settings from '../../../ui/components/settings/settings.js';
import * as SDK from '../../../core/sdk/sdk.js';

import syncSectionStyles from './syncSection.css.js';

const UIStrings = {
  /**
   * @description Text shown to the user in the Settings UI. 'This setting' refers
   * to a checkbox that is disabled.
   */
  syncDisabled: 'To turn this setting on, you must enable Chrome sync.',
  /**
   * @description Text shown to the user in the Settings UI. 'This setting' refers
   * to a checkbox that is disabled.
   */
  preferencesSyncDisabled: 'To turn this setting on, you must first enable settings sync in Chrome.',
  /**
   * @description Label for a link that take the user to the "Sync" section of the
   * chrome settings. The link is shown in the DevTools Settings UI.
   */
  settings: 'Go to Settings',
  /**
   * @description Label for the account email address. Shown in the DevTools Settings UI in
   * front of the email address currently used for Chrome Sync.
   */
  signedIn: 'Signed into Chrome as:',
};
const str_ = i18n.i18n.registerUIStrings('panels/settings/components/SyncSection.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export interface SyncSectionData {
  syncInfo: Host.InspectorFrontendHostAPI.SyncInformation;
  syncSetting: Common.Settings.Setting<boolean>;
}

export class SyncSection extends HTMLElement {
  static readonly litTagName = LitHtml.literal`devtools-sync-section`;
  private readonly shadow = this.attachShadow({mode: 'open'});

  private syncInfo: Host.InspectorFrontendHostAPI.SyncInformation = {isSyncActive: false};
  private syncSetting?: Common.Settings.Setting<boolean>;

  private boundRender = this.render.bind(this);

  connectedCallback(): void {
    this.shadow.adoptedStyleSheets = [syncSectionStyles];
  }

  set data(data: SyncSectionData) {
    this.syncInfo = data.syncInfo;
    this.syncSetting = data.syncSetting;
    ComponentHelpers.ScheduledRender.scheduleRender(this, this.boundRender);
  }

  private render(): void {
    if (!this.syncSetting) {
      throw new Error('SyncSection not properly initialized');
    }

    const checkboxDisabled = !this.syncInfo.isSyncActive || !this.syncInfo.arePreferencesSynced;
    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    LitHtml.render(LitHtml.html`
      <fieldset>
        <legend>${Common.Settings.getLocalizedSettingsCategory(Common.Settings.SettingCategory.SYNC)}</legend>
        ${renderAccountInfoOrWarning(this.syncInfo)}
        <${Settings.SettingCheckbox.SettingCheckbox.litTagName} .data=${
            {setting: this.syncSetting, disabled: checkboxDisabled} as Settings.SettingCheckbox.SettingCheckboxData}>
        </${Settings.SettingCheckbox.SettingCheckbox.litTagName}>
      </fieldset>
    `, this.shadow, {host: this});
    // clang-format on
  }
}

/* x-link doesn't work with custom click/keydown handlers */
/* eslint-disable rulesdir/ban_a_tags_in_lit_html */

function renderAccountInfoOrWarning(syncInfo: Host.InspectorFrontendHostAPI.SyncInformation): LitHtml.TemplateResult {
  if (!syncInfo.isSyncActive) {
    const link = 'chrome://settings/syncSetup';
    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    return LitHtml.html`
      <span class="warning">
        ${i18nString(UIStrings.syncDisabled)} <a href=${link} class="link" target="_blank"
          @click=${(e: Event): void => openSettingsTab(link, e)}
          @keydown=${(e: Event): void => openSettingsTab(link, e)}>${i18nString(UIStrings.settings)}</x-link>
      </span>`;
    // clang-format on
  }
  if (!syncInfo.arePreferencesSynced) {
    const link = 'chrome://settings/syncSetup/advanced';
    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    return LitHtml.html`
      <span class="warning">
        ${i18nString(UIStrings.preferencesSyncDisabled)} <a href=${link} class="link" target="_blank"
          @click=${(e: Event): void => openSettingsTab(link, e)}
          @keydown=${(e: Event): void => openSettingsTab(link, e)}>${i18nString(UIStrings.settings)}</x-link>
      </span>`;
    // clang-format on
  }
  return LitHtml.html`
    <div class="account-info">
      <img src="data:image/png;base64, ${syncInfo.accountImage}" alt="Account avatar" />
      <div class="account-email">
        <span>${i18nString(UIStrings.signedIn)}</span>
        <span>${syncInfo.accountEmail}</span>
      </div>
    </div>`;
}

// Navigating to a chrome:// link via a normal anchor doesn't work, so we "navigate"
// there using CDP.
function openSettingsTab(url: string, event: Event): void {
  if (event.type === 'click' || (event.type === 'keydown' && self.isEnterOrSpaceKey(event))) {
    const mainTarget = SDK.TargetManager.TargetManager.instance().mainTarget();
    mainTarget && mainTarget.targetAgent().invoke_createTarget({url});
    event.consume(true);
  }
}

ComponentHelpers.CustomElements.defineComponent('devtools-sync-section', SyncSection);

declare global {
  interface HTMLElementTagNameMap {
    'devtools-sync-section': SyncSection;
  }
}

// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import '../../../ui/components/chrome_link/chrome_link.js';
import '../../../ui/components/settings/settings.js';

import type * as Common from '../../../core/common/common.js';
import type * as Host from '../../../core/host/host.js';
import * as i18n from '../../../core/i18n/i18n.js';
import type * as Platform from '../../../core/platform/platform.js';
import * as ComponentHelpers from '../../../ui/components/helpers/helpers.js';
import * as LitHtml from '../../../ui/lit-html/lit-html.js';

import syncSectionStyles from './syncSection.css.js';

const {html} = LitHtml;

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
  readonly #shadow = this.attachShadow({mode: 'open'});

  #syncInfo: Host.InspectorFrontendHostAPI.SyncInformation = {isSyncActive: false};
  #syncSetting?: Common.Settings.Setting<boolean>;

  #boundRender = this.#render.bind(this);

  connectedCallback(): void {
    this.#shadow.adoptedStyleSheets = [syncSectionStyles];
  }

  set data(data: SyncSectionData) {
    this.#syncInfo = data.syncInfo;
    this.#syncSetting = data.syncSetting;
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#boundRender);
  }

  #render(): void {
    if (!this.#syncSetting) {
      throw new Error('SyncSection not properly initialized');
    }

    // TODO: this should not probably happen in render, instead, the setting
    // should be disabled.
    const checkboxDisabled = !this.#syncInfo.isSyncActive || !this.#syncInfo.arePreferencesSynced;
    this.#syncSetting?.setDisabled(checkboxDisabled);
    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    LitHtml.render(html`
      <fieldset>
        ${renderAccountInfoOrWarning(this.#syncInfo)}
        <setting-checkbox .data=${
            {setting: this.#syncSetting}}>
        </setting-checkbox>
      </fieldset>
    `, this.#shadow, {host: this});
    // clang-format on
  }
}

/* x-link doesn't work with custom click/keydown handlers */
/* eslint-disable rulesdir/ban_a_tags_in_lit_html */

function renderAccountInfoOrWarning(syncInfo: Host.InspectorFrontendHostAPI.SyncInformation): LitHtml.TemplateResult {
  if (!syncInfo.isSyncActive) {
    const link = 'chrome://settings/syncSetup' as Platform.DevToolsPath.UrlString;
    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    return html`
      <span class="warning">
        ${i18nString(UIStrings.syncDisabled)}
        <devtools-chrome-link .href=${link}>${i18nString(UIStrings.settings)}</devtools-chrome-link>
      </span>`;
    // clang-format on
  }
  if (!syncInfo.arePreferencesSynced) {
    const link = 'chrome://settings/syncSetup/advanced' as Platform.DevToolsPath.UrlString;
    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    return html`
      <span class="warning">
        ${i18nString(UIStrings.preferencesSyncDisabled)}
        <devtools-chrome-link .href=${link}>${i18nString(UIStrings.settings)}</devtools-chrome-link>
      </span>`;
    // clang-format on
  }
  return html`
    <div class="account-info">
      <img src="data:image/png;base64, ${syncInfo.accountImage}" alt="Account avatar" />
      <div class="account-email">
        <span>${i18nString(UIStrings.signedIn)}</span>
        <span>${syncInfo.accountEmail}</span>
      </div>
    </div>`;
}

customElements.define('devtools-sync-section', SyncSection);

declare global {
  interface HTMLElementTagNameMap {
    'devtools-sync-section': SyncSection;
  }
}

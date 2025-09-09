// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable rulesdir/no-lit-render-outside-of-view */

import '../../../ui/components/chrome_link/chrome_link.js';
import '../../../ui/components/settings/settings.js';
import '../../../ui/components/tooltips/tooltips.js';

import type * as Common from '../../../core/common/common.js';
import * as Host from '../../../core/host/host.js';
import * as i18n from '../../../core/i18n/i18n.js';
import type * as Platform from '../../../core/platform/platform.js';
import * as Root from '../../../core/root/root.js';
import * as Buttons from '../../../ui/components/buttons/buttons.js';
import * as ComponentHelpers from '../../../ui/components/helpers/helpers.js';
import * as Lit from '../../../ui/lit/lit.js';
import * as PanelCommon from '../../common/common.js';

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
   * @description Label for the account email address. Shown in the DevTools Settings UI in
   * front of the email address currently used for Chrome Sync.
   */
  signedIn: 'Signed into Chrome as:',
  /**
   * @description Label for the account settings. Shown in the DevTools Settings UI in
   * case the user is not logged in to Chrome.
   */
  notSignedIn: 'You\'re not signed into Chrome.',
  /**
   * @description Label for the Google Developer Program profile status that corresponds to
   * standard plan (No subscription).
   */
  gdpStandardPlan: 'Standard plan',
  /**
   * @description Label for the Google Developer Program subscription status that corresponds to
   * `PREMIUM_ANNUAL` plan.
   */
  gdpPremiumAnnualSubscription: 'Premium (Annual)',
  /**
   * @description Label for the Google Developer Program subscription status that corresponds to
   * `PREMIUM_MONTHLY` plan.
   */
  gdpPremiumMonthlySubscription: 'Premium (Monthly)',
  /**
   * @description Label for the Google Developer Program subscription status that corresponds to
   * `PRO_ANNUAL` plan.
   */
  gdpProAnnualSubscription: 'Pro (Annual)',
  /**
   * @description Label for the Google Developer Program subscription status that corresponds to
   * `PRO_MONTHLY` plan.
   */
  gdpProMonthlySubscription: 'Pro (Monthly)',
  /**
   * @description Label for the Google Developer Program subscription status that corresponds
   * to a plan not known by the client.
   */
  gdpUnknownSubscription: 'Unknown plan',
  /**
   * @description Label for Sign-Up button for the Google Developer Program profiles.
   */
  signUp: 'Sign up',
  /**
   * @description Text for the data notice right after the settings checkbox.
   */
  relevantDataDisclaimer: '(Relevant data is sent to Google)',
  /**
   * @description Link text for opening the Google Developer Program profile page.
   */
  viewProfile: 'View profile',
} as const;
const str_ = i18n.i18n.registerUIStrings('panels/settings/components/SyncSection.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
const lockedString = i18n.i18n.lockedString;

const {html} = Lit;

function getGdpSubscriptionText(profile: Host.GdpClient.Profile): Platform.UIString.LocalizedString {
  if (!profile.activeSubscription ||
      profile.activeSubscription.subscriptionStatus !== Host.GdpClient.SubscriptionStatus.ENABLED) {
    return i18nString(UIStrings.gdpStandardPlan);
  }

  switch (profile.activeSubscription.subscriptionTier) {
    case Host.GdpClient.SubscriptionTier.PREMIUM_ANNUAL:
      return i18nString(UIStrings.gdpPremiumAnnualSubscription);
    case Host.GdpClient.SubscriptionTier.PREMIUM_MONTHLY:
      return i18nString(UIStrings.gdpPremiumMonthlySubscription);
    case Host.GdpClient.SubscriptionTier.PRO_ANNUAL:
      return i18nString(UIStrings.gdpProAnnualSubscription);
    case Host.GdpClient.SubscriptionTier.PRO_MONTHLY:
      return i18nString(UIStrings.gdpProMonthlySubscription);
    default:
      return i18nString(UIStrings.gdpUnknownSubscription);
  }
}

const GDP_LOGO_IMAGE_URL = new URL('../../../Images/gdp-logo-standalone.svg', import.meta.url).toString();

export interface SyncSectionData {
  syncInfo: Host.InspectorFrontendHostAPI.SyncInformation;
  syncSetting: Common.Settings.Setting<boolean>;
  receiveBadgesSetting: Common.Settings.Setting<boolean>;
}

export class SyncSection extends HTMLElement {
  readonly #shadow = this.attachShadow({mode: 'open'});

  #syncInfo: Host.InspectorFrontendHostAPI.SyncInformation = {isSyncActive: false};
  #syncSetting?: Common.Settings.Setting<boolean>;
  #receiveBadgesSetting?: Common.Settings.Setting<boolean>;
  #gdpProfile?: Host.GdpClient.Profile;

  set data(data: SyncSectionData) {
    this.#syncInfo = data.syncInfo;
    this.#syncSetting = data.syncSetting;
    this.#receiveBadgesSetting = data.receiveBadgesSetting;
    void this.#updateGdpProfile();
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#render);
  }

  #render(): void {
    if (!this.#syncSetting) {
      throw new Error('SyncSection is not properly initialized');
    }

    // TODO: this should not probably happen in render, instead, the setting
    // should be disabled.
    const checkboxDisabled = !this.#syncInfo.isSyncActive || !this.#syncInfo.arePreferencesSynced;
    this.#syncSetting?.setDisabled(checkboxDisabled);
    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    Lit.render(html`
      <style>${syncSectionStyles}</style>
      <fieldset>
        ${renderAccountInfo(this.#syncInfo)}
        ${renderSettingCheckboxIfNeeded(this.#syncInfo, this.#syncSetting)}
        ${renderGdpSectionIfNeeded({ receiveBadgesSetting: this.#receiveBadgesSetting, gdpProfile: this.#gdpProfile })}
      </fieldset>
    `, this.#shadow, {host: this});
    // clang-format on
  }

  async #updateGdpProfile(): Promise<void> {
    this.#gdpProfile = await Host.GdpClient.GdpClient.instance().getProfile() ?? undefined;
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#render);
  }
}

function renderSettingCheckboxIfNeeded(
    syncInfo: Host.InspectorFrontendHostAPI.SyncInformation,
    syncSetting: Common.Settings.Setting<boolean>): Lit.LitTemplate {
  if (!syncInfo.accountEmail) {
    return Lit.nothing;
  }

  // clang-format off
  return html`
    <div class="setting-checkbox-container">
      <setting-checkbox class="setting-checkbox" .data=${{setting: syncSetting}}>
      </setting-checkbox>
      ${renderWarningIfNeeded(syncInfo)}
    </div>
  `;
  // clang-format on
}

function renderWarningIfNeeded(syncInfo: Host.InspectorFrontendHostAPI.SyncInformation): Lit.LitTemplate {
  const hasWarning = !syncInfo.isSyncActive || !syncInfo.arePreferencesSynced;
  if (!hasWarning) {
    return Lit.nothing;
  }

  const warningLink = !syncInfo.isSyncActive ?
      'chrome://settings/syncSetup' as Platform.DevToolsPath.UrlString :
      'chrome://settings/syncSetup/advanced' as Platform.DevToolsPath.UrlString;
  const warningText =
      !syncInfo.isSyncActive ? i18nString(UIStrings.syncDisabled) : i18nString(UIStrings.preferencesSyncDisabled);
  // clang-format off
  return html`
    <devtools-chrome-link .href=${warningLink}>
      <devtools-button
        aria-describedby=settings-sync-info
        .iconName=${'info'}
        .variant=${Buttons.Button.Variant.ICON}
        .size=${Buttons.Button.Size.SMALL}>
      </devtools-button>
    </devtools-chrome-link>
    <devtools-tooltip
        id=settings-sync-info
        variant=simple>
      ${warningText}
    </devtools-tooltip>
  `;
  // clang-format on
}

function renderAccountInfo(syncInfo: Host.InspectorFrontendHostAPI.SyncInformation): Lit.LitTemplate {
  if (!syncInfo.accountEmail) {
    // clang-format off
    return html`
      <div class="not-signed-in">${i18nString(UIStrings.notSignedIn)}</div>
    `;
    // clang-format on
  }

  // clang-format off
  return html`
    <div class="account-info">
      <img src="data:image/png;base64, ${syncInfo.accountImage}" alt="Account avatar" />
      <div class="account-email">
        <span>${i18nString(UIStrings.signedIn)}</span>
        <span>${syncInfo.accountEmail}</span>
      </div>
    </div>`;
  // clang-format on
}

function renderGdpSectionIfNeeded({
  receiveBadgesSetting,
  gdpProfile,
}: {
  receiveBadgesSetting?: Common.Settings.Setting<boolean>,
  gdpProfile?: Host.GdpClient.Profile,
}): Lit.LitTemplate {
  // clang-format off
  if (!Root.Runtime.hostConfig.devToolsGdpProfiles?.enabled) {
    return Lit.nothing;
  }

  function renderBrand(): Lit.LitTemplate {
    return html`
      <div class="gdp-profile-header">
        <img src=${GDP_LOGO_IMAGE_URL} class="gdp-logo" alt="Google Developer Program">
        ${lockedString('Google Developer Program')}
      </div>
    `;
  }

  return html`
    <div class="gdp-profile-container">
      <div class="divider"></div>
      ${gdpProfile ? html`
        <div class="gdp-profile-details-content">
          ${renderBrand()}
          <div class="plan-details">
            ${getGdpSubscriptionText(gdpProfile)}
            &nbsp;·&nbsp;
            <x-link class="link" href=${Host.GdpClient.GOOGLE_DEVELOPER_PROGRAM_PROFILE_LINK}>
              ${i18nString(UIStrings.viewProfile)}
            </x-link></div>
            ${receiveBadgesSetting ? html`
              <div class="setting-container">
                <setting-checkbox class="setting-checkbox" .data=${{setting: receiveBadgesSetting}}></setting-checkbox>
                <span>${i18nString(UIStrings.relevantDataDisclaimer)}</span>
              </div>` : Lit.nothing}
        </div>
      ` : html`
        <div class="gdp-profile-sign-up-content">
          ${renderBrand()}
          <devtools-button
            @click=${() => PanelCommon.GdpSignUpDialog.show()}
            .jslogContext=${'gdp.sign-up-dialog-open'}
            .variant=${Buttons.Button.Variant.OUTLINED}>
              ${i18nString(UIStrings.signUp)}
          </devtools-button>
        </div>
      `}
    </div>
  `;
}
// clang-format on

customElements.define('devtools-sync-section', SyncSection);

declare global {
  interface HTMLElementTagNameMap {
    'devtools-sync-section': SyncSection;
  }
}

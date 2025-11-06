var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// gen/front_end/panels/settings/components/SyncSection.js
var SyncSection_exports = {};
__export(SyncSection_exports, {
  SyncSection: () => SyncSection
});
import "./../../../ui/components/chrome_link/chrome_link.js";
import "./../../../ui/components/settings/settings.js";
import "./../../../ui/components/tooltips/tooltips.js";
import * as Host from "./../../../core/host/host.js";
import * as i18n from "./../../../core/i18n/i18n.js";
import * as SDK from "./../../../core/sdk/sdk.js";
import * as Badges from "./../../../models/badges/badges.js";
import * as Buttons from "./../../../ui/components/buttons/buttons.js";
import * as ComponentHelpers from "./../../../ui/components/helpers/helpers.js";
import * as uiI18n from "./../../../ui/i18n/i18n.js";
import * as Lit from "./../../../ui/lit/lit.js";
import * as VisualLogging from "./../../../ui/visual_logging/visual_logging.js";
import * as PanelCommon from "./../../common/common.js";
import * as PanelUtils from "./../../utils/utils.js";

// gen/front_end/panels/settings/components/syncSection.css.js
var syncSection_css_default = `/*
 * Copyright 2021 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

:host {
  break-inside: avoid;
  display: block;
  width: 100%;
  position: relative;
}

fieldset {
  border: 0;
  padding: 0;
  padding: 4px 0 0;
}

.link {
  color: var(--sys-color-primary);
  text-decoration: underline;
  cursor: pointer;
  outline-offset: 2px;
}

.account-avatar {
  border: 0;
  border-radius: var(--sys-shape-corner-full);
  display: block;
  height: var(--sys-size-9);
  width: var(--sys-size-9);
}

.account-info {
  display: flex;
  align-items: center;
}

.account-email {
  display: flex;
  flex-direction: column;
  margin-left: 8px;
}

.not-signed-in {
  padding-bottom: 4px;
}

.setting-checkbox-container {
  display: flex;
  align-items: center;
  gap: var(--sys-size-2);
}

.setting-checkbox {
  display: inline-block;
}

.gdp-profile-container {
  padding-bottom: var(--sys-size-4);

  & .divider {
    left: 0;
    position: absolute;
    width: 100%;
    height: var(--sys-size-1);
    background: var(--sys-color-divider);
  }

  & .gdp-profile-header {
    display: flex;
    align-items: center;
    gap: var(--sys-size-5);
    font-family: "Google Sans", system-ui;
    font-size: var(--sys-typescale-body3-size);
    height: var(--sys-size-11);

    & .gdp-logo {
      background-image: var(--image-file-gdp-logo-light);
      background-size: contain;
      width: 203px;
      height: 18px;
      background-repeat: no-repeat;
    }

    :host-context(.theme-with-dark-background) & .gdp-logo {
      background-image: var(--image-file-gdp-logo-dark);
    }
  }

  & .gdp-profile-sign-up-content {
    padding-top: var(--sys-size-7);
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  & .gdp-profile-details-content {
    padding-top: var(--sys-size-7);
    font: var(--sys-typescale-body4-regular);

    & .plan-details {
      margin-top: var(--sys-size-3);
      height: 18px;
      display: flex;
      align-items: center;
    }

    & .setting-container {
      /* \\'<settigns-checkbox>\\' already provides 6px margin and we want to get rid of it here */
      margin: calc(var(--sys-size-3) - 6px) -6px -6px;
      display: flex;
      align-items: center;
      gap: var(--sys-size-2);
    }

    & .tooltip-content {
      max-width: 278px;
      padding: var(--sys-size-2) var(--sys-size-3);
      font: var(--sys-typescale-body5-regular);
    }
  }
}

/*# sourceURL=${import.meta.resolve("./syncSection.css")} */`;

// gen/front_end/panels/settings/components/SyncSection.js
var UIStrings = {
  /**
   * @description Text shown to the user in the Settings UI. 'This setting' refers
   * to a checkbox that is disabled.
   */
  syncDisabled: "To turn this setting on, you must enable Chrome sync.",
  /**
   * @description Text shown to the user in the Settings UI. Explains why the checkbox
   * for saving DevTools settings to the user's Google account is inactive.
   */
  preferencesSyncDisabled: "You need to first enable saving `Chrome` settings in your `Google` account.",
  /**
   * @description Label for the account email address. Shown in the DevTools Settings UI in
   * front of the email address currently used for Chrome Sync.
   */
  signedIn: "Signed into Chrome as:",
  /**
   * @description Label for the account settings. Shown in the DevTools Settings UI in
   * case the user is not logged in to Chrome.
   */
  notSignedIn: "You're not signed into Chrome.",
  /**
   * @description Label for the Google Developer Program profile status that corresponds to
   * standard plan (No subscription).
   */
  gdpStandardPlan: "Standard plan",
  /**
   * @description Label for the Google Developer Program subscription status that corresponds to
   * `PREMIUM_ANNUAL` plan.
   */
  gdpPremiumSubscription: "Premium",
  /**
   * @description Label for the Google Developer Program subscription status that corresponds to
   * `PRO_ANNUAL` plan.
   */
  gdpProSubscription: "Pro",
  /**
   * @description Label for the Google Developer Program subscription status that corresponds
   * to a plan not known by the client.
   */
  gdpUnknownSubscription: "Unknown plan",
  /**
   * @description Label for Sign-Up button for the Google Developer Program profiles.
   */
  signUp: "Sign up",
  /**
   * @description Link text for opening the Google Developer Program profile page.
   */
  viewProfile: "View profile",
  /**
   * @description Text for tooltip shown on hovering over "Relevant Data" in the disclaimer text for AI code completion.
   */
  tooltipDisclaimerText: "When you qualify for a badge, the badge\u2019s identifier and the type of activity you did to earn it are sent to Google",
  /**
   * @description Text for the data notice right after the settings checkbox.
   */
  relevantData: "Relevant data",
  /**
   * @description Text for the data notice right after the settings checkbox.
   * @example {Relevant data} PH1
   */
  dataDisclaimer: "({PH1} is sent to Google)"
};
var str_ = i18n.i18n.registerUIStrings("panels/settings/components/SyncSection.ts", UIStrings);
var i18nString = i18n.i18n.getLocalizedString.bind(void 0, str_);
var { html, Directives: { ref, createRef } } = Lit;
var cachedTooltipElement;
function renderDataDisclaimer() {
  if (cachedTooltipElement) {
    return cachedTooltipElement;
  }
  const relevantDataTooltipTemplate = html`
    <span
      tabIndex="0"
      class="link"
      aria-details="gdp-profile-tooltip"
      aria-describedby="gdp-profile-tooltip"
      >${i18nString(UIStrings.relevantData)}</span>
    <devtools-tooltip id="gdp-profile-tooltip" variant="rich">
      <div class="tooltip-content" tabindex="0">${i18nString(UIStrings.tooltipDisclaimerText)}</div>
    </devtools-tooltip>`;
  const container = document.createElement("span");
  Lit.render(relevantDataTooltipTemplate, container);
  cachedTooltipElement = uiI18n.getFormatLocalizedString(str_, UIStrings.dataDisclaimer, {
    PH1: container
  });
  return cachedTooltipElement;
}
function getGdpSubscriptionText(profile) {
  if (!profile.activeSubscription || profile.activeSubscription.subscriptionStatus !== Host.GdpClient.SubscriptionStatus.ENABLED) {
    return i18nString(UIStrings.gdpStandardPlan);
  }
  switch (profile.activeSubscription.subscriptionTier) {
    case Host.GdpClient.SubscriptionTier.PREMIUM_ANNUAL:
    case Host.GdpClient.SubscriptionTier.PREMIUM_MONTHLY:
      return i18nString(UIStrings.gdpPremiumSubscription);
    case Host.GdpClient.SubscriptionTier.PRO_ANNUAL:
    case Host.GdpClient.SubscriptionTier.PRO_MONTHLY:
      return i18nString(UIStrings.gdpProSubscription);
    default:
      return i18nString(UIStrings.gdpUnknownSubscription);
  }
}
var SyncSection = class extends HTMLElement {
  #shadow = this.attachShadow({ mode: "open" });
  #syncInfo = { isSyncActive: false };
  #syncSetting;
  #receiveBadgesSetting;
  #receiveBadgesSettingContainerRef = createRef();
  #isEligibleToCreateGdpProfile = false;
  #gdpProfile;
  set data(data) {
    this.#syncInfo = data.syncInfo;
    this.#syncSetting = data.syncSetting;
    this.#receiveBadgesSetting = data.receiveBadgesSetting;
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#render);
    if (data.syncInfo.accountEmail) {
      void this.#fetchGdpDetails();
    }
  }
  async highlightReceiveBadgesSetting() {
    await ComponentHelpers.ScheduledRender.scheduleRender(this, this.#render);
    const element = this.#receiveBadgesSettingContainerRef.value;
    if (element) {
      PanelUtils.PanelUtils.highlightElement(element);
    }
  }
  #render() {
    if (!this.#syncSetting) {
      throw new Error("SyncSection is not properly initialized");
    }
    const checkboxDisabled = !this.#syncInfo.isSyncActive || !this.#syncInfo.arePreferencesSynced;
    this.#syncSetting?.setDisabled(checkboxDisabled);
    Lit.render(html`
      <style>${syncSection_css_default}</style>
      <fieldset>
        ${renderAccountInfo(this.#syncInfo)}
        ${renderSettingCheckboxIfNeeded(this.#syncInfo, this.#syncSetting)}
        ${renderGdpSectionIfNeeded({
      receiveBadgesSetting: this.#receiveBadgesSetting,
      receiveBadgesSettingContainerRef: this.#receiveBadgesSettingContainerRef,
      gdpProfile: this.#gdpProfile,
      isEligibleToCreateProfile: this.#isEligibleToCreateGdpProfile,
      onSignUpSuccess: this.#fetchGdpDetails.bind(this)
    })}
      </fieldset>
    `, this.#shadow, { host: this });
  }
  async #fetchGdpDetails() {
    if (!Host.GdpClient.isGdpProfilesAvailable()) {
      return;
    }
    const getProfileResponse = await Host.GdpClient.GdpClient.instance().getProfile();
    if (!getProfileResponse) {
      return;
    }
    this.#gdpProfile = getProfileResponse.profile ?? void 0;
    this.#isEligibleToCreateGdpProfile = getProfileResponse.isEligible;
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#render);
  }
};
function renderSettingCheckboxIfNeeded(syncInfo, syncSetting) {
  if (!syncInfo.accountEmail) {
    return Lit.nothing;
  }
  return html`
    <div class="setting-checkbox-container">
      <setting-checkbox class="setting-checkbox" .data=${{ setting: syncSetting }}>
      </setting-checkbox>
      ${renderWarningIfNeeded(syncInfo)}
    </div>
  `;
}
function renderWarningIfNeeded(syncInfo) {
  const hasWarning = !syncInfo.isSyncActive || !syncInfo.arePreferencesSynced;
  if (!hasWarning) {
    return Lit.nothing;
  }
  const warningLink = !syncInfo.isSyncActive ? "chrome://settings/syncSetup" : "chrome://settings/syncSetup/advanced";
  const warningText = !syncInfo.isSyncActive ? i18nString(UIStrings.syncDisabled) : i18nString(UIStrings.preferencesSyncDisabled);
  const handleClick = (event) => {
    const rootTarget = SDK.TargetManager.TargetManager.instance().rootTarget();
    if (rootTarget === null) {
      return;
    }
    void rootTarget.targetAgent().invoke_createTarget({ url: warningLink }).then((result) => {
      if (result.getError()) {
        Host.InspectorFrontendHost.InspectorFrontendHostInstance.openInNewTab(warningLink);
      }
    });
    event.consume();
  };
  return html`
    <devtools-button
      aria-describedby=settings-sync-info
      .title=${warningText}
      .iconName=${"info"}
      .variant=${"icon"}
      .size=${"SMALL"}
      @click=${handleClick}>
    </devtools-button>
    <devtools-tooltip
        id=settings-sync-info
        variant=simple>
      ${warningText}
    </devtools-tooltip>
  `;
}
function renderAccountInfo(syncInfo) {
  if (!syncInfo.accountEmail) {
    return html`
      <div class="not-signed-in">${i18nString(UIStrings.notSignedIn)}</div>
    `;
  }
  return html`
    <div class="account-info">
      <img class="account-avatar" src="data:image/png;base64, ${syncInfo.accountImage}" alt="Account avatar" />
      <div class="account-email">
        <span>${i18nString(UIStrings.signedIn)}</span>
        <span>${syncInfo.accountEmail}</span>
      </div>
    </div>`;
}
function renderGdpSectionIfNeeded({ receiveBadgesSetting, receiveBadgesSettingContainerRef, gdpProfile, isEligibleToCreateProfile, onSignUpSuccess }) {
  if (!Host.GdpClient.isGdpProfilesAvailable() || !gdpProfile && !isEligibleToCreateProfile) {
    return Lit.nothing;
  }
  const hasReceiveBadgesCheckbox = Host.GdpClient.isBadgesEnabled() && receiveBadgesSetting;
  function renderBrand() {
    return html`
      <div class="gdp-profile-header">
        <div class="gdp-logo" role="img" aria-label="Google Developer Program"></div>
      </div>
    `;
  }
  return html`
    <div class="gdp-profile-container" jslog=${VisualLogging.section().context("gdp-profile")}>
      <div class="divider"></div>
      ${gdpProfile ? html`
        <div class="gdp-profile-details-content">
          ${renderBrand()}
          <div class="plan-details">
            ${getGdpSubscriptionText(gdpProfile)}
            &nbsp;·&nbsp;
            <x-link
              jslog=${VisualLogging.link().track({ click: true, keydown: "Enter|Space" }).context("view-profile")}
              class="link"
              href=${Host.GdpClient.GOOGLE_DEVELOPER_PROGRAM_PROFILE_LINK}>
              ${i18nString(UIStrings.viewProfile)}
            </x-link></div>
            ${hasReceiveBadgesCheckbox ? html`
              <div class="setting-container"  ${ref(receiveBadgesSettingContainerRef)}>
                <setting-checkbox class="setting-checkbox" .data=${{ setting: receiveBadgesSetting }} @change=${(e) => {
    const settingCheckbox = e.target;
    void Badges.UserBadges.instance().initialize().then(() => {
      if (!settingCheckbox.checked) {
        return;
      }
      Badges.UserBadges.instance().recordAction(Badges.BadgeAction.RECEIVE_BADGES_SETTING_ENABLED);
    });
  }}></setting-checkbox>
                ${renderDataDisclaimer()}
              </div>` : Lit.nothing}
        </div>
      ` : html`
        <div class="gdp-profile-sign-up-content">
          ${renderBrand()}
          <devtools-button
            @click=${() => PanelCommon.GdpSignUpDialog.show({
    onSuccess: onSignUpSuccess
  })}
            .jslogContext=${"open-sign-up-dialog"}
            .variant=${"outlined"}>
              ${i18nString(UIStrings.signUp)}
          </devtools-button>
        </div>
      `}
    </div>
  `;
}
customElements.define("devtools-sync-section", SyncSection);
export {
  SyncSection_exports as SyncSection
};
//# sourceMappingURL=components.js.map

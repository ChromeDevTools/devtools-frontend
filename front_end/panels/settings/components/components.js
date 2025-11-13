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
import * as Common from "./../../../core/common/common.js";
import * as Host from "./../../../core/host/host.js";
import * as i18n from "./../../../core/i18n/i18n.js";
import * as SDK from "./../../../core/sdk/sdk.js";
import * as Badges from "./../../../models/badges/badges.js";
import * as Buttons from "./../../../ui/components/buttons/buttons.js";
import * as UI from "./../../../ui/legacy/legacy.js";
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

@scope to (devtools-widget > *) {
  :scope {
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
  }

  .gdp-profile-container .divider {
    left: 0;
    position: absolute;
    width: 100%;
    height: var(--sys-size-1);
    background: var(--sys-color-divider);
  }

  .gdp-profile-container .gdp-profile-header {
    display: flex;
    align-items: center;
    gap: var(--sys-size-5);
    font-family: "Google Sans", system-ui;
    font-size: var(--sys-typescale-body3-size);
    height: var(--sys-size-11);
  }

  .gdp-profile-container .gdp-profile-header .gdp-logo {
    background-image: var(--image-file-gdp-logo-light);
    background-size: contain;
    width: 203px;
    height: 18px;
    background-repeat: no-repeat;
  }

  :host-context(.theme-with-dark-background) & .gdp-profile-container .gdp-profile-header .gdp-logo {
    background-image: var(--image-file-gdp-logo-dark);
  }

  .gdp-profile-container .gdp-profile-sign-up-content {
    padding-top: var(--sys-size-7);
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .gdp-profile-container .gdp-profile-details-content {
    padding-top: var(--sys-size-7);
    font: var(--sys-typescale-body4-regular);
  }

  .gdp-profile-container .gdp-profile-details-content .plan-details {
    margin-top: var(--sys-size-3);
    height: 18px;
    display: flex;
    align-items: center;
  }

  .gdp-profile-container .gdp-profile-details-content .setting-container {
    margin: calc(var(--sys-size-3) - 6px) 0 -6px;
    display: flex;
    align-items: center;
    gap: var(--sys-size-2);
  }

  .gdp-profile-container .gdp-profile-details-content .tooltip-content {
    max-width: 278px;
    padding: var(--sys-size-2) var(--sys-size-3);
    font: var(--sys-typescale-body5-regular);
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
var i18nTemplate2 = Lit.i18nTemplate.bind(void 0, str_);
var { html, render, Directives: { ref } } = Lit;
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
var DEFAULT_VIEW = (input, output, target) => {
  const renderSettingCheckboxIfNeeded = () => {
    if (!input.syncInfo.accountEmail) {
      return Lit.nothing;
    }
    const warningText = input.warningType === "SYNC_DISABLED" ? i18nString(UIStrings.syncDisabled) : i18nString(UIStrings.preferencesSyncDisabled);
    return html`
      <div class="setting-checkbox-container">
        <setting-checkbox class="setting-checkbox"
          .data=${{ setting: input.syncSetting }}>
        </setting-checkbox>
        ${input.warningType ? html`
          <devtools-button
            aria-details="settings-sync-info"
            .iconName=${"info"}
            .variant=${"icon"}
            .size=${"SMALL"}
            @click=${input.onWarningClick}>
          </devtools-button>
          <devtools-tooltip
              id="settings-sync-info"
              variant="rich">
            ${warningText}
          </devtools-tooltip>` : Lit.nothing}
      </div>
    `;
  };
  const renderAccountInfo = () => {
    if (!input.syncInfo.accountEmail) {
      return html`
        <div class="not-signed-in">${i18nString(UIStrings.notSignedIn)}</div>
      `;
    }
    return html`
      <div class="account-info">
        <img class="account-avatar" src="data:image/png;base64, ${input.syncInfo.accountImage}"
          alt="Account avatar" />
        <div class="account-email">
          <span>${i18nString(UIStrings.signedIn)}</span>
          <span>${input.syncInfo.accountEmail}</span>
        </div>
      </div>`;
  };
  const renderGdpSectionIfNeeded = () => {
    if (!input.isEligibleToCreateGdpProfile && !input.gdpProfile) {
      return Lit.nothing;
    }
    const hasReceiveBadgesCheckbox = Host.GdpClient.isBadgesEnabled() && input.receiveBadgesSetting;
    const renderBrand = () => {
      return html`
        <div class="gdp-profile-header">
          <div class="gdp-logo" role="img" aria-label="Google Developer Program"></div>
        </div>
      `;
    };
    return html`
      <div class="gdp-profile-container" .jslog=${VisualLogging.section().context("gdp-profile")}>
        <div class="divider"></div>
        ${input.gdpProfile ? html`
          <div class="gdp-profile-details-content">
            ${renderBrand()}
            <div class="plan-details">
              ${getGdpSubscriptionText(input.gdpProfile)}
              &nbsp;·&nbsp;
              <x-link
                .jslog=${VisualLogging.link().track({ click: true, keydown: "Enter|Space" }).context("view-profile")}
                class="link"
                href=${Host.GdpClient.GOOGLE_DEVELOPER_PROGRAM_PROFILE_LINK}>
                ${i18nString(UIStrings.viewProfile)}
              </x-link></div>
              ${hasReceiveBadgesCheckbox ? html`
                <div class="setting-container" ${ref((el) => {
      output.highlightReceiveBadgesSetting = () => {
        if (el) {
          PanelUtils.PanelUtils.highlightElement(el);
        }
      };
    })}>
                  <setting-checkbox class="setting-checkbox"
                    .data=${{ setting: input.receiveBadgesSetting }}
                    @change=${(e) => input.onReceiveBadgesSettingClick(e)}>
                  </setting-checkbox>
                  <span>${i18nTemplate2(UIStrings.dataDisclaimer, { PH1: html`
                    <span class="link" tabindex="0" aria-details="gdp-profile-tooltip">
                      ${i18nString(UIStrings.relevantData)}</span>
                    <devtools-tooltip id="gdp-profile-tooltip" variant="rich">
                      <div class="tooltip-content" tabindex="0">
                      ${i18nString(UIStrings.tooltipDisclaimerText)}</div>
                    </devtools-tooltip>` })}
                  </span>
                </div>
              ` : Lit.nothing}
          </div>
        ` : html`
          <div class="gdp-profile-sign-up-content">
            ${renderBrand()}
            <devtools-button
              @click=${input.onSignUpClick}
              .jslogContext=${"open-sign-up-dialog"}
              .variant=${"outlined"}>
                ${i18nString(UIStrings.signUp)}
            </devtools-button>
          </div>
        `}
      </div>
    `;
  };
  render(html`
    <style>${syncSection_css_default}</style>
    <fieldset>
      ${renderAccountInfo()}
      ${renderSettingCheckboxIfNeeded()}
      ${renderGdpSectionIfNeeded()}
    </fieldset>
  `, target);
};
var SyncSection = class extends UI.Widget.Widget {
  #syncInfo = { isSyncActive: false };
  #syncSetting;
  #receiveBadgesSetting;
  #isEligibleToCreateGdpProfile = false;
  #gdpProfile;
  #view;
  #viewOutput = {};
  constructor(element, view = DEFAULT_VIEW) {
    super(element);
    this.#view = view;
    this.#receiveBadgesSetting = Common.Settings.Settings.instance().moduleSetting("receive-gdp-badges");
    this.#syncSetting = Common.Settings.moduleSetting("sync-preferences");
  }
  wasShown() {
    super.wasShown();
    this.requestUpdate();
  }
  set syncInfo(syncInfo) {
    this.#syncInfo = syncInfo;
    this.requestUpdate();
    if (syncInfo.accountEmail) {
      void this.#fetchGdpDetails();
    }
  }
  async highlightReceiveBadgesSetting() {
    this.requestUpdate();
    await this.updateComplete;
    this.#viewOutput.highlightReceiveBadgesSetting?.();
  }
  performUpdate() {
    const checkboxDisabled = !this.#syncInfo.isSyncActive || !this.#syncInfo.arePreferencesSynced;
    this.#syncSetting?.setDisabled(checkboxDisabled);
    let warningType;
    if (!this.#syncInfo.isSyncActive) {
      warningType = "SYNC_DISABLED";
    } else if (!this.#syncInfo.arePreferencesSynced) {
      warningType = "PREFERENCES_SYNC_DISABLED";
    }
    const viewInput = {
      syncInfo: this.#syncInfo,
      syncSetting: this.#syncSetting,
      receiveBadgesSetting: this.#receiveBadgesSetting,
      gdpProfile: this.#gdpProfile,
      isEligibleToCreateGdpProfile: Host.GdpClient.isGdpProfilesAvailable() && this.#isEligibleToCreateGdpProfile,
      onSignUpClick: this.#onSignUpClick.bind(this),
      onReceiveBadgesSettingClick: this.#onReceiveBadgesSettingClick.bind(this),
      onWarningClick: this.#onWarningClick.bind(this),
      warningType
    };
    this.#view(viewInput, this.#viewOutput, this.contentElement);
  }
  #onSignUpClick() {
    PanelCommon.GdpSignUpDialog.show({ onSuccess: this.#fetchGdpDetails.bind(this) });
  }
  #onReceiveBadgesSettingClick(e) {
    const settingCheckbox = e.target;
    void Badges.UserBadges.instance().initialize().then(() => {
      if (!settingCheckbox.checked) {
        return;
      }
      Badges.UserBadges.instance().recordAction(Badges.BadgeAction.RECEIVE_BADGES_SETTING_ENABLED);
    });
  }
  #onWarningClick(event) {
    const rootTarget = SDK.TargetManager.TargetManager.instance().rootTarget();
    if (rootTarget === null) {
      return;
    }
    const warningLink = !this.#syncInfo.isSyncActive ? "chrome://settings/syncSetup" : "chrome://settings/syncSetup/advanced";
    void rootTarget.targetAgent().invoke_createTarget({ url: warningLink }).then((result) => {
      if (result.getError()) {
        Host.InspectorFrontendHost.InspectorFrontendHostInstance.openInNewTab(warningLink);
      }
    });
    event.consume();
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
    this.requestUpdate();
  }
};
export {
  SyncSection_exports as SyncSection
};
//# sourceMappingURL=components.js.map

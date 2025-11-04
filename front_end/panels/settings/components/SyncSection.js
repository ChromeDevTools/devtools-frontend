// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-lit-render-outside-of-view */
import '../../../ui/components/chrome_link/chrome_link.js';
import '../../../ui/components/settings/settings.js';
import '../../../ui/components/tooltips/tooltips.js';
import * as Host from '../../../core/host/host.js';
import * as i18n from '../../../core/i18n/i18n.js';
import * as SDK from '../../../core/sdk/sdk.js';
import * as Badges from '../../../models/badges/badges.js';
import * as Buttons from '../../../ui/components/buttons/buttons.js';
import * as ComponentHelpers from '../../../ui/components/helpers/helpers.js';
import * as uiI18n from '../../../ui/i18n/i18n.js';
import * as Lit from '../../../ui/lit/lit.js';
import * as VisualLogging from '../../../ui/visual_logging/visual_logging.js';
import * as PanelCommon from '../../common/common.js';
import * as PanelUtils from '../../utils/utils.js';
import syncSectionStyles from './syncSection.css.js';
const UIStrings = {
    /**
     * @description Text shown to the user in the Settings UI. 'This setting' refers
     * to a checkbox that is disabled.
     */
    syncDisabled: 'To turn this setting on, you must enable Chrome sync.',
    /**
     * @description Text shown to the user in the Settings UI. Explains why the checkbox
     * for saving DevTools settings to the user's Google account is inactive.
     */
    preferencesSyncDisabled: 'You need to first enable saving `Chrome` settings in your `Google` account.',
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
    gdpPremiumSubscription: 'Premium',
    /**
     * @description Label for the Google Developer Program subscription status that corresponds to
     * `PRO_ANNUAL` plan.
     */
    gdpProSubscription: 'Pro',
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
     * @description Link text for opening the Google Developer Program profile page.
     */
    viewProfile: 'View profile',
    /**
     * @description Text for tooltip shown on hovering over "Relevant Data" in the disclaimer text for AI code completion.
     */
    tooltipDisclaimerText: 'When you qualify for a badge, the badge’s identifier and the type of activity you did to earn it are sent to Google',
    /**
     * @description Text for the data notice right after the settings checkbox.
     */
    relevantData: 'Relevant data',
    /**
     * @description Text for the data notice right after the settings checkbox.
     * @example {Relevant data} PH1
     */
    dataDisclaimer: '({PH1} is sent to Google)',
};
const str_ = i18n.i18n.registerUIStrings('panels/settings/components/SyncSection.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
const { html, Directives: { ref, createRef } } = Lit;
let cachedTooltipElement;
function renderDataDisclaimer() {
    if (cachedTooltipElement) {
        return cachedTooltipElement;
    }
    const relevantDataTooltipTemplate = html `
    <span
      tabIndex="0"
      class="link"
      aria-details="gdp-profile-tooltip"
      aria-describedby="gdp-profile-tooltip"
      >${i18nString(UIStrings.relevantData)}</span>
    <devtools-tooltip id="gdp-profile-tooltip" variant=${'rich'}>
      <div class="tooltip-content" tabindex="0">${i18nString(UIStrings.tooltipDisclaimerText)}</div>
    </devtools-tooltip>`;
    const container = document.createElement('span');
    Lit.render(relevantDataTooltipTemplate, container);
    cachedTooltipElement = uiI18n.getFormatLocalizedString(str_, UIStrings.dataDisclaimer, {
        PH1: container,
    });
    return cachedTooltipElement;
}
function getGdpSubscriptionText(profile) {
    if (!profile.activeSubscription ||
        profile.activeSubscription.subscriptionStatus !== Host.GdpClient.SubscriptionStatus.ENABLED) {
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
export class SyncSection extends HTMLElement {
    #shadow = this.attachShadow({ mode: 'open' });
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
        // Trigger fetching GDP profile if the user is signed in.
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
            throw new Error('SyncSection is not properly initialized');
        }
        // TODO: this should not probably happen in render, instead, the setting
        // should be disabled.
        const checkboxDisabled = !this.#syncInfo.isSyncActive || !this.#syncInfo.arePreferencesSynced;
        this.#syncSetting?.setDisabled(checkboxDisabled);
        // Disabled until https://crbug.com/1079231 is fixed.
        // clang-format off
        Lit.render(html `
      <style>${syncSectionStyles}</style>
      <fieldset>
        ${renderAccountInfo(this.#syncInfo)}
        ${renderSettingCheckboxIfNeeded(this.#syncInfo, this.#syncSetting)}
        ${renderGdpSectionIfNeeded({
            receiveBadgesSetting: this.#receiveBadgesSetting,
            receiveBadgesSettingContainerRef: this.#receiveBadgesSettingContainerRef,
            gdpProfile: this.#gdpProfile,
            isEligibleToCreateProfile: this.#isEligibleToCreateGdpProfile,
            onSignUpSuccess: this.#fetchGdpDetails.bind(this),
        })}
      </fieldset>
    `, this.#shadow, { host: this });
        // clang-format on
    }
    async #fetchGdpDetails() {
        if (!Host.GdpClient.isGdpProfilesAvailable()) {
            return;
        }
        const getProfileResponse = await Host.GdpClient.GdpClient.instance().getProfile();
        if (!getProfileResponse) {
            return;
        }
        this.#gdpProfile = getProfileResponse.profile ?? undefined;
        this.#isEligibleToCreateGdpProfile = getProfileResponse.isEligible;
        void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#render);
    }
}
function renderSettingCheckboxIfNeeded(syncInfo, syncSetting) {
    if (!syncInfo.accountEmail) {
        return Lit.nothing;
    }
    // clang-format off
    return html `
    <div class="setting-checkbox-container">
      <setting-checkbox class="setting-checkbox" .data=${{ setting: syncSetting }}>
      </setting-checkbox>
      ${renderWarningIfNeeded(syncInfo)}
    </div>
  `;
    // clang-format on
}
function renderWarningIfNeeded(syncInfo) {
    const hasWarning = !syncInfo.isSyncActive || !syncInfo.arePreferencesSynced;
    if (!hasWarning) {
        return Lit.nothing;
    }
    const warningLink = !syncInfo.isSyncActive ?
        'chrome://settings/syncSetup' :
        'chrome://settings/syncSetup/advanced';
    const warningText = !syncInfo.isSyncActive ? i18nString(UIStrings.syncDisabled) : i18nString(UIStrings.preferencesSyncDisabled);
    const handleClick = (event) => {
        const rootTarget = SDK.TargetManager.TargetManager.instance().rootTarget();
        if (rootTarget === null) {
            return;
        }
        void rootTarget.targetAgent().invoke_createTarget({ url: warningLink }).then(result => {
            if (result.getError()) {
                Host.InspectorFrontendHost.InspectorFrontendHostInstance.openInNewTab(warningLink);
            }
        });
        event.consume();
    };
    // clang-format off
    return html `
    <devtools-button
      aria-describedby=settings-sync-info
      .title=${warningText}
      .iconName=${'info'}
      .variant=${"icon" /* Buttons.Button.Variant.ICON */}
      .size=${"SMALL" /* Buttons.Button.Size.SMALL */}
      @click=${handleClick}>
    </devtools-button>
    <devtools-tooltip
        id=settings-sync-info
        variant=simple>
      ${warningText}
    </devtools-tooltip>
  `;
    // clang-format on
}
function renderAccountInfo(syncInfo) {
    if (!syncInfo.accountEmail) {
        // clang-format off
        return html `
      <div class="not-signed-in">${i18nString(UIStrings.notSignedIn)}</div>
    `;
        // clang-format on
    }
    // clang-format off
    return html `
    <div class="account-info">
      <img class="account-avatar" src="data:image/png;base64, ${syncInfo.accountImage}" alt="Account avatar" />
      <div class="account-email">
        <span>${i18nString(UIStrings.signedIn)}</span>
        <span>${syncInfo.accountEmail}</span>
      </div>
    </div>`;
    // clang-format on
}
function renderGdpSectionIfNeeded({ receiveBadgesSetting, receiveBadgesSettingContainerRef, gdpProfile, isEligibleToCreateProfile, onSignUpSuccess, }) {
    if (!Host.GdpClient.isGdpProfilesAvailable() || (!gdpProfile && !isEligibleToCreateProfile)) {
        return Lit.nothing;
    }
    const hasReceiveBadgesCheckbox = Host.GdpClient.isBadgesEnabled() && receiveBadgesSetting;
    function renderBrand() {
        // clang-format off
        return html `
      <div class="gdp-profile-header">
        <div class="gdp-logo" role="img" aria-label="Google Developer Program"></div>
      </div>
    `;
        // clang-format on
    }
    // clang-format off
    return html `
    <div class="gdp-profile-container" jslog=${VisualLogging.section().context('gdp-profile')}>
      <div class="divider"></div>
      ${gdpProfile ? html `
        <div class="gdp-profile-details-content">
          ${renderBrand()}
          <div class="plan-details">
            ${getGdpSubscriptionText(gdpProfile)}
            &nbsp;·&nbsp;
            <x-link
              jslog=${VisualLogging.link().track({ click: true, keydown: 'Enter|Space' }).context('view-profile')}
              class="link"
              href=${Host.GdpClient.GOOGLE_DEVELOPER_PROGRAM_PROFILE_LINK}>
              ${i18nString(UIStrings.viewProfile)}
            </x-link></div>
            ${hasReceiveBadgesCheckbox ? html `
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
      ` : html `
        <div class="gdp-profile-sign-up-content">
          ${renderBrand()}
          <devtools-button
            @click=${() => PanelCommon.GdpSignUpDialog.show({
        onSuccess: onSignUpSuccess
    })}
            .jslogContext=${'open-sign-up-dialog'}
            .variant=${"outlined" /* Buttons.Button.Variant.OUTLINED */}>
              ${i18nString(UIStrings.signUp)}
          </devtools-button>
        </div>
      `}
    </div>
  `;
    // clang-format on
}
customElements.define('devtools-sync-section', SyncSection);
//# sourceMappingURL=SyncSection.js.map
// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import '../../ui/components/switch/switch.js';
import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Badges from '../../models/badges/badges.js';
import * as Geometry from '../../models/geometry/geometry.js';
import * as Buttons from '../../ui/components/buttons/buttons.js';
import * as Snackbars from '../../ui/components/snackbars/snackbars.js';
import * as UIHelpers from '../../ui/helpers/helpers.js';
import * as uiI18n from '../../ui/i18n/i18n.js';
import * as UI from '../../ui/legacy/legacy.js';
import { html, render } from '../../ui/lit/lit.js';
import styles from './gdpSignUpDialog.css.js';
const UIStrings = {
    /**
     * @description Aria label for the Google Developer Program sign up dialog
     */
    gdpDialogAriaLabel: 'Google Developer Program sign up dialog',
    /**
     *
     * @description Button text for canceling GDP sign up.
     */
    cancel: 'Cancel',
    /**
     * @description Button text for confirming GDP sign up.
     */
    signUp: 'Sign up',
    /**
     * @description Title for the first section of the GDP sign up dialog.
     */
    designedForSuccess: 'Designed for your success',
    /**
     * @description Body for the first section of the GDP sign up dialog.
     */
    designedForSuccessBody: 'Grow your skills, build with AI, and earn badges you can showcase in your developer profile',
    /**
     * @description Title for the second section of the GDP sign up dialog.
     */
    keepUpdated: 'Keep me updated',
    /**
     * @description Body for the second section of the GDP sign up dialog.
     */
    keepUpdatedBody: 'The latest DevTools features, event invites, and tailored insights land directly in your inbox',
    /**
     * @description Title for the third section of the GDP sign up dialog.
     */
    tailorProfile: 'Tailor your profile',
    /**
     * @description Body for the third section of the GDP sign up dialog.
     */
    tailorProfileBody: 'The name on your Google Account and your interests will be used in your Google Developer Profile. Your name may appear where you contribute and can be changed at any time.',
    /**
     * @description Body for the third section of the GDP sign up dialog.
     * @example {Content Policy} PH1
     * @example {Terms of Service} PH2
     * @example {Privacy Policy} PH3
     */
    tailorProfileBodyDisclaimer: 'By creating a Developer Profile, you agree to the {PH1}. Google’s {PH2} and {PH3} apply to your use of this service.',
    /**
     * @description Button text for learning more about the Google Developer Program.
     */
    learnMore: 'Learn more',
    /**
     * @description Accessible text for learning more about the Google Developer Program.
     */
    learnMoreAccessibleText: 'Learn more about the Google Developer Program',
    /**
     * @description Link text for Content Policy.
     */
    contentPolicy: 'Content Policy',
    /**
     * @description Link text for Terms of Service.
     */
    termsOfService: 'Terms of Service',
    /**
     * @description Link text for Privacy Policy.
     */
    privacyPolicy: 'Privacy Policy',
    /**
     * @description Error message shown in a snackbar when GDP sign up fails.
     */
    signUpFailed: 'Your Google Developer Program profile couldn’t be created. Please try again later.'
};
const str_ = i18n.i18n.registerUIStrings('panels/common/GdpSignUpDialog.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
const TERMS_OF_SERVICE_URL = 'https://policies.google.com/terms';
const PRIVACY_POLICY_URL = 'https://policies.google.com/privacy';
const CONTENT_POLICY_URL = 'https://developers.google.com/profile/content-policy';
const GDP_PROGRAM_URL = 'https://developers.google.com/program';
export const DEFAULT_VIEW = (input, _output, target) => {
    // clang-format off
    render(html `
      <style>${styles}</style>
      <div class="gdp-sign-up-dialog-header" role="img" aria-label="Google Developer Program"></div>
      <div class="main-content">
        <div class="section">
          <div class="icon-container">
            <devtools-icon name="trophy"></devtools-icon>
          </div>
          <div class="text-container">
            <h2 class="section-title">${i18nString(UIStrings.designedForSuccess)}</h2>
            <div class="section-text">${i18nString(UIStrings.designedForSuccessBody)}</div>
          </div>
        </div>
        <div class="section">
          <div class="icon-container">
            <devtools-icon name="mark-email-unread"></devtools-icon>
          </div>
          <div class="text-container">
            <h2 class="section-title">${i18nString(UIStrings.keepUpdated)}</h2>
            <div class="section-text">${i18nString(UIStrings.keepUpdatedBody)}</div>
          </div>
          <div class="switch-container">
            <devtools-switch
            .checked=${input.keepMeUpdated}
            .jslogContext=${'keep-me-updated'}
            .label=${i18nString(UIStrings.keepUpdated)}
            @switchchange=${(e) => input.onKeepMeUpdatedChange(e.checked)}
          >
            </devtools-switch>
          </div>
          </div>
        <div class="section">
          <div class="icon-container">
            <devtools-icon name="google"></devtools-icon>
          </div>
          <div class="text-container">
            <h2 class="section-title">${i18nString(UIStrings.tailorProfile)}</h2>
            <div class="section-text">
              <div>${i18nString(UIStrings.tailorProfileBody)}</div><br/>
              <div>${uiI18n.getFormatLocalizedString(str_, UIStrings.tailorProfileBodyDisclaimer, {
        PH1: UI.XLink.XLink.create(CONTENT_POLICY_URL, i18nString(UIStrings.contentPolicy), 'link', undefined, 'content-policy'),
        PH2: UI.XLink.XLink.create(TERMS_OF_SERVICE_URL, i18nString(UIStrings.termsOfService), 'link', undefined, 'terms-of-service'),
        PH3: UI.XLink.XLink.create(PRIVACY_POLICY_URL, i18nString(UIStrings.privacyPolicy), 'link', undefined, 'privacy-policy'),
    })}</div>
            </div>
          </div>
        </div>
      </div>
      <div class="buttons">
        <devtools-button
          aria-label=${i18nString(UIStrings.learnMoreAccessibleText)}
          .title=${i18nString(UIStrings.learnMoreAccessibleText)}
          .variant=${"outlined" /* Buttons.Button.Variant.OUTLINED */}
          .jslogContext=${'learn-more'}
          @click=${() => UIHelpers.openInNewTab(GDP_PROGRAM_URL)}>${i18nString(UIStrings.learnMore)}</devtools-button>
        <div class="right-buttons">
          <devtools-button
            .variant=${"tonal" /* Buttons.Button.Variant.TONAL */}
            .jslogContext=${'cancel'}
            @click=${input.onCancelClick}>${i18nString(UIStrings.cancel)}</devtools-button>
          <devtools-button
            .variant=${"primary" /* Buttons.Button.Variant.PRIMARY */}
            .jslogContext=${'sign-up'}
            .spinner=${input.isSigningUp}
            .disabled=${input.isSigningUp}
            @click=${input.onSignUpClick}>${i18nString(UIStrings.signUp)}</devtools-button>
        </div>
      </div>
    `, target);
    // clang-format on
};
export class GdpSignUpDialog extends UI.Widget.VBox {
    #view;
    #dialog;
    #keepMeUpdated = false;
    #isSigningUp = false;
    #onSuccess;
    #onCancel;
    constructor(options, view) {
        super();
        this.#dialog = options.dialog;
        this.#onSuccess = options.onSuccess;
        this.#onCancel = options.onCancel;
        this.#view = view ?? DEFAULT_VIEW;
        this.requestUpdate();
    }
    async #onSignUpClick() {
        this.#isSigningUp = true;
        this.requestUpdate();
        const syncInfo = await new Promise(resolve => Host.InspectorFrontendHost.InspectorFrontendHostInstance.getSyncInformation(resolve));
        const user = syncInfo.accountFullName ?? '';
        const emailPreference = this.#keepMeUpdated ? Host.GdpClient.EmailPreference.ENABLED : Host.GdpClient.EmailPreference.DISABLED;
        const result = await Host.GdpClient.GdpClient.instance().createProfile({ user, emailPreference });
        if (result) {
            Common.Settings.Settings.instance().moduleSetting('receive-gdp-badges').set(true);
            await Badges.UserBadges.instance().initialize();
            Badges.UserBadges.instance().recordAction(Badges.BadgeAction.GDP_SIGN_UP_COMPLETE);
            this.#onSuccess?.();
            this.#dialog.hide();
        }
        else {
            Snackbars.Snackbar.Snackbar.show({ message: i18nString(UIStrings.signUpFailed) }, this.#dialog.contentElement);
            this.#isSigningUp = false;
            this.requestUpdate();
        }
    }
    performUpdate() {
        const viewInput = {
            onSignUpClick: this.#onSignUpClick.bind(this),
            onCancelClick: () => {
                this.#dialog.hide();
                this.#onCancel?.();
            },
            keepMeUpdated: this.#keepMeUpdated,
            onKeepMeUpdatedChange: (value) => {
                this.#keepMeUpdated = value;
                this.requestUpdate();
            },
            isSigningUp: this.#isSigningUp,
        };
        this.#view(viewInput, undefined, this.contentElement);
    }
    static show({ onSuccess, onCancel } = {}) {
        const dialog = new UI.Dialog.Dialog('gdp-sign-up-dialog');
        dialog.setAriaLabel(i18nString(UIStrings.gdpDialogAriaLabel));
        dialog.setMaxContentSize(new Geometry.Size(384, 500));
        dialog.setSizeBehavior("SetExactWidthMaxHeight" /* UI.GlassPane.SizeBehavior.SET_EXACT_WIDTH_MAX_HEIGHT */);
        dialog.setDimmed(true);
        new GdpSignUpDialog({ dialog, onSuccess, onCancel }).show(dialog.contentElement);
        dialog.show(undefined, /* stack */ true);
    }
}
//# sourceMappingURL=GdpSignUpDialog.js.map
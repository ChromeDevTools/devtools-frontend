// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import '../../ui/components/switch/switch.js';

import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import type * as Platform from '../../core/platform/platform.js';
import * as Geometry from '../../models/geometry/geometry.js';
import * as Buttons from '../../ui/components/buttons/buttons.js';
import * as Snackbars from '../../ui/components/snackbars/snackbars.js';
import type * as Switch from '../../ui/components/switch/switch.js';
import * as UI from '../../ui/legacy/legacy.js';
import {html, render} from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import styles from './gdpSignUpDialog.css.js';

const UIStrings = {
  /**
   * @description Heading of the Google Developer Program sign up dialog.
   */
  gdpSignUp: 'Google Developer Program',
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
  designedForSuccessBody: 'Grow your skills, build with AI, and showcase your achievements',
  /**
   * @description Title for the second section of the GDP sign up dialog.
   */
  keepUpdated: 'Keep me updated',
  /**
   * @description Body for the second section of the GDP sign up dialog.
   */
  keepUpdatedBody: 'The latest DevTools features, event invites, and tailored insights directly in your inbox',
  /**
   * @description Title for the third section of the GDP sign up dialog.
   */
  thingsToConsider: 'Things to consider',
  /**
   * @description Body for the third section of the GDP sign up dialog.
   * @example {Content Policy} PH1
   * @example {Terms of Service} PH2
   * @example {Privacy Policy} PH3
   */
  thingsToConsiderBody:
      'By creating a Developer Profile, you agree to the {PH1}. Google’s {PH2} and {PH3} apply to your use of this service. The name on your Google Account and your interests will be used in your Google Developer Profile. Your name may appear where you contribute and can be changed at any time.',
  /**
   * @description Button text for learning more about the Google Developer Program.
   */
  learnMore: 'Learn more',
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
} as const;

const str_ = i18n.i18n.registerUIStrings('panels/common/GdpSignUpDialog.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

const TERMS_OF_SERVICE_URL = 'https://policies.google.com/terms';
const PRIVACY_POLICY_URL = 'https://policies.google.com/privacy';
const CONTENT_POLICY_URL = 'https://developers.google.com/profile/content-policy';
const GDP_PROGRAM_URL = 'https://developers.google.com/program';

interface ViewInput {
  onSignUpClick: () => void;
  onCancelClick: () => void;
  keepMeUpdated: boolean;
  onKeepMeUpdatedChange: (value: boolean) => void;
  isSigningUp: boolean;
}

type View = (input: ViewInput, output: undefined, target: HTMLElement) => void;

export const DEFAULT_VIEW: View = (input, _output, target): void => {
  // clang-format off
  render(
    html`
      <style>${styles}</style>
      <h2 class="gdp-sign-up-dialog-header">${i18nString(UIStrings.gdpSignUp)}</h2>
      <div class="main-content">
        <div class="section">
          <div class="icon-container">
            <devtools-icon name="trophy"></devtools-icon>
          </div>
          <div class="text-container">
            <h3 class="section-title">${i18nString(UIStrings.designedForSuccess)}</h3>
            <div class="section-text">${i18nString(UIStrings.designedForSuccessBody)}</div>
          </div>
        </div>
        <div class="section">
          <div class="icon-container">
            <devtools-icon name="mark-email-unread"></devtools-icon>
          </div>
          <div class="text-container">
            <h3 class="section-title">${i18nString(UIStrings.keepUpdated)}</h3>
            <div class="section-text">${i18nString(UIStrings.keepUpdatedBody)}</div>
          </div>
          <div class="switch-container">
            <devtools-switch
            .checked=${input.keepMeUpdated}
            @switchchange=${(e: Switch.Switch.SwitchChangeEvent) => input.onKeepMeUpdatedChange(e.checked)}
            jslog=${VisualLogging.toggle('gdp.signup.keep-me-updated').track({ click: true })}
            aria-label=${i18nString(UIStrings.keepUpdated)}
          >
            </devtools-switch>
          </div>
          </div>
        <div class="section">
          <div class="icon-container">
            <devtools-icon name="google"></devtools-icon>
          </div>
          <div class="text-container">
            <h3 class="section-title">${i18nString(UIStrings.thingsToConsider)}</h3>
            <div class="section-text">${i18n.i18n.getFormatLocalizedString(str_, UIStrings.thingsToConsiderBody, {
      PH1: UI.XLink.XLink.create(CONTENT_POLICY_URL, i18nString(UIStrings.contentPolicy), 'link', undefined, 'gdp.content-policy'),
      PH2: UI.XLink.XLink.create(TERMS_OF_SERVICE_URL, i18nString(UIStrings.termsOfService), 'link',
        undefined, 'gdp.terms-of-service'),
      PH3: UI.XLink.XLink.create(PRIVACY_POLICY_URL, i18nString(UIStrings.privacyPolicy), 'link',
        undefined, 'gdp.privacy-policy'),
    })}</div>
          </div>
        </div>
      </div>
      <div class="buttons">
        <devtools-button
          .variant=${Buttons.Button.Variant.OUTLINED}
          .jslogContext=${'learn-more'}
          @click=${() => UI.UIUtils.openInNewTab(GDP_PROGRAM_URL as Platform.DevToolsPath.UrlString)}>${i18nString(UIStrings.learnMore)}</devtools-button>
        <div class="right-buttons">
          <devtools-button
            .variant=${Buttons.Button.Variant.TONAL}
            .jslogContext=${'cancel'}
            @click=${input.onCancelClick}>${i18nString(UIStrings.cancel)}</devtools-button>
          <devtools-button
            .variant=${Buttons.Button.Variant.PRIMARY}
            .jslogContext=${'gdp.sign-up'}
            .spinner=${input.isSigningUp}
            .disabled=${input.isSigningUp}
            @click=${input.onSignUpClick}>${i18nString(UIStrings.signUp)}</devtools-button>
        </div>
      </div>
    `,
    target
  );
  // clang-format on
};

export class GdpSignUpDialog extends UI.Widget.VBox {
  #view: View;
  #dialog: UI.Dialog.Dialog;
  #keepMeUpdated = false;
  #isSigningUp = false;

  constructor(options: {dialog: UI.Dialog.Dialog}, view?: View) {
    super();
    this.#dialog = options.dialog;
    this.#view = view ?? DEFAULT_VIEW;
    this.requestUpdate();
  }

  async #onSignUpClick(): Promise<void> {
    this.#isSigningUp = true;
    this.requestUpdate();

    const syncInfo = await new Promise<Host.InspectorFrontendHostAPI.SyncInformation>(
        resolve => Host.InspectorFrontendHost.InspectorFrontendHostInstance.getSyncInformation(resolve));
    const user = syncInfo.accountFullName ?? '';
    const emailPreference =
        this.#keepMeUpdated ? Host.GdpClient.EmailPreference.ENABLED : Host.GdpClient.EmailPreference.DISABLED;
    const result = await Host.GdpClient.GdpClient.instance().createProfile({user, emailPreference});
    if (result) {
      this.#dialog.hide();
    } else {
      Snackbars.Snackbar.Snackbar.show({message: i18nString(UIStrings.signUpFailed)}, this.#dialog.contentElement);
      this.#isSigningUp = false;
      this.requestUpdate();
    }
  }

  override performUpdate(): void {
    const viewInput = {
      onSignUpClick: this.#onSignUpClick.bind(this),
      onCancelClick: () => {
        this.#dialog.hide();
      },
      keepMeUpdated: this.#keepMeUpdated,
      onKeepMeUpdatedChange: (value: boolean) => {
        this.#keepMeUpdated = value;
        this.requestUpdate();
      },
      isSigningUp: this.#isSigningUp,
    };

    this.#view(viewInput, undefined, this.contentElement);
  }

  static show(): void {
    const dialog = new UI.Dialog.Dialog();
    dialog.setAriaLabel(i18nString(UIStrings.gdpDialogAriaLabel));
    dialog.setMaxContentSize(new Geometry.Size(384, 500));
    dialog.setSizeBehavior(UI.GlassPane.SizeBehavior.SET_EXACT_WIDTH_MAX_HEIGHT);
    dialog.setDimmed(true);

    new GdpSignUpDialog({dialog}).show(dialog.contentElement);
    dialog.show();
  }
}

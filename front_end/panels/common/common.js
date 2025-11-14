var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// gen/front_end/panels/common/common.prebundle.js
import * as Host7 from "./../../core/host/host.js";
import * as i18n19 from "./../../core/i18n/i18n.js";
import * as Geometry2 from "./../../models/geometry/geometry.js";
import * as Buttons4 from "./../../ui/components/buttons/buttons.js";
import * as UI12 from "./../../ui/legacy/legacy.js";

// gen/front_end/panels/common/common.css.js
var common_css_default = `/*
 * Copyright 2025 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

.type-to-allow-dialog {
  width: 100%;

  .header {
    display: flex;
    justify-content: space-between;
    font: var(--sys-typescale-body2-medium);
    margin: var(--sys-size-5) var(--sys-size-5) var(--sys-size-5) var(--sys-size-8);
  }

  .title {
    padding-top: var(--sys-size-3);
  }

  .dialog-close-button {
    margin: var(--sys-size-3);
    z-index: 1;
  }

  .message,
  .text-input {
    margin: 0 var(--sys-size-8);
  }

  .text-input {
    margin-top: var(--sys-size-5);
  }

  .button {
    text-align: right;
    margin: var(--sys-size-6) var(--sys-size-8) var(--sys-size-8) var(--sys-size-8);
    gap: var(--sys-size-5);
    display: flex;
    flex-direction: row-reverse;
    justify-content: flex-start;
  }

  .button button {
    min-width: var(--sys-size-19);
  }
}

/*# sourceURL=${import.meta.resolve("./common.css")} */`;

// gen/front_end/panels/common/AiCodeCompletionTeaser.js
import * as Common from "./../../core/common/common.js";
import * as Host from "./../../core/host/host.js";
import * as i18n3 from "./../../core/i18n/i18n.js";
import * as Root from "./../../core/root/root.js";
import * as Snackbars from "./../../ui/components/snackbars/snackbars.js";
import * as UI2 from "./../../ui/legacy/legacy.js";
import { html as html2, nothing, render as render2 } from "./../../ui/lit/lit.js";
import * as VisualLogging from "./../../ui/visual_logging/visual_logging.js";

// gen/front_end/panels/common/aiCodeCompletionTeaser.css.js
var aiCodeCompletionTeaser_css_default = `/*
 * Copyright 2025 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

@scope to (devtools-widget > *) {
    .ai-code-completion-teaser-screen-reader-only {
        position: absolute;
        overflow: hidden;
        clip-path: rect(0 0 0 0);
        height: var(--sys-size-1);
        width: var(--sys-size-1);
        margin: -1 * var(--sys-size-1);;
        padding: 0;
        border: 0;
    }

    .ai-code-completion-teaser {
        padding-left: var(--sys-size-3);
        line-height: var(--sys-size-7);
        pointer-events: all;
        align-items: center;
        font-style: italic;

        .ai-code-completion-teaser-dismiss {
            text-decoration: underline;
            cursor: pointer;
        }

        .ai-code-completion-teaser-action {
            display: inline-flex;
            gap: var(--sys-size-2);

            span {
                border: var(--sys-size-1) solid var(--sys-color-neutral-outline);
                border-radius: var(--sys-shape-corner-extra-small);
                padding: 0 var(--sys-size-3);
            }
        }

        .new-badge {
            font-style: normal;
            display: inline-block;
        }
    }
}

/*# sourceURL=${import.meta.resolve("./aiCodeCompletionTeaser.css")} */`;

// gen/front_end/panels/common/FreDialog.js
import * as i18n from "./../../core/i18n/i18n.js";
import * as Buttons from "./../../ui/components/buttons/buttons.js";
import * as UI from "./../../ui/legacy/legacy.js";
import * as Lit from "./../../ui/lit/lit.js";

// gen/front_end/panels/common/freDialog.css.js
var freDialog_css_default = `/*
 * Copyright 2025 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */


.fre-disclaimer {
  width: var(--sys-size-33);
  padding: var(--sys-size-9);

  header {
    display: flex;
    gap: var(--sys-size-8);
    margin-bottom: var(--sys-size-6);
    align-items: center;

    h2 {
      margin: 0;
      color: var(--sys-color-on-surface);
      font: var(--sys-typescale-headline5);
    }

    .header-icon-container {
      background: linear-gradient(
        135deg,
        var(--sys-color-gradient-primary),
        var(--sys-color-gradient-tertiary)
      );
      border-radius: var(--sys-size-4);
      min-height: var(--sys-size-14);
      min-width: var(--sys-size-14);
      display: flex;
      align-items: center;
      justify-content: center;

      devtools-icon {
        width: var(--sys-size-9);
        height: var(--sys-size-9);
      }
    }
  }

  .reminder-container {
    border-radius: var(--sys-size-6);
    background-color: var(--sys-color-surface4);
    padding: var(--sys-size-9);

    h3 {
      color: var(--sys-color-on-surface);
      font: var(--sys-typescale-body4-medium);
      margin: 0;
    }

    .reminder-item {
      display: flex;
      flex-direction: row;
      align-items: center;
      gap: var(--sys-size-5);
      margin-top: var(--sys-size-6);
      font: var(--sys-typescale-body5-regular);

      devtools-icon.reminder-icon {
        width: var(--sys-size-8);
        height: var(--sys-size-8);
      }

      .link {
        color: var(--sys-color-primary);
        text-decoration-line: underline;
      }
    }
  }

  footer {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    margin-top: var(--sys-size-8);
    min-width: var(--sys-size-28);

    .right-buttons {
      display: flex;
      gap: var(--sys-size-5);
    }
  }
}

/*# sourceURL=${import.meta.resolve("./freDialog.css")} */`;

// gen/front_end/panels/common/FreDialog.js
var { html, Directives: { ifDefined } } = Lit;
var UIStrings = {
  /**
   * @description Header text for the feature reminder dialog.
   */
  thingsToConsider: "Things to consider",
  /**
   * @description Text for the learn more button in the feature reminder dialog.
   */
  learnMore: "Learn more",
  /**
   * @description Text for the cancel button in the feature reminder dialog.
   */
  cancel: "Cancel",
  /**
   * @description Text for the got it button in the feature reminder dialog.
   */
  gotIt: "Got it"
};
var str_ = i18n.i18n.registerUIStrings("panels/common/FreDialog.ts", UIStrings);
var i18nString = i18n.i18n.getLocalizedString.bind(void 0, str_);
var FreDialog = class {
  static show({ header, reminderItems, onLearnMoreClick, ariaLabel, learnMoreButtonText, learnMoreButtonAriaLabel }) {
    const dialog2 = new UI.Dialog.Dialog();
    if (ariaLabel) {
      dialog2.setAriaLabel(ariaLabel);
    }
    const result = Promise.withResolvers();
    Lit.render(html`
      <div class="fre-disclaimer">
        <style>
          ${freDialog_css_default}
        </style>
        <header>
          <div class="header-icon-container">
            <devtools-icon name=${header.iconName}></devtools-icon>
          </div>
          <h2 tabindex="-1">
            ${header.text}
          </h2>
        </header>
        <main class="reminder-container">
          <h3>${i18nString(UIStrings.thingsToConsider)}</h3>
          ${reminderItems.map((reminderItem) => html`
            <div class="reminder-item">
              <devtools-icon class="reminder-icon" name=${reminderItem.iconName}></devtools-icon>
              <span>${reminderItem.content}</span>
            </div>
          `)}
        </main>
        <footer>
          <devtools-button
            @click=${onLearnMoreClick}
            .jslogContext=${"fre-disclaimer.learn-more"}
            .variant=${"outlined"}
            .title=${learnMoreButtonAriaLabel ?? i18nString(UIStrings.learnMore)}
            aria-label=${ifDefined(learnMoreButtonAriaLabel)}>
            ${learnMoreButtonText ?? i18nString(UIStrings.learnMore)}
          </devtools-button>
          <div class="right-buttons">
            <devtools-button
              @click=${() => {
      result.resolve(false);
      dialog2.hide();
    }}
              .jslogContext=${"fre-disclaimer.cancel"}
              .variant=${"tonal"}>
              ${i18nString(UIStrings.cancel)}
            </devtools-button>
            <devtools-button
              @click=${() => {
      result.resolve(true);
      dialog2.hide();
    }}
              .jslogContext=${"fre-disclaimer.continue"}
              .variant=${"primary"}>
              ${i18nString(UIStrings.gotIt)}
            </devtools-button>
          </div>
        </footer>
      </div>`, dialog2.contentElement);
    dialog2.setOutsideClickCallback((ev) => {
      ev.consume(true);
      dialog2.hide();
      result.resolve(false);
    });
    dialog2.setOnHideCallback(() => {
      result.resolve(false);
    });
    dialog2.setSizeBehavior(
      "MeasureContent"
      /* UI.GlassPane.SizeBehavior.MEASURE_CONTENT */
    );
    dialog2.setDimmed(true);
    dialog2.show();
    return result.promise;
  }
  constructor() {
  }
};

// gen/front_end/panels/common/AiCodeCompletionTeaser.js
var UIStringsNotTranslate = {
  /**
   * @description Text for `ctrl` key.
   */
  ctrl: "ctrl",
  /**
   * @description Text for `cmd` key.
   */
  cmd: "cmd",
  /**
   * @description Text for `i` key.
   */
  i: "i",
  /**
   * @description Text for `x` key.
   */
  x: "x",
  /**
   * @description Text for dismissing teaser.
   */
  dontShowAgain: "Don't show again",
  /**
   * @description Text for teaser to turn on code suggestions.
   */
  toTurnOnCodeSuggestions: "to turn on code suggestions.",
  /**
   * @description Text for snackbar notification on dismissing the teaser.
   */
  turnOnCodeSuggestionsAtAnyTimeInSettings: "Turn on code suggestions at any time in Settings",
  /**
   * @description Text for snackbar action button to manage settings.
   */
  manage: "Manage",
  /**
   * @description The footer disclaimer that links to more information
   * about the AI feature.
   */
  learnMore: "Learn more about AI code completion",
  /**
   * @description Header text for the AI-powered suggestions disclaimer dialog.
   */
  freDisclaimerHeader: "Code faster with AI-powered suggestions",
  /**
   * @description First disclaimer item text for the fre dialog.
   */
  freDisclaimerTextAiWontAlwaysGetItRight: "This feature uses AI and won\u2019t always get it right",
  /**
   * @description Second disclaimer item text for the fre dialog.
   */
  freDisclaimerTextPrivacy: "To generate code suggestions, your console input, the history of your current console session, the currently inspected CSS, and the contents of the currently open file are shared with Google. This data may be seen by human reviewers to improve this feature.",
  /**
   * @description Second disclaimer item text for the fre dialog when enterprise logging is off.
   */
  freDisclaimerTextPrivacyNoLogging: "To generate code suggestions, your console input, the history of your current console session, the currently inspected CSS, and the contents of the currently open file are shared with Google. This data will not be used to improve Google\u2019s AI models. Your organization may change these settings at any time.",
  /**
   * @description Third disclaimer item text for the fre dialog.
   */
  freDisclaimerTextUseWithCaution: "Use generated code snippets with caution",
  /**
   *@description Text for ARIA label for the teaser.
   */
  press: "Press",
  /**
   *@description Text for ARIA label for the teaser.
   */
  toDisableCodeSuggestions: "to disable code suggestions."
};
var lockedString = i18n3.i18n.lockedString;
var CODE_SNIPPET_WARNING_URL = "https://support.google.com/legal/answer/13505487";
var PROMOTION_ID = "ai-code-completion";
var DEFAULT_VIEW = (input, _output, target) => {
  if (input.aidaAvailability !== "available") {
    render2(nothing, target);
    return;
  }
  const cmdOrCtrl = Host.Platform.isMac() ? lockedString(UIStringsNotTranslate.cmd) : lockedString(UIStringsNotTranslate.ctrl);
  const teaserAriaLabel = lockedString(UIStringsNotTranslate.press) + " " + cmdOrCtrl + " " + lockedString(UIStringsNotTranslate.i) + " " + lockedString(UIStringsNotTranslate.toTurnOnCodeSuggestions) + " " + lockedString(UIStringsNotTranslate.press) + " " + cmdOrCtrl + " " + lockedString(UIStringsNotTranslate.x) + " " + lockedString(UIStringsNotTranslate.toDisableCodeSuggestions);
  const newBadge = UI2.UIUtils.maybeCreateNewBadge(PROMOTION_ID);
  const newBadgeTemplate = newBadge ? html2`&nbsp;${newBadge}` : nothing;
  render2(html2`
          <style>${aiCodeCompletionTeaser_css_default}</style>
          <style>@scope to (devtools-widget > *) { ${UI2.inspectorCommonStyles} }</style>
          <div class="ai-code-completion-teaser-screen-reader-only">${teaserAriaLabel}</div>
          <div class="ai-code-completion-teaser" aria-hidden="true">
            <span class="ai-code-completion-teaser-action">
              <span>${cmdOrCtrl}</span>
              <span>${lockedString(UIStringsNotTranslate.i)}</span>
            </span>
            </span>&nbsp;${lockedString(UIStringsNotTranslate.toTurnOnCodeSuggestions)}&nbsp;
            <span role="button" class="ai-code-completion-teaser-dismiss" @click=${input.onDismiss}
              jslog=${VisualLogging.action("ai-code-completion-teaser.dismiss").track({ click: true })}>
                ${lockedString(UIStringsNotTranslate.dontShowAgain)}
            </span>
            ${newBadgeTemplate}
          </div>
        `, target);
};
var AiCodeCompletionTeaser = class extends UI2.Widget.Widget {
  #view;
  #aidaAvailability;
  #boundOnAidaAvailabilityChange;
  #boundOnAiCodeCompletionSettingChanged;
  #onDetach;
  // Whether the user completed first run experience dialog or not.
  #aiCodeCompletionFreCompletedSetting = Common.Settings.Settings.instance().createSetting("ai-code-completion-enabled", false);
  // Whether the user dismissed the teaser or not.
  #aiCodeCompletionTeaserDismissedSetting = Common.Settings.Settings.instance().createSetting("ai-code-completion-teaser-dismissed", false);
  #noLogging;
  // Whether the enterprise setting is `ALLOW_WITHOUT_LOGGING` or not.
  constructor(config, view) {
    super();
    this.markAsExternallyManaged();
    this.#onDetach = config.onDetach;
    this.#view = view ?? DEFAULT_VIEW;
    this.#boundOnAidaAvailabilityChange = this.#onAidaAvailabilityChange.bind(this);
    this.#boundOnAiCodeCompletionSettingChanged = this.#onAiCodeCompletionSettingChanged.bind(this);
    this.#noLogging = Root.Runtime.hostConfig.aidaAvailability?.enterprisePolicyValue === Root.Runtime.GenAiEnterprisePolicyValue.ALLOW_WITHOUT_LOGGING;
    this.requestUpdate();
  }
  #showReminderSnackbar() {
    Snackbars.Snackbar.Snackbar.show({
      message: lockedString(UIStringsNotTranslate.turnOnCodeSuggestionsAtAnyTimeInSettings),
      actionProperties: {
        label: lockedString(UIStringsNotTranslate.manage),
        onClick: () => {
          void UI2.ViewManager.ViewManager.instance().showView("chrome-ai");
        }
      },
      closable: true
    });
  }
  async #onAidaAvailabilityChange() {
    const currentAidaAvailability = await Host.AidaClient.AidaClient.checkAccessPreconditions();
    if (currentAidaAvailability !== this.#aidaAvailability) {
      this.#aidaAvailability = currentAidaAvailability;
      this.requestUpdate();
    }
  }
  #onAiCodeCompletionSettingChanged() {
    if (this.#aiCodeCompletionFreCompletedSetting.get() || this.#aiCodeCompletionTeaserDismissedSetting.get()) {
      this.detach();
    }
  }
  onAction = async (event) => {
    event.preventDefault();
    const result = await FreDialog.show({
      header: { iconName: "smart-assistant", text: lockedString(UIStringsNotTranslate.freDisclaimerHeader) },
      reminderItems: [
        {
          iconName: "psychiatry",
          content: lockedString(UIStringsNotTranslate.freDisclaimerTextAiWontAlwaysGetItRight)
        },
        {
          iconName: "google",
          content: this.#noLogging ? lockedString(UIStringsNotTranslate.freDisclaimerTextPrivacyNoLogging) : lockedString(UIStringsNotTranslate.freDisclaimerTextPrivacy)
        },
        {
          iconName: "warning",
          // clang-format off
          content: html2`<x-link
            href=${CODE_SNIPPET_WARNING_URL}
            class="link devtools-link"
            jslog=${VisualLogging.link("code-snippets-explainer.ai-code-completion-teaser").track({
            click: true
          })}
          >${lockedString(UIStringsNotTranslate.freDisclaimerTextUseWithCaution)}</x-link>`
          // clang-format on
        }
      ],
      onLearnMoreClick: () => {
        void UI2.ViewManager.ViewManager.instance().showView("chrome-ai");
      },
      ariaLabel: lockedString(UIStringsNotTranslate.freDisclaimerHeader),
      learnMoreButtonAriaLabel: lockedString(UIStringsNotTranslate.learnMore)
    });
    if (result) {
      this.#aiCodeCompletionFreCompletedSetting.set(true);
      this.detach();
    } else {
      this.requestUpdate();
    }
  };
  onDismiss = (event) => {
    event.preventDefault();
    this.#aiCodeCompletionTeaserDismissedSetting.set(true);
    this.#showReminderSnackbar();
    this.detach();
  };
  performUpdate() {
    const output = {};
    this.#view({
      aidaAvailability: this.#aidaAvailability,
      onAction: this.onAction,
      onDismiss: this.onDismiss
    }, output, this.contentElement);
  }
  wasShown() {
    super.wasShown();
    Host.AidaClient.HostConfigTracker.instance().addEventListener("aidaAvailabilityChanged", this.#boundOnAidaAvailabilityChange);
    this.#aiCodeCompletionFreCompletedSetting.addChangeListener(this.#boundOnAiCodeCompletionSettingChanged);
    this.#aiCodeCompletionTeaserDismissedSetting.addChangeListener(this.#boundOnAiCodeCompletionSettingChanged);
    void this.#onAidaAvailabilityChange();
  }
  willHide() {
    super.willHide();
    Host.AidaClient.HostConfigTracker.instance().removeEventListener("aidaAvailabilityChanged", this.#boundOnAidaAvailabilityChange);
    this.#aiCodeCompletionFreCompletedSetting.removeChangeListener(this.#boundOnAiCodeCompletionSettingChanged);
    this.#aiCodeCompletionTeaserDismissedSetting.removeChangeListener(this.#boundOnAiCodeCompletionSettingChanged);
  }
  onDetach() {
    this.#onDetach();
  }
};

// gen/front_end/panels/common/GdpSignUpDialog.js
import "./../../ui/components/switch/switch.js";
import * as Common2 from "./../../core/common/common.js";
import * as Host2 from "./../../core/host/host.js";
import * as i18n5 from "./../../core/i18n/i18n.js";
import * as Badges from "./../../models/badges/badges.js";
import * as Geometry from "./../../models/geometry/geometry.js";
import * as Buttons2 from "./../../ui/components/buttons/buttons.js";
import * as Snackbars2 from "./../../ui/components/snackbars/snackbars.js";
import * as uiI18n from "./../../ui/i18n/i18n.js";
import * as UI3 from "./../../ui/legacy/legacy.js";
import { html as html3, render as render3 } from "./../../ui/lit/lit.js";

// gen/front_end/panels/common/gdpSignUpDialog.css.js
var gdpSignUpDialog_css_default = `/*
 * Copyright 2025 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

@scope to (devtools-widget > *) {
    :scope {
        width: 100%;
        box-shadow: none;
        padding: var(--sys-size-8);
    }

    .gdp-sign-up-dialog-header {
        background-image: var(--image-file-gdp-logo-light);
        height: 20px;
        background-repeat: no-repeat;
        background-size: contain;
        margin: 0;

        &:focus-visible {
            outline: 2px solid var(--sys-color-state-focus-ring);
        }
    }

    :host-context(.theme-with-dark-background) & .gdp-sign-up-dialog-header {
        background-image: var(--image-file-gdp-logo-dark);
    }

    .main-content {
        display: flex;
        flex-direction: column;
        margin: var(--sys-size-6) 0;
        gap: var(--sys-size-3);
    }

    .section {
        display: flex;
        gap: var(--sys-size-6);
        padding: 12px 16px 12px 12px;
        background-color: var(--sys-color-surface4);
        align-self: stretch;
    }

    .icon-container {
        flex-shrink: 0;
    }

    .section:first-child {
        border-top-left-radius: var(--sys-shape-corner-medium-small);
        border-top-right-radius: var(--sys-shape-corner-medium-small);
    }

    .section:last-child {
        border-bottom-left-radius: var(--sys-shape-corner-medium-small);
        border-bottom-right-radius: var(--sys-shape-corner-medium-small);
    }

    .section .icon-container devtools-icon {
        width: var(--sys-size-8);
        height: var(--sys-size-8);
    }

    .text-container {
        display: flex;
        flex-direction: column;
    }

    .section-title {
        margin: 0;
        font: var(--sys-typescale-body4-medium);
        color: var(--sys-color-on-surface);
    }

    .section-text {
        font: var(--sys-typescale-body4-regular);
        color: var(--sys-color-on-surface-subtle);
        line-height: 18px;
    }

    .switch-container {
        display: flex;
        align-items: center;
        flex-shrink: 0;
    }

    .buttons {
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .right-buttons {
        display: flex;
        gap: var(--sys-size-5);
    }
}

/*# sourceURL=${import.meta.resolve("./gdpSignUpDialog.css")} */`;

// gen/front_end/panels/common/GdpSignUpDialog.js
var UIStrings2 = {
  /**
   * @description Aria label for the Google Developer Program sign up dialog
   */
  gdpDialogAriaLabel: "Google Developer Program sign up dialog",
  /**
   *
   * @description Button text for canceling GDP sign up.
   */
  cancel: "Cancel",
  /**
   * @description Button text for confirming GDP sign up.
   */
  signUp: "Sign up",
  /**
   * @description Title for the first section of the GDP sign up dialog.
   */
  designedForSuccess: "Designed for your success",
  /**
   * @description Body for the first section of the GDP sign up dialog.
   */
  designedForSuccessBody: "Grow your skills, build with AI, and earn badges you can showcase in your developer profile",
  /**
   * @description Title for the second section of the GDP sign up dialog.
   */
  keepUpdated: "Keep me updated",
  /**
   * @description Body for the second section of the GDP sign up dialog.
   */
  keepUpdatedBody: "The latest DevTools features, event invites, and tailored insights land directly in your inbox",
  /**
   * @description Title for the third section of the GDP sign up dialog.
   */
  tailorProfile: "Tailor your profile",
  /**
   * @description Body for the third section of the GDP sign up dialog.
   */
  tailorProfileBody: "The name on your Google Account and your interests will be used in your Google Developer Profile. Your name may appear where you contribute and can be changed at any time.",
  /**
   * @description Body for the third section of the GDP sign up dialog.
   * @example {Content Policy} PH1
   * @example {Terms of Service} PH2
   * @example {Privacy Policy} PH3
   */
  tailorProfileBodyDisclaimer: "By creating a Developer Profile, you agree to the\xA0{PH1}. Google\u2019s\xA0{PH2}\xA0and\xA0{PH3}\xA0apply to your use of this service.",
  /**
   * @description Button text for learning more about the Google Developer Program.
   */
  learnMore: "Learn more",
  /**
   * @description Accessible text for learning more about the Google Developer Program.
   */
  learnMoreAccessibleText: "Learn more about the Google Developer Program",
  /**
   * @description Link text for Content Policy.
   */
  contentPolicy: "Content Policy",
  /**
   * @description Link text for Terms of Service.
   */
  termsOfService: "Terms of Service",
  /**
   * @description Link text for Privacy Policy.
   */
  privacyPolicy: "Privacy Policy",
  /**
   * @description Error message shown in a snackbar when GDP sign up fails.
   */
  signUpFailed: "Your Google Developer Program profile couldn\u2019t be created. Please try again later."
};
var str_2 = i18n5.i18n.registerUIStrings("panels/common/GdpSignUpDialog.ts", UIStrings2);
var i18nString2 = i18n5.i18n.getLocalizedString.bind(void 0, str_2);
var TERMS_OF_SERVICE_URL = "https://policies.google.com/terms";
var PRIVACY_POLICY_URL = "https://policies.google.com/privacy";
var CONTENT_POLICY_URL = "https://developers.google.com/profile/content-policy";
var GDP_PROGRAM_URL = "https://developers.google.com/program";
var DEFAULT_VIEW2 = (input, _output, target) => {
  render3(html3`
      <style>${gdpSignUpDialog_css_default}</style>
      <div class="gdp-sign-up-dialog-header" role="img" aria-label="Google Developer Program"></div>
      <div class="main-content">
        <div class="section">
          <div class="icon-container">
            <devtools-icon name="trophy"></devtools-icon>
          </div>
          <div class="text-container">
            <h2 class="section-title">${i18nString2(UIStrings2.designedForSuccess)}</h2>
            <div class="section-text">${i18nString2(UIStrings2.designedForSuccessBody)}</div>
          </div>
        </div>
        <div class="section">
          <div class="icon-container">
            <devtools-icon name="mark-email-unread"></devtools-icon>
          </div>
          <div class="text-container">
            <h2 class="section-title">${i18nString2(UIStrings2.keepUpdated)}</h2>
            <div class="section-text">${i18nString2(UIStrings2.keepUpdatedBody)}</div>
          </div>
          <div class="switch-container">
            <devtools-switch
            .checked=${input.keepMeUpdated}
            .jslogContext=${"keep-me-updated"}
            .label=${i18nString2(UIStrings2.keepUpdated)}
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
            <h2 class="section-title">${i18nString2(UIStrings2.tailorProfile)}</h2>
            <div class="section-text">
              <div>${i18nString2(UIStrings2.tailorProfileBody)}</div><br/>
              <div>${uiI18n.getFormatLocalizedString(str_2, UIStrings2.tailorProfileBodyDisclaimer, {
    PH1: UI3.XLink.XLink.create(CONTENT_POLICY_URL, i18nString2(UIStrings2.contentPolicy), "link", void 0, "content-policy"),
    PH2: UI3.XLink.XLink.create(TERMS_OF_SERVICE_URL, i18nString2(UIStrings2.termsOfService), "link", void 0, "terms-of-service"),
    PH3: UI3.XLink.XLink.create(PRIVACY_POLICY_URL, i18nString2(UIStrings2.privacyPolicy), "link", void 0, "privacy-policy")
  })}</div>
            </div>
          </div>
        </div>
      </div>
      <div class="buttons">
        <devtools-button
          aria-label=${i18nString2(UIStrings2.learnMoreAccessibleText)}
          .title=${i18nString2(UIStrings2.learnMoreAccessibleText)}
          .variant=${"outlined"}
          .jslogContext=${"learn-more"}
          @click=${() => UI3.UIUtils.openInNewTab(GDP_PROGRAM_URL)}>${i18nString2(UIStrings2.learnMore)}</devtools-button>
        <div class="right-buttons">
          <devtools-button
            .variant=${"tonal"}
            .jslogContext=${"cancel"}
            @click=${input.onCancelClick}>${i18nString2(UIStrings2.cancel)}</devtools-button>
          <devtools-button
            .variant=${"primary"}
            .jslogContext=${"sign-up"}
            .spinner=${input.isSigningUp}
            .disabled=${input.isSigningUp}
            @click=${input.onSignUpClick}>${i18nString2(UIStrings2.signUp)}</devtools-button>
        </div>
      </div>
    `, target);
};
var GdpSignUpDialog = class _GdpSignUpDialog extends UI3.Widget.VBox {
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
    this.#view = view ?? DEFAULT_VIEW2;
    this.requestUpdate();
  }
  async #onSignUpClick() {
    this.#isSigningUp = true;
    this.requestUpdate();
    const syncInfo = await new Promise((resolve) => Host2.InspectorFrontendHost.InspectorFrontendHostInstance.getSyncInformation(resolve));
    const user = syncInfo.accountFullName ?? "";
    const emailPreference = this.#keepMeUpdated ? Host2.GdpClient.EmailPreference.ENABLED : Host2.GdpClient.EmailPreference.DISABLED;
    const result = await Host2.GdpClient.GdpClient.instance().createProfile({ user, emailPreference });
    if (result) {
      Common2.Settings.Settings.instance().moduleSetting("receive-gdp-badges").set(true);
      await Badges.UserBadges.instance().initialize();
      Badges.UserBadges.instance().recordAction(Badges.BadgeAction.GDP_SIGN_UP_COMPLETE);
      this.#onSuccess?.();
      this.#dialog.hide();
    } else {
      Snackbars2.Snackbar.Snackbar.show({ message: i18nString2(UIStrings2.signUpFailed) }, this.#dialog.contentElement);
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
      isSigningUp: this.#isSigningUp
    };
    this.#view(viewInput, void 0, this.contentElement);
  }
  static show({ onSuccess, onCancel } = {}) {
    const dialog2 = new UI3.Dialog.Dialog("gdp-sign-up-dialog");
    dialog2.setAriaLabel(i18nString2(UIStrings2.gdpDialogAriaLabel));
    dialog2.setMaxContentSize(new Geometry.Size(384, 500));
    dialog2.setSizeBehavior(
      "SetExactWidthMaxHeight"
      /* UI.GlassPane.SizeBehavior.SET_EXACT_WIDTH_MAX_HEIGHT */
    );
    dialog2.setDimmed(true);
    new _GdpSignUpDialog({ dialog: dialog2, onSuccess, onCancel }).show(dialog2.contentElement);
    dialog2.show(
      void 0,
      /* stack */
      true
    );
  }
};

// gen/front_end/panels/common/AiCodeCompletionDisclaimer.js
import "./../../ui/components/spinners/spinners.js";
import "./../../ui/components/tooltips/tooltips.js";
import * as Host3 from "./../../core/host/host.js";
import * as i18n7 from "./../../core/i18n/i18n.js";
import * as Root2 from "./../../core/root/root.js";
import * as UI4 from "./../../ui/legacy/legacy.js";
import { Directives, html as html4, nothing as nothing2, render as render4 } from "./../../ui/lit/lit.js";
import * as VisualLogging2 from "./../../ui/visual_logging/visual_logging.js";

// gen/front_end/panels/common/aiCodeCompletionDisclaimer.css.js
var aiCodeCompletionDisclaimer_css_default = `/*
 * Copyright 2025 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

@scope to (devtools-widget > *) {
    /* stylelint-disable-next-line no-invalid-position-declaration */
    display: flex;

    .ai-code-completion-disclaimer {
        gap: 5px;
        display: flex;
        flex-shrink: 0;

        span.link {
            color: var(--sys-color-on-surface-subtle);

            &:focus-visible {
                outline: var(--sys-size-2) solid var(--sys-color-state-focus-ring);
                outline-offset: 0;
                border-radius: var(--sys-shape-corner-extra-small);
            }
        }

        devtools-spinner {
            margin-top: var(--sys-size-2);
            padding: var(--sys-size-1);
            height: var(--sys-size-6);
            width: var(--sys-size-6);
        }

        devtools-tooltip:popover-open {
            display: flex;
            flex-direction: column;
            align-items: center;

            .disclaimer-tooltip-container {
                padding: var(--sys-size-4) 0;
                max-width: var(--sys-size-30);
                white-space: normal;

                .tooltip-text {
                    color: var(--sys-color-on-surface-subtle);
                    padding: 0 var(--sys-size-5);
                    align-items: flex-start;
                    gap: 10px;
                }

                .link {
                    margin: var(--sys-size-5) var(--sys-size-8) 0 var(--sys-size-5);
                    display: inline-block;
                }
            }
        }
    }
}

/*# sourceURL=${import.meta.resolve("./aiCodeCompletionDisclaimer.css")} */`;

// gen/front_end/panels/common/AiCodeCompletionDisclaimer.js
var UIStringsNotTranslate2 = {
  /**
   * @description Disclaimer text for AI code completion
   */
  relevantData: "Relevant data",
  /**
   * @description Disclaimer text for AI code completion
   */
  isSentToGoogle: "is sent to Google",
  /**
   * @description Text for tooltip shown on hovering over "Relevant Data" in the disclaimer text for AI code completion.
   */
  tooltipDisclaimerTextForAiCodeCompletion: "To generate code suggestions, your console input and the history of your current console session are shared with Google. This data may be seen by human reviewers to improve this feature.",
  /**
   * @description Text for tooltip shown on hovering over "Relevant Data" in the disclaimer text for AI code completion.
   */
  tooltipDisclaimerTextForAiCodeCompletionNoLogging: "To generate code suggestions, your console input and the history of your current console session are shared with Google. This data will not be used to improve Google\u2019s AI models.",
  /**
   * Text for tooltip shown on hovering over spinner.
   */
  tooltipTextForSpinner: "Shows when data is being sent to Google to generate code suggestions",
  /**
   * @description Text for tooltip button which redirects to AI settings
   */
  manageInSettings: "Manage in settings",
  /**
   *@description Text announced when request is sent to AIDA and the spinner is loading
   */
  dataIsBeingSentToGoogle: "Data is being sent to Google"
};
var lockedString2 = i18n7.i18n.lockedString;
var DEFAULT_SUMMARY_TOOLBAR_VIEW = (input, output, target) => {
  if (input.aidaAvailability !== "available" || !input.disclaimerTooltipId || !input.spinnerTooltipId) {
    render4(nothing2, target);
    return;
  }
  render4(html4`
        <style>${aiCodeCompletionDisclaimer_css_default}</style>
        <div class="ai-code-completion-disclaimer"><devtools-spinner
          .active=${false}
          ${Directives.ref((el) => {
    if (el instanceof HTMLElement) {
      output.setLoading = (isLoading) => {
        el.toggleAttribute("active", isLoading);
      };
    }
  })}
          aria-details=${input.spinnerTooltipId}
          aria-describedby=${input.spinnerTooltipId}></devtools-spinner>
          <devtools-tooltip
              id=${input.spinnerTooltipId}
              variant="rich"
              jslogContext="ai-code-completion-spinner-tooltip">
          <div class="disclaimer-tooltip-container"><div class="tooltip-text">
            ${lockedString2(UIStringsNotTranslate2.tooltipTextForSpinner)}
          </div></div></devtools-tooltip>
          <span
              tabIndex="0"
              class="link"
              role="link"
              jslog=${VisualLogging2.link("open-ai-settings").track({
    click: true
  })}
              aria-details=${input.disclaimerTooltipId}
              aria-describedby=${input.disclaimerTooltipId}
              @click=${() => {
    void UI4.ViewManager.ViewManager.instance().showView("chrome-ai");
  }}
          >${lockedString2(UIStringsNotTranslate2.relevantData)}</span>${lockedString2(UIStringsNotTranslate2.isSentToGoogle)}
          <devtools-tooltip
              id=${input.disclaimerTooltipId}
              variant="rich"
              jslogContext="ai-code-completion-disclaimer"
              ${Directives.ref((el) => {
    if (el instanceof HTMLElement) {
      output.hideTooltip = () => {
        el.hidePopover();
      };
    }
  })}>
            <div class="disclaimer-tooltip-container"><div class="tooltip-text">
                ${input.noLogging ? lockedString2(UIStringsNotTranslate2.tooltipDisclaimerTextForAiCodeCompletionNoLogging) : lockedString2(UIStringsNotTranslate2.tooltipDisclaimerTextForAiCodeCompletion)}
                </div>
                <span
                    tabIndex="0"
                    class="link"
                    role="link"
                    jslog=${VisualLogging2.link("open-ai-settings").track({
    click: true
  })}
                    @click=${input.onManageInSettingsTooltipClick}
                >${lockedString2(UIStringsNotTranslate2.manageInSettings)}</span></div></devtools-tooltip>
          </div>
        `, target);
};
var MINIMUM_LOADING_STATE_TIMEOUT = 1e3;
var AiCodeCompletionDisclaimer = class extends UI4.Widget.Widget {
  #view;
  #viewOutput = {};
  #spinnerTooltipId;
  #disclaimerTooltipId;
  #noLogging;
  // Whether the enterprise setting is `ALLOW_WITHOUT_LOGGING` or not.
  #loading = false;
  #loadingStartTime = 0;
  #spinnerLoadingTimeout;
  #aidaAvailability;
  #boundOnAidaAvailabilityChange;
  constructor(element, view = DEFAULT_SUMMARY_TOOLBAR_VIEW) {
    super(element);
    this.markAsExternallyManaged();
    this.#noLogging = Root2.Runtime.hostConfig.aidaAvailability?.enterprisePolicyValue === Root2.Runtime.GenAiEnterprisePolicyValue.ALLOW_WITHOUT_LOGGING;
    this.#boundOnAidaAvailabilityChange = this.#onAidaAvailabilityChange.bind(this);
    this.#view = view;
  }
  set disclaimerTooltipId(disclaimerTooltipId) {
    this.#disclaimerTooltipId = disclaimerTooltipId;
    this.requestUpdate();
  }
  set spinnerTooltipId(spinnerTooltipId) {
    this.#spinnerTooltipId = spinnerTooltipId;
    this.requestUpdate();
  }
  set loading(loading) {
    if (!loading && !this.#loading) {
      return;
    }
    if (loading) {
      if (!this.#loading) {
        this.#viewOutput.setLoading?.(true);
        UI4.ARIAUtils.LiveAnnouncer.status(lockedString2(UIStringsNotTranslate2.dataIsBeingSentToGoogle));
      }
      if (this.#spinnerLoadingTimeout) {
        clearTimeout(this.#spinnerLoadingTimeout);
        this.#spinnerLoadingTimeout = void 0;
      }
      this.#loadingStartTime = performance.now();
      this.#loading = true;
    } else {
      this.#loading = false;
      const duration = performance.now() - this.#loadingStartTime;
      const remainingTime = Math.max(MINIMUM_LOADING_STATE_TIMEOUT - duration, 0);
      this.#spinnerLoadingTimeout = window.setTimeout(() => {
        this.#viewOutput.setLoading?.(false);
        this.#spinnerLoadingTimeout = void 0;
      }, remainingTime);
    }
  }
  async #onAidaAvailabilityChange() {
    const currentAidaAvailability = await Host3.AidaClient.AidaClient.checkAccessPreconditions();
    if (currentAidaAvailability !== this.#aidaAvailability) {
      this.#aidaAvailability = currentAidaAvailability;
      this.requestUpdate();
    }
  }
  #onManageInSettingsTooltipClick() {
    this.#viewOutput.hideTooltip?.();
    void UI4.ViewManager.ViewManager.instance().showView("chrome-ai");
  }
  performUpdate() {
    this.#view({
      disclaimerTooltipId: this.#disclaimerTooltipId,
      spinnerTooltipId: this.#spinnerTooltipId,
      noLogging: this.#noLogging,
      aidaAvailability: this.#aidaAvailability,
      onManageInSettingsTooltipClick: this.#onManageInSettingsTooltipClick.bind(this)
    }, this.#viewOutput, this.contentElement);
  }
  wasShown() {
    super.wasShown();
    Host3.AidaClient.HostConfigTracker.instance().addEventListener("aidaAvailabilityChanged", this.#boundOnAidaAvailabilityChange);
    void this.#onAidaAvailabilityChange();
  }
  willHide() {
    super.willHide();
    Host3.AidaClient.HostConfigTracker.instance().removeEventListener("aidaAvailabilityChanged", this.#boundOnAidaAvailabilityChange);
  }
};

// gen/front_end/panels/common/AiCodeCompletionSummaryToolbar.js
import "./../../ui/components/spinners/spinners.js";
import "./../../ui/components/tooltips/tooltips.js";
import * as Host4 from "./../../core/host/host.js";
import * as i18n9 from "./../../core/i18n/i18n.js";
import * as UI5 from "./../../ui/legacy/legacy.js";
import { Directives as Directives2, html as html5, nothing as nothing3, render as render5 } from "./../../ui/lit/lit.js";
import * as VisualLogging3 from "./../../ui/visual_logging/visual_logging.js";

// gen/front_end/panels/common/aiCodeCompletionSummaryToolbar.css.js
var aiCodeCompletionSummaryToolbar_css_default = `/*
 * Copyright 2025 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

@scope to (devtools-widget > *) {
  .ai-code-completion-summary-toolbar {
    display: flex;
    height: 26px;
    background-color: var(--sys-color-cdt-base-container);
    padding: var(--sys-size-2) var(--sys-size-5);
    align-items: center;
    gap: var(--sys-size-5);
    flex-shrink: 0;
    color: var(--sys-color-on-surface-subtle);

    &:not(.has-top-border) {
      border-top: var(--sys-size-1) solid var(--sys-color-divider);
    }

    devtools-widget.disclaimer-widget {
      flex: none;
    }

    span.link {
      color: var(--sys-color-on-surface-subtle);
      /* Inside the code mirror editor, the cursor and text-decoration styling need to be provided explicitly */
      cursor: pointer;
      text-decoration: underline;

      &:focus-visible {
        outline: var(--sys-size-2) solid var(--sys-color-state-focus-ring);
        outline-offset: 0;
        border-radius: var(--sys-shape-corner-extra-small);
      }
    }

    .ai-code-completion-recitation-notice {
      white-space: nowrap;

      span.link {
        padding-left: var(--sys-size-3);
      }
    }

    &.has-disclaimer .ai-code-completion-recitation-notice {
      padding-left: var(--sys-size-5);
      border-left: var(--sys-size-1) solid var(--sys-color-divider);
    }

    @media (width < 545px) {
      &.has-disclaimer.has-recitation-notice {
        height: 46px;
        flex-direction: column;
        align-items: flex-start;

        .ai-code-completion-disclaimer {
          height: 26px;
          margin-bottom: -3px;
          margin-top: var(--sys-size-2);
          flex-shrink: 1;
        }

        .ai-code-completion-recitation-notice {
          height: 26px;
          padding-left: 0;
          border-left: 0;
          margin-top: -3px;
        }
      }
    }

    devtools-tooltip:popover-open {
        display: flex;
        flex-direction: column;
        align-items: center;

        .citations-tooltip-container {
            display: inline-flex;
            padding: var(--sys-size-4) var(--sys-size-5);
            flex-direction: column;
            align-items: flex-start;
            justify-content: center;
            gap: var(--sys-size-2);
            white-space: normal;

            x-link {
                color: var(--sys-color-primary);
                text-decoration: underline;

              &:focus-visible {
                outline: var(--sys-size-2) solid var(--sys-color-state-focus-ring);
                outline-offset: 0;
                border-radius: var(--sys-shape-corner-extra-small);
              }
          }
      }
    }
  }
}

/*# sourceURL=${import.meta.resolve("./aiCodeCompletionSummaryToolbar.css")} */`;

// gen/front_end/panels/common/AiCodeCompletionSummaryToolbar.js
var UIStringsNotTranslate3 = {
  /**
   * @description Text for recitation notice
   */
  generatedCodeMayBeSubjectToALicense: "Generated code may be subject to a license.",
  /**
   * @description Text for citations
   */
  viewSources: "View Sources"
};
var lockedString3 = i18n9.i18n.lockedString;
var DEFAULT_SUMMARY_TOOLBAR_VIEW2 = (input, _output, target) => {
  if (input.aidaAvailability !== "available") {
    render5(nothing3, target);
    return;
  }
  const toolbarClasses = Directives2.classMap({
    "ai-code-completion-summary-toolbar": true,
    "has-disclaimer": Boolean(input.disclaimerTooltipId),
    "has-recitation-notice": Boolean(input.citations && input.citations.size > 0),
    "has-top-border": input.hasTopBorder
  });
  const disclaimer = input.disclaimerTooltipId && input.spinnerTooltipId ? html5`<devtools-widget
            .widgetConfig=${UI5.Widget.widgetConfig(AiCodeCompletionDisclaimer, {
    disclaimerTooltipId: input.disclaimerTooltipId,
    spinnerTooltipId: input.spinnerTooltipId,
    loading: input.loading
  })} class="disclaimer-widget"></devtools-widget>` : nothing3;
  const recitationNotice = input.citations && input.citations.size > 0 ? html5`<div class="ai-code-completion-recitation-notice">
                ${lockedString3(UIStringsNotTranslate3.generatedCodeMayBeSubjectToALicense)}
                <span class="link"
                    role="link"
                    aria-details=${input.citationsTooltipId}
                    aria-describedby=${input.citationsTooltipId}
                    tabIndex="0">
                  ${lockedString3(UIStringsNotTranslate3.viewSources)}&nbsp;${lockedString3("(" + input.citations.size + ")")}
                </span>
                <devtools-tooltip
                    id=${input.citationsTooltipId}
                    variant="rich"
                    jslogContext="ai-code-completion-citations"
                ><div class="citations-tooltip-container">
                    ${Directives2.repeat(input.citations, (citation) => html5`<x-link
                        tabIndex="0"
                        href=${citation}
                        jslog=${VisualLogging3.link("ai-code-completion-citations.citation-link").track({
    click: true
  })}>${citation}</x-link>`)}</div></devtools-tooltip>
            </div>` : nothing3;
  render5(html5`
        <style>${aiCodeCompletionSummaryToolbar_css_default}</style>
        <div class=${toolbarClasses}>
          ${disclaimer}
          ${recitationNotice}
        </div>
        `, target);
};
var AiCodeCompletionSummaryToolbar = class extends UI5.Widget.Widget {
  #view;
  #disclaimerTooltipId;
  #spinnerTooltipId;
  #citationsTooltipId;
  #citations = /* @__PURE__ */ new Set();
  #loading = false;
  #hasTopBorder = false;
  #aidaAvailability;
  #boundOnAidaAvailabilityChange;
  constructor(props, view) {
    super();
    this.#disclaimerTooltipId = props.disclaimerTooltipId;
    this.#spinnerTooltipId = props.spinnerTooltipId;
    this.#citationsTooltipId = props.citationsTooltipId;
    this.#hasTopBorder = props.hasTopBorder ?? false;
    this.#boundOnAidaAvailabilityChange = this.#onAidaAvailabilityChange.bind(this);
    this.#view = view ?? DEFAULT_SUMMARY_TOOLBAR_VIEW2;
    this.requestUpdate();
  }
  async #onAidaAvailabilityChange() {
    const currentAidaAvailability = await Host4.AidaClient.AidaClient.checkAccessPreconditions();
    if (currentAidaAvailability !== this.#aidaAvailability) {
      this.#aidaAvailability = currentAidaAvailability;
      this.requestUpdate();
    }
  }
  setLoading(loading) {
    this.#loading = loading;
    this.requestUpdate();
  }
  updateCitations(citations) {
    citations.forEach((citation) => this.#citations.add(citation));
    this.requestUpdate();
  }
  clearCitations() {
    this.#citations.clear();
    this.requestUpdate();
  }
  performUpdate() {
    this.#view({
      disclaimerTooltipId: this.#disclaimerTooltipId,
      spinnerTooltipId: this.#spinnerTooltipId,
      citations: this.#citations,
      citationsTooltipId: this.#citationsTooltipId,
      loading: this.#loading,
      hasTopBorder: this.#hasTopBorder,
      aidaAvailability: this.#aidaAvailability
    }, void 0, this.contentElement);
  }
  wasShown() {
    super.wasShown();
    Host4.AidaClient.HostConfigTracker.instance().addEventListener("aidaAvailabilityChanged", this.#boundOnAidaAvailabilityChange);
    void this.#onAidaAvailabilityChange();
  }
  willHide() {
    super.willHide();
    Host4.AidaClient.HostConfigTracker.instance().removeEventListener("aidaAvailabilityChanged", this.#boundOnAidaAvailabilityChange);
  }
};

// gen/front_end/panels/common/BadgeNotification.js
import * as Common3 from "./../../core/common/common.js";
import * as Host5 from "./../../core/host/host.js";
import * as i18n11 from "./../../core/i18n/i18n.js";
import * as Badges2 from "./../../models/badges/badges.js";
import * as Buttons3 from "./../../ui/components/buttons/buttons.js";
import * as uiI18n2 from "./../../ui/i18n/i18n.js";
import * as UI6 from "./../../ui/legacy/legacy.js";
import * as Lit2 from "./../../ui/lit/lit.js";
import * as VisualLogging4 from "./../../ui/visual_logging/visual_logging.js";

// gen/front_end/panels/common/badgeNotification.css.js
var badgeNotification_css_default = `/*
 * Copyright 2025 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

@scope to (devtools-widget > *) {
  :scope {
    position: fixed;
    z-index: 9999;
    /* subtract var(--sys-size-5) * 2 so that there is equal space on the left and on the right in small screens */
    max-width: calc(100% - 2 * var(--sys-size-5));
  }

  .container {
    display: flex;
    align-items: center;
    overflow: hidden;
    width: 485px;
    background: var(--sys-color-inverse-surface);
    box-shadow: var(--sys-elevation-level3);
    border-radius: var(--sys-shape-corner-small);
    font: var(--sys-typescale-body4-regular);
    animation: slideIn 100ms cubic-bezier(0, 0, 0.3, 1);
    box-sizing: border-box;
    max-width: 100%;
    padding: var(--sys-size-5) var(--sys-size-6) var(--sys-size-6) var(--sys-size-6);
  }

  .action-and-text-container {
    display: flex;
    flex-direction: column;
    gap: var(--sys-size-3);
  }

  .long-action-container {
    margin-left: auto;
    /*
    * Buttons have a 24px total height, which includes padding for the hover area.
    * We apply a -3px vertical margin to compensate for this extra space.
    * This ensures the component aligns based on the visual text height,
    * not the full clickable bounding box.
    */
    margin-block: -3px;
  }

  .label-container {
    display: flex;
    width: 100%;
    align-items: center;
    padding-block: var(--sys-size-3);
    line-height: 18px;
  }

  .badge-container {
    margin-right: 10px;
    min-width: 64px;
    height: 64px;
  }

  .badge-image {
    width: 100%;
    height: 100%;
    border-radius: var(--sys-shape-corner-full);
  }

  .badge-link {
    color: var(--sys-color-inverse-primary);
  }

  .message {
    width: 100%;
    color: var(--sys-color-inverse-on-surface);
    flex: 1 0 0;
    text-wrap: pretty;
    user-select: text;
  }

  devtools-button.dismiss {
    padding: 3px;
  }
}

@keyframes slideIn {
  from {
    transform: translateY(var(--sys-size-5));
    opacity: 0%;
  }

  to {
    opacity: 100%;
  }
}

/*# sourceURL=${import.meta.resolve("./badgeNotification.css")} */`;

// gen/front_end/panels/common/BadgeNotification.js
var { html: html6, render: render6 } = Lit2;
var UIStrings3 = {
  /**
   * @description Title for close button
   */
  close: "Close",
  /**
   * @description Activity based badge award notification text
   * @example {Badge Title} PH1
   */
  activityBasedBadgeAwardMessage: "You earned the {PH1} badge! It\u2019s been added to your Developer Profile.",
  /**
   * @description Action title for navigating to the badge settings in Google Developer Profile section
   */
  manageSettings: "Manage settings",
  /**
   * @description Action title for opening the Google Developer Program profile page of the user in a new tab
   */
  viewProfile: "View profile",
  /**
   * @description Starter badge award notification text when the user has a Google Developer Program profile but did not enable receiving badges in DevTools yet
   * @example {Badge Title} PH1
   * @example {Google Developer Program link} PH2
   */
  starterBadgeAwardMessageSettingDisabled: "You earned the {PH1} badge for the {PH2}! Turn on badges to claim it.",
  /**
   * @description Starter badge award notification text when the user does not have a Google Developer Program profile.
   * @example {Badge Title} PH1
   * @example {Google Developer Program link} PH2
   */
  starterBadgeAwardMessageNoGdpProfile: "You earned the {PH1} badge for the {PH2}! Create a profile to claim your badge.",
  /**
   * @description Action title for snoozing the starter badge.
   */
  remindMeLater: "Remind me later",
  /**
   * @description Action title for enabling the "Receive badges" setting
   */
  receiveBadges: "Turn on badges",
  /**
   * @description Action title for creating a Google Developer Program profle
   */
  createProfile: "Create profile"
};
var str_3 = i18n11.i18n.registerUIStrings("panels/common/BadgeNotification.ts", UIStrings3);
var i18nString3 = i18n11.i18n.getLocalizedString.bind(void 0, str_3);
var i18nFormatString = uiI18n2.getFormatLocalizedString.bind(void 0, str_3);
var lockedString4 = i18n11.i18n.lockedString;
var LEFT_OFFSET = 5;
var BOTTOM_OFFSET = 5;
var AUTO_CLOSE_TIME_IN_MS = 3e4;
var DEFAULT_VIEW3 = (input, _output, target) => {
  const actionButtons = input.actions.map((property) => {
    return html6`<devtools-button
        class="notification-button"
        @click=${() => property.onClick()}
        jslog=${VisualLogging4.action(property.jslogContext).track({ click: true })}
        .variant=${"text"}
        .title=${property.title ?? ""}
        .inverseColorTheme=${true}
    >${property.label}</devtools-button>`;
  });
  const crossButton = html6`<devtools-button
        class="dismiss notification-button"
        @click=${input.onDismissClick}
        jslog=${VisualLogging4.action("badge-notification.dismiss").track({ click: true })}
        aria-label=${i18nString3(UIStrings3.close)}
        .iconName=${"cross"}
        .variant=${"icon"}
        .title=${i18nString3(UIStrings3.close)}
        .inverseColorTheme=${true}
    ></devtools-button>`;
  render6(html6`
    <style>${badgeNotification_css_default}</style>
    <div class="container" jslog=${VisualLogging4.dialog("badge-notification")}>
      <div class="badge-container" jslog=${VisualLogging4.item(input.jslogContext)}>
        <img class="badge-image" role="presentation" src=${input.imageUri}>
      </div>
      <div class="action-and-text-container">
        <div class="label-container">
            <div class="message">${input.message}</div>
            ${crossButton}
        </div>
        <div class="long-action-container">${actionButtons}</div>
      </div>
    </div>
  `, target);
};
function revealBadgeSettings() {
  void Common3.Revealer.reveal(Common3.Settings.moduleSetting("receive-gdp-badges"));
}
var BadgeNotification = class extends UI6.Widget.Widget {
  jslogContext = "";
  message = "";
  imageUri = "";
  actions = [];
  isStarterBadge = false;
  #autoCloseTimeout;
  #view;
  constructor(element, view = DEFAULT_VIEW3) {
    super(element);
    this.#view = view;
    this.contentElement.role = "alert";
    this.markAsRoot();
  }
  async present(badge) {
    if (badge.isStarterBadge) {
      await this.#presentStarterBadge(badge);
    } else {
      this.#presentActivityBasedBadge(badge);
    }
  }
  #positionNotification() {
    const boundingRect = this.contentElement.getBoundingClientRect();
    const container = UI6.UIUtils.getDevToolsBoundingElement();
    this.contentElement.positionAt(LEFT_OFFSET, container.clientHeight - boundingRect.height - BOTTOM_OFFSET, container);
  }
  #show(properties) {
    this.message = properties.message;
    this.imageUri = properties.imageUri;
    this.actions = properties.actions;
    this.isStarterBadge = properties.isStarterBadge;
    this.jslogContext = properties.jslogContext;
    this.requestUpdate();
    this.show(document.body);
    void this.updateComplete.then(() => {
      this.#positionNotification();
    });
    if (this.#autoCloseTimeout) {
      window.clearTimeout(this.#autoCloseTimeout);
    }
    this.#autoCloseTimeout = window.setTimeout(this.#onAutoClose, AUTO_CLOSE_TIME_IN_MS);
  }
  async #presentStarterBadge(badge) {
    const getProfileResponse = await Host5.GdpClient.GdpClient.instance().getProfile();
    if (!getProfileResponse) {
      return;
    }
    const hasGdpProfile = Boolean(getProfileResponse.profile);
    const receiveBadgesSettingEnabled = Badges2.UserBadges.instance().isReceiveBadgesSettingEnabled();
    const googleDeveloperProgramLink = UI6.XLink.XLink.create("https://developers.google.com/program", lockedString4("Google Developer Program"), "badge-link", void 0, "program-link");
    if (hasGdpProfile && receiveBadgesSettingEnabled) {
      this.#presentActivityBasedBadge(badge);
      return;
    }
    if (hasGdpProfile && !receiveBadgesSettingEnabled) {
      this.#show({
        message: i18nFormatString(UIStrings3.starterBadgeAwardMessageSettingDisabled, { PH1: badge.title, PH2: googleDeveloperProgramLink }),
        jslogContext: badge.jslogContext,
        actions: [
          {
            label: i18nString3(UIStrings3.remindMeLater),
            jslogContext: "remind-me-later",
            onClick: () => {
              this.detach();
              Badges2.UserBadges.instance().snoozeStarterBadge();
            }
          },
          {
            label: i18nString3(UIStrings3.receiveBadges),
            jslogContext: "receive-badges",
            onClick: () => {
              this.detach();
              revealBadgeSettings();
            }
          }
        ],
        imageUri: badge.imageUri,
        isStarterBadge: true
      });
      return;
    }
    this.#show({
      message: i18nFormatString(UIStrings3.starterBadgeAwardMessageNoGdpProfile, { PH1: badge.title, PH2: googleDeveloperProgramLink }),
      jslogContext: badge.jslogContext,
      actions: [
        {
          label: i18nString3(UIStrings3.remindMeLater),
          jslogContext: "remind-me-later",
          onClick: () => {
            this.detach();
            Badges2.UserBadges.instance().snoozeStarterBadge();
          }
        },
        {
          label: i18nString3(UIStrings3.createProfile),
          jslogContext: "create-profile",
          onClick: () => {
            this.detach();
            GdpSignUpDialog.show({
              // We want to consider cancelling from the starter badge as a "snooze" for starter badge.
              onCancel: () => Badges2.UserBadges.instance().snoozeStarterBadge()
            });
          }
        }
      ],
      imageUri: badge.imageUri,
      isStarterBadge: true
    });
  }
  #presentActivityBasedBadge(badge) {
    this.#show({
      message: i18nString3(UIStrings3.activityBasedBadgeAwardMessage, { PH1: badge.title }),
      jslogContext: badge.jslogContext,
      actions: [
        {
          label: i18nString3(UIStrings3.manageSettings),
          jslogContext: "manage-settings",
          onClick: () => {
            this.detach();
            revealBadgeSettings();
          }
        },
        {
          label: i18nString3(UIStrings3.viewProfile),
          jslogContext: "view-profile",
          onClick: () => {
            UI6.UIUtils.openInNewTab(Host5.GdpClient.GOOGLE_DEVELOPER_PROGRAM_PROFILE_LINK);
          }
        }
      ],
      imageUri: badge.imageUri,
      isStarterBadge: badge.isStarterBadge
    });
  }
  onDetach() {
    window.clearTimeout(this.#autoCloseTimeout);
  }
  #onDismissClick = () => {
    this.detach();
    if (this.isStarterBadge) {
      Badges2.UserBadges.instance().dismissStarterBadge();
    }
  };
  #onAutoClose = () => {
    this.detach();
    if (this.isStarterBadge) {
      Badges2.UserBadges.instance().snoozeStarterBadge();
    }
  };
  wasShown() {
    super.wasShown();
    this.requestUpdate();
  }
  performUpdate() {
    const viewInput = {
      message: this.message,
      imageUri: this.imageUri,
      actions: this.actions,
      isStarterBadge: this.isStarterBadge,
      onDismissClick: this.#onDismissClick,
      jslogContext: this.jslogContext
    };
    this.#view(viewInput, void 0, this.contentElement);
  }
};

// gen/front_end/panels/common/ExtensionPanel.js
var ExtensionPanel_exports = {};
__export(ExtensionPanel_exports, {
  ExtensionButton: () => ExtensionButton,
  ExtensionPanel: () => ExtensionPanel,
  ExtensionSidebarPane: () => ExtensionSidebarPane
});
import * as Platform2 from "./../../core/platform/platform.js";
import * as SDK from "./../../core/sdk/sdk.js";
import * as Extensions from "./../../models/extensions/extensions.js";
import * as UI8 from "./../../ui/legacy/legacy.js";

// gen/front_end/panels/common/ExtensionView.js
var ExtensionView_exports = {};
__export(ExtensionView_exports, {
  ExtensionNotifierView: () => ExtensionNotifierView,
  ExtensionView: () => ExtensionView
});
import * as UI7 from "./../../ui/legacy/legacy.js";
import * as Lit3 from "./../../ui/lit/lit.js";
var { render: render7, html: html7, Directives: { ref } } = Lit3;
var DEFAULT_VIEW4 = (input, output, target) => {
  render7(html7`<iframe
    ${ref((element) => {
    output.iframe = element;
  })}
    src=${input.src}
    class=${input.className}
    @load=${input.onLoad}></iframe>`, target);
};
var ExtensionView = class extends UI7.Widget.Widget {
  #server;
  #id;
  #src;
  #className;
  #iframe;
  #frameIndex;
  #view;
  constructor(server, id, src, className, view = DEFAULT_VIEW4) {
    super();
    this.#view = view;
    this.#server = server;
    this.#src = src;
    this.#className = className;
    this.#id = id;
    this.setHideOnDetach();
    void this.performUpdate();
  }
  performUpdate() {
    const output = {};
    this.#view({
      src: this.#src,
      className: this.#className,
      onLoad: this.onLoad.bind(this)
    }, output, this.element);
    if (output.iframe) {
      this.#iframe = output.iframe;
    }
  }
  wasShown() {
    super.wasShown();
    if (typeof this.#frameIndex === "number") {
      this.#server.notifyViewShown(this.#id, this.#frameIndex);
    }
  }
  willHide() {
    super.willHide();
    if (typeof this.#frameIndex === "number") {
      this.#server.notifyViewHidden(this.#id);
    }
  }
  onLoad() {
    if (!this.#iframe) {
      return;
    }
    const frames = window.frames;
    this.#frameIndex = Array.prototype.indexOf.call(frames, this.#iframe.contentWindow);
    if (this.isShowing()) {
      this.#server.notifyViewShown(this.#id, this.#frameIndex);
    }
  }
};
var ExtensionNotifierView = class extends UI7.Widget.VBox {
  server;
  id;
  constructor(server, id) {
    super();
    this.server = server;
    this.id = id;
  }
  wasShown() {
    super.wasShown();
    this.server.notifyViewShown(this.id);
  }
  willHide() {
    super.willHide();
    this.server.notifyViewHidden(this.id);
  }
};

// gen/front_end/panels/common/ExtensionPanel.js
var ExtensionPanel = class extends UI8.Panel.Panel {
  server;
  id;
  panelToolbar;
  #searchableView;
  constructor(server, panelName, id, pageURL) {
    super(panelName);
    this.server = server;
    this.id = id;
    this.setHideOnDetach();
    this.panelToolbar = this.element.createChild("devtools-toolbar", "hidden");
    this.#searchableView = new UI8.SearchableView.SearchableView(this, null);
    this.#searchableView.show(this.element);
    const extensionView = new ExtensionView(server, this.id, pageURL, "extension");
    extensionView.show(this.#searchableView.element);
  }
  addToolbarItem(item2) {
    this.panelToolbar.classList.remove("hidden");
    this.panelToolbar.appendToolbarItem(item2);
  }
  onSearchCanceled() {
    this.server.notifySearchAction(
      this.id,
      "cancelSearch"
      /* Extensions.ExtensionAPI.PrivateAPI.Panels.SearchAction.CancelSearch */
    );
    this.#searchableView.updateSearchMatchesCount(0);
  }
  searchableView() {
    return this.#searchableView;
  }
  performSearch(searchConfig, _shouldJump, _jumpBackwards) {
    const query = searchConfig.query;
    this.server.notifySearchAction(this.id, "performSearch", query);
  }
  jumpToNextSearchResult() {
    this.server.notifySearchAction(
      this.id,
      "nextSearchResult"
      /* Extensions.ExtensionAPI.PrivateAPI.Panels.SearchAction.NextSearchResult */
    );
  }
  jumpToPreviousSearchResult() {
    this.server.notifySearchAction(
      this.id,
      "previousSearchResult"
      /* Extensions.ExtensionAPI.PrivateAPI.Panels.SearchAction.PreviousSearchResult */
    );
  }
  supportsCaseSensitiveSearch() {
    return false;
  }
  supportsWholeWordSearch() {
    return false;
  }
  supportsRegexSearch() {
    return false;
  }
};
var ExtensionButton = class {
  id;
  #toolbarButton;
  constructor(server, id, iconURL, tooltip, disabled) {
    this.id = id;
    this.#toolbarButton = new UI8.Toolbar.ToolbarButton("", "");
    this.#toolbarButton.addEventListener("Click", server.notifyButtonClicked.bind(server, this.id));
    this.update(iconURL, tooltip, disabled);
  }
  update(iconURL, tooltip, disabled) {
    if (typeof iconURL === "string") {
      this.#toolbarButton.setBackgroundImage(iconURL);
    }
    if (typeof tooltip === "string") {
      this.#toolbarButton.setTitle(tooltip);
    }
    if (typeof disabled === "boolean") {
      this.#toolbarButton.setEnabled(!disabled);
    }
  }
  toolbarButton() {
    return this.#toolbarButton;
  }
};
var ExtensionSidebarPane = class extends UI8.View.SimpleView {
  #panelName;
  server;
  #id;
  extensionView;
  objectPropertiesView;
  constructor(server, panelName, title, id) {
    const viewId = Platform2.StringUtilities.toKebabCase(title);
    super({ title, viewId });
    this.element.classList.add("fill");
    this.#panelName = panelName;
    this.server = server;
    this.#id = id;
  }
  id() {
    return this.#id;
  }
  panelName() {
    return this.#panelName;
  }
  setObject(object, title, callback) {
    this.createObjectPropertiesView();
    this.#setObject(SDK.RemoteObject.RemoteObject.fromLocalObject(object), title, callback);
  }
  setExpression(expression, title, evaluateOptions, securityOrigin, callback) {
    this.createObjectPropertiesView();
    this.server.evaluate(expression, true, false, evaluateOptions, securityOrigin, this.onEvaluate.bind(this, title, callback));
  }
  setPage(url) {
    if (this.objectPropertiesView) {
      this.objectPropertiesView.detach();
      delete this.objectPropertiesView;
    }
    if (this.extensionView) {
      this.extensionView.detach(true);
    }
    this.extensionView = new ExtensionView(this.server, this.#id, url, "extension fill");
    this.extensionView.show(this.element);
    if (!this.element.style.height) {
      this.setHeight("150px");
    }
  }
  setHeight(height) {
    this.element.style.height = height;
  }
  onEvaluate(title, callback, error, result, _wasThrown) {
    if (error) {
      callback(error.toString());
    } else if (!result) {
      callback();
    } else {
      this.#setObject(result, title, callback);
    }
  }
  createObjectPropertiesView() {
    if (this.objectPropertiesView) {
      return;
    }
    if (this.extensionView) {
      this.extensionView.detach(true);
      delete this.extensionView;
    }
    this.objectPropertiesView = new ExtensionNotifierView(this.server, this.#id);
    this.objectPropertiesView.show(this.element);
  }
  #setObject(object, title, callback) {
    const objectPropertiesView = this.objectPropertiesView;
    if (!objectPropertiesView) {
      callback("operation cancelled");
      return;
    }
    objectPropertiesView.element.removeChildren();
    void UI8.UIUtils.Renderer.render(object, { title, editable: false, expand: true }).then((result) => {
      if (!result) {
        callback();
        return;
      }
      objectPropertiesView.element.appendChild(result.element);
      callback();
    });
  }
};

// gen/front_end/panels/common/ExtensionServer.js
var ExtensionServer_exports = {};
__export(ExtensionServer_exports, {
  ExtensionServer: () => ExtensionServer,
  ExtensionStatus: () => ExtensionStatus,
  HostsPolicy: () => HostsPolicy,
  RevealableNetworkRequestFilter: () => RevealableNetworkRequestFilter
});
import * as Common4 from "./../../core/common/common.js";
import * as Host6 from "./../../core/host/host.js";
import * as i18n13 from "./../../core/i18n/i18n.js";
import * as Platform3 from "./../../core/platform/platform.js";
import * as SDK2 from "./../../core/sdk/sdk.js";
import * as Bindings from "./../../models/bindings/bindings.js";
import * as Extensions2 from "./../../models/extensions/extensions.js";
import * as HAR from "./../../models/har/har.js";
import * as Logs from "./../../models/logs/logs.js";
import * as TextUtils from "./../../models/text_utils/text_utils.js";
import * as Workspace from "./../../models/workspace/workspace.js";
import * as Components from "./../../ui/legacy/components/utils/utils.js";
import * as UI9 from "./../../ui/legacy/legacy.js";
import * as ThemeSupport from "./../../ui/legacy/theme_support/theme_support.js";
var extensionOrigins = /* @__PURE__ */ new WeakMap();
var kPermittedSchemes = ["http:", "https:", "file:", "data:", "chrome-extension:", "about:"];
var extensionServerInstance;
var HostsPolicy = class _HostsPolicy {
  runtimeAllowedHosts;
  runtimeBlockedHosts;
  static create(policy) {
    const runtimeAllowedHosts = [];
    const runtimeBlockedHosts = [];
    if (policy) {
      for (const pattern of policy.runtimeAllowedHosts) {
        const parsedPattern = Extensions2.HostUrlPattern.HostUrlPattern.parse(pattern);
        if (!parsedPattern) {
          return null;
        }
        runtimeAllowedHosts.push(parsedPattern);
      }
      for (const pattern of policy.runtimeBlockedHosts) {
        const parsedPattern = Extensions2.HostUrlPattern.HostUrlPattern.parse(pattern);
        if (!parsedPattern) {
          return null;
        }
        runtimeBlockedHosts.push(parsedPattern);
      }
    }
    return new _HostsPolicy(runtimeAllowedHosts, runtimeBlockedHosts);
  }
  constructor(runtimeAllowedHosts, runtimeBlockedHosts) {
    this.runtimeAllowedHosts = runtimeAllowedHosts;
    this.runtimeBlockedHosts = runtimeBlockedHosts;
  }
  isAllowedOnURL(inspectedURL) {
    if (!inspectedURL) {
      return this.runtimeBlockedHosts.length === 0;
    }
    if (this.runtimeBlockedHosts.some((pattern) => pattern.matchesUrl(inspectedURL)) && !this.runtimeAllowedHosts.some((pattern) => pattern.matchesUrl(inspectedURL))) {
      return false;
    }
    return true;
  }
};
var RegisteredExtension = class {
  name;
  hostsPolicy;
  allowFileAccess;
  openResourceScheme = null;
  constructor(name, hostsPolicy, allowFileAccess) {
    this.name = name;
    this.hostsPolicy = hostsPolicy;
    this.allowFileAccess = allowFileAccess;
  }
  isAllowedOnTarget(inspectedURL) {
    if (!inspectedURL) {
      inspectedURL = SDK2.TargetManager.TargetManager.instance().primaryPageTarget()?.inspectedURL();
    }
    if (!inspectedURL) {
      return false;
    }
    if (this.openResourceScheme && inspectedURL.startsWith(this.openResourceScheme)) {
      return true;
    }
    if (!ExtensionServer.canInspectURL(inspectedURL)) {
      return false;
    }
    if (!this.hostsPolicy.isAllowedOnURL(inspectedURL)) {
      return false;
    }
    if (!this.allowFileAccess) {
      let parsedURL;
      try {
        parsedURL = new URL(inspectedURL);
      } catch {
        return false;
      }
      return parsedURL.protocol !== "file:";
    }
    return true;
  }
};
var RevealableNetworkRequestFilter = class {
  filter;
  constructor(filter) {
    this.filter = filter;
  }
};
var ExtensionServer = class _ExtensionServer extends Common4.ObjectWrapper.ObjectWrapper {
  clientObjects;
  handlers;
  subscribers;
  subscriptionStartHandlers;
  subscriptionStopHandlers;
  extraHeaders;
  requests;
  requestIds;
  lastRequestId;
  registeredExtensions;
  status;
  #sidebarPanes;
  extensionsEnabled;
  inspectedTabId;
  extensionAPITestHook;
  themeChangeHandlers = /* @__PURE__ */ new Map();
  #pendingExtensions = [];
  constructor() {
    super();
    this.clientObjects = /* @__PURE__ */ new Map();
    this.handlers = /* @__PURE__ */ new Map();
    this.subscribers = /* @__PURE__ */ new Map();
    this.subscriptionStartHandlers = /* @__PURE__ */ new Map();
    this.subscriptionStopHandlers = /* @__PURE__ */ new Map();
    this.extraHeaders = /* @__PURE__ */ new Map();
    this.requests = /* @__PURE__ */ new Map();
    this.requestIds = /* @__PURE__ */ new Map();
    this.lastRequestId = 0;
    this.registeredExtensions = /* @__PURE__ */ new Map();
    this.status = new ExtensionStatus();
    this.#sidebarPanes = [];
    this.extensionsEnabled = true;
    this.registerHandler("addRequestHeaders", this.onAddRequestHeaders.bind(this));
    this.registerHandler("createPanel", this.onCreatePanel.bind(this));
    this.registerHandler("createSidebarPane", this.onCreateSidebarPane.bind(this));
    this.registerHandler("createToolbarButton", this.onCreateToolbarButton.bind(this));
    this.registerHandler("evaluateOnInspectedPage", this.onEvaluateOnInspectedPage.bind(this));
    this.registerHandler("_forwardKeyboardEvent", this.onForwardKeyboardEvent.bind(this));
    this.registerHandler("getHAR", this.onGetHAR.bind(this));
    this.registerHandler("getPageResources", this.onGetPageResources.bind(this));
    this.registerHandler("getRequestContent", this.onGetRequestContent.bind(this));
    this.registerHandler("getResourceContent", this.onGetResourceContent.bind(this));
    this.registerHandler("Reload", this.onReload.bind(this));
    this.registerHandler("setOpenResourceHandler", this.onSetOpenResourceHandler.bind(this));
    this.registerHandler("setThemeChangeHandler", this.onSetThemeChangeHandler.bind(this));
    this.registerHandler("setResourceContent", this.onSetResourceContent.bind(this));
    this.registerHandler("attachSourceMapToResource", this.onAttachSourceMapToResource.bind(this));
    this.registerHandler("setSidebarHeight", this.onSetSidebarHeight.bind(this));
    this.registerHandler("setSidebarContent", this.onSetSidebarContent.bind(this));
    this.registerHandler("setSidebarPage", this.onSetSidebarPage.bind(this));
    this.registerHandler("showPanel", this.onShowPanel.bind(this));
    this.registerHandler("subscribe", this.onSubscribe.bind(this));
    this.registerHandler("openResource", this.onOpenResource.bind(this));
    this.registerHandler("unsubscribe", this.onUnsubscribe.bind(this));
    this.registerHandler("updateButton", this.onUpdateButton.bind(this));
    this.registerHandler("registerLanguageExtensionPlugin", this.registerLanguageExtensionEndpoint.bind(this));
    this.registerHandler("getWasmLinearMemory", this.onGetWasmLinearMemory.bind(this));
    this.registerHandler("getWasmGlobal", this.onGetWasmGlobal.bind(this));
    this.registerHandler("getWasmLocal", this.onGetWasmLocal.bind(this));
    this.registerHandler("getWasmOp", this.onGetWasmOp.bind(this));
    this.registerHandler("registerRecorderExtensionPlugin", this.registerRecorderExtensionEndpoint.bind(this));
    this.registerHandler("reportResourceLoad", this.onReportResourceLoad.bind(this));
    this.registerHandler("setFunctionRangesForScript", this.onSetFunctionRangesForScript.bind(this));
    this.registerHandler("createRecorderView", this.onCreateRecorderView.bind(this));
    this.registerHandler("showRecorderView", this.onShowRecorderView.bind(this));
    this.registerHandler("showNetworkPanel", this.onShowNetworkPanel.bind(this));
    window.addEventListener("message", this.onWindowMessage, false);
    const existingTabId = window.DevToolsAPI?.getInspectedTabId?.();
    if (existingTabId) {
      this.setInspectedTabId({ data: existingTabId });
    }
    Host6.InspectorFrontendHost.InspectorFrontendHostInstance.events.addEventListener(Host6.InspectorFrontendHostAPI.Events.SetInspectedTabId, this.setInspectedTabId, this);
    this.initExtensions();
    ThemeSupport.ThemeSupport.instance().addEventListener(ThemeSupport.ThemeChangeEvent.eventName, this.#onThemeChange);
  }
  get isEnabledForTest() {
    return this.extensionsEnabled;
  }
  dispose() {
    ThemeSupport.ThemeSupport.instance().removeEventListener(ThemeSupport.ThemeChangeEvent.eventName, this.#onThemeChange);
    SDK2.TargetManager.TargetManager.instance().removeEventListener("InspectedURLChanged", this.inspectedURLChanged, this);
    Host6.InspectorFrontendHost.InspectorFrontendHostInstance.events.removeEventListener(Host6.InspectorFrontendHostAPI.Events.SetInspectedTabId, this.setInspectedTabId, this);
    window.removeEventListener("message", this.onWindowMessage, false);
  }
  #onThemeChange = () => {
    const themeName = ThemeSupport.ThemeSupport.instance().themeName();
    for (const port of this.themeChangeHandlers.values()) {
      port.postMessage({ command: "host-theme-change", themeName });
    }
  };
  static instance(opts = { forceNew: null }) {
    const { forceNew } = opts;
    if (!extensionServerInstance || forceNew) {
      extensionServerInstance?.dispose();
      extensionServerInstance = new _ExtensionServer();
    }
    return extensionServerInstance;
  }
  initializeExtensions() {
    if (this.inspectedTabId !== null) {
      Host6.InspectorFrontendHost.InspectorFrontendHostInstance.setAddExtensionCallback(this.addExtension.bind(this));
    }
  }
  hasExtensions() {
    return Boolean(this.registeredExtensions.size);
  }
  notifySearchAction(panelId, action3, searchString) {
    this.postNotification("panel-search-" + panelId, [action3, searchString]);
  }
  notifyViewShown(identifier, frameIndex) {
    this.postNotification("view-shown-" + identifier, [frameIndex]);
  }
  notifyViewHidden(identifier) {
    this.postNotification("view-hidden," + identifier, []);
  }
  notifyButtonClicked(identifier) {
    this.postNotification("button-clicked-" + identifier, []);
  }
  profilingStarted() {
    this.postNotification("profiling-started-", []);
  }
  profilingStopped() {
    this.postNotification("profiling-stopped-", []);
  }
  registerLanguageExtensionEndpoint(message, _shared_port) {
    if (message.command !== "registerLanguageExtensionPlugin") {
      return this.status.E_BADARG("command", `expected ${"registerLanguageExtensionPlugin"}`);
    }
    const { pluginManager } = Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance();
    const { pluginName, port, supportedScriptTypes: { language, symbol_types } } = message;
    const symbol_types_array = Array.isArray(symbol_types) && symbol_types.every((e) => typeof e === "string") ? symbol_types : [];
    const extensionOrigin = this.getExtensionOrigin(_shared_port);
    const registration = this.registeredExtensions.get(extensionOrigin);
    if (!registration) {
      throw new Error("Received a message from an unregistered extension");
    }
    const endpoint = new Extensions2.LanguageExtensionEndpoint.LanguageExtensionEndpoint(registration.allowFileAccess, extensionOrigin, pluginName, { language, symbol_types: symbol_types_array }, port);
    pluginManager.addPlugin(endpoint);
    return this.status.OK();
  }
  async loadWasmValue(expectValue, convert, expression, stopId) {
    const { pluginManager } = Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance();
    const callFrame = pluginManager.callFrameForStopId(stopId);
    if (!callFrame) {
      return this.status.E_BADARG("stopId", "Unknown stop id");
    }
    const result = await callFrame.debuggerModel.agent.invoke_evaluateOnCallFrame({
      callFrameId: callFrame.id,
      expression,
      silent: true,
      returnByValue: !expectValue,
      generatePreview: expectValue,
      throwOnSideEffect: true
    });
    if (!result.exceptionDetails && !result.getError()) {
      return convert(result.result);
    }
    return this.status.E_FAILED("Failed");
  }
  async onGetWasmLinearMemory(message) {
    if (message.command !== "getWasmLinearMemory") {
      return this.status.E_BADARG("command", `expected ${"getWasmLinearMemory"}`);
    }
    return await this.loadWasmValue(false, (result) => result.value, `[].slice.call(new Uint8Array(memories[0].buffer, ${Number(message.offset)}, ${Number(message.length)}))`, message.stopId);
  }
  convertWasmValue(valueClass, index) {
    return (obj) => {
      if (obj.type === "undefined") {
        return;
      }
      if (obj.type !== "object" || obj.subtype !== "wasmvalue") {
        return this.status.E_FAILED("Bad object type");
      }
      const type = obj?.description;
      const value = obj.preview?.properties?.find((o) => o.name === "value")?.value ?? "";
      switch (type) {
        case "i32":
        case "f32":
        case "f64":
          return { type, value: Number(value) };
        case "i64":
          return { type, value: BigInt(value.replace(/n$/, "")) };
        case "v128":
          return { type, value };
        default:
          return { type: "reftype", valueClass, index };
      }
    };
  }
  async onGetWasmGlobal(message) {
    if (message.command !== "getWasmGlobal") {
      return this.status.E_BADARG("command", `expected ${"getWasmGlobal"}`);
    }
    const global = Number(message.global);
    const result = await this.loadWasmValue(true, this.convertWasmValue("global", global), `globals[${global}]`, message.stopId);
    return result ?? this.status.E_BADARG("global", `No global with index ${global}`);
  }
  async onGetWasmLocal(message) {
    if (message.command !== "getWasmLocal") {
      return this.status.E_BADARG("command", `expected ${"getWasmLocal"}`);
    }
    const local = Number(message.local);
    const result = await this.loadWasmValue(true, this.convertWasmValue("local", local), `locals[${local}]`, message.stopId);
    return result ?? this.status.E_BADARG("local", `No local with index ${local}`);
  }
  async onGetWasmOp(message) {
    if (message.command !== "getWasmOp") {
      return this.status.E_BADARG("command", `expected ${"getWasmOp"}`);
    }
    const op = Number(message.op);
    const result = await this.loadWasmValue(true, this.convertWasmValue("operand", op), `stack[${op}]`, message.stopId);
    return result ?? this.status.E_BADARG("op", `No operand with index ${op}`);
  }
  registerRecorderExtensionEndpoint(message, _shared_port) {
    if (message.command !== "registerRecorderExtensionPlugin") {
      return this.status.E_BADARG("command", `expected ${"registerRecorderExtensionPlugin"}`);
    }
    const { pluginName, mediaType, port, capabilities } = message;
    Extensions2.RecorderPluginManager.RecorderPluginManager.instance().addPlugin(new Extensions2.RecorderExtensionEndpoint.RecorderExtensionEndpoint(pluginName, port, capabilities, mediaType));
    return this.status.OK();
  }
  onReportResourceLoad(message) {
    if (message.command !== "reportResourceLoad") {
      return this.status.E_BADARG("command", `expected ${"reportResourceLoad"}`);
    }
    const { resourceUrl, extensionId, status } = message;
    const url = resourceUrl;
    const initiator = { target: null, frameId: null, initiatorUrl: extensionId, extensionId };
    const pageResource = {
      url,
      initiator,
      errorMessage: status.errorMessage,
      success: status.success ?? null,
      size: status.size ?? null,
      duration: null
    };
    SDK2.PageResourceLoader.PageResourceLoader.instance().resourceLoadedThroughExtension(pageResource);
    return this.status.OK();
  }
  onSetFunctionRangesForScript(message, port) {
    if (message.command !== "setFunctionRangesForScript") {
      return this.status.E_BADARG("command", `expected ${"setFunctionRangesForScript"}`);
    }
    const { scriptUrl, ranges } = message;
    if (!scriptUrl || !ranges?.length) {
      return this.status.E_BADARG("command", "expected valid scriptUrl and non-empty NamedFunctionRanges");
    }
    const resource = this.lookupAllowedUISourceCode(scriptUrl, port);
    if ("error" in resource) {
      return resource.error;
    }
    const { uiSourceCode } = resource;
    if (!uiSourceCode.contentType().isScript() || !uiSourceCode.contentType().isFromSourceMap()) {
      return this.status.E_BADARG("command", `expected a source map script resource for url: ${scriptUrl}`);
    }
    try {
      Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance().setFunctionRanges(uiSourceCode, ranges);
    } catch (e) {
      return this.status.E_FAILED(e);
    }
    return this.status.OK();
  }
  onShowRecorderView(message) {
    if (message.command !== "showRecorderView") {
      return this.status.E_BADARG("command", `expected ${"showRecorderView"}`);
    }
    Extensions2.RecorderPluginManager.RecorderPluginManager.instance().showView(message.id);
    return void 0;
  }
  onShowNetworkPanel(message) {
    if (message.command !== "showNetworkPanel") {
      return this.status.E_BADARG("command", `expected ${"showNetworkPanel"}`);
    }
    void Common4.Revealer.reveal(new RevealableNetworkRequestFilter(message.filter));
    return this.status.OK();
  }
  onCreateRecorderView(message, port) {
    if (message.command !== "createRecorderView") {
      return this.status.E_BADARG("command", `expected ${"createRecorderView"}`);
    }
    const id = message.id;
    if (this.clientObjects.has(id)) {
      return this.status.E_EXISTS(id);
    }
    const pagePath = _ExtensionServer.expandResourcePath(this.getExtensionOrigin(port), message.pagePath);
    if (pagePath === void 0) {
      return this.status.E_BADARG("pagePath", "Resources paths cannot point to non-extension resources");
    }
    const onShown = () => this.notifyViewShown(id);
    const onHidden = () => this.notifyViewHidden(id);
    Extensions2.RecorderPluginManager.RecorderPluginManager.instance().registerView({
      id,
      pagePath,
      title: message.title,
      onShown,
      onHidden
    });
    return this.status.OK();
  }
  inspectedURLChanged(event) {
    if (!_ExtensionServer.canInspectURL(event.data.inspectedURL())) {
      this.disableExtensions();
      return;
    }
    if (event.data !== SDK2.TargetManager.TargetManager.instance().primaryPageTarget()) {
      return;
    }
    this.requests = /* @__PURE__ */ new Map();
    this.enableExtensions();
    const url = event.data.inspectedURL();
    this.postNotification("inspected-url-changed", [url]);
    const extensions = this.#pendingExtensions.splice(0);
    extensions.forEach((e) => this.addExtension(e));
  }
  hasSubscribers(type) {
    return this.subscribers.has(type);
  }
  postNotification(type, args, filter) {
    if (!this.extensionsEnabled) {
      return;
    }
    const subscribers = this.subscribers.get(type);
    if (!subscribers) {
      return;
    }
    const message = { command: "notify-" + type, arguments: args };
    for (const subscriber of subscribers) {
      if (!this.extensionEnabled(subscriber)) {
        continue;
      }
      if (filter) {
        const origin = extensionOrigins.get(subscriber);
        const extension = origin && this.registeredExtensions.get(origin);
        if (!extension || !filter(extension)) {
          continue;
        }
      }
      subscriber.postMessage(message);
    }
  }
  onSubscribe(message, port) {
    if (message.command !== "subscribe") {
      return this.status.E_BADARG("command", `expected ${"subscribe"}`);
    }
    const subscribers = this.subscribers.get(message.type);
    if (subscribers) {
      subscribers.add(port);
    } else {
      this.subscribers.set(message.type, /* @__PURE__ */ new Set([port]));
      const handler = this.subscriptionStartHandlers.get(message.type);
      if (handler) {
        handler();
      }
    }
    return void 0;
  }
  onUnsubscribe(message, port) {
    if (message.command !== "unsubscribe") {
      return this.status.E_BADARG("command", `expected ${"unsubscribe"}`);
    }
    const subscribers = this.subscribers.get(message.type);
    if (!subscribers) {
      return;
    }
    subscribers.delete(port);
    if (!subscribers.size) {
      this.subscribers.delete(message.type);
      const handler = this.subscriptionStopHandlers.get(message.type);
      if (handler) {
        handler();
      }
    }
    return void 0;
  }
  onAddRequestHeaders(message) {
    if (message.command !== "addRequestHeaders") {
      return this.status.E_BADARG("command", `expected ${"addRequestHeaders"}`);
    }
    const id = message.extensionId;
    if (typeof id !== "string") {
      return this.status.E_BADARGTYPE("extensionId", typeof id, "string");
    }
    let extensionHeaders = this.extraHeaders.get(id);
    if (!extensionHeaders) {
      extensionHeaders = /* @__PURE__ */ new Map();
      this.extraHeaders.set(id, extensionHeaders);
    }
    for (const name in message.headers) {
      extensionHeaders.set(name, message.headers[name]);
    }
    const allHeaders = {};
    for (const headers of this.extraHeaders.values()) {
      for (const [name, value] of headers) {
        if (name !== "__proto__" && typeof value === "string") {
          allHeaders[name] = value;
        }
      }
    }
    SDK2.NetworkManager.MultitargetNetworkManager.instance().setExtraHTTPHeaders(allHeaders);
    return void 0;
  }
  getExtensionOrigin(port) {
    const origin = extensionOrigins.get(port);
    if (!origin) {
      throw new Error("Received a message from an unregistered extension");
    }
    return origin;
  }
  onCreatePanel(message, port) {
    if (message.command !== "createPanel") {
      return this.status.E_BADARG("command", `expected ${"createPanel"}`);
    }
    const id = message.id;
    if (this.clientObjects.has(id) || UI9.InspectorView.InspectorView.instance().hasPanel(id)) {
      return this.status.E_EXISTS(id);
    }
    const page = _ExtensionServer.expandResourcePath(this.getExtensionOrigin(port), message.page);
    if (page === void 0) {
      return this.status.E_BADARG("page", "Resources paths cannot point to non-extension resources");
    }
    let persistentId = this.getExtensionOrigin(port) + message.title;
    persistentId = persistentId.replace(/\s|:\d+/g, "");
    const panelView = new ExtensionServerPanelView(persistentId, i18n13.i18n.lockedString(message.title), new ExtensionPanel(this, persistentId, id, page));
    this.clientObjects.set(id, panelView);
    UI9.InspectorView.InspectorView.instance().addPanel(panelView);
    return this.status.OK();
  }
  onShowPanel(message) {
    if (message.command !== "showPanel") {
      return this.status.E_BADARG("command", `expected ${"showPanel"}`);
    }
    let panelViewId = message.id;
    const panelView = this.clientObjects.get(message.id);
    if (panelView && panelView instanceof ExtensionServerPanelView) {
      panelViewId = panelView.viewId();
    }
    void UI9.InspectorView.InspectorView.instance().showPanel(panelViewId);
    return void 0;
  }
  onCreateToolbarButton(message, port) {
    if (message.command !== "createToolbarButton") {
      return this.status.E_BADARG("command", `expected ${"createToolbarButton"}`);
    }
    const panelView = this.clientObjects.get(message.panel);
    if (!panelView || !(panelView instanceof ExtensionServerPanelView)) {
      return this.status.E_NOTFOUND(message.panel);
    }
    const resourcePath = _ExtensionServer.expandResourcePath(this.getExtensionOrigin(port), message.icon);
    if (resourcePath === void 0) {
      return this.status.E_BADARG("icon", "Resources paths cannot point to non-extension resources");
    }
    const button = new ExtensionButton(this, message.id, resourcePath, message.tooltip, message.disabled);
    this.clientObjects.set(message.id, button);
    void panelView.widget().then(appendButton);
    function appendButton(panel) {
      panel.addToolbarItem(button.toolbarButton());
    }
    return this.status.OK();
  }
  onUpdateButton(message, port) {
    if (message.command !== "updateButton") {
      return this.status.E_BADARG("command", `expected ${"updateButton"}`);
    }
    const button = this.clientObjects.get(message.id);
    if (!button || !(button instanceof ExtensionButton)) {
      return this.status.E_NOTFOUND(message.id);
    }
    const resourcePath = message.icon && _ExtensionServer.expandResourcePath(this.getExtensionOrigin(port), message.icon);
    if (message.icon && resourcePath === void 0) {
      return this.status.E_BADARG("icon", "Resources paths cannot point to non-extension resources");
    }
    button.update(resourcePath, message.tooltip, message.disabled);
    return this.status.OK();
  }
  onCreateSidebarPane(message) {
    if (message.command !== "createSidebarPane") {
      return this.status.E_BADARG("command", `expected ${"createSidebarPane"}`);
    }
    const id = message.id;
    const sidebar = new ExtensionSidebarPane(this, message.panel, i18n13.i18n.lockedString(message.title), id);
    this.#sidebarPanes.push(sidebar);
    this.clientObjects.set(id, sidebar);
    this.dispatchEventToListeners("SidebarPaneAdded", sidebar);
    return this.status.OK();
  }
  sidebarPanes() {
    return this.#sidebarPanes;
  }
  onSetSidebarHeight(message) {
    if (message.command !== "setSidebarHeight") {
      return this.status.E_BADARG("command", `expected ${"setSidebarHeight"}`);
    }
    const sidebar = this.clientObjects.get(message.id);
    if (!sidebar || !(sidebar instanceof ExtensionSidebarPane)) {
      return this.status.E_NOTFOUND(message.id);
    }
    sidebar.setHeight(message.height);
    return this.status.OK();
  }
  onSetSidebarContent(message, port) {
    if (message.command !== "setSidebarContent") {
      return this.status.E_BADARG("command", `expected ${"setSidebarContent"}`);
    }
    const { requestId, id, rootTitle, expression, evaluateOptions, evaluateOnPage } = message;
    const sidebar = this.clientObjects.get(id);
    if (!sidebar || !(sidebar instanceof ExtensionSidebarPane)) {
      return this.status.E_NOTFOUND(message.id);
    }
    function callback(error) {
      const result = error ? this.status.E_FAILED(error) : this.status.OK();
      this.dispatchCallback(requestId, port, result);
    }
    if (evaluateOnPage) {
      sidebar.setExpression(expression, rootTitle, evaluateOptions, this.getExtensionOrigin(port), callback.bind(this));
      return void 0;
    }
    sidebar.setObject(message.expression, message.rootTitle, callback.bind(this));
    return void 0;
  }
  onSetSidebarPage(message, port) {
    if (message.command !== "setSidebarPage") {
      return this.status.E_BADARG("command", `expected ${"setSidebarPage"}`);
    }
    const sidebar = this.clientObjects.get(message.id);
    if (!sidebar || !(sidebar instanceof ExtensionSidebarPane)) {
      return this.status.E_NOTFOUND(message.id);
    }
    const resourcePath = _ExtensionServer.expandResourcePath(this.getExtensionOrigin(port), message.page);
    if (resourcePath === void 0) {
      return this.status.E_BADARG("page", "Resources paths cannot point to non-extension resources");
    }
    sidebar.setPage(resourcePath);
    return void 0;
  }
  onOpenResource(message) {
    if (message.command !== "openResource") {
      return this.status.E_BADARG("command", `expected ${"openResource"}`);
    }
    const uiSourceCode = Workspace.Workspace.WorkspaceImpl.instance().uiSourceCodeForURL(message.url);
    if (uiSourceCode) {
      void Common4.Revealer.reveal(uiSourceCode.uiLocation(message.lineNumber, message.columnNumber));
      return this.status.OK();
    }
    const resource = Bindings.ResourceUtils.resourceForURL(message.url);
    if (resource) {
      void Common4.Revealer.reveal(resource);
      return this.status.OK();
    }
    const request = Logs.NetworkLog.NetworkLog.instance().requestForURL(message.url);
    if (request) {
      void Common4.Revealer.reveal(request);
      return this.status.OK();
    }
    return this.status.E_NOTFOUND(message.url);
  }
  onSetOpenResourceHandler(message, port) {
    if (message.command !== "setOpenResourceHandler") {
      return this.status.E_BADARG("command", `expected ${"setOpenResourceHandler"}`);
    }
    const extension = this.registeredExtensions.get(this.getExtensionOrigin(port));
    if (!extension) {
      throw new Error("Received a message from an unregistered extension");
    }
    if (message.urlScheme) {
      extension.openResourceScheme = message.urlScheme;
    }
    const extensionOrigin = this.getExtensionOrigin(port);
    const { name } = extension;
    const registration = {
      title: name,
      origin: extensionOrigin,
      scheme: message.urlScheme,
      handler: this.handleOpenURL.bind(this, port),
      shouldHandleOpenResource: (url, schemes) => Components.Linkifier.Linkifier.shouldHandleOpenResource(extension.openResourceScheme, url, schemes)
    };
    if (message.handlerPresent) {
      Components.Linkifier.Linkifier.registerLinkHandler(registration);
    } else {
      Components.Linkifier.Linkifier.unregisterLinkHandler(registration);
    }
    return void 0;
  }
  onSetThemeChangeHandler(message, port) {
    if (message.command !== "setThemeChangeHandler") {
      return this.status.E_BADARG("command", `expected ${"setThemeChangeHandler"}`);
    }
    const extensionOrigin = this.getExtensionOrigin(port);
    const extension = this.registeredExtensions.get(extensionOrigin);
    if (!extension) {
      throw new Error("Received a message from an unregistered extension");
    }
    if (message.handlerPresent) {
      this.themeChangeHandlers.set(extensionOrigin, port);
    } else {
      this.themeChangeHandlers.delete(extensionOrigin);
    }
    return void 0;
  }
  handleOpenURL(port, contentProviderOrUrl, lineNumber, columnNumber) {
    let resource;
    let isAllowed;
    if (typeof contentProviderOrUrl !== "string") {
      resource = this.makeResource(contentProviderOrUrl);
      isAllowed = this.extensionAllowedOnContentProvider(contentProviderOrUrl, port);
    } else {
      const url = contentProviderOrUrl;
      resource = { url, type: Common4.ResourceType.resourceTypes.Other.name() };
      isAllowed = this.extensionAllowedOnURL(url, port);
    }
    if (isAllowed) {
      port.postMessage({
        command: "open-resource",
        resource,
        lineNumber: lineNumber ? lineNumber + 1 : void 0,
        columnNumber: columnNumber ? columnNumber + 1 : void 0
      });
    }
  }
  extensionAllowedOnURL(url, port) {
    const origin = extensionOrigins.get(port);
    const extension = origin && this.registeredExtensions.get(origin);
    return Boolean(extension?.isAllowedOnTarget(url));
  }
  /**
   * Slightly more permissive as {@link extensionAllowedOnURL}: This method also permits
   * UISourceCodes that originate from a {@link SDK.Script.Script} with a sourceURL magic comment as
   * long as the corresponding target is permitted.
   */
  extensionAllowedOnContentProvider(contentProvider, port) {
    if (!(contentProvider instanceof Workspace.UISourceCode.UISourceCode)) {
      return this.extensionAllowedOnURL(contentProvider.contentURL(), port);
    }
    if (contentProvider.contentType() !== Common4.ResourceType.resourceTypes.Script) {
      return this.extensionAllowedOnURL(contentProvider.contentURL(), port);
    }
    const scripts = Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance().scriptsForUISourceCode(contentProvider);
    if (scripts.length === 0) {
      return this.extensionAllowedOnURL(contentProvider.contentURL(), port);
    }
    return scripts.every((script) => {
      if (script.hasSourceURL) {
        return this.extensionAllowedOnTarget(script.target(), port);
      }
      return this.extensionAllowedOnURL(script.contentURL(), port);
    });
  }
  /**
   * This method prefers returning 'Permission denied' errors if restricted resources are not found,
   * rather then NOTFOUND. This prevents extensions from being able to fish for restricted resources.
   */
  lookupAllowedUISourceCode(url, port) {
    const uiSourceCode = Workspace.Workspace.WorkspaceImpl.instance().uiSourceCodeForURL(url);
    if (!uiSourceCode && !this.extensionAllowedOnURL(url, port)) {
      return { error: this.status.E_FAILED("Permission denied") };
    }
    if (!uiSourceCode) {
      return { error: this.status.E_NOTFOUND(url) };
    }
    if (!this.extensionAllowedOnContentProvider(uiSourceCode, port)) {
      return { error: this.status.E_FAILED("Permission denied") };
    }
    return { uiSourceCode };
  }
  extensionAllowedOnTarget(target, port) {
    return this.extensionAllowedOnURL(target.inspectedURL(), port);
  }
  onReload(message, port) {
    if (message.command !== "Reload") {
      return this.status.E_BADARG("command", `expected ${"Reload"}`);
    }
    const options = message.options || {};
    SDK2.NetworkManager.MultitargetNetworkManager.instance().setUserAgentOverride(typeof options.userAgent === "string" ? options.userAgent : "", null);
    let injectedScript;
    if (options.injectedScript) {
      injectedScript = "(function(){" + options.injectedScript + "})()";
    }
    const target = SDK2.TargetManager.TargetManager.instance().primaryPageTarget();
    if (!target) {
      return this.status.OK();
    }
    const resourceTreeModel = target.model(SDK2.ResourceTreeModel.ResourceTreeModel);
    if (!this.extensionAllowedOnTarget(target, port)) {
      return this.status.E_FAILED("Permission denied");
    }
    resourceTreeModel?.reloadPage(Boolean(options.ignoreCache), injectedScript);
    return this.status.OK();
  }
  onEvaluateOnInspectedPage(message, port) {
    if (message.command !== "evaluateOnInspectedPage") {
      return this.status.E_BADARG("command", `expected ${"evaluateOnInspectedPage"}`);
    }
    const { requestId, expression, evaluateOptions } = message;
    function callback(error, object, wasThrown) {
      let result;
      if (error || !object) {
        result = this.status.E_PROTOCOLERROR(error?.toString());
      } else if (wasThrown) {
        result = { isException: true, value: object.description };
      } else {
        result = { value: object.value };
      }
      this.dispatchCallback(requestId, port, result);
    }
    return this.evaluate(expression, true, true, evaluateOptions, this.getExtensionOrigin(port), callback.bind(this));
  }
  async onGetHAR(message, port) {
    if (message.command !== "getHAR") {
      return this.status.E_BADARG("command", `expected ${"getHAR"}`);
    }
    const requests = Logs.NetworkLog.NetworkLog.instance().requests().filter((r) => this.extensionAllowedOnURL(r.url(), port));
    const harLog = await HAR.Log.Log.build(requests, { sanitize: false });
    for (let i = 0; i < harLog.entries.length; ++i) {
      harLog.entries[i]._requestId = this.requestId(requests[i]);
    }
    return harLog;
  }
  makeResource(contentProvider) {
    let buildId = void 0;
    if (contentProvider instanceof Workspace.UISourceCode.UISourceCode) {
      buildId = Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance().scriptsForUISourceCode(contentProvider).find((script) => Boolean(script.buildId))?.buildId ?? void 0;
    }
    return { url: contentProvider.contentURL(), type: contentProvider.contentType().name(), buildId };
  }
  onGetPageResources(_message, port) {
    const resources = /* @__PURE__ */ new Map();
    function pushResourceData(contentProvider) {
      if (!resources.has(contentProvider.contentURL()) && this.extensionAllowedOnContentProvider(contentProvider, port)) {
        resources.set(contentProvider.contentURL(), this.makeResource(contentProvider));
      }
      return false;
    }
    let uiSourceCodes = Workspace.Workspace.WorkspaceImpl.instance().uiSourceCodesForProjectType(Workspace.Workspace.projectTypes.Network);
    uiSourceCodes = uiSourceCodes.concat(Workspace.Workspace.WorkspaceImpl.instance().uiSourceCodesForProjectType(Workspace.Workspace.projectTypes.ContentScripts));
    uiSourceCodes.forEach(pushResourceData.bind(this));
    for (const resourceTreeModel of SDK2.TargetManager.TargetManager.instance().models(SDK2.ResourceTreeModel.ResourceTreeModel)) {
      if (this.extensionAllowedOnTarget(resourceTreeModel.target(), port)) {
        resourceTreeModel.forAllResources(pushResourceData.bind(this));
      }
    }
    return [...resources.values()];
  }
  async getResourceContent(contentProvider, message, port) {
    if (!this.extensionAllowedOnContentProvider(contentProvider, port)) {
      this.dispatchCallback(message.requestId, port, this.status.E_FAILED("Permission denied"));
      return void 0;
    }
    const contentData = await contentProvider.requestContentData();
    if (TextUtils.ContentData.ContentData.isError(contentData)) {
      this.dispatchCallback(message.requestId, port, { encoding: "", content: null });
      return;
    }
    const encoding = !contentData.isTextContent ? "base64" : "";
    const content = contentData.isTextContent ? contentData.text : contentData.base64;
    this.dispatchCallback(message.requestId, port, { encoding, content });
  }
  onGetRequestContent(message, port) {
    if (message.command !== "getRequestContent") {
      return this.status.E_BADARG("command", `expected ${"getRequestContent"}`);
    }
    const request = this.requestById(message.id);
    if (!request) {
      return this.status.E_NOTFOUND(message.id);
    }
    void this.getResourceContent(request, message, port);
    return void 0;
  }
  onGetResourceContent(message, port) {
    if (message.command !== "getResourceContent") {
      return this.status.E_BADARG("command", `expected ${"getResourceContent"}`);
    }
    const url = message.url;
    const contentProvider = Workspace.Workspace.WorkspaceImpl.instance().uiSourceCodeForURL(url) || Bindings.ResourceUtils.resourceForURL(url);
    if (!contentProvider) {
      return this.status.E_NOTFOUND(url);
    }
    void this.getResourceContent(contentProvider, message, port);
    return void 0;
  }
  onAttachSourceMapToResource(message, port) {
    if (message.command !== "attachSourceMapToResource") {
      return this.status.E_BADARG("command", `expected ${"getResourceContent"}`);
    }
    if (!message.sourceMapURL) {
      return this.status.E_FAILED("Expected a source map URL but got null");
    }
    const resource = this.lookupAllowedUISourceCode(message.contentUrl, port);
    if ("error" in resource) {
      return resource.error;
    }
    const debuggerBindingsInstance = Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance();
    const scriptFiles = debuggerBindingsInstance.scriptsForUISourceCode(resource.uiSourceCode);
    if (scriptFiles.length > 0) {
      for (const script of scriptFiles) {
        const resourceFile = debuggerBindingsInstance.scriptFile(resource.uiSourceCode, script.debuggerModel);
        resourceFile?.addSourceMapURL(message.sourceMapURL);
      }
    }
    return this.status.OK();
  }
  onSetResourceContent(message, port) {
    if (message.command !== "setResourceContent") {
      return this.status.E_BADARG("command", `expected ${"setResourceContent"}`);
    }
    const { url, requestId, content, commit } = message;
    function callbackWrapper(error) {
      const response = error ? this.status.E_FAILED(error) : this.status.OK();
      this.dispatchCallback(requestId, port, response);
    }
    const resource = this.lookupAllowedUISourceCode(url, port);
    if ("error" in resource) {
      return resource.error;
    }
    const { uiSourceCode } = resource;
    if (!uiSourceCode.contentType().isDocumentOrScriptOrStyleSheet()) {
      const resource2 = SDK2.ResourceTreeModel.ResourceTreeModel.resourceForURL(url);
      if (!resource2) {
        return this.status.E_NOTFOUND(url);
      }
      return this.status.E_NOTSUPPORTED("Resource is not editable");
    }
    uiSourceCode.setWorkingCopy(content);
    if (commit) {
      uiSourceCode.commitWorkingCopy();
    }
    callbackWrapper.call(this, null);
    return void 0;
  }
  requestId(request) {
    const requestId = this.requestIds.get(request);
    if (requestId === void 0) {
      const newId = ++this.lastRequestId;
      this.requestIds.set(request, newId);
      this.requests.set(newId, request);
      return newId;
    }
    return requestId;
  }
  requestById(id) {
    return this.requests.get(id);
  }
  onForwardKeyboardEvent(message) {
    if (message.command !== "_forwardKeyboardEvent") {
      return this.status.E_BADARG("command", `expected ${"_forwardKeyboardEvent"}`);
    }
    message.entries.forEach(handleEventEntry);
    function handleEventEntry(entry) {
      const event = new window.KeyboardEvent(entry.eventType, {
        key: entry.key,
        code: entry.code,
        keyCode: entry.keyCode,
        location: entry.location,
        ctrlKey: entry.ctrlKey,
        altKey: entry.altKey,
        shiftKey: entry.shiftKey,
        metaKey: entry.metaKey
      });
      event.__keyCode = keyCodeForEntry(entry);
      document.dispatchEvent(event);
    }
    function keyCodeForEntry(entry) {
      let keyCode = entry.keyCode;
      if (!keyCode) {
        if (entry.key === Platform3.KeyboardUtilities.ESCAPE_KEY) {
          keyCode = 27;
        }
      }
      return keyCode || 0;
    }
    return void 0;
  }
  dispatchCallback(requestId, port, result) {
    if (requestId) {
      port.postMessage({ command: "callback", requestId, result });
    }
  }
  initExtensions() {
    this.registerAutosubscriptionHandler("resource-added", Workspace.Workspace.WorkspaceImpl.instance(), Workspace.Workspace.Events.UISourceCodeAdded, this.notifyResourceAdded);
    this.registerAutosubscriptionTargetManagerHandler("network-request-finished", SDK2.NetworkManager.NetworkManager, SDK2.NetworkManager.Events.RequestFinished, this.notifyRequestFinished);
    function onElementsSubscriptionStarted() {
      UI9.Context.Context.instance().addFlavorChangeListener(SDK2.DOMModel.DOMNode, this.notifyElementsSelectionChanged, this);
    }
    function onElementsSubscriptionStopped() {
      UI9.Context.Context.instance().removeFlavorChangeListener(SDK2.DOMModel.DOMNode, this.notifyElementsSelectionChanged, this);
    }
    this.registerSubscriptionHandler("panel-objectSelected-elements", onElementsSubscriptionStarted.bind(this), onElementsSubscriptionStopped.bind(this));
    this.registerResourceContentCommittedHandler(this.notifyUISourceCodeContentCommitted);
    SDK2.TargetManager.TargetManager.instance().addEventListener("InspectedURLChanged", this.inspectedURLChanged, this);
  }
  notifyResourceAdded(event) {
    const uiSourceCode = event.data;
    this.postNotification("resource-added", [this.makeResource(uiSourceCode)], (extension) => extension.isAllowedOnTarget(uiSourceCode.url()));
  }
  notifyUISourceCodeContentCommitted(event) {
    const { uiSourceCode, content } = event.data;
    this.postNotification("resource-content-committed", [this.makeResource(uiSourceCode), content], (extension) => extension.isAllowedOnTarget(uiSourceCode.url()));
  }
  async notifyRequestFinished(event) {
    const request = event.data;
    const entry = await HAR.Log.Entry.build(request, { sanitize: false });
    this.postNotification("network-request-finished", [this.requestId(request), entry], (extension) => extension.isAllowedOnTarget(entry.request.url));
  }
  notifyElementsSelectionChanged() {
    this.postNotification("panel-objectSelected-elements", []);
  }
  sourceSelectionChanged(url, range) {
    this.postNotification("panel-objectSelected-sources", [{
      startLine: range.startLine,
      startColumn: range.startColumn,
      endLine: range.endLine,
      endColumn: range.endColumn,
      url
    }], (extension) => extension.isAllowedOnTarget(url));
  }
  setInspectedTabId(event) {
    const oldId = this.inspectedTabId;
    this.inspectedTabId = event.data;
    if (oldId === null) {
      this.initializeExtensions();
    }
  }
  addExtensionFrame({ startPage, name }) {
    const iframe = document.createElement("iframe");
    iframe.src = startPage;
    iframe.dataset.devtoolsExtension = name;
    iframe.style.display = "none";
    document.body.appendChild(iframe);
  }
  addExtension(extensionInfo) {
    const startPage = extensionInfo.startPage;
    const inspectedURL = SDK2.TargetManager.TargetManager.instance().primaryPageTarget()?.inspectedURL() ?? "";
    if (inspectedURL === "") {
      this.#pendingExtensions.push(extensionInfo);
      return;
    }
    if (!_ExtensionServer.canInspectURL(inspectedURL)) {
      this.disableExtensions();
    }
    if (!this.extensionsEnabled) {
      this.#pendingExtensions.push(extensionInfo);
      return;
    }
    const hostsPolicy = HostsPolicy.create(extensionInfo.hostsPolicy);
    if (!hostsPolicy) {
      return;
    }
    try {
      const startPageURL = new URL(startPage);
      const extensionOrigin = startPageURL.origin;
      const name = extensionInfo.name || `Extension ${extensionOrigin}`;
      const extensionRegistration = new RegisteredExtension(name, hostsPolicy, Boolean(extensionInfo.allowFileAccess));
      if (!extensionRegistration.isAllowedOnTarget(inspectedURL)) {
        this.#pendingExtensions.push(extensionInfo);
        return;
      }
      if (!this.registeredExtensions.get(extensionOrigin)) {
        const injectedAPI = self.buildExtensionAPIInjectedScript(extensionInfo, this.inspectedTabId, ThemeSupport.ThemeSupport.instance().themeName(), UI9.ShortcutRegistry.ShortcutRegistry.instance().globalShortcutKeys(), _ExtensionServer.instance().extensionAPITestHook);
        Host6.InspectorFrontendHost.InspectorFrontendHostInstance.setInjectedScriptForOrigin(extensionOrigin, injectedAPI);
        this.registeredExtensions.set(extensionOrigin, extensionRegistration);
      }
      this.addExtensionFrame(extensionInfo);
    } catch (e) {
      console.error("Failed to initialize extension " + startPage + ":" + e);
      return false;
    }
    return true;
  }
  registerExtension(origin, port) {
    if (!this.registeredExtensions.has(origin)) {
      if (origin !== window.location.origin) {
        console.error("Ignoring unauthorized client request from " + origin);
      }
      return;
    }
    extensionOrigins.set(port, origin);
    port.addEventListener("message", this.onmessage.bind(this), false);
    port.start();
  }
  onWindowMessage = (event) => {
    if (event.data === "registerExtension") {
      this.registerExtension(event.origin, event.ports[0]);
    }
  };
  extensionEnabled(port) {
    if (!this.extensionsEnabled) {
      return false;
    }
    const origin = extensionOrigins.get(port);
    if (!origin) {
      return false;
    }
    const extension = this.registeredExtensions.get(origin);
    if (!extension) {
      return false;
    }
    return extension.isAllowedOnTarget();
  }
  async onmessage(event) {
    const message = event.data;
    let result;
    const port = event.currentTarget;
    const handler = this.handlers.get(message.command);
    if (!handler) {
      result = this.status.E_NOTSUPPORTED(message.command);
    } else if (!this.extensionEnabled(port)) {
      result = this.status.E_FAILED("Permission denied");
    } else {
      result = await handler(message, event.target);
    }
    if (result && message.requestId) {
      this.dispatchCallback(message.requestId, event.target, result);
    }
  }
  registerHandler(command, callback) {
    console.assert(Boolean(command));
    this.handlers.set(command, callback);
  }
  registerSubscriptionHandler(eventTopic, onSubscribeFirst, onUnsubscribeLast) {
    this.subscriptionStartHandlers.set(eventTopic, onSubscribeFirst);
    this.subscriptionStopHandlers.set(eventTopic, onUnsubscribeLast);
  }
  registerAutosubscriptionHandler(eventTopic, eventTarget, frontendEventType, handler) {
    this.registerSubscriptionHandler(eventTopic, () => eventTarget.addEventListener(frontendEventType, handler, this), () => eventTarget.removeEventListener(frontendEventType, handler, this));
  }
  registerAutosubscriptionTargetManagerHandler(eventTopic, modelClass, frontendEventType, handler) {
    this.registerSubscriptionHandler(eventTopic, () => SDK2.TargetManager.TargetManager.instance().addModelListener(modelClass, frontendEventType, handler, this), () => SDK2.TargetManager.TargetManager.instance().removeModelListener(modelClass, frontendEventType, handler, this));
  }
  registerResourceContentCommittedHandler(handler) {
    function addFirstEventListener() {
      Workspace.Workspace.WorkspaceImpl.instance().addEventListener(Workspace.Workspace.Events.WorkingCopyCommittedByUser, handler, this);
      Workspace.Workspace.WorkspaceImpl.instance().setHasResourceContentTrackingExtensions(true);
    }
    function removeLastEventListener() {
      Workspace.Workspace.WorkspaceImpl.instance().setHasResourceContentTrackingExtensions(false);
      Workspace.Workspace.WorkspaceImpl.instance().removeEventListener(Workspace.Workspace.Events.WorkingCopyCommittedByUser, handler, this);
    }
    this.registerSubscriptionHandler("resource-content-committed", addFirstEventListener.bind(this), removeLastEventListener.bind(this));
  }
  static expandResourcePath(extensionOrigin, resourcePath) {
    const strippedOrigin = new URL(extensionOrigin).origin;
    const resourceURL = new URL(Common4.ParsedURL.normalizePath(resourcePath), strippedOrigin);
    if (resourceURL.origin !== strippedOrigin) {
      return void 0;
    }
    return resourceURL.href;
  }
  evaluate(expression, exposeCommandLineAPI, returnByValue, options, securityOrigin, callback) {
    let context;
    function resolveURLToFrame(url) {
      let found = null;
      function hasMatchingURL(frame2) {
        found = frame2.url === url ? frame2 : null;
        return found;
      }
      SDK2.ResourceTreeModel.ResourceTreeModel.frames().some(hasMatchingURL);
      return found;
    }
    options = options || {};
    let frame;
    if (options.frameURL) {
      frame = resolveURLToFrame(options.frameURL);
    } else {
      const target = SDK2.TargetManager.TargetManager.instance().primaryPageTarget();
      const resourceTreeModel = target?.model(SDK2.ResourceTreeModel.ResourceTreeModel);
      frame = resourceTreeModel?.mainFrame;
    }
    if (!frame) {
      if (options.frameURL) {
        console.warn("evaluate: there is no frame with URL " + options.frameURL);
      } else {
        console.warn("evaluate: the main frame is not yet available");
      }
      return this.status.E_NOTFOUND(options.frameURL || "<top>");
    }
    const extension = this.registeredExtensions.get(securityOrigin);
    if (!extension?.isAllowedOnTarget(frame.url)) {
      return this.status.E_FAILED("Permission denied");
    }
    let contextSecurityOrigin;
    if (options.useContentScriptContext) {
      contextSecurityOrigin = securityOrigin;
    } else if (options.scriptExecutionContext) {
      contextSecurityOrigin = options.scriptExecutionContext;
    }
    const runtimeModel = frame.resourceTreeModel().target().model(SDK2.RuntimeModel.RuntimeModel);
    const executionContexts = runtimeModel ? runtimeModel.executionContexts() : [];
    if (contextSecurityOrigin) {
      for (let i = 0; i < executionContexts.length; ++i) {
        const executionContext = executionContexts[i];
        if (executionContext.frameId === frame.id && executionContext.origin === contextSecurityOrigin && !executionContext.isDefault) {
          context = executionContext;
        }
      }
      if (!context) {
        console.warn("The JavaScript context " + contextSecurityOrigin + " was not found in the frame " + frame.url);
        return this.status.E_NOTFOUND(contextSecurityOrigin);
      }
    } else {
      for (let i = 0; i < executionContexts.length; ++i) {
        const executionContext = executionContexts[i];
        if (executionContext.frameId === frame.id && executionContext.isDefault) {
          context = executionContext;
        }
      }
      if (!context) {
        return this.status.E_FAILED(frame.url + " has no execution context");
      }
    }
    if (!extension?.isAllowedOnTarget(context.origin)) {
      return this.status.E_FAILED("Permission denied");
    }
    void context.evaluate(
      {
        expression,
        objectGroup: "extension",
        includeCommandLineAPI: exposeCommandLineAPI,
        silent: true,
        returnByValue,
        generatePreview: false
      },
      /* userGesture */
      false,
      /* awaitPromise */
      false
    ).then(onEvaluate);
    function onEvaluate(result) {
      if ("error" in result) {
        callback(result.error, null, false);
        return;
      }
      callback(null, result.object || null, Boolean(result.exceptionDetails));
    }
    return void 0;
  }
  static canInspectURL(url) {
    let parsedURL;
    try {
      parsedURL = new URL(url);
    } catch {
      return false;
    }
    if (!kPermittedSchemes.includes(parsedURL.protocol)) {
      return false;
    }
    if ((window.DevToolsAPI?.getOriginsForbiddenForExtensions?.() || []).includes(parsedURL.origin)) {
      return false;
    }
    if (this.#isUrlFromChromeWebStore(parsedURL)) {
      return false;
    }
    return true;
  }
  /**
   * Tests whether a given URL is from the Chrome web store to prevent the extension server from
   * being injected. This is treated as separate from the `getOriginsForbiddenForExtensions` API because
   * DevTools might not be being run from a native origin and we still want to lock down this specific
   * origin from DevTools extensions.
   *
   * @param parsedURL The URL to check
   * @returns `true` if the URL corresponds to the Chrome web store; otherwise `false`
   */
  static #isUrlFromChromeWebStore(parsedURL) {
    if (parsedURL.protocol.startsWith("http") && parsedURL.hostname.match(/^chrome\.google\.com\.?$/) && parsedURL.pathname.startsWith("/webstore")) {
      return true;
    }
    if (parsedURL.protocol.startsWith("http") && parsedURL.hostname.match(/^chromewebstore\.google\.com\.?$/)) {
      return true;
    }
    return false;
  }
  disableExtensions() {
    this.extensionsEnabled = false;
  }
  enableExtensions() {
    this.extensionsEnabled = true;
  }
};
var ExtensionServerPanelView = class extends UI9.View.SimpleView {
  name;
  panel;
  constructor(name, title, panel) {
    const viewId = Platform3.StringUtilities.toKebabCase(title);
    super({ title, viewId });
    this.name = name;
    this.panel = panel;
  }
  viewId() {
    return this.name;
  }
  widget() {
    return Promise.resolve(this.panel);
  }
};
var ExtensionStatus = class {
  OK;
  E_EXISTS;
  E_BADARG;
  E_BADARGTYPE;
  E_NOTFOUND;
  E_NOTSUPPORTED;
  E_PROTOCOLERROR;
  E_FAILED;
  constructor() {
    function makeStatus(code, description, ...details) {
      const status = { code, description, details };
      if (code !== "OK") {
        status.isError = true;
        console.error("Extension server error: " + Platform3.StringUtilities.sprintf(description, ...details));
      }
      return status;
    }
    this.OK = makeStatus.bind(null, "OK", "OK");
    this.E_EXISTS = makeStatus.bind(null, "E_EXISTS", "Object already exists: %s");
    this.E_BADARG = makeStatus.bind(null, "E_BADARG", "Invalid argument %s: %s");
    this.E_BADARGTYPE = makeStatus.bind(null, "E_BADARGTYPE", "Invalid type for argument %s: got %s, expected %s");
    this.E_NOTFOUND = makeStatus.bind(null, "E_NOTFOUND", "Object not found: %s");
    this.E_NOTSUPPORTED = makeStatus.bind(null, "E_NOTSUPPORTED", "Object does not support requested operation: %s");
    this.E_PROTOCOLERROR = makeStatus.bind(null, "E_PROTOCOLERROR", "Inspector protocol error: %s");
    this.E_FAILED = makeStatus.bind(null, "E_FAILED", "Operation failed: %s");
  }
};

// gen/front_end/panels/common/PersistenceUtils.js
var PersistenceUtils_exports = {};
__export(PersistenceUtils_exports, {
  LinkDecorator: () => LinkDecorator,
  PersistenceUtils: () => PersistenceUtils
});
import * as Common5 from "./../../core/common/common.js";
import * as i18n15 from "./../../core/i18n/i18n.js";
import * as Platform4 from "./../../core/platform/platform.js";
import * as Persistence from "./../../models/persistence/persistence.js";
import * as Workspace3 from "./../../models/workspace/workspace.js";
import * as IconButton from "./../../ui/components/icon_button/icon_button.js";
import * as Components2 from "./../../ui/legacy/components/utils/utils.js";
import * as UI10 from "./../../ui/legacy/legacy.js";
var UIStrings4 = {
  /**
   * @description Text in Persistence Utils of the Workspace settings in Settings
   * @example {example.url} PH1
   */
  linkedToSourceMapS: "Linked to source map: {PH1}",
  /**
   * @description Text to show something is linked to another
   * @example {example.url} PH1
   */
  linkedToS: "Linked to {PH1}"
};
var str_4 = i18n15.i18n.registerUIStrings("panels/common/PersistenceUtils.ts", UIStrings4);
var i18nString4 = i18n15.i18n.getLocalizedString.bind(void 0, str_4);
var PersistenceUtils = class _PersistenceUtils {
  static tooltipForUISourceCode(uiSourceCode) {
    const binding = Persistence.Persistence.PersistenceImpl.instance().binding(uiSourceCode);
    if (!binding) {
      return "";
    }
    if (uiSourceCode === binding.network) {
      return Persistence.FileSystemWorkspaceBinding.FileSystemWorkspaceBinding.tooltipForUISourceCode(binding.fileSystem);
    }
    if (binding.network.contentType().isFromSourceMap()) {
      return i18nString4(UIStrings4.linkedToSourceMapS, { PH1: Platform4.StringUtilities.trimMiddle(binding.network.url(), 150) });
    }
    return i18nString4(UIStrings4.linkedToS, { PH1: Platform4.StringUtilities.trimMiddle(binding.network.url(), 150) });
  }
  static iconForUISourceCode(uiSourceCode) {
    const binding = Persistence.Persistence.PersistenceImpl.instance().binding(uiSourceCode);
    if (binding) {
      if (!Common5.ParsedURL.schemeIs(binding.fileSystem.url(), "file:")) {
        return null;
      }
      const icon2 = new IconButton.Icon.Icon();
      icon2.name = "document";
      icon2.classList.add("small");
      UI10.Tooltip.Tooltip.install(icon2, _PersistenceUtils.tooltipForUISourceCode(binding.network));
      if (Persistence.NetworkPersistenceManager.NetworkPersistenceManager.instance().project() === binding.fileSystem.project()) {
        icon2.classList.add("dot", "purple");
      } else {
        icon2.classList.add("dot", "green");
      }
      return icon2;
    }
    if (uiSourceCode.project().type() !== Workspace3.Workspace.projectTypes.FileSystem || !Common5.ParsedURL.schemeIs(uiSourceCode.url(), "file:")) {
      return null;
    }
    if (Persistence.NetworkPersistenceManager.NetworkPersistenceManager.instance().isActiveHeaderOverrides(uiSourceCode)) {
      const icon2 = new IconButton.Icon.Icon();
      icon2.name = "document";
      icon2.classList.add("small");
      icon2.classList.add("dot", "purple");
      return icon2;
    }
    const icon = new IconButton.Icon.Icon();
    icon.name = "document";
    icon.classList.add("small");
    UI10.Tooltip.Tooltip.install(icon, _PersistenceUtils.tooltipForUISourceCode(uiSourceCode));
    return icon;
  }
};
var LinkDecorator = class extends Common5.ObjectWrapper.ObjectWrapper {
  constructor(persistence) {
    super();
    persistence.addEventListener(Persistence.Persistence.Events.BindingCreated, this.bindingChanged, this);
    persistence.addEventListener(Persistence.Persistence.Events.BindingRemoved, this.bindingChanged, this);
  }
  bindingChanged(event) {
    const binding = event.data;
    this.dispatchEventToListeners("LinkIconChanged", binding.network);
  }
  linkIcon(uiSourceCode) {
    return PersistenceUtils.iconForUISourceCode(uiSourceCode);
  }
};

// gen/front_end/panels/common/DOMLinkifier.js
var DOMLinkifier_exports = {};
__export(DOMLinkifier_exports, {
  DOMNodeLink: () => DOMNodeLink,
  DeferredDOMNodeLink: () => DeferredDOMNodeLink,
  Linkifier: () => Linkifier2
});
import * as Common6 from "./../../core/common/common.js";
import * as i18n17 from "./../../core/i18n/i18n.js";
import * as SDK3 from "./../../core/sdk/sdk.js";
import * as UI11 from "./../../ui/legacy/legacy.js";
import { Directives as Directives3, html as html8, nothing as nothing4, render as render8 } from "./../../ui/lit/lit.js";
import * as VisualLogging5 from "./../../ui/visual_logging/visual_logging.js";

// gen/front_end/panels/common/domLinkifier.css.js
var domLinkifier_css_default = `/*
 * Copyright 2018 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

@scope to (devtools-widget > *) {
  :scope {
    display: inline;
  }

  .node-link {
    cursor: pointer;
    display: inline;
    pointer-events: auto;
    outline-offset: 2px;

    /* If the element has lots of classes, don't let the label get too wide */
    text-overflow: ellipsis;
    overflow: hidden;
    max-width: min(100%, 550px);

    &:focus-visible {
      outline-width: unset;
    }

    &.dynamic-link:hover {
      text-decoration: underline;
    }
  }

  .node-link.disabled {
    .node-label-name,
    .node-label-class,
    .node-label-pseudo,
    .node-label-name .dynamic-link,
    .node-label-id {
      color: var(--sys-color-state-disabled);
    }
  }

  .node-label-name {
    color: var(--sys-color-token-tag);

    .dynamic-link & {
      color: var(--text-link);
    }
  }

  .node-label-class,
  .node-label-pseudo {
    color: var(--sys-color-token-attribute);
  }
}

/*# sourceURL=${import.meta.resolve("./domLinkifier.css")} */`;

// gen/front_end/panels/common/DOMLinkifier.js
var { classMap } = Directives3;
var UIStrings5 = {
  /**
   * @description Text displayed when trying to create a link to a node in the UI, but the node
   * location could not be found so we display this placeholder instead. Node refers to a DOM node.
   * This should be translated if appropriate.
   */
  node: "<node>"
};
var str_5 = i18n17.i18n.registerUIStrings("panels/common/DOMLinkifier.ts", UIStrings5);
var i18nString5 = i18n17.i18n.getLocalizedString.bind(void 0, str_5);
var DEFAULT_VIEW5 = (input, _output, target) => {
  render8(html8`${input.tagName || input.pseudo ? html8`
    <style>${domLinkifier_css_default}</style>
    <span class="monospace">
      <button class="node-link text-button link-style ${classMap({
    "dynamic-link": Boolean(input.dynamic),
    disabled: Boolean(input.disabled)
  })}"
          jslog=${VisualLogging5.link("node").track({ click: true, keydown: "Enter" })}
          tabindex=${input.preventKeyboardFocus ? -1 : 0}
          @click=${input.onClick}
          @mouseover=${input.onMouseOver}
          @mouseleave=${input.onMouseLeave}
          title=${[
    input.tagName ?? "",
    input.id ? `#${input.id}` : "",
    ...input.classes.map((c) => `.${c}`),
    input.pseudo ? `::${input.pseudo}` : ""
  ].join(" ")}>${[
    input.tagName ? html8`<span class="node-label-name">${input.tagName}</span>` : nothing4,
    input.id ? html8`<span class="node-label-id">#${input.id}</span>` : nothing4,
    ...input.classes.map((className) => html8`<span class="extra node-label-class">.${className}</span>`),
    input.pseudo ? html8`<span class="extra node-label-pseudo">${input.pseudo}</span>` : nothing4
  ]}</button>
    </span>` : i18nString5(UIStrings5.node)}`, target);
};
var DOMNodeLink = class extends UI11.Widget.Widget {
  #node = void 0;
  #options = void 0;
  #view;
  constructor(element, node, options, view = DEFAULT_VIEW5) {
    super(element, { useShadowDom: true });
    this.element.classList.remove("vbox");
    this.#node = node;
    this.#options = options;
    this.#view = view;
    this.performUpdate();
  }
  set node(node) {
    this.#node = node;
    this.performUpdate();
  }
  set options(options) {
    this.#options = options;
    this.performUpdate();
  }
  performUpdate() {
    const options = this.#options ?? {
      tooltip: void 0,
      preventKeyboardFocus: void 0,
      textContent: void 0,
      isDynamicLink: false,
      disabled: false
    };
    const viewInput = {
      dynamic: options.isDynamicLink,
      disabled: options.disabled,
      preventKeyboardFocus: options.preventKeyboardFocus,
      classes: [],
      onClick: () => {
        void Common6.Revealer.reveal(this.#node);
        void this.#node?.scrollIntoView();
        return false;
      },
      onMouseOver: () => {
        this.#node?.highlight?.();
      },
      onMouseLeave: () => {
        SDK3.OverlayModel.OverlayModel.hideDOMNodeHighlight();
      }
    };
    if (!this.#node) {
      this.#view(viewInput, {}, this.contentElement);
      return;
    }
    let node = this.#node;
    const isPseudo = node.nodeType() === Node.ELEMENT_NODE && node.pseudoType();
    if (isPseudo && node.parentNode) {
      node = node.parentNode;
    }
    if (node.isViewTransitionPseudoNode()) {
      viewInput.pseudo = `::${this.#node.pseudoType()}(${this.#node.pseudoIdentifier()})`;
      this.#view(viewInput, {}, this.contentElement);
      return;
    }
    if (options.textContent) {
      viewInput.tagName = options.textContent;
      this.#view(viewInput, {}, this.contentElement);
      return;
    }
    viewInput.tagName = node.nodeNameInCorrectCase();
    const idAttribute = node.getAttribute("id");
    if (idAttribute) {
      viewInput.id = idAttribute;
    }
    const classAttribute = node.getAttribute("class");
    if (classAttribute) {
      const classes = classAttribute.split(/\s+/);
      if (classes.length) {
        const foundClasses = /* @__PURE__ */ new Set();
        for (let i = 0; i < classes.length; ++i) {
          const className = classes[i];
          if (className && !options.hiddenClassList?.includes(className) && !foundClasses.has(className)) {
            foundClasses.add(className);
          }
        }
        viewInput.classes = [...foundClasses];
      }
    }
    if (isPseudo) {
      const pseudoIdentifier = this.#node.pseudoIdentifier();
      let pseudoText = "::" + this.#node.pseudoType();
      if (pseudoIdentifier) {
        pseudoText += `(${pseudoIdentifier})`;
      }
      viewInput.pseudo = pseudoText;
    }
    this.#view(viewInput, {}, this.contentElement);
  }
};
var DEFERRED_DEFAULT_VIEW = (input, _output, target) => {
  render8(html8`
      <style>${domLinkifier_css_default}</style>
      <button class="node-link text-button link-style"
          jslog=${VisualLogging5.link("node").track({ click: true })}
          tabindex=${input.preventKeyboardFocus ? -1 : 0}
          @click=${input.onClick}
          @mousedown=${(e) => e.consume()}>
        <slot></slot>
      </button>`, target);
};
var DeferredDOMNodeLink = class extends UI11.Widget.Widget {
  #deferredNode = void 0;
  #options = void 0;
  #view;
  constructor(element, deferredNode, options, view = DEFERRED_DEFAULT_VIEW) {
    super(element, { useShadowDom: true });
    this.element.classList.remove("vbox");
    this.#deferredNode = deferredNode;
    this.#options = options;
    this.#view = view;
    this.performUpdate();
  }
  performUpdate() {
    const viewInput = {
      preventKeyboardFocus: this.#options?.preventKeyboardFocus,
      onClick: () => {
        this.#deferredNode?.resolve?.((node) => {
          void Common6.Revealer.reveal(node);
          void node?.scrollIntoView();
        });
      }
    };
    this.#view(viewInput, {}, this.contentElement);
  }
};
var linkifierInstance;
var Linkifier2 = class _Linkifier {
  static instance(opts = { forceNew: null }) {
    const { forceNew } = opts;
    if (!linkifierInstance || forceNew) {
      linkifierInstance = new _Linkifier();
    }
    return linkifierInstance;
  }
  linkify(node, options) {
    if (node instanceof SDK3.DOMModel.DOMNode) {
      const link5 = document.createElement("devtools-widget");
      link5.widgetConfig = UI11.Widget.widgetConfig((e) => new DOMNodeLink(e, node, options));
      return link5;
    }
    if (node instanceof SDK3.DOMModel.DeferredDOMNode) {
      const link5 = document.createElement("devtools-widget");
      link5.widgetConfig = UI11.Widget.widgetConfig((e) => new DeferredDOMNodeLink(e, node, options));
      return link5;
    }
    throw new Error("Can't linkify non-node");
  }
};

// gen/front_end/panels/common/common.prebundle.js
var UIStrings6 = {
  /**
   * @description Text for the cancel button in the dialog.
   */
  cancel: "Cancel",
  /**
   * @description Text for the allow button in the "type to allow" dialog.
   */
  allow: "Allow"
};
var str_6 = i18n19.i18n.registerUIStrings("panels/common/common.ts", UIStrings6);
var i18nString6 = i18n19.i18n.getLocalizedString.bind(void 0, str_6);
var TypeToAllowDialog = class {
  static async show(options) {
    const dialog2 = new UI12.Dialog.Dialog(options.jslogContext.dialog);
    dialog2.setMaxContentSize(new Geometry2.Size(504, 340));
    dialog2.setSizeBehavior(
      "SetExactWidthMaxHeight"
      /* UI.GlassPane.SizeBehavior.SET_EXACT_WIDTH_MAX_HEIGHT */
    );
    dialog2.setDimmed(true);
    const shadowRoot = UI12.UIUtils.createShadowRootWithCoreStyles(dialog2.contentElement, { cssFile: common_css_default });
    const content = shadowRoot.createChild("div", "type-to-allow-dialog");
    const result = await new Promise((resolve) => {
      const header = content.createChild("div", "header");
      header.createChild("div", "title").textContent = options.header;
      const closeButton = header.createChild("dt-close-button", "dialog-close-button");
      closeButton.setTabbable(true);
      self.onInvokeElement(closeButton, (event) => {
        dialog2.hide();
        event.consume(true);
        resolve(false);
      });
      closeButton.setSize(
        "SMALL"
        /* Buttons.Button.Size.SMALL */
      );
      content.createChild("div", "message").textContent = options.message;
      const input = UI12.UIUtils.createInput("text-input", "text", options.jslogContext.input);
      input.placeholder = options.inputPlaceholder;
      content.appendChild(input);
      const buttonsBar = content.createChild("div", "button");
      const cancelButton = UI12.UIUtils.createTextButton(i18nString6(UIStrings6.cancel), () => resolve(false), { jslogContext: "cancel" });
      const allowButton = UI12.UIUtils.createTextButton(i18nString6(UIStrings6.allow), () => {
        resolve(input.value === options.typePhrase);
      }, {
        jslogContext: "confirm",
        variant: "primary"
        /* Buttons.Button.Variant.PRIMARY */
      });
      allowButton.disabled = true;
      buttonsBar.appendChild(allowButton);
      buttonsBar.appendChild(cancelButton);
      input.addEventListener("input", () => {
        allowButton.disabled = !Boolean(input.value);
      }, false);
      input.addEventListener("paste", (e) => e.preventDefault());
      input.addEventListener("drop", (e) => e.preventDefault());
      dialog2.setOutsideClickCallback((event) => {
        event.consume();
        resolve(false);
      });
      dialog2.show();
      Host7.userMetrics.actionTaken(Host7.UserMetrics.Action.SelfXssWarningDialogShown);
    });
    dialog2.hide();
    return result;
  }
};
export {
  AiCodeCompletionDisclaimer,
  AiCodeCompletionSummaryToolbar,
  AiCodeCompletionTeaser,
  BadgeNotification,
  DOMLinkifier_exports as DOMLinkifier,
  ExtensionPanel_exports as ExtensionPanel,
  ExtensionServer_exports as ExtensionServer,
  ExtensionView_exports as ExtensionView,
  FreDialog,
  GdpSignUpDialog,
  PersistenceUtils_exports as PersistenceUtils,
  TypeToAllowDialog
};
//# sourceMappingURL=common.js.map

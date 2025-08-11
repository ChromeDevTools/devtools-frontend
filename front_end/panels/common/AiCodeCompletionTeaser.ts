// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Root from '../../core/root/root.js';
import * as Snackbars from '../../ui/components/snackbars/snackbars.js';
import * as UI from '../../ui/legacy/legacy.js';
import {html, nothing, render} from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import styles from './aiCodeCompletionTeaser.css.js';
import {FreDialog} from './FreDialog.js';

const UIStringsNotTranslate = {
  /**
   * @description Text for `ctrl` key.
   */
  ctrl: 'ctrl',
  /**
   * @description Text for `cmd` key.
   */
  cmd: 'cmd',
  /**
   * @description Text for `i` key.
   */
  i: 'i',
  /**
   * @description Text for `x` key.
   */
  x: 'x',
  /**
   * @description Text for dismissing teaser.
   */
  dontShowAgain: 'Don\'t show again',
  /**
   * @description Text for teaser to turn on code suggestions.
   */
  toTurnOnCodeSuggestions: 'to turn on code suggestions.',
  /**
   * @description Text for snackbar notification on dismissing the teaser.
   */
  turnOnCodeSuggestionsAtAnyTimeInSettings: 'Turn on code suggestions at any time in Settings',
  /**
   * @description Text for snackbar action button to manage settings.
   */
  manage: 'Manage',
  /**
   * @description The footer disclaimer that links to more information
   * about the AI feature.
   */
  learnMore: 'Learn more about AI code completion',
  /**
   * @description Header text for the AI-powered suggestions disclaimer dialog.
   */
  freDisclaimerHeader: 'Code faster with AI-powered suggestions',
  /**
   * @description First disclaimer item text for the fre dialog.
   */
  freDisclaimerTextAiWontAlwaysGetItRight: 'This feature uses AI and won’t always get it right',
  /**
   * @description Second disclaimer item text for the fre dialog.
   */
  freDisclaimerTextPrivacy:
      'To generate code suggestions, your console input, the history of your current console session, the currently inspected CSS, and the contents of the currently open file are shared with Google. This data may be seen by human reviewers to improve this feature.',
  /**
   * @description Second disclaimer item text for the fre dialog when enterprise logging is off.
   */
  freDisclaimerTextPrivacyNoLogging:
      'To generate code suggestions, your console input, the history of your current console session, the currently inspected CSS, and the contents of the currently open file are shared with Google. This data will not be used to improve Google’s AI models. Your organization may change these settings at any time.',
  /**
   * @description Third disclaimer item text for the fre dialog.
   */
  freDisclaimerTextUseWithCaution: 'Use generated code snippets with caution',
  /**
   *@description Text for ARIA label for the teaser.
   */
  press: 'Press',
  /**
   *@description Text for ARIA label for the teaser.
   */
  toDisableCodeSuggestions: 'to disable code suggestions.',
} as const;

const lockedString = i18n.i18n.lockedString;
const CODE_SNIPPET_WARNING_URL = 'https://support.google.com/legal/answer/13505487';

export interface ViewInput {
  aidaAvailability: Host.AidaClient.AidaAccessPreconditions;
  onAction: (event: Event) => void;
  onDismiss: (event: Event) => void;
}

export type View = (input: ViewInput, output: object, target: HTMLElement) => void;

export const DEFAULT_VIEW: View = (input, _output, target) => {
  if (input.aidaAvailability !== Host.AidaClient.AidaAccessPreconditions.AVAILABLE) {
    render(nothing, target);
    return;
  }
  const cmdOrCtrl =
      Host.Platform.isMac() ? lockedString(UIStringsNotTranslate.cmd) : lockedString(UIStringsNotTranslate.ctrl);
  const teaserAriaLabel = lockedString(UIStringsNotTranslate.press) + ' ' + cmdOrCtrl + ' ' +
      lockedString(UIStringsNotTranslate.i) + ' ' + lockedString(UIStringsNotTranslate.toTurnOnCodeSuggestions) + ' ' +
      lockedString(UIStringsNotTranslate.press) + ' ' + cmdOrCtrl + ' ' + lockedString(UIStringsNotTranslate.x) + ' ' +
      lockedString(UIStringsNotTranslate.toDisableCodeSuggestions);
  // clang-format off
  render(
        html`
          <style>${styles}</style>
          <div class="ai-code-completion-teaser-screen-reader-only">${teaserAriaLabel}</div>
          <div class="ai-code-completion-teaser" aria-hidden="true">
            <span class="ai-code-completion-teaser-action">
              <span>${cmdOrCtrl}</span>
              <span>${lockedString(UIStringsNotTranslate.i)}</span>
            </span>
            </span>&nbsp;${lockedString(UIStringsNotTranslate.toTurnOnCodeSuggestions)}&nbsp;
            <span role="button" class="ai-code-completion-teaser-dismiss" @click=${input.onDismiss}
              jslog=${VisualLogging.action('ai-code-completion-teaser.dismiss').track({click: true})}>
                ${lockedString(UIStringsNotTranslate.dontShowAgain)}
            </span>
          </div>
        `, target
      );
  // clang-format on
};

interface AiCodeCompletionTeaserConfig {
  onDetach: () => void;
}

export class AiCodeCompletionTeaser extends UI.Widget.Widget {
  readonly #view: View;

  #aidaAvailability = Host.AidaClient.AidaAccessPreconditions.NO_ACCOUNT_EMAIL;
  #boundOnAidaAvailabilityChange: () => Promise<void>;
  #onDetach: () => void;

  // Whether the user completed first run experience dialog or not.
  #aiCodeCompletionFreCompletedSetting =
      Common.Settings.Settings.instance().createSetting('ai-code-completion-enabled', false);
  // Whether the user dismissed the teaser or not.
  #aiCodeCompletionTeaserDismissedSetting =
      Common.Settings.Settings.instance().createSetting('ai-code-completion-teaser-dismissed', false);

  #noLogging: boolean;  // Whether the enterprise setting is `ALLOW_WITHOUT_LOGGING` or not.

  constructor(config: AiCodeCompletionTeaserConfig, view?: View) {
    super();
    this.markAsExternallyManaged();
    this.#onDetach = config.onDetach;
    this.#view = view ?? DEFAULT_VIEW;
    this.#boundOnAidaAvailabilityChange = this.#onAidaAvailabilityChange.bind(this);
    this.#noLogging = Root.Runtime.hostConfig.aidaAvailability?.enterprisePolicyValue ===
        Root.Runtime.GenAiEnterprisePolicyValue.ALLOW_WITHOUT_LOGGING;
    this.requestUpdate();
  }

  #showReminderSnackbar(): void {
    Snackbars.Snackbar.Snackbar.show({
      message: lockedString(UIStringsNotTranslate.turnOnCodeSuggestionsAtAnyTimeInSettings),
      actionProperties: {
        label: lockedString(UIStringsNotTranslate.manage),
        onClick: () => {
          void UI.ViewManager.ViewManager.instance().showView('chrome-ai');
        },
      },
      closable: true,
    });
  }

  async #onAidaAvailabilityChange(): Promise<void> {
    const currentAidaAvailability = await Host.AidaClient.AidaClient.checkAccessPreconditions();
    if (currentAidaAvailability !== this.#aidaAvailability) {
      this.#aidaAvailability = currentAidaAvailability;
      this.requestUpdate();
    }
  }

  onAction = async(event: Event): Promise<void> => {
    event.preventDefault();
    const result = await FreDialog.show({
      header: {iconName: 'smart-assistant', text: lockedString(UIStringsNotTranslate.freDisclaimerHeader)},
      reminderItems: [
        {
          iconName: 'psychiatry',
          content: lockedString(UIStringsNotTranslate.freDisclaimerTextAiWontAlwaysGetItRight),
        },
        {
          iconName: 'google',
          content: this.#noLogging ? lockedString(UIStringsNotTranslate.freDisclaimerTextPrivacyNoLogging) :
                                     lockedString(UIStringsNotTranslate.freDisclaimerTextPrivacy),
        },
        {
          iconName: 'warning',
          // clang-format off
          content: html`<x-link
            href=${CODE_SNIPPET_WARNING_URL}
            class="link devtools-link"
            jslog=${VisualLogging.link('code-snippets-explainer.ai-code-completion-teaser').track({
              click: true
            })}
          >${lockedString(UIStringsNotTranslate.freDisclaimerTextUseWithCaution)}</x-link>`,
          // clang-format on
        }
      ],
      onLearnMoreClick: () => {
        void UI.ViewManager.ViewManager.instance().showView('chrome-ai');
      },
      ariaLabel: lockedString(UIStringsNotTranslate.freDisclaimerHeader),
      learnMoreButtonAriaLabel: lockedString(UIStringsNotTranslate.learnMore),
    });

    if (result) {
      this.#aiCodeCompletionFreCompletedSetting.set(true);
      this.detach();
    } else {
      this.requestUpdate();
    }
  };

  onDismiss = (event: Event): void => {
    event.preventDefault();
    this.#aiCodeCompletionTeaserDismissedSetting.set(true);
    this.#showReminderSnackbar();
    this.detach();
  };

  override performUpdate(): void {
    const output = {};
    this.#view(
        {
          aidaAvailability: this.#aidaAvailability,
          onAction: this.onAction,
          onDismiss: this.onDismiss,
        },
        output, this.contentElement);
  }

  override wasShown(): void {
    super.wasShown();
    Host.AidaClient.HostConfigTracker.instance().addEventListener(
        Host.AidaClient.Events.AIDA_AVAILABILITY_CHANGED, this.#boundOnAidaAvailabilityChange);
    void this.#onAidaAvailabilityChange();
  }

  override willHide(): void {
    super.willHide();
    Host.AidaClient.HostConfigTracker.instance().removeEventListener(
        Host.AidaClient.Events.AIDA_AVAILABILITY_CHANGED, this.#boundOnAidaAvailabilityChange);
  }

  override onDetach(): void {
    this.#onDetach();
  }
}

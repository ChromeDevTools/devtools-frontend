// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Snackbars from '../../ui/components/snackbars/snackbars.js';
import * as UI from '../../ui/legacy/legacy.js';
import {html, nothing, render} from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import styles from './aiCodeCompletionTeaser.css.js';

const UIStringsNotTranslate = {
  /**
   *@description Text for `ctrl` key.
   */
  ctrl: 'ctrl',
  /**
   *@description Text for `cmd` key.
   */
  cmd: 'cmd',
  /**
   *@description Text for `i` key.
   */
  i: 'i',
  /**
   *@description Text for dismissing teaser.
   */
  dontShowAgain: 'Don\'t show again',
  /**
   *@description Text for teaser to turn on code suggestions.
   */
  toTurnOnCodeSuggestions: 'to turn on code suggestions.',
  /**
   *@description Text for snackbar notification on dismissing the teaser.
   */
  turnOnCodeSuggestionsAtAnyTimeInSettings: 'Turn on code suggestions at any time in Settings',
  /**
   *@description Text for snackbar action button to manage settings.
   */
  manage: 'Manage',
} as const;

const lockedString = i18n.i18n.lockedString;

export interface ViewInput {
  aidaAvailability: Host.AidaClient.AidaAccessPreconditions;
  onAction: (event: Event) => void;
  onDismiss: (event: Event) => void;
}

export type View = (input: ViewInput, output: object, target: HTMLElement) => void;

export const DEFAULT_VIEW: View = (input, _output, target) => {
  if (input.aidaAvailability !== Host.AidaClient.AidaAccessPreconditions.AVAILABLE) {
    render(nothing, target, {host: input});
    return;
  }
  const cmdOrCtrl =
      Host.Platform.isMac() ? lockedString(UIStringsNotTranslate.cmd) : lockedString(UIStringsNotTranslate.ctrl);
  // TODO: Add ARIA labels
  // clang-format off
  render(
        html`
          <style>${styles}</style>
          <div class="ai-code-completion-teaser">
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
        `, target, {host: input}
      );
  // clang-format on
};

export class AiCodeCompletionTeaser extends UI.Widget.Widget {
  readonly #view: View;

  #aidaAvailability = Host.AidaClient.AidaAccessPreconditions.NO_ACCOUNT_EMAIL;
  #boundOnAidaAvailabilityChange: () => Promise<void>;

  // Whether the user completed first run experience dialog or not.
  #aiCodeCompletionFreCompletedSetting =
      Common.Settings.Settings.instance().createSetting('ai-code-completion-fre-completed', false);
  // Whether the user dismissed the teaser or not.
  #aiCodeCompletionTeaserDismissedSetting =
      Common.Settings.Settings.instance().createSetting('ai-code-completion-teaser-dismissed', false);

  constructor(view?: View) {
    super();
    this.#view = view ?? DEFAULT_VIEW;
    this.#boundOnAidaAvailabilityChange = this.#onAidaAvailabilityChange.bind(this);
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

  readonly #onKeyDown = (event: KeyboardEvent): void => {
    const keyboardEvent = (event as KeyboardEvent);
    if (UI.KeyboardShortcut.KeyboardShortcut.eventHasCtrlEquivalentKey(keyboardEvent)) {
      if (keyboardEvent.key === 'i') {
        keyboardEvent.consume(true);
        this.onAction(event);
        void VisualLogging.logKeyDown(event.currentTarget, event, 'ai-code-completion-teaser.fre');
      } else if (keyboardEvent.key === 'x') {
        keyboardEvent.consume(true);
        this.onDismiss(event);
        void VisualLogging.logKeyDown(event.currentTarget, event, 'ai-code-completion-teaser.dismiss');
      }
    }
  };

  onAction = (event: Event): void => {
    event.preventDefault();
    // TODO: Add logic for FRE dialog and updating setting
    this.requestUpdate();
  };

  onDismiss = (event: Event): void => {
    event.preventDefault();
    this.#aiCodeCompletionTeaserDismissedSetting.set(true);
    this.#showReminderSnackbar();
    this.detach();
  };

  override performUpdate(): void {
    if (this.#aiCodeCompletionFreCompletedSetting.get() || this.#aiCodeCompletionTeaserDismissedSetting.get()) {
      this.detach();
      return;
    }
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
    document.body.addEventListener('keydown', this.#onKeyDown);
    Host.AidaClient.HostConfigTracker.instance().addEventListener(
        Host.AidaClient.Events.AIDA_AVAILABILITY_CHANGED, this.#boundOnAidaAvailabilityChange);
    void this.#onAidaAvailabilityChange();
  }

  override willHide(): void {
    document.body.removeEventListener('keydown', this.#onKeyDown);
    Host.AidaClient.HostConfigTracker.instance().removeEventListener(
        Host.AidaClient.Events.AIDA_AVAILABILITY_CHANGED, this.#boundOnAidaAvailabilityChange);
  }
}

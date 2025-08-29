// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import '../../ui/components/spinners/spinners.js';
import '../../ui/components/tooltips/tooltips.js';

import * as i18n from '../../core/i18n/i18n.js';
import * as Root from '../../core/root/root.js';
import * as UI from '../../ui/legacy/legacy.js';
import {Directives, html, nothing, render} from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import styles from './aiCodeCompletionDisclaimer.css.js';

const UIStringsNotTranslate = {
  /**
   * @description Disclaimer text for AI code completion
   */
  relevantData: 'Relevant data',
  /**
   * @description Disclaimer text for AI code completion
   */
  isSentToGoogle: 'is sent to Google',
  /**
   * @description Text for tooltip shown on hovering over "Relevant Data" in the disclaimer text for AI code completion.
   */
  tooltipDisclaimerTextForAiCodeCompletion:
      'To generate code suggestions, your console input and the history of your current console session are shared with Google. This data may be seen by human reviewers to improve this feature.',
  /**
   * @description Text for tooltip shown on hovering over "Relevant Data" in the disclaimer text for AI code completion.
   */
  tooltipDisclaimerTextForAiCodeCompletionNoLogging:
      'To generate code suggestions, your console input and the history of your current console session are shared with Google. This data will not be used to improve Google’s AI models.',
  /**
   * @description Text for tooltip button which redirects to AI settings
   */
  manageInSettings: 'Manage in settings',
  /**
   *@description Text announced when request is sent to AIDA and the spinner is loading
   */
  dataIsBeingSentToGoogle: 'Data is being sent to Google',
} as const;

const lockedString = i18n.i18n.lockedString;

export interface ViewInput {
  disclaimerTooltipId?: string;
  noLogging: boolean;
  onManageInSettingsTooltipClick: () => void;
}

export interface ViewOutput {
  hideTooltip?: () => void;
  setLoading?: (isLoading: boolean) => void;
}

export type View = (input: ViewInput, output: ViewOutput, target: HTMLElement) => void;

export const DEFAULT_SUMMARY_TOOLBAR_VIEW: View =
    (input, output, target) => {
      if (!input.disclaimerTooltipId) {
        render(nothing, target);
        return;
      }
      // clang-format off
  render(
    html`
        <style>${styles}</style>
        <div class="ai-code-completion-disclaimer"><devtools-spinner
          .active=${false}
          ${Directives.ref(el => {
            if (el instanceof HTMLElement) {
              output.setLoading = (isLoading: boolean) => {
                el.toggleAttribute('active', isLoading);
              };
            }
          })}></devtools-spinner>
          <span
              tabIndex="0"
              class="link"
              role="link"
              jslog=${VisualLogging.link('open-ai-settings').track({
                click: true,
              })}
              aria-details=${input.disclaimerTooltipId}
              aria-describedby=${input.disclaimerTooltipId}
              @click=${() => {
                void UI.ViewManager.ViewManager.instance().showView('chrome-ai');
              }}
          >${lockedString(UIStringsNotTranslate.relevantData)}</span>${lockedString(UIStringsNotTranslate.isSentToGoogle)}
          <devtools-tooltip
              id=${input.disclaimerTooltipId}
              variant=${'rich'}
              jslogContext=${'ai-code-completion-disclaimer'}
              ${Directives.ref(el => {
                if (el instanceof HTMLElement) {
                  output.hideTooltip = () => {
                    el.hidePopover();
                  };
                }
              })}>
            <div class="disclaimer-tooltip-container"><div class="tooltip-text">
                ${input.noLogging ? lockedString(UIStringsNotTranslate.tooltipDisclaimerTextForAiCodeCompletionNoLogging) : lockedString(UIStringsNotTranslate.tooltipDisclaimerTextForAiCodeCompletion)}
                </div>
                <span
                    tabIndex="0"
                    class="link"
                    role="link"
                    jslog=${VisualLogging.link('open-ai-settings').track({
                      click: true,
                    })}
                    @click=${input.onManageInSettingsTooltipClick}
                >${lockedString(UIStringsNotTranslate.manageInSettings)}</span></div></devtools-tooltip>
          </div>
        `, target);
      // clang-format on
    };

const MINIMUM_LOADING_STATE_TIMEOUT = 1000;

export class AiCodeCompletionDisclaimer extends UI.Widget.Widget {
  readonly #view: View;
  #viewOutput: ViewOutput = {};

  #disclaimerTooltipId?: string;
  #noLogging: boolean;  // Whether the enterprise setting is `ALLOW_WITHOUT_LOGGING` or not.
  #loading = false;
  #loadingStartTime = 0;
  #spinnerLoadingTimeout: number|undefined;

  constructor(element?: HTMLElement, view: View = DEFAULT_SUMMARY_TOOLBAR_VIEW) {
    super(element);
    this.markAsExternallyManaged();
    this.#noLogging = Root.Runtime.hostConfig.aidaAvailability?.enterprisePolicyValue ===
        Root.Runtime.GenAiEnterprisePolicyValue.ALLOW_WITHOUT_LOGGING;
    this.#view = view;
  }

  set disclaimerTooltipId(disclaimerTooltipId: string) {
    this.#disclaimerTooltipId = disclaimerTooltipId;
    this.requestUpdate();
  }

  set loading(loading: boolean) {
    if (!loading && !this.#loading) {
      return;
    }

    if (loading) {
      if (!this.#loading) {
        this.#viewOutput.setLoading?.(true);
        UI.ARIAUtils.LiveAnnouncer.status(lockedString(UIStringsNotTranslate.dataIsBeingSentToGoogle));
      }
      if (this.#spinnerLoadingTimeout) {
        clearTimeout(this.#spinnerLoadingTimeout);
        this.#spinnerLoadingTimeout = undefined;
      }
      this.#loadingStartTime = performance.now();
      this.#loading = true;
    } else {
      this.#loading = false;
      const duration = performance.now() - this.#loadingStartTime;
      const remainingTime = Math.max(MINIMUM_LOADING_STATE_TIMEOUT - duration, 0);
      this.#spinnerLoadingTimeout = window.setTimeout(() => {
        this.#viewOutput.setLoading?.(false);
        this.#spinnerLoadingTimeout = undefined;
      }, remainingTime);
    }
  }

  #onManageInSettingsTooltipClick(): void {
    this.#viewOutput.hideTooltip?.();
    void UI.ViewManager.ViewManager.instance().showView('chrome-ai');
  }

  override performUpdate(): void {
    this.#view(
        {
          disclaimerTooltipId: this.#disclaimerTooltipId,
          noLogging: this.#noLogging,
          onManageInSettingsTooltipClick: this.#onManageInSettingsTooltipClick.bind(this),
        },
        this.#viewOutput, this.contentElement);
  }
}

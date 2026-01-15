// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import '../../ui/components/tooltips/tooltips.js';

import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Root from '../../core/root/root.js';
import * as AiCodeCompletion from '../../models/ai_code_completion/ai_code_completion.js';
import * as Buttons from '../../ui/components/buttons/buttons.js';
import * as UI from '../../ui/legacy/legacy.js';
import {Directives, html, nothing, render} from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import styles from './aiCodeGenerationTeaser.css.js';

const UIStringsNotTranslate = {
  /**
   * @description Text for teaser to generate code.
   */
  ctrlItoGenerateCode: 'Ctrl+I to generate code',
  /**
   * @description Text for teaser to generate code in Mac.
   */
  cmdItoGenerateCode: 'Cmd+I to generate code',
  /**
   * @description Text for teaser when generating suggestion.
   */
  generating: 'Generating... (esc to cancel)',
  /**
   * @description Text for teaser for discoverability.
   */
  writeACommentToGenerateCode: 'Write a comment to generate code',
  /**
   * @description Text for teaser when suggestion has been generated.
   */
  tab: 'tab',
  /**
   * @description Text for teaser when suggestion has been generated.
   */
  toAccept: 'to accept',
  /**
   * @description Text for tooltip shown on hovering over "Relevant Data" in the disclaimer text for AI code generation in Console panel.
   */
  tooltipDisclaimerTextForAiCodeGenerationInConsole:
      'To generate code suggestions, your console input and the history of your current console session are shared with Google. This data may be seen by human reviewers to improve this feature.',
  /**
   * @description Text for tooltip shown on hovering over "Relevant Data" in the disclaimer text for AI code generation in Console panel.
   */
  tooltipDisclaimerTextForAiCodeGenerationNoLoggingInConsole:
      'To generate code suggestions, your console input and the history of your current console session are shared with Google. This data will not be used to improve Google’s AI models. Your organization may change these settings at any time.',
  /**
   * @description Text for tooltip shown on hovering over "Relevant Data" in the disclaimer text for AI code generation in Sources panel.
   */
  tooltipDisclaimerTextForAiCodeGenerationInSources:
      'To generate code suggestions, the contents of the currently open file are shared with Google. This data may be seen by human reviewers to improve this feature.',
  /**
   * @description Text for tooltip shown on hovering over "Relevant Data" in the disclaimer text for AI code generation in Sources panel.
   */
  tooltipDisclaimerTextForAiCodeGenerationNoLoggingInSources:
      'To generate code suggestions, the contents of the currently open file are shared with Google. This data will not be used to improve Google’s AI models. Your organization may change these settings at any time.',
  /**
   * @description Text for tooltip button which redirects to AI settings
   */
  manageInSettings: 'Manage in settings',
  /**
   * @description Title for disclaimer info button in the teaser to generate code.
   */
  learnMoreAboutHowYourDataIsBeingUsed: 'Learn more about how your data is being used',
} as const;

const lockedString = i18n.i18n.lockedString;
export const PROMOTION_ID = 'ai-code-generation';

export enum AiCodeGenerationTeaserDisplayState {
  TRIGGER = 'trigger',
  DISCOVERY = 'discovery',
  LOADING = 'loading',
  GENERATED = 'generated',
}

function getTooltipDisclaimerText(noLogging: boolean, panel: AiCodeCompletion.AiCodeCompletion.ContextFlavor): string {
  switch (panel) {
    case AiCodeCompletion.AiCodeCompletion.ContextFlavor.CONSOLE:
      return noLogging ?
          lockedString(UIStringsNotTranslate.tooltipDisclaimerTextForAiCodeGenerationNoLoggingInConsole) :
          lockedString(UIStringsNotTranslate.tooltipDisclaimerTextForAiCodeGenerationInConsole);
    case AiCodeCompletion.AiCodeCompletion.ContextFlavor.SOURCES:
      return noLogging ?
          lockedString(UIStringsNotTranslate.tooltipDisclaimerTextForAiCodeGenerationNoLoggingInSources) :
          lockedString(UIStringsNotTranslate.tooltipDisclaimerTextForAiCodeGenerationInSources);
  }
}

export interface ViewInput {
  displayState: AiCodeGenerationTeaserDisplayState;
  disclaimerTooltipId?: string;
  noLogging: boolean;
  onManageInSettingsTooltipClick: (event: Event) => void;
  // TODO(b/472268298): Remove ContextFlavor explicitly and pass required values
  panel?: AiCodeCompletion.AiCodeCompletion.ContextFlavor;
}

export interface ViewOutput {
  hideTooltip?: () => void;
  setTimerText?: (text: string) => void;
}

export type View = (input: ViewInput, output: ViewOutput, target: HTMLElement) => void;

export const DEFAULT_VIEW: View = (input, output, target) => {
  if (!input.panel) {
    render(nothing, target);
    return;
  }

  let teaserLabel;
  switch (input.displayState) {
    case AiCodeGenerationTeaserDisplayState.TRIGGER: {
      if (!input.disclaimerTooltipId) {
        render(nothing, target);
        return;
      }
      const toGenerateCode = Host.Platform.isMac() ? lockedString(UIStringsNotTranslate.cmdItoGenerateCode) :
                                                     lockedString(UIStringsNotTranslate.ctrlItoGenerateCode);
      const tooltipDisclaimerText = getTooltipDisclaimerText(input.noLogging, input.panel);
      // TODO(b/472291834): Disclaimer icon should match the placeholder's color
      // clang-format off
      teaserLabel = html`<div class="ai-code-generation-teaser-trigger">
        ${toGenerateCode}&nbsp;<devtools-button
          .data=${{
              title: lockedString(UIStringsNotTranslate.learnMoreAboutHowYourDataIsBeingUsed),
              size: Buttons.Button.Size.MICRO,
              iconName: 'info',
              variant: Buttons.Button.Variant.ICON,
              jslogContext: 'ai-code-generation-teaser.info-button',
            } as Buttons.Button.ButtonData}
            aria-details=${input.disclaimerTooltipId}
            aria-describedby=${input.disclaimerTooltipId}
          ></devtools-button>
          <devtools-tooltip
              id=${input.disclaimerTooltipId}
              variant="rich"
              jslogContext="ai-code-generation-disclaimer"
              ${Directives.ref(el => {
                if (el instanceof HTMLElement) {
                  output.hideTooltip = () => {
                    el.hidePopover();
                  };
                }
              })}>
            <div class="disclaimer-tooltip-container"><div class="tooltip-text">
                ${tooltipDisclaimerText}
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
                  </div>`;
      // clang-format on
      break;
    }

    case AiCodeGenerationTeaserDisplayState.DISCOVERY: {
      const newBadge = UI.UIUtils.maybeCreateNewBadge(PROMOTION_ID);
      teaserLabel = newBadge ?
          html`${lockedString(UIStringsNotTranslate.writeACommentToGenerateCode)}&nbsp;${newBadge}` :
          nothing;
      break;
    }

    case AiCodeGenerationTeaserDisplayState.LOADING: {
      // clang-format off
      teaserLabel = html`
        <span class="ai-code-generation-spinner"></span>&nbsp;${lockedString(UIStringsNotTranslate.generating)}&nbsp;
        <span class="ai-code-generation-timer" ${Directives.ref(el => {
          if (el) {
            output.setTimerText = (text: string) => {
              el.textContent = text;
            };
          }
        })}></span>`;
      // clang-format on
      break;
    }

    case AiCodeGenerationTeaserDisplayState.GENERATED: {
      // clang-format off
      teaserLabel = html`<div class="ai-code-generation-teaser-generated">
          <span>${lockedString(UIStringsNotTranslate.tab)}</span>
          &nbsp;${lockedString(UIStringsNotTranslate.toAccept)}
        </div>`;
      // clang-format on
      break;
    }
  }

  // clang-format off
  render(
        html`
          <style>${styles}</style>
          <style>@scope to (devtools-widget > *) { ${UI.inspectorCommonStyles} }</style>
          <div class="ai-code-generation-teaser">
            ${teaserLabel}
          </div>
        `, target
      );
  // clang-format on
};

// TODO(b/448063927): Add "Dont show again" for discovery teaser.
export class AiCodeGenerationTeaser extends UI.Widget.Widget {
  readonly #view: View;
  #viewOutput: ViewOutput = {};

  #displayState = AiCodeGenerationTeaserDisplayState.TRIGGER;
  #disclaimerTooltipId?: string;
  #noLogging: boolean;  // Whether the enterprise setting is `ALLOW_WITHOUT_LOGGING` or not.
  #panel?: AiCodeCompletion.AiCodeCompletion.ContextFlavor;
  #timerIntervalId?: number;
  #loadStartTime?: number;

  constructor(view?: View) {
    super();
    this.markAsExternallyManaged();
    this.#noLogging = Root.Runtime.hostConfig.aidaAvailability?.enterprisePolicyValue ===
        Root.Runtime.GenAiEnterprisePolicyValue.ALLOW_WITHOUT_LOGGING;
    this.#view = view ?? DEFAULT_VIEW;
    this.requestUpdate();
  }

  override performUpdate(): void {
    this.#view(
        {
          displayState: this.#displayState,
          onManageInSettingsTooltipClick: this.#onManageInSettingsTooltipClick.bind(this),
          disclaimerTooltipId: this.#disclaimerTooltipId,
          noLogging: this.#noLogging,
          panel: this.#panel,
        },
        this.#viewOutput, this.contentElement);
  }

  override willHide(): void {
    super.willHide();
    this.#stopLoadingAnimation();
  }

  get displayState(): AiCodeGenerationTeaserDisplayState {
    return this.#displayState;
  }

  set displayState(displayState: AiCodeGenerationTeaserDisplayState) {
    if (displayState === this.#displayState) {
      return;
    }
    this.#displayState = displayState;
    this.requestUpdate();
    if (this.#displayState === AiCodeGenerationTeaserDisplayState.LOADING) {
      // wait update to complete so that setTimerText has been set properly
      void this.updateComplete.then(() => {
        void this.#startLoadingAnimation();
      });
    } else if (this.#loadStartTime) {
      this.#stopLoadingAnimation();
    }
  }

  #startLoadingAnimation(): void {
    this.#stopLoadingAnimation();
    this.#loadStartTime = performance.now();

    this.#viewOutput.setTimerText?.('(0s)');

    this.#timerIntervalId = window.setInterval(() => {
      if (this.#loadStartTime) {
        const elapsedSeconds = Math.floor((performance.now() - this.#loadStartTime) / 1000);
        this.#viewOutput.setTimerText?.(`(${elapsedSeconds}s)`);
      }
    }, 1000);
  }

  #stopLoadingAnimation(): void {
    if (this.#timerIntervalId) {
      clearInterval(this.#timerIntervalId);
      this.#timerIntervalId = undefined;
    }
    this.#loadStartTime = undefined;
  }

  set disclaimerTooltipId(disclaimerTooltipId: string) {
    this.#disclaimerTooltipId = disclaimerTooltipId;
    this.requestUpdate();
  }

  set panel(panel: AiCodeCompletion.AiCodeCompletion.ContextFlavor) {
    this.#panel = panel;
    this.requestUpdate();
  }

  #onManageInSettingsTooltipClick(event: Event): void {
    event.stopPropagation();
    this.#viewOutput.hideTooltip?.();
    void UI.ViewManager.ViewManager.instance().showView('chrome-ai');
    event.consume(true);
  }
}

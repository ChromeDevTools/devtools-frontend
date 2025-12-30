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
import { Directives, html, nothing, render } from '../../ui/lit/lit.js';
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
     * Text for teaser when generating suggestion.
     */
    generating: 'Generating... (esc to cancel)',
    /**
     * Text for teaser for discoverability.
     */
    writeACommentToGenerateCode: 'Write a comment to generate code',
    /**
     * @description Text for tooltip shown on hovering over "Relevant Data" in the disclaimer text for AI code generation in Console panel.
     */
    tooltipDisclaimerTextForAiCodeGenerationInConsole: 'To generate code suggestions, your console input and the history of your current console session are shared with Google. This data may be seen by human reviewers to improve this feature.',
    /**
     * @description Text for tooltip shown on hovering over "Relevant Data" in the disclaimer text for AI code generation in Console panel.
     */
    tooltipDisclaimerTextForAiCodeGenerationNoLoggingInConsole: 'To generate code suggestions, your console input and the history of your current console session are shared with Google. This data will not be used to improve Google’s AI models. Your organization may change these settings at any time.',
    /**
     * @description Text for tooltip shown on hovering over "Relevant Data" in the disclaimer text for AI code generation in Sources panel.
     */
    tooltipDisclaimerTextForAiCodeGenerationInSources: 'To generate code suggestions, the contents of the currently open file are shared with Google. This data may be seen by human reviewers to improve this feature.',
    /**
     * @description Text for tooltip shown on hovering over "Relevant Data" in the disclaimer text for AI code generation in Sources panel.
     */
    tooltipDisclaimerTextForAiCodeGenerationNoLoggingInSources: 'To generate code suggestions, the contents of the currently open file are shared with Google. This data will not be used to improve Google’s AI models. Your organization may change these settings at any time.',
    /**
     * @description Text for tooltip button which redirects to AI settings
     */
    manageInSettings: 'Manage in settings',
    /**
     * @description Title for disclaimer info button in the teaser to generate code.
     */
    learnMoreAboutHowYourDataIsBeingUsed: 'Learn more about how your data is being used',
};
const lockedString = i18n.i18n.lockedString;
const PROMOTION_ID = 'ai-code-generation';
export var AiCodeGenerationTeaserDisplayState;
(function (AiCodeGenerationTeaserDisplayState) {
    AiCodeGenerationTeaserDisplayState["TRIGGER"] = "trigger";
    AiCodeGenerationTeaserDisplayState["DISCOVERY"] = "discovery";
    AiCodeGenerationTeaserDisplayState["LOADING"] = "loading";
})(AiCodeGenerationTeaserDisplayState || (AiCodeGenerationTeaserDisplayState = {}));
function getTooltipDisclaimerText(noLogging, panel) {
    switch (panel) {
        case "console" /* AiCodeCompletion.AiCodeCompletion.ContextFlavor.CONSOLE */:
            return noLogging ?
                lockedString(UIStringsNotTranslate.tooltipDisclaimerTextForAiCodeGenerationNoLoggingInConsole) :
                lockedString(UIStringsNotTranslate.tooltipDisclaimerTextForAiCodeGenerationInConsole);
        case "sources" /* AiCodeCompletion.AiCodeCompletion.ContextFlavor.SOURCES */:
            return noLogging ?
                lockedString(UIStringsNotTranslate.tooltipDisclaimerTextForAiCodeGenerationNoLoggingInSources) :
                lockedString(UIStringsNotTranslate.tooltipDisclaimerTextForAiCodeGenerationInSources);
    }
}
export const DEFAULT_VIEW = (input, output, target) => {
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
            teaserLabel = html `<div class="ai-code-generation-teaser-trigger">
        ${toGenerateCode}&nbsp;<devtools-button
          .data=${{
                title: lockedString(UIStringsNotTranslate.learnMoreAboutHowYourDataIsBeingUsed),
                size: "MICRO" /* Buttons.Button.Size.MICRO */,
                iconName: 'info',
                variant: "icon" /* Buttons.Button.Variant.ICON */,
                jslogContext: 'ai-code-generation-teaser.info-button',
            }}
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
                html `${lockedString(UIStringsNotTranslate.writeACommentToGenerateCode)}&nbsp;${newBadge}` :
                nothing;
            break;
        }
        case AiCodeGenerationTeaserDisplayState.LOADING: {
            teaserLabel = html `${lockedString(UIStringsNotTranslate.generating)}`;
            break;
        }
    }
    // clang-format off
    render(html `
          <style>${styles}</style>
          <style>@scope to (devtools-widget > *) { ${UI.inspectorCommonStyles} }</style>
          <div class="ai-code-generation-teaser">
            ${teaserLabel}
          </div>
        `, target);
    // clang-format on
};
// TODO(b/448063927): Add "Dont show again" for discovery teaser.
export class AiCodeGenerationTeaser extends UI.Widget.Widget {
    #view;
    #viewOutput = {};
    #displayState = AiCodeGenerationTeaserDisplayState.TRIGGER;
    #disclaimerTooltipId;
    #noLogging; // Whether the enterprise setting is `ALLOW_WITHOUT_LOGGING` or not.
    #panel;
    constructor(view) {
        super();
        this.markAsExternallyManaged();
        this.#noLogging = Root.Runtime.hostConfig.aidaAvailability?.enterprisePolicyValue ===
            Root.Runtime.GenAiEnterprisePolicyValue.ALLOW_WITHOUT_LOGGING;
        this.#view = view ?? DEFAULT_VIEW;
        this.requestUpdate();
    }
    performUpdate() {
        this.#view({
            displayState: this.#displayState,
            onManageInSettingsTooltipClick: this.#onManageInSettingsTooltipClick.bind(this),
            disclaimerTooltipId: this.#disclaimerTooltipId,
            noLogging: this.#noLogging,
            panel: this.#panel,
        }, this.#viewOutput, this.contentElement);
    }
    get displayState() {
        return this.#displayState;
    }
    set displayState(displayState) {
        if (displayState === this.#displayState) {
            return;
        }
        this.#displayState = displayState;
        this.requestUpdate();
    }
    set disclaimerTooltipId(disclaimerTooltipId) {
        this.#disclaimerTooltipId = disclaimerTooltipId;
        this.requestUpdate();
    }
    set panel(panel) {
        this.#panel = panel;
        this.requestUpdate();
    }
    #onManageInSettingsTooltipClick(event) {
        event.stopPropagation();
        this.#viewOutput.hideTooltip?.();
        void UI.ViewManager.ViewManager.instance().showView('chrome-ai');
        event.consume(true);
    }
}
//# sourceMappingURL=AiCodeGenerationTeaser.js.map
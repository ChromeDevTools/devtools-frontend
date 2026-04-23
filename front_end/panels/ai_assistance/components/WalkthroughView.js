// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as i18n from '../../../core/i18n/i18n.js';
import * as AiAssistanceModel from '../../../models/ai_assistance/ai_assistance.js';
import * as Buttons from '../../../ui/components/buttons/buttons.js';
import * as Input from '../../../ui/components/input/input.js';
import * as UI from '../../../ui/legacy/legacy.js';
import * as Lit from '../../../ui/lit/lit.js';
import * as VisualLogging from '../../../ui/visual_logging/visual_logging.js';
import chatMessageStyles from './chatMessage.css.js';
import { renderStep, titleForStep } from './ChatMessage.js';
import { getButtonLabel } from './WalkthroughUtils.js';
import walkthroughViewStyles from './walkthroughView.css.js';
const lockedString = i18n.i18n.lockedString;
const { html, render, Directives } = Lit;
const { ref } = Directives;
const SCROLL_ROUND_OFFSET = 2;
const UIStrings = {
    /**
     * @description Title for the close button in the walkthrough view.
     */
    close: 'Close',
    /**
     * @description Title for the walkthrough view.
     */
    title: 'Agent walkthrough',
    /**
     * @description Title for the button that shows the walkthrough when there are no widgets in the walkthrough.
     */
    showThinking: 'Show thinking',
    /**
     * @description Title for the button that shows the walkthrough when there are widgets in the walkthrough.
     */
    showAgentWalkthrough: 'Show agent walkthrough',
    /**
     * @description Title for the button that hides the walkthrough when there are no widgets in the walkthrough.
     */
    hideThinking: 'Hide thinking',
    /**
     * @description Title for the button that hides the walkthrough when there are widgets in the walkthrough.
     */
    hideAgentWalkthrough: 'Hide agent walkthrough',
    /**
     * @description Aria label for the spinner to be read by screen reader when a step is in progress.
     */
    inProgress: 'In progress',
};
const str_ = i18n.i18n.registerUIStrings('panels/ai_assistance/components/WalkthroughView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export function walkthroughTitle(input) {
    if (input.isLoading) {
        return titleForStep(input.lastStep);
    }
    if (input.hasWidgets) {
        return lockedString(UIStrings.showAgentWalkthrough);
    }
    return lockedString(UIStrings.showThinking);
}
export function walkthroughCloseTitle(input) {
    if (input.isInlined) {
        return i18nString(UIStrings.title);
    }
    if (input.hasWidgets) {
        return lockedString(UIStrings.hideAgentWalkthrough);
    }
    return lockedString(UIStrings.hideThinking);
}
function renderInlineWalkthrough(input, stepsOutput, allSteps) {
    const lastStep = allSteps.at(-1);
    if (!input.isInlined || !lastStep) {
        return Lit.nothing;
    }
    function onToggle(event) {
        const isOpen = event.target.open;
        if (!input.message) {
            return;
        }
        if (isOpen) {
            input.onOpen(input.message);
        }
        else {
            input.onToggle(isOpen, input.message);
        }
    }
    const hasWidgets = allSteps.some(s => s.widgets?.length);
    const icon = AiAssistanceModel.AiUtils.getIconName();
    // clang-format off
    return html `
    <div class="inline-wrapper" ?data-open=${input.isExpanded} jslog=${VisualLogging.section('walkthrough-container')}>
      <span class="inline-icon">
        ${input.isLoading ?
        html `<devtools-spinner aria-label=${lockedString(UIStrings.inProgress)}></devtools-spinner>` :
        html `<devtools-icon name=${icon}></devtools-icon>`}
      </span>
      <details class="walkthrough-inline" ?open=${input.isExpanded} @toggle=${onToggle} jslog=${VisualLogging.expand('walkthrough').track({ click: true })}>
        <summary
          ?data-has-widgets=${!input.isLoading && hasWidgets}
          aria-label=${getButtonLabel({
        isExpanded: input.isExpanded,
        isLoading: input.isLoading,
        hasWidgets,
        prompt: input.prompt,
        stepTitle: titleForStep(lastStep),
    })}
        >
          <h2 class="walkthrough-inline-title">
            ${input.isExpanded ?
        walkthroughCloseTitle({ hasWidgets, isInlined: true }) :
        walkthroughTitle({ isLoading: input.isLoading, lastStep, hasWidgets })}
          </h2>
          <devtools-icon name="chevron-right"></devtools-icon>
        </summary>

        ${stepsOutput}
      </details>
    </div>
  `;
    // clang-format on
}
function renderSidebarWalkthrough(input, stepsOutput, stepsCount) {
    if (input.isInlined) {
        return Lit.nothing;
    }
    // clang-format off
    return html `
    <div class="walkthrough-view" jslog=${VisualLogging.section('walkthrough-container')}>
      <div class="walkthrough-header">
         <h2 class="walkthrough-title">${i18nString(UIStrings.title)}</h2>
         <devtools-button
          .data=${{
        variant: "toolbar" /* Buttons.Button.Variant.TOOLBAR */,
        iconName: 'cross',
        title: i18nString(UIStrings.close),
        jslogContext: 'close-walkthrough',
    }}
          @click=${() => {
        if (input.message) {
            input.onToggle(false, input.message);
        }
    }}
        ></devtools-button>
      </div>
      ${stepsOutput}
      ${stepsCount === 0 ? html `
        <div class="empty-state">
          <p>No walkthrough steps available yet.</p>
        </div>
      ` : Lit.nothing}
    </div>
  `;
    // clang-format on
}
export const DEFAULT_VIEW = (input, output, target) => {
    const allSteps = input.message?.parts.filter(t => t.type === 'step')?.map(p => p.step) ?? [];
    // Ensure that we render steps but not ones that need approval; a
    // step that needs approval is always rendered into the main chat
    // view regardless of if the walkthrough is open or not.
    const renderableSteps = allSteps.filter(s => !s.requestApproval);
    // clang-format off
    const stepsOutput = renderableSteps.length > 0 ? html `
    <div class="steps-container" @scroll=${input.handleScroll} ${ref(el => {
        output.scrollContainer = el;
    })}>
      <div class="steps-scroll-content" ${ref(el => {
        output.stepsContainer = el;
    })}>
        ${renderableSteps.map((step, index) => html `
          <div class="walkthrough-step">
            <span class="step-number">${index + 1}</span>
            <div class="step-wrapper">
              ${renderStep({
        step,
        isLoading: input.isLoading,
        markdownRenderer: input.markdownRenderer,
        isLast: index === renderableSteps.length - 1
    })}
            </div>
          </div>
        `)}
      </div>
    </div>
  ` : Lit.nothing;
    render(html `
    <style>
      ${Input.textInputStyles}
      ${chatMessageStyles}
      ${walkthroughViewStyles}
    </style>
    ${input.isInlined ? renderInlineWalkthrough(input, stepsOutput, allSteps)
        : renderSidebarWalkthrough(input, stepsOutput, renderableSteps.length)}`, target);
    // clang-format on
};
export class WalkthroughView extends UI.Widget.Widget {
    #view;
    #message = null;
    #isLoading = false;
    #markdownRenderer = null;
    #onToggle = () => { };
    #onOpen = () => { };
    #isInlined = false;
    #isExpanded = false;
    #prompt = '';
    #pinScrollToBottom = true;
    #isProgrammaticScroll = false;
    #output = {};
    #stepsContainerResizeObserver = new ResizeObserver(() => this.#handleStepsContainerResize());
    #lastStepsContainerWidth = 0;
    constructor(element, view = DEFAULT_VIEW) {
        super(element);
        this.#view = view;
        this.setMinimumSize(330, 0);
    }
    wasShown() {
        super.wasShown();
        this.#registerResizeObservers();
    }
    willHide() {
        super.willHide();
        this.#stepsContainerResizeObserver.disconnect();
    }
    #registerResizeObservers() {
        if (this.#output.stepsContainer) {
            this.#stepsContainerResizeObserver.observe(this.#output.stepsContainer);
        }
    }
    #handleStepsContainerResize() {
        const width = this.#output.stepsContainer?.offsetWidth ?? 0;
        /**
         * If the width has changed, it's likely due to a manual resize (e.g., the
         * user dragging the sidebar). In these cases, we want to avoid jumping the
         * scroll position to the bottom, as it can be jarring for the user. We
         * only auto-scroll if the width remains the same, meaning only the height
         * has changed (likely due to new content being added).
         */
        if (width !== this.#lastStepsContainerWidth) {
            this.#lastStepsContainerWidth = width;
            return;
        }
        /**
         * We only want to auto-scroll if the walkthrough is "live", which means it's
         * currently loading. If it's not loading, it's a walkthrough for a previous
         * message, and we don't want to jump the user to the bottom if they've
         * scrolled away.
         */
        if (!this.#pinScrollToBottom || !this.#isLoading) {
            return;
        }
        this.scrollToBottom();
    }
    scrollToBottom() {
        if (!this.#output.stepsContainer) {
            return;
        }
        this.#isProgrammaticScroll = true;
        window.requestAnimationFrame(() => {
            const lastElement = this.#output.stepsContainer?.lastElementChild;
            if (lastElement) {
                lastElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'end',
                });
            }
        });
    }
    #handleScroll = (ev) => {
        if (!ev.target || !(ev.target instanceof HTMLElement)) {
            return;
        }
        if (this.#isProgrammaticScroll) {
            // For smooth scrolling, multiple scroll events will be fired.
            // We only reset the flag once we've reached the bottom,
            // or we can just rely on the fact that if it's programmatic,
            // we don't want to change the pinning state based on mid-scroll positions.
            const isAtBottom = ev.target.scrollTop + ev.target.clientHeight + SCROLL_ROUND_OFFSET >= ev.target.scrollHeight;
            if (isAtBottom) {
                this.#isProgrammaticScroll = false;
            }
            return;
        }
        this.#pinScrollToBottom =
            ev.target.scrollTop + ev.target.clientHeight + SCROLL_ROUND_OFFSET >= ev.target.scrollHeight;
    };
    set isLoading(isLoading) {
        this.#isLoading = isLoading;
        this.requestUpdate();
    }
    get isLoading() {
        return this.#isLoading;
    }
    get markdownRenderer() {
        return this.#markdownRenderer;
    }
    set markdownRenderer(markdownRenderer) {
        this.#markdownRenderer = markdownRenderer;
        this.requestUpdate();
    }
    get message() {
        return this.#message;
    }
    get onOpen() {
        return this.#onOpen;
    }
    set onOpen(onOpen) {
        this.#onOpen = onOpen;
        this.requestUpdate();
    }
    set message(message) {
        this.#message = message;
        this.requestUpdate();
    }
    set onToggle(onToggle) {
        this.#onToggle = onToggle;
        this.requestUpdate();
    }
    set isInlined(isInlined) {
        this.#isInlined = isInlined;
        this.requestUpdate();
    }
    set isExpanded(isExpanded) {
        this.#isExpanded = isExpanded;
        this.requestUpdate();
    }
    get prompt() {
        return this.#prompt;
    }
    set prompt(prompt) {
        this.#prompt = prompt;
        this.requestUpdate();
    }
    performUpdate() {
        if (!this.#markdownRenderer) {
            return;
        }
        this.#view({
            isLoading: this.#isLoading,
            markdownRenderer: this.#markdownRenderer,
            onToggle: this.#onToggle,
            onOpen: this.#onOpen,
            isInlined: this.#isInlined,
            isExpanded: this.#isExpanded,
            prompt: this.#prompt,
            message: this.#message,
            handleScroll: this.#handleScroll,
        }, this.#output, this.contentElement);
        this.#registerResizeObservers();
        /**
         * We only want to auto-scroll if the walkthrough is "live", which means it's
         * currently loading. If it's not loading, it's a walkthrough for a previous
         * message, and we don't want to jump the user to the bottom if they've
         * scrolled away.
         */
        if (this.#pinScrollToBottom && this.#isLoading) {
            this.scrollToBottom();
        }
    }
}
//# sourceMappingURL=WalkthroughView.js.map
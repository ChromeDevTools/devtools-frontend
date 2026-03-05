// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as i18n from '../../../core/i18n/i18n.js';
import * as Buttons from '../../../ui/components/buttons/buttons.js';
import * as Input from '../../../ui/components/input/input.js';
import * as UI from '../../../ui/legacy/legacy.js';
import * as Lit from '../../../ui/lit/lit.js';
import chatMessageStyles from './chatMessage.css.js';
import { renderStep, titleForStep } from './ChatMessage.js';
import walkthroughViewStyles from './walkthroughView.css.js';
const lockedString = i18n.i18n.lockedString;
const { html, render } = Lit;
const UIStrings = {
    /**
     * @description Title for the close button in the walkthrough view.
     */
    close: 'Close',
    /**
     * @description Title for the walkthrough view.
     */
    title: 'Investigation steps',
    /**
     * @description Title for the button that shows the thinking process (walkthrough).
     */
    showThinking: 'Show thinking',
};
const str_ = i18n.i18n.registerUIStrings('panels/ai_assistance/components/WalkthroughView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export function walkthroughTitle(input) {
    const title = input.isLoading ? titleForStep(input.lastStep) : lockedString(UIStrings.showThinking);
    return title;
}
function renderInlineWalkthrough(input, stepsOutput, steps) {
    const lastStep = steps.at(-1);
    if (!input.isInlined || !lastStep) {
        return Lit.nothing;
    }
    function onToggle(event) {
        input.onToggle(event.target.open);
    }
    // clang-format off
    return html `
    <details class="walkthrough-inline" ?open=${input.isExpanded} @toggle=${onToggle}>
      <summary>
        ${input.isLoading ? html `<devtools-spinner></devtools-spinner>` : Lit.nothing}
        ${walkthroughTitle({ isLoading: input.isLoading, lastStep, })}
        <devtools-icon name="chevron-down"></devtools-icon>
      </summary>
      ${stepsOutput}
    </details>
  `;
    // clang-format on
}
function renderSidebarWalkthrough(input, stepsOutput, stepsCount) {
    if (input.isInlined) {
        return Lit.nothing;
    }
    // clang-format off
    return html `
    <div class="walkthrough-view">
      <div class="walkthrough-header">
         <div class="walkthrough-title">${i18nString(UIStrings.title)}</div>
         <devtools-button
          .data=${{
        variant: "toolbar" /* Buttons.Button.Variant.TOOLBAR */,
        iconName: 'right-panel-open',
        title: i18nString(UIStrings.close),
        jslogContext: 'close-walkthrough',
    }}
          @click=${() => input.onToggle(false)}
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
export const DEFAULT_VIEW = (input, _output, target) => {
    const steps = input.message?.parts.filter(t => t.type === 'step')?.map(p => p.step) ?? [];
    // clang-format off
    const stepsOutput = steps.length > 0 ? html `
    <div class="steps-container">
      ${steps.map((step, index) => html `
        <div class="step-wrapper">
          ${renderStep({
        step,
        isLoading: input.isLoading,
        markdownRenderer: input.markdownRenderer,
        isLast: index === steps.length - 1
    })}
        </div>
      `)}
    </div>
  ` : Lit.nothing;
    render(html `
    <style>
      ${Input.textInputStyles}
      ${chatMessageStyles}
      ${walkthroughViewStyles}
    </style>
    ${input.isInlined ? renderInlineWalkthrough(input, stepsOutput, steps)
        : renderSidebarWalkthrough(input, stepsOutput, steps.length)}`, target);
    // clang-format on
};
export class WalkthroughView extends UI.Widget.Widget {
    #view;
    #message = null;
    // TODO(b/487921187): fix loading state - also unsure if we need this vs
    // looking at the loading state in the message's steps.
    #isLoading = false;
    #markdownRenderer = null;
    #onToggle = () => { };
    #isInlined = false;
    #isExpanded = false;
    constructor(element, view = DEFAULT_VIEW) {
        super(element);
        this.#view = view;
    }
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
    performUpdate() {
        if (!this.#markdownRenderer) {
            return;
        }
        this.#view({
            isLoading: this.#isLoading,
            markdownRenderer: this.#markdownRenderer,
            onToggle: this.#onToggle,
            isInlined: this.#isInlined,
            isExpanded: this.#isExpanded,
            message: this.#message,
        }, null, this.contentElement);
    }
}
//# sourceMappingURL=WalkthroughView.js.map
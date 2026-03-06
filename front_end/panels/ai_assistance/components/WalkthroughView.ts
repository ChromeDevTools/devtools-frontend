// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../../core/i18n/i18n.js';
import * as Buttons from '../../../ui/components/buttons/buttons.js';
import * as Input from '../../../ui/components/input/input.js';
import type {MarkdownLitRenderer} from '../../../ui/components/markdown_view/MarkdownView.js';
import * as UI from '../../../ui/legacy/legacy.js';
import * as Lit from '../../../ui/lit/lit.js';

import chatMessageStyles from './chatMessage.css.js';
import {type ModelChatMessage, renderStep, type Step, titleForStep} from './ChatMessage.js';
import walkthroughViewStyles from './walkthroughView.css.js';

const lockedString = i18n.i18n.lockedString;

const {html, render} = Lit;

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
} as const;
const str_ = i18n.i18n.registerUIStrings('panels/ai_assistance/components/WalkthroughView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export interface ViewInput {
  message: ModelChatMessage|null;
  isLoading: boolean;
  markdownRenderer: MarkdownLitRenderer;
  isInlined: boolean;
  isExpanded: boolean;
  onToggle: (isOpen: boolean) => void;
}

export function walkthroughTitle(input: {
  isLoading: boolean,
  lastStep: Step,
}): string {
  const title = input.isLoading ? titleForStep(input.lastStep) : lockedString(UIStrings.showThinking);
  return title;
}

function renderInlineWalkthrough(input: ViewInput, stepsOutput: Lit.LitTemplate, steps: Step[]): Lit.LitTemplate {
  const lastStep = steps.at(-1);
  if (!input.isInlined || !lastStep) {
    return Lit.nothing;
  }

  function onToggle(event: Event): void {
    input.onToggle((event.target as HTMLDetailsElement).open);
  }

  // clang-format off
  return html`
    <details class="walkthrough-inline" ?open=${input.isExpanded} @toggle=${onToggle}>
      <summary>
        ${input.isLoading ? html`<devtools-spinner></devtools-spinner>` : Lit.nothing}
        ${walkthroughTitle({isLoading: input.isLoading, lastStep,})}
        <devtools-icon name="chevron-down"></devtools-icon>
      </summary>
      ${stepsOutput}
    </details>
  `;
  // clang-format on
}

function renderSidebarWalkthrough(input: ViewInput, stepsOutput: Lit.LitTemplate, stepsCount: number): Lit.LitTemplate {
  if (input.isInlined) {
    return Lit.nothing;
  }

  // clang-format off
  return html`
    <div class="walkthrough-view">
      <div class="walkthrough-header">
         <div class="walkthrough-title">${i18nString(UIStrings.title)}</div>
         <devtools-button
          .data=${{
            variant: Buttons.Button.Variant.TOOLBAR,
            iconName: 'right-panel-open',
            title: i18nString(UIStrings.close),
            jslogContext: 'close-walkthrough',
          } as Buttons.Button.ButtonData}
          @click=${() => input.onToggle(false)}
        ></devtools-button>
      </div>
      ${stepsOutput}
      ${stepsCount === 0 ? html`
        <div class="empty-state">
          <p>No walkthrough steps available yet.</p>
        </div>
      ` : Lit.nothing}
    </div>
  `;
  // clang-format on
}

export const DEFAULT_VIEW = (
    input: ViewInput,
    _output: null,
    target: HTMLElement|DocumentFragment,
    ): void => {
  const steps = input.message?.parts.filter(t => t.type === 'step')?.map(p => p.step) ?? [];

  // clang-format off
  const stepsOutput = steps.length > 0 ? html`
    <div class="steps-container">
      ${steps.map((step, index) => html`
        <div class="walkthrough-step">
          <span class="step-number">${index+1}</span>
          <div class="step-wrapper">
            ${renderStep({
              step,
              isLoading: input.isLoading,
              markdownRenderer: input.markdownRenderer,
              isLast: index === steps.length - 1
            })}
          </div>
        </div>
      `)}
    </div>
  ` : Lit.nothing;

  render(html`
    <style>
      ${Input.textInputStyles}
      ${chatMessageStyles}
      ${walkthroughViewStyles}
    </style>
    ${input.isInlined ? renderInlineWalkthrough(input, stepsOutput, steps)
                     : renderSidebarWalkthrough(input, stepsOutput, steps.length)
    }`, target);
  // clang-format on
};

export type View = typeof DEFAULT_VIEW;

export class WalkthroughView extends UI.Widget.Widget {
  #view: View;

  #message: ModelChatMessage|null = null;
  // TODO(b/487921187): fix loading state - also unsure if we need this vs
  // looking at the loading state in the message's steps.
  #isLoading = false;
  #markdownRenderer: MarkdownLitRenderer|null = null;
  #onToggle: (isOpen: boolean) => void = () => {};
  #isInlined = false;
  #isExpanded = false;

  constructor(element?: HTMLElement, view: View = DEFAULT_VIEW) {
    super(element);
    this.#view = view;
  }

  set isLoading(isLoading: boolean) {
    this.#isLoading = isLoading;
    this.requestUpdate();
  }

  get isLoading(): boolean {
    return this.#isLoading;
  }

  get markdownRenderer(): MarkdownLitRenderer|null {
    return this.#markdownRenderer;
  }

  set markdownRenderer(markdownRenderer: MarkdownLitRenderer|null) {
    this.#markdownRenderer = markdownRenderer;
    this.requestUpdate();
  }

  get message(): ModelChatMessage|null {
    return this.#message;
  }

  set message(message: ModelChatMessage|null) {
    this.#message = message;
    this.requestUpdate();
  }

  set onToggle(onToggle: (isOpen: boolean) => void) {
    this.#onToggle = onToggle;
    this.requestUpdate();
  }

  set isInlined(isInlined: boolean) {
    this.#isInlined = isInlined;
    this.requestUpdate();
  }

  set isExpanded(isExpanded: boolean) {
    this.#isExpanded = isExpanded;
    this.requestUpdate();
  }

  override performUpdate(): void {
    if (!this.#markdownRenderer) {
      return;
    }
    this.#view(
        {
          isLoading: this.#isLoading,
          markdownRenderer: this.#markdownRenderer,
          onToggle: this.#onToggle,
          isInlined: this.#isInlined,
          isExpanded: this.#isExpanded,
          message: this.#message,
        },
        null, this.contentElement);
  }
}

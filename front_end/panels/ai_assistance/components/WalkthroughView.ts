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

const {html, render, Directives} = Lit;
const {ref} = Directives;
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
  onOpen: (message: ModelChatMessage) => void;
  handleScroll: (ev: Event) => void;
}

export interface ViewOutput {
  scrollContainer?: HTMLElement;
  stepsContainer?: HTMLElement;
}

export function walkthroughTitle(input: {
  isLoading: boolean,
  hasWidgets: boolean,
  lastStep: Step,
}): string {
  if (input.isLoading) {
    return titleForStep(input.lastStep);
  }
  if (input.hasWidgets) {
    return lockedString(UIStrings.showAgentWalkthrough);
  }
  return lockedString(UIStrings.showThinking);
}

function renderInlineWalkthrough(input: ViewInput, stepsOutput: Lit.LitTemplate, steps: Step[]): Lit.LitTemplate {
  const lastStep = steps.at(-1);
  if (!input.isInlined || !lastStep) {
    return Lit.nothing;
  }

  function onToggle(event: Event): void {
    input.onToggle((event.target as HTMLDetailsElement).open);
  }

  const hasWidgets = steps.some(s => s.widgets?.length);

  // clang-format off
  return html`
    <details class="walkthrough-inline" ?open=${input.isExpanded} @toggle=${onToggle}>
      <summary>
        ${input.isLoading ? html`<devtools-spinner></devtools-spinner>` : Lit.nothing}
        ${walkthroughTitle({isLoading: input.isLoading, lastStep, hasWidgets})}
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
            iconName: 'cross',
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
    output: ViewOutput,
    target: HTMLElement|DocumentFragment,
    ): void => {
  const steps = input.message?.parts.filter(t => t.type === 'step')?.map(p => p.step) ?? [];

  // clang-format off
  const stepsOutput = steps.length > 0 ? html`
    <div class="steps-container" @scroll=${input.handleScroll} ${ref(el => {
      output.scrollContainer = el as HTMLElement;
    })}>
      <div class="steps-scroll-content" ${ref(el => {
        output.stepsContainer = el as HTMLElement;
    })}>
        ${steps.map((step, index) => html`
          <div class="walkthrough-step">
            <span class="step-number">${index + 1}</span>
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
  #onOpen: (message: ModelChatMessage) => void = () => {};
  #isInlined = false;
  #isExpanded = false;

  #pinScrollToBottom = true;
  #isProgrammaticScroll = false;

  #output: ViewOutput = {};
  #stepsContainerResizeObserver = new ResizeObserver(() => this.#handleStepsContainerResize());

  constructor(element?: HTMLElement, view: View = DEFAULT_VIEW) {
    super(element);
    this.#view = view;
  }

  override wasShown(): void {
    super.wasShown();
    this.#registerResizeObservers();
  }

  override willHide(): void {
    super.willHide();
    this.#stepsContainerResizeObserver.disconnect();
  }

  #registerResizeObservers(): void {
    if (this.#output.stepsContainer) {
      this.#stepsContainerResizeObserver.observe(this.#output.stepsContainer);
    }
  }

  override onResize(): void {
    this.#handleStepsContainerResize();
  }

  #handleStepsContainerResize(): void {
    if (!this.#pinScrollToBottom) {
      return;
    }

    this.scrollToBottom();
  }

  scrollToBottom(): void {
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

  #handleScroll = (ev: Event): void => {
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

  get onOpen(): (message: ModelChatMessage) => void {
    return this.#onOpen;
  }

  set onOpen(onOpen: (message: ModelChatMessage) => void) {
    this.#onOpen = onOpen;
    this.requestUpdate();
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
          onOpen: this.#onOpen,
          isInlined: this.#isInlined,
          isExpanded: this.#isExpanded,
          message: this.#message,
          handleScroll: this.#handleScroll,
        },
        this.#output, this.contentElement);

    this.#registerResizeObservers();

    if (this.#pinScrollToBottom) {
      this.scrollToBottom();
    }
  }
}

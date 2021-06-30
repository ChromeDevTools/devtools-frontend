// Copyright (c) 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Recorder from '../../../models/recorder/recorder.js';
import * as LitHtml from '../../../ui/lit-html/lit-html.js';
import * as ComponentHelpers from '../../../ui/components/helpers/helpers.js';
import * as Coordinator from '../../../ui/components/render_coordinator/render_coordinator.js';

const coordinator = Coordinator.RenderCoordinator.RenderCoordinator.instance();


declare global {
  interface HTMLElementTagNameMap {
    'devtools-step-view': StepView;
  }
}

export const enum State {
  Default = 'default',
  Success = 'success',
  Current = 'current',
  Outstanding = 'outstanding',
  Error = 'error',
}

export interface StepViewData {
  state: State;
  step: Recorder.Steps.Step;
  error?: Error;
}

export class StepView extends HTMLElement {
  static readonly litTagName = LitHtml.literal`devtools-step-view`;

  private readonly shadow = this.attachShadow({mode: 'open'});
  private step!: Recorder.Steps.Step;
  private state = State.Default;
  private error?: Error;

  set data(data: StepViewData) {
    const prevState = this.state;
    this.step = data.step;
    this.state = data.state;
    this.error = data.error;
    this.render();

    if (this.state !== prevState && this.state === 'current') {
      this.scrollIntoView({behavior: 'smooth'});
    }
  }

  connectedCallback(): void {
    this.render();

    const prev = this.previousElementSibling;
    if (prev && prev.tagName.toLowerCase() === 'devtools-step-view') {
      const bar = this.shadowRoot?.querySelector('.bar') as HTMLDivElement;
      if (bar) {
        coordinator.read(() => {
          const bb = prev.getBoundingClientRect();

          coordinator.write(() => {
            bar.style.top = `-${bb.height * 0.5 + 16}px`;
          });
        });
      }
    }
  }

  private getCSSClassFromState(state: State): string {
    switch (state) {
      case State.Default:
        return '';
      case State.Success:
        return 'is-success';
      case State.Current:
        return 'is-current';
      case State.Outstanding:
        return 'is-outstanding';
      case State.Error:
        return 'is-error';
    }
  }

  private render(): void {
    if (!this.step) {
      return;
    }

    const {type} = this.step;
    // clang-format off
    // eslint-disable-next-line rulesdir/ban_style_tags_in_lit_html
    LitHtml.render(LitHtml.html`
    <style>
      .step {
        position: relative;
        padding-left: 32px;
        margin: 16px 0;
      }

      .step .action {
        font-size: 13px;
        line-height: 16px;
        letter-spacing: 0.03em;
      }

      .step::before {
        content: '';
        width: 8px;
        height: 8px;
        border: 2px solid var(--color-background);
        border-radius: 50%;
        display: block;
        position: absolute;
        top: 50%;
        left: 8px;
        background: var(--color-primary);
        transform: translate(-50%, -50%);
        z-index: 1;
      }

      .bar {
        position: absolute;
        top: -16px;
        left: 8px;
        width: 2px;
        background: var(--color-primary);
        bottom: 50%;
        display: block;
        transform: translateX(-50%);
      }

      .error {
        margin: 16px 0 0;
        padding: 8px;
        background: var(--color-error-background);
        color: var(--color-error-text);
      }

      .step.is-outstanding::before,
      .step.is-outstanding .bar {
        background: var(--color-background-elevation-2);
      }

      .step.is-current::before,
      .step.is-current .bar {
        background: var(--color-primary);
      }

      .step.is-success::before,
      .step.is-success .bar {
        background: var(--lighthouse-green);
      }

      .step.is-error::before,
      .step.is-error .bar {
        background: var(--color-red);
      }

    </style>
    <div class="step ${this.getCSSClassFromState(this.state)}">
      <div class="action">${type}</div>
      ${'selector' in this.step ? LitHtml.html`<div class="selector">${this.step.selector}</div>` : null}
      ${this.error && LitHtml.html`
        <div class="error">
          ${this.error.message}
        </div>
      `}
      <div class="bar"></div>
    </div>
  `, this.shadow);
    // clang-format off
  }
}

ComponentHelpers.CustomElements.defineComponent('devtools-step-view', StepView);

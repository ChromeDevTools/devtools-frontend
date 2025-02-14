// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Lit from '../../third_party/lit/lit.js';
import * as UI from '../../ui/legacy/legacy.js';

import cssValueTraceViewStyles from './cssValueTraceView.css.js';

const {html, render} = Lit;

export interface ViewInput {
  substitutions: Node[][];
  evaluations: Node[][];
  finalResult: Node[]|undefined;
  onToggle: () => void;
}
export interface ViewOutput {}

export type View = (
    input: ViewInput,
    output: ViewOutput,
    target: HTMLElement,
    ) => void;

export class CSSValueTraceView extends UI.Widget.VBox {
  #view: View;
  #finalResult: Node[]|undefined = undefined;
  #evaluations: Node[][] = [];
  #substitutions: Node[][] = [];

  constructor(
      view: View = (input, output, target):
          void => {
            const substitutionIcon = html`<span class=trace-line-icon aria-label="resolved to">\u21B3</span>`;
            const evalIcon = html`<span class=trace-line-icon aria-label="is equal to">\u003D</span>`;
            const [firstEvaluation, ...intermediateEvaluations] = input.evaluations;
            render(
                // clang-format off
        html`
<div class="css-value-trace monospace">
  ${input.substitutions.map(line => html`${substitutionIcon}<span class="trace-line">${line}</span>`)}
  ${
    firstEvaluation && intermediateEvaluations.length === 0
      ? html`${evalIcon}<span class="trace-line">${firstEvaluation}</span>`
      : html`<details
                  @toggle=${input.onToggle}
                  ?hidden=${!firstEvaluation || intermediateEvaluations.length === 0}>
    <summary>
       ${evalIcon}<devtools-icon class=marker></devtools-icon><span class="trace-line">${firstEvaluation}</span>
    </summary>
    <div>
      ${intermediateEvaluations.map(evaluation => html`${evalIcon}<span class="trace-line">${evaluation}</span>`)}
    </div>
  </details>`
  }
  ${!input.finalResult ? '' : html`${evalIcon}<span class="trace-line">${input.finalResult}</span>`}
</div>
`,
                // clang-format on
                target,
            );
          },
  ) {
    super(true);
    this.registerRequiredCSS(cssValueTraceViewStyles);
    this.#view = view;
    this.requestUpdate();
  }

  showTrace(
      substitutions: Node[][],
      evaluations: Node[][],
      finalResult: Node[]|undefined,
      ): void {
    this.#substitutions = substitutions;
    this.#evaluations = evaluations;
    this.#finalResult = finalResult;
    this.requestUpdate();
  }

  override performUpdate(): void {
    const viewInput: ViewInput = {
      substitutions: this.#substitutions,
      evaluations: this.#evaluations,
      finalResult: this.#finalResult,
      onToggle: () => this.onResize(),
    };
    const viewOutput = {};
    this.#view(viewInput, viewOutput, this.contentElement);
  }
}

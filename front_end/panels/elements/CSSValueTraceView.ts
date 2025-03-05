// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as SDK from '../../core/sdk/sdk.js';
import * as Lit from '../../third_party/lit/lit.js';
import * as UI from '../../ui/legacy/legacy.js';

import cssValueTraceViewStyles from './cssValueTraceView.css.js';
import {
  type MatchRenderer,
  Renderer,
  RenderingContext,
  TracingContext,
} from './PropertyRenderer.js';
import stylePropertiesTreeOutlineStyles from './stylePropertiesTreeOutline.css.js';

const {html, render} = Lit;

export interface ViewInput {
  substitutions: Node[][];
  evaluations: Node[][];
  finalResult: Node[]|undefined;
  onToggle: () => void;
}

export type View = (
    input: ViewInput,
    output: object,
    target: HTMLElement,
    ) => void;

export class CSSValueTraceView extends UI.Widget.VBox {
  #view: View;
  #finalResult: Node[]|undefined = undefined;
  #evaluations: Node[][] = [];
  #substitutions: Node[][] = [];

  constructor(
      view: View = (input, _, target):
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
    this.registerRequiredCSS(cssValueTraceViewStyles, stylePropertiesTreeOutlineStyles);
    this.#view = view;
    this.requestUpdate();
  }

  showTrace(
      property: SDK.CSSProperty.CSSProperty,
      matchedStyles: SDK.CSSMatchedStyles.CSSMatchedStyles,
      computedStyles: Map<string, string>|null,
      renderers: Array<MatchRenderer<SDK.CSSPropertyParser.Match>>,
      ): void {
    const matchedResult = property.parseValue(matchedStyles, computedStyles);
    if (!matchedResult) {
      return undefined;
    }

    const rendererMap = new Map(renderers.map(r => [r.matchType, r]));

    // Compute all trace lines
    // 1st: Apply substitutions for var() functions
    const substitutions = [];
    const evaluations = [];
    const tracing = new TracingContext(matchedResult);
    while (tracing.nextSubstitution()) {
      const context = new RenderingContext(
          matchedResult.ast,
          rendererMap,
          matchedResult,
          /* cssControls */ undefined,
          /* options */ {},
          tracing,
      );
      substitutions.push(
          Renderer.render(matchedResult.ast.tree, context).nodes,
      );
    }

    // 2nd: Apply evaluations for calc, min, max, etc.
    while (tracing.nextEvaluation()) {
      const context = new RenderingContext(
          matchedResult.ast,
          rendererMap,
          matchedResult,
          /* cssControls */ undefined,
          /* options */ {},
          tracing,
      );
      evaluations.push(Renderer.render(matchedResult.ast.tree, context).nodes);
    }

    this.#substitutions = substitutions;
    this.#finalResult = evaluations.pop();
    this.#evaluations = evaluations;
    if (evaluations.length === 0 && !tracing.didApplyEvaluations()) {
      this.#substitutions.pop();
    }
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

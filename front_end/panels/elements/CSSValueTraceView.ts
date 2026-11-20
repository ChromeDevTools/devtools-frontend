// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import '../../ui/kit/kit.js';

import type * as SDK from '../../core/sdk/sdk.js';
import * as UI from '../../ui/legacy/legacy.js';
import {Directives, html, type LitTemplate, nothing, render} from '../../ui/lit/lit.js';

import cssValueTraceViewStyles from './cssValueTraceView.css.js';
import {
  Highlighting,
  type MatchRenderer,
  Renderer,
  RenderingContext,
  TracingContext,
} from './PropertyRenderer.js';
import stylePropertiesTreeOutlineStyles from './stylePropertiesTreeOutline.css.js';

const {classMap, ifDefined} = Directives;

export interface ViewInput {
  substitutions: LitTemplate[];
  evaluations: LitTemplate[];
  onToggle: () => void;
}

export type View = (
    input: ViewInput,
    output: undefined,
    target: HTMLElement,
    ) => void;

export const DEFAULT_VIEW: View = (input, _output, target) => {
  const substitutions = [...input.substitutions];
  const evaluations = [...input.evaluations];
  const finalResult = evaluations.pop() ?? substitutions.pop();
  const [firstEvaluation, ...intermediateEvaluations] = evaluations;

  const hiddenSummary = !firstEvaluation || intermediateEvaluations.length === 0;
  const summaryTabIndex = hiddenSummary ? undefined : 0;
  const singleResult = evaluations.length === 0 && substitutions.length === 0;
  // clang-format off
  render(
    html`
      <style>${cssValueTraceViewStyles}</style>
      <style>${stylePropertiesTreeOutlineStyles}</style>
      <div role=dialog class="css-value-trace monospace" @keydown=${onKeyDown}>
        ${substitutions.map(line => html`
          <span class="trace-line-icon" aria-label="is equal to">\u21b3</span>
          <span class="trace-line">${line}</span>`,
        )}
        ${firstEvaluation && intermediateEvaluations.length === 0 ? html`
          <span class="trace-line-icon" aria-label="is equal to">\u21b3</span>
          <span class="trace-line">${firstEvaluation}</span>`
            : html`
          <details @toggle=${input.onToggle} ?hidden=${hiddenSummary}>
            <summary tabindex=${ifDefined(summaryTabIndex)} ?autofocus=${!hiddenSummary && input.substitutions.length === 0}>
              <span class="trace-line-icon" aria-label="is equal to">\u21b3</span>
              <devtools-icon class="marker"></devtools-icon>
              <span class="trace-line">${firstEvaluation}</span>
            </summary>
            <div>
              ${intermediateEvaluations.map(
                evaluation => html`
                  <span class="trace-line-icon" aria-label="is equal to" >\u21b3</span>
                  <span class="trace-line">${evaluation}</span>`,
              )}
            </div>
          </details>`}
        ${finalResult ? html`
          <span class="trace-line-icon" aria-label="is equal to" ?hidden=${singleResult}>\u21b3</span>
          <span class=${classMap({ 'trace-line': true, 'full-row': singleResult})}>
            ${finalResult}
          </span>` : nothing}
      </div>`, target);
  // clang-format on

  function onKeyDown(this: HTMLDivElement, e: KeyboardEvent): void {
    // prevent styles-tab keyboard navigation
    if (!e.altKey) {
      if (e.key.startsWith('Arrow') || e.key === ' ' || e.key === 'Enter') {
        e.consume();
      }
    }

    // Capture tab focus within
    if (e.key === 'Tab') {
      const tabstops = this.querySelectorAll('[tabindex]:not([tabindex="-1"])') ?? [];
      const firstTabStop = tabstops[0];
      const lastTabStop = tabstops[tabstops.length - 1];
      if (e.target === lastTabStop && !e.shiftKey) {
        e.consume(true);
        if (firstTabStop instanceof HTMLElement) {
          firstTabStop.focus();
        }
      }
      if (e.target === firstTabStop && e.shiftKey) {
        e.consume(true);
        if (lastTabStop instanceof HTMLElement) {
          lastTabStop.focus();
        }
      }
    }
  }
};

export class CSSValueTraceView extends UI.Widget.VBox {
  #highlighting: Highlighting|undefined;
  readonly #view: View;
  #evaluations: LitTemplate[] = [];
  #substitutions: LitTemplate[] = [];
  #pendingFocus = false;

  constructor(element?: HTMLElement, view: View = DEFAULT_VIEW) {
    super(element, {useShadowDom: true});
    this.#view = view;
    this.requestUpdate();
  }

  async showTrace(
      property: SDK.CSSProperty.CSSProperty,
      subexpression: string|null,
      matchedStyles: SDK.CSSMatchedStyles.CSSMatchedStyles,
      computedStyles: Map<string, string>|null,
      renderers: Array<MatchRenderer<SDK.CSSPropertyParser.Match>>,
      expandPercentagesInShorthands: boolean,
      shorthandPositionOffset: number,
      focus: boolean,
      signal?: AbortSignal,
      ): Promise<void> {
    const matchedResult = subexpression === null ?
        property.parseValue(matchedStyles, computedStyles) :
        property.parseExpression(subexpression, matchedStyles, computedStyles);
    if (!matchedResult) {
      return undefined;
    }
    return await this.#showTrace(
        property, matchedResult, renderers, expandPercentagesInShorthands, shorthandPositionOffset, focus, signal);
  }

  async #showTrace(
      property: SDK.CSSProperty.CSSProperty,
      matchedResult: SDK.CSSPropertyParser.BottomUpTreeMatching,
      renderers: Array<MatchRenderer<SDK.CSSPropertyParser.Match>>,
      expandPercentagesInShorthands: boolean,
      shorthandPositionOffset: number,
      focus: boolean,
      signal?: AbortSignal,
      ): Promise<void> {
    this.#highlighting = new Highlighting();
    const rendererMap = new Map(renderers.map(r => [r.matchType, r]));

    // Compute all trace lines
    // 1st: Apply substitutions for var() functions
    const substitutions = [];
    const evaluations = [];
    const tracing =
        new TracingContext(this.#highlighting, expandPercentagesInShorthands, shorthandPositionOffset, matchedResult);
    while (tracing.nextSubstitution()) {
      if (substitutions.length === 0) {
        tracing.enableAutofocusOnFirstMatch();
      }
      const context = new RenderingContext(
          matchedResult.ast,
          property,
          rendererMap,
          matchedResult,
          /* options */ {},
          tracing,
          signal,
      );
      substitutions.push(Renderer.render(matchedResult.ast.tree, context));
    }

    // 2nd: Apply evaluations for calc, min, max, etc.
    const asyncCallbackResults = [];
    while (tracing.nextEvaluation()) {
      const context = new RenderingContext(
          matchedResult.ast,
          property,
          rendererMap,
          matchedResult,
          /* options */ {},
          tracing,
          signal,
      );
      evaluations.push(Renderer.render(matchedResult.ast.tree, context));
      asyncCallbackResults.push(tracing.runAsyncEvaluations());
    }

    this.#substitutions = substitutions;
    this.#evaluations = [];
    let firstSuccessfulEvalStep: number|null = null;
    for (const [index, success] of (await Promise.all(asyncCallbackResults)).entries()) {
      if (success) {
        firstSuccessfulEvalStep ??= index + 1;
        this.#evaluations.push(evaluations[index]);
      }
    }

    if (this.#substitutions.length === 0 && firstSuccessfulEvalStep !== null &&
        (this.#evaluations.length === 1 || this.#evaluations.length === 2)) {
      const autofocusTracing =
          new TracingContext(this.#highlighting, expandPercentagesInShorthands, shorthandPositionOffset, matchedResult);
      for (let step = 0; step < firstSuccessfulEvalStep; step++) {
        autofocusTracing.nextEvaluation();
      }
      autofocusTracing.enableAutofocusOnFirstMatch();
      const context = new RenderingContext(
          matchedResult.ast,
          property,
          rendererMap,
          matchedResult,
          /* options */ {},
          autofocusTracing,
          signal,
      );
      this.#evaluations[0] = Renderer.render(matchedResult.ast.tree, context);
      await autofocusTracing.runAsyncEvaluations();
    }

    if (this.#substitutions.length === 0 && this.#evaluations.length === 0) {
      const context = new RenderingContext(
          matchedResult.ast,
          property,
          rendererMap,
          matchedResult,
          {},
          undefined,
          signal,
      );
      this.#evaluations.push(Renderer.render(matchedResult.ast.tree, context));
    }

    this.#pendingFocus = focus;
    this.requestUpdate();
  }

  override performUpdate(): void {
    const viewInput: ViewInput = {
      substitutions: this.#substitutions,
      evaluations: this.#evaluations,
      onToggle: () => this.onResize(),
    };
    this.#view(viewInput, undefined, this.contentElement);
    if (this.#pendingFocus && this.getDefaultFocusedElement()) {
      this.focus();
      this.resetPendingFocus();
    }
  }

  resetPendingFocus(): void {
    this.#pendingFocus = false;
  }
}

// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Lit from '../../third_party/lit/lit.js';
import * as UI from '../../ui/legacy/legacy.js';
import cssValueTraceViewStyles from './cssValueTraceView.css.js';
import { Highlighting, Renderer, RenderingContext, TracingContext, } from './PropertyRenderer.js';
import stylePropertiesTreeOutlineStyles from './stylePropertiesTreeOutline.css.js';
const { html, render, Directives: { classMap, ifDefined } } = Lit;
function defaultView(input, output, target) {
    const substitutions = [...input.substitutions];
    const evaluations = [...input.evaluations];
    const finalResult = evaluations.pop() ?? substitutions.pop();
    const [firstEvaluation, ...intermediateEvaluations] = evaluations;
    const hiddenSummary = !firstEvaluation || intermediateEvaluations.length === 0;
    const summaryTabIndex = hiddenSummary ? undefined : 0;
    const singleResult = evaluations.length === 0 && substitutions.length === 0;
    // clang-format off
    render(html `
      <div role=dialog class="css-value-trace monospace" @keydown=${onKeyDown}>
        ${substitutions.map(line => html `
          <span class="trace-line-icon" aria-label="is equal to">↳</span>
          <span class="trace-line">${line}</span>`)}
        ${firstEvaluation && intermediateEvaluations.length === 0 ? html `
          <span class="trace-line-icon" aria-label="is equal to">↳</span>
          <span class="trace-line">${firstEvaluation}</span>`
        : html `
          <details @toggle=${input.onToggle} ?hidden=${hiddenSummary}>
            <summary tabindex=${ifDefined(summaryTabIndex)}>
              <span class="trace-line-icon" aria-label="is equal to">↳</span>
              <devtools-icon class="marker"></devtools-icon>
              <span class="trace-line">${firstEvaluation}</span>
            </summary>
            <div>
              ${intermediateEvaluations.map(evaluation => html `
                  <span class="trace-line-icon" aria-label="is equal to" >↳</span>
                  <span class="trace-line">${evaluation}</span>`)}
            </div>
          </details>`}
        ${finalResult ? html `
          <span class="trace-line-icon" aria-label="is equal to" ?hidden=${singleResult}>↳</span>
          <span class=${classMap({ 'trace-line': true, 'full-row': singleResult })}>
            ${finalResult}
          </span>` : ''}
      </div>`, target);
    // clang-format on
    function onKeyDown(e) {
        // prevent styles-tab keyboard navigation
        if (!e.altKey) {
            if (e.key.startsWith('Arrow') || e.key === ' ' || e.key === 'Enter') {
                e.consume();
            }
        }
        // Capture tab focus within
        if (e.key === 'Tab') {
            const tabstops = this.querySelectorAll('[tabindex]') ?? [];
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
}
export class CSSValueTraceView extends UI.Widget.VBox {
    #highlighting;
    #view;
    #evaluations = [];
    #substitutions = [];
    #pendingFocus = false;
    constructor(element, view = defaultView) {
        super(element, { useShadowDom: true });
        this.registerRequiredCSS(cssValueTraceViewStyles, stylePropertiesTreeOutlineStyles);
        this.#view = view;
        this.requestUpdate();
    }
    async showTrace(property, subexpression, matchedStyles, computedStyles, renderers, expandPercentagesInShorthands, shorthandPositionOffset, focus) {
        const matchedResult = subexpression === null ?
            property.parseValue(matchedStyles, computedStyles) :
            property.parseExpression(subexpression, matchedStyles, computedStyles);
        if (!matchedResult) {
            return undefined;
        }
        return await this.#showTrace(property, matchedResult, renderers, expandPercentagesInShorthands, shorthandPositionOffset, focus);
    }
    async #showTrace(property, matchedResult, renderers, expandPercentagesInShorthands, shorthandPositionOffset, focus) {
        this.#highlighting = new Highlighting();
        const rendererMap = new Map(renderers.map(r => [r.matchType, r]));
        // Compute all trace lines
        // 1st: Apply substitutions for var() functions
        const substitutions = [];
        const evaluations = [];
        const tracing = new TracingContext(this.#highlighting, expandPercentagesInShorthands, shorthandPositionOffset, matchedResult);
        while (tracing.nextSubstitution()) {
            const context = new RenderingContext(matchedResult.ast, property, rendererMap, matchedResult, 
            /* cssControls */ undefined, 
            /* options */ {}, tracing);
            substitutions.push(Renderer.render(matchedResult.ast.tree, context).nodes);
        }
        // 2nd: Apply evaluations for calc, min, max, etc.
        const asyncCallbackResults = [];
        while (tracing.nextEvaluation()) {
            const context = new RenderingContext(matchedResult.ast, property, rendererMap, matchedResult, 
            /* cssControls */ undefined, 
            /* options */ {}, tracing);
            evaluations.push(Renderer.render(matchedResult.ast.tree, context).nodes);
            asyncCallbackResults.push(tracing.runAsyncEvaluations());
        }
        this.#substitutions = substitutions;
        this.#evaluations = [];
        for (const [index, success] of (await Promise.all(asyncCallbackResults)).entries()) {
            if (success) {
                this.#evaluations.push(evaluations[index]);
            }
        }
        if (this.#substitutions.length === 0 && this.#evaluations.length === 0) {
            const context = new RenderingContext(matchedResult.ast, property, rendererMap, matchedResult);
            this.#evaluations.push(Renderer.render(matchedResult.ast.tree, context).nodes);
        }
        this.#pendingFocus = focus;
        this.requestUpdate();
    }
    performUpdate() {
        const viewInput = {
            substitutions: this.#substitutions,
            evaluations: this.#evaluations,
            onToggle: () => this.onResize(),
        };
        this.#view(viewInput, {}, this.contentElement);
        const tabStop = this.contentElement.querySelector('[tabindex]');
        this.setDefaultFocusedElement(tabStop);
        if (tabStop && this.#pendingFocus) {
            this.focus();
            this.resetPendingFocus();
        }
    }
    resetPendingFocus() {
        this.#pendingFocus = false;
    }
}
//# sourceMappingURL=CSSValueTraceView.js.map
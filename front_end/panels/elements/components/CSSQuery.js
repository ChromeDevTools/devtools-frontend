// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-lit-render-outside-of-view */
import '../../../ui/components/tooltips/tooltips.js';
import '../../../ui/legacy/components/inline_editor/inline_editor.js';
import * as SDK from '../../../core/sdk/sdk.js';
import * as UI from '../../../ui/legacy/legacy.js';
import * as Lit from '../../../ui/lit/lit.js';
import * as VisualLogging from '../../../ui/visual_logging/visual_logging.js';
import cssQueryStyles from './cssQuery.css.js';
const { render, html } = Lit;
export class CSSQuery extends HTMLElement {
    #shadow = this.attachShadow({ mode: 'open' });
    #queryPrefix = '';
    #queryName;
    #queryText = [];
    #onQueryTextClick;
    #onLinkActivate;
    #getPopoverContents;
    #jslogContext;
    #matchedStyles;
    #style;
    #containerNode;
    #tooltipPrefix = '';
    set data(data) {
        this.#queryPrefix = data.queryPrefix;
        this.#queryName = data.queryName;
        this.#queryText = [{ text: data.queryText, isVariable: false }];
        this.#onQueryTextClick = data.onQueryTextClick;
        this.#onLinkActivate = data.onLinkActivate;
        this.#getPopoverContents = data.getPopoverContents;
        this.#jslogContext = data.jslogContext;
        this.#render();
    }
    parseStyleQueries(matchedStyles, style, containerNode, tooltipPrefix) {
        this.#matchedStyles = matchedStyles;
        this.#style = style;
        this.#containerNode = containerNode;
        this.#tooltipPrefix = tooltipPrefix;
        const queryText = this.#queryText[0]?.text;
        if (!queryText) {
            return;
        }
        const prefix = 'if(';
        const suffix = ': 1)';
        const ast = SDK.CSSPropertyParser.tokenizeDeclaration('--query', prefix + queryText + suffix);
        if (!ast) {
            return;
        }
        const matcher = new SDK.CSSPropertyParserMatchers.VariableNameMatcher(matchedStyles, style);
        const matchedResult = SDK.CSSPropertyParser.BottomUpTreeMatching.walk(ast, [matcher]);
        const matchedNodes = SDK.CSSPropertyParser.TreeSearch.findAll(ast, node => {
            return matchedResult.getMatch(node) instanceof SDK.CSSPropertyParserMatchers.VariableNameMatch;
        });
        matchedNodes.sort((a, b) => a.from - b.from);
        const sections = [];
        const valueOffset = ast.rule.indexOf(ast.propertyValue) + prefix.length;
        let lastOffset = 0;
        for (const node of matchedNodes) {
            const start = node.from - valueOffset;
            const end = node.to - valueOffset;
            if (start > lastOffset) {
                sections.push({
                    text: queryText.substring(lastOffset, start),
                    isVariable: false,
                });
            }
            sections.push({
                text: queryText.substring(start, end),
                isVariable: true,
            });
            lastOffset = end;
        }
        if (lastOffset < queryText.length) {
            sections.push({
                text: queryText.substring(lastOffset),
                isVariable: false,
            });
        }
        this.#queryText = sections;
        this.#render();
    }
    #render() {
        const queryClasses = Lit.Directives.classMap({
            query: true,
            editable: Boolean(this.#onQueryTextClick),
        });
        // clang-format off
        const queryText = html `
      <span class="query-text" @click=${this.#onQueryTextClick}>${this.#queryText.map((section, index) => {
            if (section.isVariable && this.#matchedStyles && this.#style && this.#onLinkActivate) {
                const variableName = section.text;
                const variable = this.#matchedStyles.computeCSSVariable(this.#style, variableName, this.#containerNode);
                const isDefined = variable !== null && variable.value !== undefined;
                const onLinkActivate = () => {
                    if (this.#onLinkActivate) {
                        this.#onLinkActivate(variable ? variable.declaration : variableName);
                    }
                };
                const tooltipContents = this.#getPopoverContents?.(variableName, variable?.value ?? null) ?? null;
                const tooltipId = `${this.#tooltipPrefix}-${index}-${variableName}`;
                const tooltip = { tooltipId };
                return html `
              <devtools-link-swatch class="css-var-link" .data=${{
                    tooltip,
                    text: variableName,
                    isDefined,
                    onLinkActivate,
                }}>
              </devtools-link-swatch>
              <devtools-tooltip
                id=${tooltipId}
                variant="rich"
                jslogContext="elements.css-var"
              >
                ${tooltipContents}
              </devtools-tooltip>
            `;
            }
            return html `${section.text}`;
        })}</span>
    `;
        render(html `
        <style>${cssQueryStyles}</style>
        <style>${UI.inspectorCommonStyles}</style>
        <div class=${queryClasses} jslog=${VisualLogging.cssRuleHeader(this.#jslogContext).track({ click: true, change: true })}>
          <slot name="indent"></slot>
          ${this.#queryPrefix ? html `<span>${this.#queryPrefix + ' '}</span>` : Lit.nothing}
          ${this.#queryName ? html `<span>${this.#queryName + ' '}</span>` : Lit.nothing}
          ${queryText} {
        </div>`, this.#shadow, { host: this });
        // clang-format on
    }
}
customElements.define('devtools-css-query', CSSQuery);
//# sourceMappingURL=CSSQuery.js.map
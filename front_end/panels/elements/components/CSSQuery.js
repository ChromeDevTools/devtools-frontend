// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import '../../../ui/components/tooltips/tooltips.js';
import '../../../ui/legacy/components/inline_editor/inline_editor.js';
import * as SDK from '../../../core/sdk/sdk.js';
import * as UI from '../../../ui/legacy/legacy.js';
import * as Lit from '../../../ui/lit/lit.js';
import * as VisualLogging from '../../../ui/visual_logging/visual_logging.js';
import cssQueryStyles from './cssQuery.css.js';
const { render, html } = Lit;
export const DEFAULT_VIEW = (input, _output, target) => {
    const queryClasses = Lit.Directives.classMap({
        query: true,
        editable: Boolean(input.onQueryTextClick),
    });
    // clang-format off
    const queryText = html `
    <span class="query-text" @click=${input.onQueryTextClick}>${input.queryText.map((section, index) => {
        if (section.isVariable && input.matchedStyles && input.style && input.onLinkActivate) {
            const variableName = section.text;
            const variable = input.matchedStyles.computeCSSVariable(input.style, variableName, input.containerNode);
            const isDefined = variable !== null && variable.value !== undefined;
            const onLinkActivate = () => {
                if (input.onLinkActivate) {
                    input.onLinkActivate(variable ? variable.declaration : variableName);
                }
            };
            const tooltipContents = input.getPopoverContents?.(variableName, variable?.value ?? null) ?? null;
            const tooltipId = `${input.tooltipPrefix || 'css-query'}-${index}-${variableName}`;
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
              ${tooltipContents ? html `<devtools-widget>${tooltipContents.element}</devtools-widget>` : Lit.nothing}
            </devtools-tooltip>
          `;
        }
        return html `${section.text}`;
    })}</span>
  `;
    render(html `
      <style>${cssQueryStyles}</style>
      <style>${UI.inspectorCommonStyles}</style>
      <div class=${queryClasses} jslog=${VisualLogging.cssRuleHeader(input.jslogContext).track({ click: true, change: true })}>
        <slot name="indent"></slot>
        ${input.queryPrefix ? html `<span>${input.queryPrefix + ' '}</span>` : Lit.nothing}
        ${input.queryName ? html `<span>${input.queryName + ' '}</span>` : Lit.nothing}
        ${queryText}<slot></slot> <span class="sidebar-pane-open-brace">{</span>
      </div>`, target);
    // clang-format on
};
export class CSSQuery extends UI.Widget.Widget {
    #view;
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
    constructor(element, view = DEFAULT_VIEW) {
        super(element, { useShadowDom: true, classes: ['css-query'] });
        this.element.classList.remove('vbox', 'flex-auto');
        this.#view = view;
    }
    set data(data) {
        this.#queryPrefix = data.queryPrefix;
        this.#queryName = data.queryName;
        this.#queryText = [{ text: data.queryText, isVariable: false }];
        this.#onQueryTextClick = data.onQueryTextClick;
        this.#onLinkActivate = data.onLinkActivate;
        this.#getPopoverContents = data.getPopoverContents;
        this.#jslogContext = data.jslogContext;
        this.performUpdate();
    }
    wasShown() {
        super.wasShown();
        this.performUpdate();
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
        this.performUpdate();
    }
    performUpdate() {
        this.#view({
            queryPrefix: this.#queryPrefix,
            queryName: this.#queryName,
            queryText: this.#queryText,
            onQueryTextClick: this.#onQueryTextClick,
            onLinkActivate: this.#onLinkActivate,
            getPopoverContents: this.#getPopoverContents,
            jslogContext: this.#jslogContext,
            matchedStyles: this.#matchedStyles,
            style: this.#style,
            containerNode: this.#containerNode,
            tooltipPrefix: this.#tooltipPrefix,
        }, undefined, this.contentElement);
    }
}
//# sourceMappingURL=CSSQuery.js.map
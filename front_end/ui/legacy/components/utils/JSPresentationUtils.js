// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/*
 * Copyright (C) 2011 Google Inc.  All rights reserved.
 * Copyright (C) 2007, 2008 Apple Inc.  All rights reserved.
 * Copyright (C) 2008 Matt Lilek <webkit@mattlilek.com>
 * Copyright (C) 2009 Joseph Pecoraro
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 *
 * 1.  Redistributions of source code must retain the above copyright
 *     notice, this list of conditions and the following disclaimer.
 * 2.  Redistributions in binary form must reproduce the above copyright
 *     notice, this list of conditions and the following disclaimer in the
 *     documentation and/or other materials provided with the distribution.
 * 3.  Neither the name of Apple Computer, Inc. ("Apple") nor the names of
 *     its contributors may be used to endorse or promote products derived
 *     from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY APPLE AND ITS CONTRIBUTORS "AS IS" AND ANY
 * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL APPLE OR ITS CONTRIBUTORS BE LIABLE FOR ANY
 * DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
 * THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
import * as i18n from '../../../../core/i18n/i18n.js';
import * as Root from '../../../../core/root/root.js';
import * as SDK from '../../../../core/sdk/sdk.js';
import * as StackTrace from '../../../../models/stack_trace/stack_trace.js';
import * as Workspace from '../../../../models/workspace/workspace.js';
import { Directives, html, nothing, render } from '../../../lit/lit.js';
import * as VisualLogging from '../../../visual_logging/visual_logging.js';
import * as UI from '../../legacy.js';
import jsUtilsStyles from './jsUtils.css.js';
import { Linkifier } from './Linkifier.js';
const { classMap } = Directives;
const UIStrings = {
    /**
     * @description Text to stop preventing the debugger from stepping into library code
     */
    removeFromIgnore: 'Remove from ignore list',
    /**
     * @description Text for scripts that should not be stepped into when debugging
     */
    addToIgnore: 'Add script to ignore list',
    /**
     * @description A link to show more frames when they are available.
     */
    showMoreFrames: 'Show ignore-listed frames',
    /**
     * @description A link to rehide frames that are by default hidden.
     */
    showLess: 'Show less',
};
const str_ = i18n.i18n.registerUIStrings('ui/legacy/components/utils/JSPresentationUtils.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
function populateContextMenu(link, event) {
    const contextMenu = new UI.ContextMenu.ContextMenu(event);
    event.consume(true);
    const uiLocation = Linkifier.uiLocation(link);
    if (uiLocation &&
        Workspace.IgnoreListManager.IgnoreListManager.instance().canIgnoreListUISourceCode(uiLocation.uiSourceCode)) {
        if (Workspace.IgnoreListManager.IgnoreListManager.instance().isUserIgnoreListedURL(uiLocation.uiSourceCode.url())) {
            contextMenu.debugSection().appendItem(i18nString(UIStrings.removeFromIgnore), () => Workspace.IgnoreListManager.IgnoreListManager.instance().unIgnoreListUISourceCode(uiLocation.uiSourceCode), { jslogContext: 'remove-from-ignore-list' });
        }
        else {
            contextMenu.debugSection().appendItem(i18nString(UIStrings.addToIgnore), () => Workspace.IgnoreListManager.IgnoreListManager.instance().ignoreListUISourceCode(uiLocation.uiSourceCode), { jslogContext: 'add-to-ignore-list' });
        }
    }
    contextMenu.appendApplicableItems(event);
    void contextMenu.show();
}
export const DEFAULT_VIEW = (input, output, target) => {
    let renderExpandButton = Boolean(input.expandable);
    const maybeRenderExpandButton = () => {
        // clang-format off
        const result = html `
      ${renderExpandButton ? html `
        <button class="arrow-icon-button" jslog=${VisualLogging.expand().track({ click: true })} @click=${input.onExpand}>
          <span class="arrow-icon"></span>
        </button>
      ` : '\n'}`;
        // clang-format on
        renderExpandButton = false;
        return result;
    };
    const classes = {
        'stack-preview-container': true,
        'width-constrained': Boolean(input.widthConstrained),
        expandable: Boolean(input.expandable),
        expanded: Boolean(input.expanded),
        'show-hidden-rows': Boolean(input.showIgnoreListed),
    };
    const { stackTrace } = input;
    // clang-format off
    render(html `
    <style>${jsUtilsStyles}</style>
    <table class=${classMap(classes)}>
      ${stackTrace ? html `
        ${[stackTrace.syncFragment, ...stackTrace.asyncFragments].map(fragment => html `
          <tbody>
            ${'description' in fragment ? html `
              <tr class="stack-preview-async-row">
                <td>${maybeRenderExpandButton()}</td>
                <td class="stack-preview-async-description">
                  ${UI.UIUtils.asyncFragmentLabel(stackTrace, fragment)}
                </td>
                <td></td>
                <td></td>
              </tr>
            ` : nothing}
            ${fragment.frames.map((frame, i) => {
        const previousStackFrameWasBreakpointCondition = i > 0 && [
            SDK.DebuggerModel.COND_BREAKPOINT_SOURCE_URL,
            SDK.DebuggerModel.LOGPOINT_SOURCE_URL,
        ].includes(fragment.frames[i - 1].url ?? '');
        const link = Linkifier.linkifyStackTraceFrame(frame, {
            showColumnNumber: Boolean(input.showColumnNumber),
            tabStop: Boolean(input.tabStops),
            inlineFrameIndex: 0,
            revealBreakpoint: previousStackFrameWasBreakpointCondition,
            maxLength: UI.UIUtils.MaxLengthForDisplayedURLsInConsole,
        });
        link.setAttribute('jslog', `${VisualLogging.link('stack-trace').track({ click: true })}`);
        link.addEventListener('contextmenu', populateContextMenu.bind(null, link));
        return html `
                <tr>
                  <td>${maybeRenderExpandButton()}</td>
                  <td class="function-name">
                    ${UI.UIUtils.beautifyFunctionName(frame.name ?? '')}
                  </td>
                  <td> @ </td>
                  <td class="link">${link}</td>
                </tr>
            `;
    })}
          </tbody>
        `)}
        <tfoot>
          <tr class="show-all-link">
            <td></td>
            <td colspan="3">
              <span class="link" @click=${input.onShowMore}>
                <span class="css-inserted-text" data-inserted-text=${i18nString(UIStrings.showMoreFrames)}></span>
              </span>
            </td>
          </tr>
          <tr class="show-less-link">
            <td></td>
            <td colspan="3">
              <span class="link" @click=${input.onShowLess}>
                <span class="css-inserted-text" data-inserted-text=${i18nString(UIStrings.showLess)}></span>
              </span>
            </td>
          </tr>
        </tfoot>
      ` : nothing}
    </table>
  `, target);
    // clang-format on
};
export class StackTracePreviewContent extends UI.Widget.Widget {
    #view;
    #stackTrace;
    #options = {};
    #expanded = false;
    #showIgnoreListed = false;
    constructor(element, view = DEFAULT_VIEW) {
        super(element, { useShadowDom: true, classes: ['monospace', 'stack-preview-container'] });
        this.#view = view;
    }
    hasContent() {
        if (!this.#stackTrace) {
            return false;
        }
        const { syncFragment, asyncFragments } = this.#stackTrace;
        return syncFragment.frames.length > 0 || asyncFragments.some(f => f.frames.length > 0);
    }
    performUpdate() {
        this.element.classList.toggle('expandable', this.#options.expandable);
        this.element.classList.toggle('expanded', this.#expanded);
        this.element.classList.toggle('show-hidden-rows', this.#showIgnoreListed);
        const input = {
            stackTrace: this.#stackTrace,
            ...this.#options,
            expanded: this.#expanded,
            showIgnoreListed: this.#showIgnoreListed,
            onExpand: this.#onExpand.bind(this),
            onShowMore: this.#onShowMoreLess.bind(this, true),
            onShowLess: this.#onShowMoreLess.bind(this, false),
        };
        this.#view(input, {}, this.contentElement);
        this.#updateHasNonIgnoredLinks();
    }
    // Propagate ignore-list state to the host element so that CSS outside the
    // shadow DOM can coordinate ignore-list toggling across multiple stack
    // traces (e.g. Error inline stack + console.error call stack).
    // See crbug.com/379788109.
    #updateHasNonIgnoredLinks = () => {
        const hasNonIgnoredLinks = this.linkElements.some(link => {
            const uiLocation = Linkifier.uiLocation(link);
            if (uiLocation) {
                return !uiLocation.isIgnoreListed();
            }
            return !link.classList.contains('ignore-list-link');
        });
        this.element.classList.toggle('has-non-ignored-links', hasNonIgnoredLinks);
    };
    wasShown() {
        super.wasShown();
        if (Root.DevToolsContext.globalInstance().has(Workspace.IgnoreListManager.IgnoreListManager)) {
            Workspace.IgnoreListManager.IgnoreListManager.instance().addChangeListener(this.#updateHasNonIgnoredLinks);
        }
    }
    willHide() {
        if (Root.DevToolsContext.globalInstance().has(Workspace.IgnoreListManager.IgnoreListManager)) {
            Workspace.IgnoreListManager.IgnoreListManager.instance().removeChangeListener(this.#updateHasNonIgnoredLinks);
        }
        super.willHide();
    }
    get linkElements() {
        return [...this.contentElement.querySelectorAll('td.link > .devtools-link')];
    }
    set options(options) {
        this.#options = options;
        this.requestUpdate();
    }
    set stackTrace(stackTrace) {
        if (this.#stackTrace) {
            this.#stackTrace.removeEventListener("UPDATED" /* StackTrace.StackTrace.Events.UPDATED */, this.requestUpdate, this);
        }
        this.#stackTrace = stackTrace;
        this.#stackTrace.addEventListener("UPDATED" /* StackTrace.StackTrace.Events.UPDATED */, this.requestUpdate, this);
        this.requestUpdate();
    }
    #onShowMoreLess(more) {
        this.#showIgnoreListed = more;
        this.requestUpdate();
        // If we are in a popup, this will trigger a re-layout
        void this.updateComplete.then(() => UI.GlassPane.GlassPane.containerMoved(this.contentElement));
    }
    #onExpand() {
        this.#expanded = !this.#expanded;
        this.requestUpdate();
    }
}
//# sourceMappingURL=JSPresentationUtils.js.map
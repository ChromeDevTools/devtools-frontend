// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-lit-render-outside-of-view */
import '../../../ui/components/expandable_list/expandable_list.js';
import * as i18n from '../../../core/i18n/i18n.js';
import * as Components from '../../../ui/legacy/components/utils/utils.js';
import * as Lit from '../../../ui/lit/lit.js';
import * as VisualLogging from '../../../ui/visual_logging/visual_logging.js';
import stackTraceLinkButtonStyles from './stackTraceLinkButton.css.js';
import stackTraceRowStyles from './stackTraceRow.css.js';
const { html } = Lit;
const UIStrings = {
    /**
     * @description Error message stating that something went wrong when trying to render stack trace
     */
    cannotRenderStackTrace: 'Cannot render stack trace',
    /**
     * @description A link to show more frames in the stack trace if more are available. Never 0.
     */
    showSMoreFrames: '{n, plural, =1 {Show # more frame} other {Show # more frames}}',
    /**
     * @description A link to rehide frames that are by default hidden.
     */
    showLess: 'Show less',
    /**
     * @description Label for a stack trace. If a frame is created programmatically (i.e. via JavaScript), there is a
     * stack trace for the line of code which caused the creation of the iframe. This is the stack trace we are showing here.
     */
    creationStackTrace: 'Frame Creation `Stack Trace`',
};
const str_ = i18n.i18n.registerUIStrings('panels/application/components/StackTrace.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class StackTraceRow extends HTMLElement {
    #shadow = this.attachShadow({ mode: 'open' });
    #stackTraceRowItem = null;
    set data(data) {
        this.#stackTraceRowItem = data.stackTraceRowItem;
        this.#render();
    }
    #render() {
        if (!this.#stackTraceRowItem) {
            return;
        }
        Lit.render(html `
      <style>${stackTraceRowStyles}</style>
      <div class="stack-trace-row">
              <div class="stack-trace-function-name text-ellipsis" title=${this.#stackTraceRowItem.functionName}>
                ${this.#stackTraceRowItem.functionName}
              </div>
              <div class="stack-trace-source-location">
                ${this.#stackTraceRowItem.link ?
            html `<div class="text-ellipsis">\xA0@\xA0${this.#stackTraceRowItem.link}</div>` :
            Lit.nothing}
              </div>
            </div>
    `, this.#shadow, { host: this });
    }
}
export class StackTraceLinkButton extends HTMLElement {
    #shadow = this.attachShadow({ mode: 'open' });
    #onShowAllClick = () => { };
    #hiddenCallFramesCount = null;
    #expandedView = false;
    set data(data) {
        this.#onShowAllClick = data.onShowAllClick;
        this.#hiddenCallFramesCount = data.hiddenCallFramesCount;
        this.#expandedView = data.expandedView;
        this.#render();
    }
    #render() {
        if (!this.#hiddenCallFramesCount) {
            return;
        }
        const linkText = this.#expandedView ? i18nString(UIStrings.showLess) :
            i18nString(UIStrings.showSMoreFrames, { n: this.#hiddenCallFramesCount });
        Lit.render(html `
      <style>${stackTraceLinkButtonStyles}</style>
      <div class="stack-trace-row">
          <button class="link" @click=${() => this.#onShowAllClick()}>
            ${linkText}
          </button>
        </div>
    `, this.#shadow, { host: this });
    }
}
export class StackTrace extends HTMLElement {
    #shadow = this.attachShadow({ mode: 'open' });
    #linkifier = new Components.Linkifier.Linkifier();
    #stackTraceRows = [];
    #showHidden = false;
    set data(data) {
        const frame = data.frame;
        const { creationStackTrace, creationStackTraceTarget } = frame.getCreationStackTraceData();
        if (creationStackTrace) {
            this.#stackTraceRows = data.buildStackTraceRows(creationStackTrace, creationStackTraceTarget, this.#linkifier, true, this.#onStackTraceRowsUpdated.bind(this));
        }
        this.#render();
    }
    #onStackTraceRowsUpdated(stackTraceRows) {
        this.#stackTraceRows = stackTraceRows;
        this.#render();
    }
    #onToggleShowAllClick() {
        this.#showHidden = !this.#showHidden;
        this.#render();
    }
    createRowTemplates() {
        const expandableRows = [];
        let hiddenCallFramesCount = 0;
        for (const item of this.#stackTraceRows) {
            let ignoreListHide = false;
            // TODO(crbug.com/1183325): fix race condition with uiLocation still being null here
            // Note: This has always checked whether the call frame location *in the generated
            // code* is ignore-listed or not. This can change after the live location updates,
            // and is handled again in the linkifier live location update callback.
            if ('link' in item && item.link) {
                const uiLocation = Components.Linkifier.Linkifier.uiLocation(item.link);
                ignoreListHide = Boolean(uiLocation?.isIgnoreListed());
            }
            if (this.#showHidden || !ignoreListHide) {
                if ('functionName' in item) {
                    expandableRows.push(html `
          <devtools-stack-trace-row data-stack-trace-row .data=${{
                        stackTraceRowItem: item,
                    }}></devtools-stack-trace-row>`);
                }
                if ('asyncDescription' in item) {
                    expandableRows.push(html `
            <div>${item.asyncDescription}</div>
          `);
                }
            }
            if ('functionName' in item && ignoreListHide) {
                hiddenCallFramesCount++;
            }
        }
        if (hiddenCallFramesCount) {
            // Disabled until https://crbug.com/1079231 is fixed.
            // clang-format off
            expandableRows.push(html `
      <devtools-stack-trace-link-button data-stack-trace-row .data=${{ onShowAllClick: this.#onToggleShowAllClick.bind(this), hiddenCallFramesCount, expandedView: this.#showHidden }}></devtools-stack-trace-link-button>
      `);
            // clang-format on
        }
        return expandableRows;
    }
    #render() {
        if (!this.#stackTraceRows.length) {
            // Disabled until https://crbug.com/1079231 is fixed.
            // clang-format off
            Lit.render(html `
          <span>${i18nString(UIStrings.cannotRenderStackTrace)}</span>
        `, this.#shadow, { host: this });
            return;
        }
        const expandableRows = this.createRowTemplates();
        Lit.render(html `
        <devtools-expandable-list .data=${{ rows: expandableRows, title: i18nString(UIStrings.creationStackTrace) }}
                                  jslog=${VisualLogging.tree()}>
        </devtools-expandable-list>
      `, this.#shadow, { host: this });
        // clang-format on
    }
}
customElements.define('devtools-stack-trace-row', StackTraceRow);
customElements.define('devtools-stack-trace-link-button', StackTraceLinkButton);
customElements.define('devtools-resources-stack-trace', StackTrace);
//# sourceMappingURL=StackTrace.js.map
// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import '../../../../ui/legacy/components/data_grid/data_grid.js';
import '../../../../ui/kit/kit.js';
import * as Common from '../../../../core/common/common.js';
import * as i18n from '../../../../core/i18n/i18n.js';
import * as SDK from '../../../../core/sdk/sdk.js';
import * as UI from '../../../../ui/legacy/legacy.js';
import * as Lit from '../../../../ui/lit/lit.js';
import preloadingGridStyles from './preloadingGrid.css.js';
import { capitalizedAction, composedStatus, ruleSetTagOrLocationShort, sortOrder } from './PreloadingString.js';
const { PreloadingStatus } = SDK.PreloadingModel;
const UIStrings = {
    /**
     * @description Column header: Action of preloading (prefetch/prerender)
     */
    action: 'Action',
    /**
     * @description Column header: A rule set of preloading
     */
    ruleSet: 'Rule set',
    /**
     * @description Column header: Status of preloading attempt
     */
    status: 'Status',
    /**
     * @description Status: Prerender failed, but prefetch is available
     */
    prefetchFallbackReady: 'Prefetch fallback ready',
};
const str_ = i18n.i18n.registerUIStrings('panels/application/preloading/components/PreloadingGrid.ts', UIStrings);
export const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
const { render, html, nothing, Directives: { styleMap } } = Lit;
// Shorten URL if a preloading attempt is same-origin.
function urlShort(row, securityOrigin) {
    const url = row.pipeline.getOriginallyTriggered().key.url;
    return securityOrigin && url.startsWith(securityOrigin) ? url.slice(securityOrigin.length) : url;
}
export const PRELOADING_GRID_DEFAULT_VIEW = (input, _output, target) => {
    if (!input.rows || input.pageURL === undefined) {
        render(nothing, target);
        return;
    }
    const { rows, pageURL } = input;
    const securityOrigin = pageURL === '' ? null : (new Common.ParsedURL.ParsedURL(pageURL)).securityOrigin();
    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    render(html `
    <style>${preloadingGridStyles}</style>
    <div class="preloading-container">
      <devtools-data-grid striped>
        <table>
          <tr>
            <th id="url" weight="40" sortable>${i18n.i18n.lockedString('URL')}</th>
            <th id="action" weight="15" sortable>${i18nString(UIStrings.action)}</th>
            <th id="rule-set" weight="20" sortable>${i18nString(UIStrings.ruleSet)}</th>
            <th id="status" weight="40" sortable>${i18nString(UIStrings.status)}</th>
          </tr>
          ${rows.map(row => {
        const attempt = row.pipeline.getOriginallyTriggered();
        const prefetchStatus = row.pipeline.getPrefetch()?.status;
        const prerenderStatus = row.pipeline.getPrerender()?.status;
        const hasWarning = (prerenderStatus === "Failure" /* PreloadingStatus.FAILURE */ &&
            (prefetchStatus === "Ready" /* PreloadingStatus.READY */ || prefetchStatus === "Success" /* PreloadingStatus.SUCCESS */));
        const hasError = row.pipeline.getOriginallyTriggered().status === "Failure" /* PreloadingStatus.FAILURE */;
        return html `<tr @select=${() => input.onSelect?.({ rowId: row.id })}>
              <td title=${attempt.key.url}>${urlShort(row, securityOrigin)}</td>
              <td>${capitalizedAction(attempt.action)}</td>
              <td>${row.ruleSets.length === 0 ? '' : ruleSetTagOrLocationShort(row.ruleSets[0], pageURL)}</td>
              <td data-value=${sortOrder(attempt)}>
                <div style=${styleMap({ color: hasWarning ? 'var(--sys-color-orange-bright)'
                : hasError ? 'var(--sys-color-error)'
                    : 'var(--sys-color-on-surface)' })}>
                  ${(hasError || hasWarning) ? html `
                    <devtools-icon
                      name=${hasWarning ? 'warning-filled' : 'cross-circle-filled'}
                      class='medium'
                      style=${styleMap({
            'vertical-align': 'sub',
        })}
                    ></devtools-icon>` : ''}
                  ${hasWarning ? i18nString(UIStrings.prefetchFallbackReady) : composedStatus(attempt)}
                </div>
              </td>
            </tr>`;
    })}
        </table>
      </devtools-data-grid>
    </div>
  `, target);
}; // clang-format on
/** Grid component to show prerendering attempts. **/
export class PreloadingGrid extends UI.Widget.VBox {
    #view;
    #rows;
    #pageURL;
    #onSelect;
    constructor(view) {
        super();
        this.#view = view ?? PRELOADING_GRID_DEFAULT_VIEW;
        this.requestUpdate();
    }
    set rows(rows) {
        this.#rows = rows;
        this.requestUpdate();
    }
    set pageURL(pageURL) {
        this.#pageURL = pageURL;
        this.requestUpdate();
    }
    set onSelect(onSelect) {
        this.#onSelect = onSelect;
        this.requestUpdate();
    }
    performUpdate() {
        const viewInput = {
            rows: this.#rows,
            pageURL: this.#pageURL,
            onSelect: this.#onSelect?.bind(this),
        };
        this.#view(viewInput, undefined, this.contentElement);
    }
}
//# sourceMappingURL=PreloadingGrid.js.map
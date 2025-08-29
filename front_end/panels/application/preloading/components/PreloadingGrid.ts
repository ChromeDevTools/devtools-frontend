// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable rulesdir/no-lit-render-outside-of-view */

import '../../../../ui/legacy/components/data_grid/data_grid.js';
import '../../../../ui/components/icon_button/icon_button.js';

import * as Common from '../../../../core/common/common.js';
import * as i18n from '../../../../core/i18n/i18n.js';
import type * as Platform from '../../../../core/platform/platform.js';
import * as SDK from '../../../../core/sdk/sdk.js';
import type * as Protocol from '../../../../generated/protocol.js';
import * as LegacyWrapper from '../../../../ui/components/legacy_wrapper/legacy_wrapper.js';
import type * as UI from '../../../../ui/legacy/legacy.js';
import * as Lit from '../../../../ui/lit/lit.js';

import preloadingGridStyles from './preloadingGrid.css.js';
import {capitalizedAction, composedStatus, ruleSetTagOrLocationShort} from './PreloadingString.js';

const {PreloadingStatus} = SDK.PreloadingModel;

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
} as const;
const str_ = i18n.i18n.registerUIStrings('panels/application/preloading/components/PreloadingGrid.ts', UIStrings);
export const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

const {render, html, Directives: {styleMap}} = Lit;

export interface PreloadingGridData {
  rows: PreloadingGridRow[];
  pageURL: Platform.DevToolsPath.UrlString;
}

export interface PreloadingGridRow {
  id: string;
  pipeline: SDK.PreloadingModel.PreloadPipeline;
  ruleSets: Protocol.Preload.RuleSet[];
}

// Grid component to show prerendering attempts.
export class PreloadingGrid extends LegacyWrapper.LegacyWrapper.WrappableComponent<UI.Widget.VBox> {

  readonly #shadow = this.attachShadow({mode: 'open'});
  #data: PreloadingGridData|null = null;

  connectedCallback(): void {
    this.#render();
  }

  update(data: PreloadingGridData): void {
    this.#data = data;
    this.#render();
  }

  #render(): void {
    if (!this.#data) {
      return;
    }
    const {rows, pageURL} = this.#data;
    const securityOrigin = pageURL === '' ? null : (new Common.ParsedURL.ParsedURL(pageURL)).securityOrigin();

    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    render(html`
      <style>${preloadingGridStyles}</style>
      <div class="preloading-container">
        <devtools-data-grid striped @select=${this.#onPreloadingGridCellFocused}>
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
              const hasWarning =
                  (prerenderStatus === PreloadingStatus.FAILURE &&
                  (prefetchStatus === PreloadingStatus.READY || prefetchStatus === PreloadingStatus.SUCCESS));
              const hasError = row.pipeline.getOriginallyTriggered().status === PreloadingStatus.FAILURE;
              return html`<tr data-id=${row.id}>
                <td title=${attempt.key.url}>${this.#urlShort(row, securityOrigin)}</td>
                <td>${capitalizedAction(attempt.action)}</td>
                <td>${row.ruleSets.length === 0 ? '' : ruleSetTagOrLocationShort(row.ruleSets[0], pageURL)}</td>
                <td>
                  <div style=${styleMap({color: hasWarning ? 'var(--sys-color-orange-bright)'
                                                : hasError   ? 'var(--sys-color-error)'
                                                             : 'var(--sys-color-on-surface)'})}>
                    ${(hasError || hasWarning) ?  html`
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
    `, this.#shadow, {host: this});
    // clang-format on
  }

  #onPreloadingGridCellFocused(event: CustomEvent<HTMLElement>): void {
    this.dispatchEvent(new CustomEvent('select', {detail: event.detail.dataset.id}));
  }

  // Shorten URL if a preloading attempt is same-origin.
  #urlShort(row: PreloadingGridRow, securityOrigin: string|null): string {
    const url = row.pipeline.getOriginallyTriggered().key.url;
    return securityOrigin && url.startsWith(securityOrigin) ? url.slice(securityOrigin.length) : url;
  }
}

customElements.define('devtools-resources-preloading-grid', PreloadingGrid);

declare global {
  interface HTMLElementTagNameMap {
    'devtools-resources-preloading-grid': PreloadingGrid;
  }
}

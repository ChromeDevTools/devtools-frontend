// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable rulesdir/no-lit-render-outside-of-view */

import '../../../../ui/legacy/components/data_grid/data_grid.js';

import * as i18n from '../../../../core/i18n/i18n.js';
import type * as Platform from '../../../../core/platform/platform.js';
import * as SDK from '../../../../core/sdk/sdk.js';
import type * as Protocol from '../../../../generated/protocol.js';
import * as Diff from '../../../../third_party/diff/diff.js';
import * as LegacyWrapper from '../../../../ui/components/legacy_wrapper/legacy_wrapper.js';
import type * as UI from '../../../../ui/legacy/legacy.js';
import * as Lit from '../../../../ui/lit/lit.js';

import {capitalizedAction} from './PreloadingString.js';

const {charDiff} = Diff.Diff.DiffWrapper;
const {render, html, Directives: {styleMap}} = Lit;

const UIStrings = {
  /**
   * @description Column header
   */
  url: 'URL',
  /**
   * @description Column header: Action of preloading (prefetch/prerender)
   */
  action: 'Action',
  /**
   * @description Column header: Status of preloading attempt
   */
  status: 'Status',
  /**
   * @description Text in grid and details: Preloading attempt is not yet triggered.
   */
  statusNotTriggered: 'Not triggered',
  /**
   * @description Text in grid and details: Preloading attempt is eligible but pending.
   */
  statusPending: 'Pending',
  /**
   * @description Text in grid and details: Preloading is running.
   */
  statusRunning: 'Running',
  /**
   * @description Text in grid and details: Preloading finished and the result is ready for the next navigation.
   */
  statusReady: 'Ready',
  /**
   * @description Text in grid and details: Ready, then used.
   */
  statusSuccess: 'Success',
  /**
   * @description Text in grid and details: Preloading failed.
   */
  statusFailure: 'Failure',
} as const;
const str_ =
    i18n.i18n.registerUIStrings('panels/application/preloading/components/MismatchedPreloadingGrid.ts', UIStrings);
export const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

class PreloadingUIUtils {
  static status(status: SDK.PreloadingModel.PreloadingStatus): string {
    // See content/public/browser/preloading.h PreloadingAttemptOutcome.
    switch (status) {
      case SDK.PreloadingModel.PreloadingStatus.NOT_TRIGGERED:
        return i18nString(UIStrings.statusNotTriggered);
      case SDK.PreloadingModel.PreloadingStatus.PENDING:
        return i18nString(UIStrings.statusPending);
      case SDK.PreloadingModel.PreloadingStatus.RUNNING:
        return i18nString(UIStrings.statusRunning);
      case SDK.PreloadingModel.PreloadingStatus.READY:
        return i18nString(UIStrings.statusReady);
      case SDK.PreloadingModel.PreloadingStatus.SUCCESS:
        return i18nString(UIStrings.statusSuccess);
      case SDK.PreloadingModel.PreloadingStatus.FAILURE:
        return i18nString(UIStrings.statusFailure);
      // NotSupported is used to handle unreachable case. For example,
      // there is no code path for
      // PreloadingTriggeringOutcome::kTriggeredButPending in prefetch,
      // which is mapped to NotSupported. So, we regard it as an
      // internal error.
      case SDK.PreloadingModel.PreloadingStatus.NOT_SUPPORTED:
        return i18n.i18n.lockedString('Internal error');
    }
  }
}

export interface MismatchedPreloadingGridRow {
  action: Protocol.Preload.SpeculationAction;
  url: string;
  status: SDK.PreloadingModel.PreloadingStatus;
}

export interface MismatchedPreloadingGridData {
  pageURL: Platform.DevToolsPath.UrlString;
  rows: MismatchedPreloadingGridRow[];
}

// Grid component to show prerendering attempts.
export class MismatchedPreloadingGrid extends LegacyWrapper.LegacyWrapper.WrappableComponent<UI.Widget.VBox> {
  readonly #shadow = this.attachShadow({mode: 'open'});
  #data: MismatchedPreloadingGridData|null = null;

  connectedCallback(): void {
    this.#render();
  }

  set data(data: MismatchedPreloadingGridData) {
    this.#data = data;
    this.#render();
  }

  #render(): void {
    if (!this.#data) {
      return;
    }

    const {pageURL} = this.#data;

    render(
        html`<devtools-data-grid striped inline>
          <table>
            <tr>
              <th id="url" weight="40" sortable>
                ${i18nString(UIStrings.url)}
              </th>
              <th id="action" weight="15" sortable>
                ${i18nString(UIStrings.action)}
              </th>
              <th id="status" weight="15" sortable>
                ${i18nString(UIStrings.status)}
              </th>
            </tr>
            ${
            this.#data.rows
                .map(row => ({
                       row,
                       diffScore: Diff.Diff.DiffWrapper.characterScore(row.url, pageURL),
                     }))
                .sort((a, b) => b.diffScore - a.diffScore)
                .map(({row}) => html`
                <tr>
                  <td>
                    <div>${charDiff(row.url, pageURL).map(diffOp => {
                       const s = diffOp[1];
                       switch (diffOp[0]) {
                         case Diff.Diff.Operation.Equal:
                           return html`<span>${s}</span>`;
                         case Diff.Diff.Operation.Insert:
                           return html`<span style=${styleMap({
                             color: 'var(--sys-color-green)',
                             'text-decoration': 'line-through'
                           })}
                               >${s}</span>`;
                         case Diff.Diff.Operation.Delete:
                           return html`<span style=${styleMap({color: 'var(--sys-color-error)'})}>${s}</span>`;
                         case Diff.Diff.Operation.Edit:
                           return html`<span style=${styleMap({
                             color: 'var(--sys-color-green',
                             'text-decoration': 'line-through'
                           })}
                            >${s}</span>`;
                         default:
                           throw new Error('unreachable');
                       }
                     })}
                    </div>
                  </td>
                  <td>${capitalizedAction(row.action)}</td>
                  <td>${PreloadingUIUtils.status(row.status)}</td>
                </tr>
              `)}
          </table>
        </devtools-data-grid>`,
        this.#shadow, {host: this});
  }
}

customElements.define('devtools-resources-mismatched-preloading-grid', MismatchedPreloadingGrid);

declare global {
  interface HTMLElementTagNameMap {
    'devtools-resources-mismatched-preloading-grid': MismatchedPreloadingGrid;
  }
}

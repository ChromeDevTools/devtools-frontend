// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import './Table.js';

import * as i18n from '../../../../core/i18n/i18n.js';
import type {DuplicatedJavaScriptInsightModel} from '../../../../models/trace/insights/DuplicatedJavaScript.js';
import * as Trace from '../../../../models/trace/trace.js';
import * as Buttons from '../../../../ui/components/buttons/buttons.js';
import * as Lit from '../../../../ui/lit/lit.js';
import * as VisualLogging from '../../../../ui/visual_logging/visual_logging.js';
import * as Utils from '../../utils/utils.js';

import {BaseInsightComponent} from './BaseInsightComponent.js';
import {scriptRef} from './ScriptRef.js';
import type {TableData, TableDataRow} from './Table.js';

const {UIStrings, i18nString} = Trace.Insights.Models.DuplicatedJavaScript;

const {html} = Lit;

export class DuplicatedJavaScript extends BaseInsightComponent<DuplicatedJavaScriptInsightModel> {
  static override readonly litTagName = Lit.StaticHtml.literal`devtools-performance-duplicated-javascript`;
  override internalName = 'duplicated-javascript';
  #treemapData: Utils.Treemap.TreemapData|null = null;

  #shouldShowTreemap(): boolean {
    if (!this.model) {
      return false;
    }

    return this.model.scripts.some(script => !!script.url);
  }

  protected override hasAskAiSupport(): boolean {
    return true;
  }

  #openTreemap(): void {
    if (!this.model) {
      return;
    }

    if (!this.#treemapData) {
      this.#treemapData = Utils.Treemap.createTreemapData({scripts: this.model.scripts}, this.model.duplication);
    }

    const windowNameSuffix = this.insightSetKey ?? 'devtools';
    Utils.Treemap.openTreemap(this.#treemapData, this.model.mainDocumentUrl, windowNameSuffix);
  }

  override getEstimatedSavingsTime(): Trace.Types.Timing.Milli|null {
    return this.model?.metricSavings?.FCP ?? null;
  }

  override renderContent(): Lit.LitTemplate {
    if (!this.model) {
      return Lit.nothing;
    }

    const rows: TableDataRow[] =
        [...this.model.duplicationGroupedByNodeModules.entries()].slice(0, 10).map(([source, data]) => {
          const scriptToOverlay = new Map();
          for (const {script} of data.duplicates) {
            scriptToOverlay.set(script, {
              type: 'ENTRY_OUTLINE',
              entry: script.request,
              outlineReason: 'ERROR',
            });
          }

          return {
            values: [source, i18n.ByteUtilities.bytesToString(data.estimatedDuplicateBytes)],
            overlays: [...scriptToOverlay.values()],
            subRows: data.duplicates.map(({script, attributedSize}, index) => {
              let overlays: Trace.Types.Overlays.Overlay[]|undefined;
              const overlay = scriptToOverlay.get(script);
              if (overlay) {
                overlays = [overlay];
              }

              return {
                values: [
                  scriptRef(script),
                  index === 0 ? '--' : i18n.ByteUtilities.bytesToString(attributedSize),
                ],
                overlays,
              };
            })
          };
        });

    let treemapButton;
    if (this.#shouldShowTreemap()) {
      treemapButton = html`<devtools-button
        .variant=${Buttons.Button.Variant.OUTLINED}
        jslog=${VisualLogging.action(`timeline.treemap.${this.internalName}-insight`).track({
        click: true
      })}
        @click=${this.#openTreemap}
      >View Treemap</devtools-button>`;
    }

    // clang-format off
    return html`
      ${treemapButton}
      <div class="insight-section">
        <devtools-performance-table
          .data=${{
            insight: this,
            headers: [i18nString(UIStrings.columnSource), i18nString(UIStrings.columnDuplicatedBytes)],
            rows,
          } as TableData}>
        </devtools-performance-table>
      </div>
    `;
    // clang-format on
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'devtools-performance-duplicated-javascript': DuplicatedJavaScript;
  }
}

customElements.define('devtools-performance-duplicated-javascript', DuplicatedJavaScript);

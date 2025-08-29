// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import './Table.js';

import * as Common from '../../../../core/common/common.js';
import * as i18n from '../../../../core/i18n/i18n.js';
import * as SDK from '../../../../core/sdk/sdk.js';
import * as Bindings from '../../../../models/bindings/bindings.js';
import type {
  LegacyJavaScriptInsightModel, PatternMatchResult} from '../../../../models/trace/insights/LegacyJavaScript.js';
import * as Trace from '../../../../models/trace/trace.js';
import * as Lit from '../../../../ui/lit/lit.js';

import {BaseInsightComponent} from './BaseInsightComponent.js';
import {scriptRef} from './ScriptRef.js';
import type {TableData, TableDataRow} from './Table.js';

const {UIStrings, i18nString} = Trace.Insights.Models.LegacyJavaScript;

const {html} = Lit;

export class LegacyJavaScript extends BaseInsightComponent<LegacyJavaScriptInsightModel> {
  static override readonly litTagName = Lit.StaticHtml.literal`devtools-performance-legacy-javascript`;
  override internalName = 'legacy-javascript';

  override getEstimatedSavingsTime(): Trace.Types.Timing.Milli|null {
    return this.model?.metricSavings?.FCP ?? null;
  }

  protected override hasAskAiSupport(): boolean {
    return true;
  }

  async #revealLocation(script: Trace.Handlers.ModelHandlers.Scripts.Script, match: PatternMatchResult): Promise<void> {
    const target = SDK.TargetManager.TargetManager.instance().primaryPageTarget();
    if (!target) {
      return;
    }

    const debuggerModel = target.model(SDK.DebuggerModel.DebuggerModel);
    if (!debuggerModel) {
      return;
    }

    const location = new SDK.DebuggerModel.Location(debuggerModel, script.scriptId, match.line, match.column);
    if (!location) {
      return;
    }

    const uiLocation =
        await Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance().rawLocationToUILocation(location);
    await Common.Revealer.reveal(uiLocation);
  }

  override renderContent(): Lit.LitTemplate {
    if (!this.model) {
      return Lit.nothing;
    }

    const rows: TableDataRow[] =
        [...this.model.legacyJavaScriptResults.entries()].slice(0, 10).map(([script, result]) => {
          const overlays: Trace.Types.Overlays.Overlay[] = [];
          if (script.request) {
            overlays.push({
              type: 'ENTRY_OUTLINE',
              entry: script.request,
              outlineReason: 'ERROR',
            });
          }

          return {
            values: [scriptRef(script), i18n.ByteUtilities.bytesToString(result.estimatedByteSavings)],
            overlays,
            subRows: result.matches.map(match => {
              return {
                values: [html`<span @click=${
                    () => this.#revealLocation(
                        script, match)} title=${`${script.url}:${match.line}:${match.column}`}>${match.name}</span>`],
              };
            })
          };
        });

    // clang-format off
    return html`
      <div class="insight-section">
        <devtools-performance-table
          .data=${{
            insight: this,
            headers: [i18nString(UIStrings.columnScript), i18nString(UIStrings.columnWastedBytes)],
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
    'devtools-performance-legacy-javascript': LegacyJavaScript;
  }
}

customElements.define('devtools-performance-legacy-javascript', LegacyJavaScript);

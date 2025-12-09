// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Common from '../../../../core/common/common.js';
import * as i18n from '../../../../core/i18n/i18n.js';
import * as SDK from '../../../../core/sdk/sdk.js';
import * as Bindings from '../../../../models/bindings/bindings.js';
import * as Trace from '../../../../models/trace/trace.js';
import * as UI from '../../../../ui/legacy/legacy.js';
import * as Lit from '../../../../ui/lit/lit.js';
import { BaseInsightComponent } from './BaseInsightComponent.js';
import { scriptRef } from './ScriptRef.js';
import { Table } from './Table.js';
const { UIStrings, i18nString } = Trace.Insights.Models.LegacyJavaScript;
const { html } = Lit;
const { widgetConfig } = UI.Widget;
export class LegacyJavaScript extends BaseInsightComponent {
    internalName = 'legacy-javascript';
    getEstimatedSavingsTime() {
        return this.model?.metricSavings?.FCP ?? null;
    }
    hasAskAiSupport() {
        return true;
    }
    async #revealLocation(script, match) {
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
        const uiLocation = await Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance().rawLocationToUILocation(location);
        await Common.Revealer.reveal(uiLocation);
    }
    renderContent() {
        if (!this.model) {
            return Lit.nothing;
        }
        const rows = [...this.model.legacyJavaScriptResults.entries()].slice(0, 10).map(([script, result]) => {
            const overlays = [];
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
                        values: [html `<span @click=${() => this.#revealLocation(script, match)} title=${`${script.url}:${match.line}:${match.column}`}>${match.name}</span>`],
                    };
                })
            };
        });
        // clang-format off
        return html `
      <div class="insight-section">
        <devtools-widget .widgetConfig=${widgetConfig(Table, {
            data: {
                insight: this,
                headers: [i18nString(UIStrings.columnScript), i18nString(UIStrings.columnWastedBytes)],
                rows,
            }
        })}>
        </devtools-widget>
      </div>
    `;
        // clang-format on
    }
}
//# sourceMappingURL=LegacyJavaScript.js.map
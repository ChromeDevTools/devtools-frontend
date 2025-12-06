// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as UI from '../../../../ui/legacy/legacy.js';
import * as Lit from '../../../../ui/lit/lit.js';
import { BaseInsightComponent } from './BaseInsightComponent.js';
import { Checklist } from './Checklist.js';
const { html } = Lit;
const { widgetConfig } = UI.Widget;
export class DocumentLatency extends BaseInsightComponent {
    internalName = 'document-latency';
    hasAskAiSupport() {
        return true;
    }
    getEstimatedSavingsTime() {
        return this.model?.metricSavings?.FCP ?? null;
    }
    renderContent() {
        if (!this.model?.data) {
            return Lit.nothing;
        }
        // clang-format off
        return html `<devtools-widget .widgetConfig=${widgetConfig(Checklist, {
            checklist: this.model.data.checklist,
        })}></devtools-widget>`;
        // clang-format on
    }
}
//# sourceMappingURL=DocumentLatency.js.map
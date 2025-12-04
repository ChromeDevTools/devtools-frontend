// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import './Checklist.js';
import * as Lit from '../../../../ui/lit/lit.js';
import { BaseInsightComponent } from './BaseInsightComponent.js';
const { html } = Lit;
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
        return html `<devtools-performance-checklist .checklist=${this.model.data.checklist}></devtools-performance-checklist>`;
        // clang-format on
    }
}
//# sourceMappingURL=DocumentLatency.js.map
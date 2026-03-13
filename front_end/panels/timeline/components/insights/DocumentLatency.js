// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as UI from '../../../../ui/legacy/legacy.js';
import * as Lit from '../../../../ui/lit/lit.js';
import { BaseInsightComponent } from './BaseInsightComponent.js';
import { Checklist } from './Checklist.js';
const { html } = Lit;
const { widget } = UI.Widget;
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
        return html `${widget(Checklist, { checklist: this.model.data.checklist })}`;
    }
}
//# sourceMappingURL=DocumentLatency.js.map
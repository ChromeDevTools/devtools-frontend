// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as UI from '../../../../ui/legacy/legacy.js';
import { Cache } from './Cache.js';
import { CLSCulprits } from './CLSCulprits.js';
import { DocumentLatency } from './DocumentLatency.js';
import { DOMSize } from './DOMSize.js';
import { DuplicatedJavaScript } from './DuplicatedJavaScript.js';
import { FontDisplay } from './FontDisplay.js';
import { ForcedReflow } from './ForcedReflow.js';
import { ImageDelivery } from './ImageDelivery.js';
import { INPBreakdown } from './INPBreakdown.js';
import { LCPBreakdown } from './LCPBreakdown.js';
import { LCPDiscovery } from './LCPDiscovery.js';
import { LegacyJavaScript } from './LegacyJavaScript.js';
import { ModernHTTP } from './ModernHTTP.js';
import { NetworkDependencyTree } from './NetworkDependencyTree.js';
import { RenderBlocking } from './RenderBlocking.js';
import { SlowCSSSelector } from './SlowCSSSelector.js';
import { ThirdParties } from './ThirdParties.js';
import { Viewport } from './Viewport.js';
const { widgetConfig } = UI.Widget;
/**
 * Every insight (INCLUDING experimental ones).
 *
 * Order does not matter (but keep alphabetized).
 */
const INSIGHT_NAME_TO_COMPONENT = {
    Cache,
    CLSCulprits,
    DocumentLatency,
    DOMSize,
    DuplicatedJavaScript,
    FontDisplay,
    ForcedReflow,
    ImageDelivery,
    INPBreakdown,
    LCPDiscovery,
    LCPBreakdown,
    LegacyJavaScript,
    ModernHTTP,
    NetworkDependencyTree,
    RenderBlocking,
    SlowCSSSelector,
    ThirdParties,
    Viewport,
};
export class InsightRenderer {
    #insightWidgetCache = new WeakMap();
    renderInsightToWidgetElement(parsedTrace, insightSet, model, insightName, options) {
        let widgetElement = this.#insightWidgetCache.get(model);
        if (!widgetElement) {
            widgetElement = document.createElement('devtools-widget');
            const componentClass = INSIGHT_NAME_TO_COMPONENT[insightName];
            const widget = new componentClass(widgetElement);
            widget.selected = false;
            widget.parsedTrace = parsedTrace;
            widget.model = model;
            widget.bounds = insightSet.bounds;
            widget.insightSetKey = insightSet.id;
            Object.assign(widget, options);
            widgetElement.widgetConfig = widgetConfig(() => {
                return widget;
            });
            this.#insightWidgetCache.set(model, widgetElement);
        }
        const widget = widgetElement.getWidget();
        if (widget) {
            Object.assign(widget, options);
        }
        return widgetElement;
    }
}
//# sourceMappingURL=InsightRenderer.js.map
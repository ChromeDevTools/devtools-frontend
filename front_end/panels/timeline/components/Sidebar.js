// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-imperative-dom-api */
import * as UI from '../../../ui/legacy/legacy.js';
import { InsightActivated, InsightDeactivated } from './insights/SidebarInsight.js';
import { SidebarAnnotationsTab } from './SidebarAnnotationsTab.js';
import { SidebarInsightsTab } from './SidebarInsightsTab.js';
export class RemoveAnnotation extends Event {
    removedAnnotation;
    static eventName = 'removeannotation';
    constructor(removedAnnotation) {
        super(RemoveAnnotation.eventName, { bubbles: true, composed: true });
        this.removedAnnotation = removedAnnotation;
    }
}
export class RevealAnnotation extends Event {
    annotation;
    static eventName = 'revealannotation';
    constructor(annotation) {
        super(RevealAnnotation.eventName, { bubbles: true, composed: true });
        this.annotation = annotation;
    }
}
export class HoverAnnotation extends Event {
    annotation;
    static eventName = 'hoverannotation';
    constructor(annotation) {
        super(HoverAnnotation.eventName, { bubbles: true, composed: true });
        this.annotation = annotation;
    }
}
export class AnnotationHoverOut extends Event {
    static eventName = 'annotationhoverout';
    constructor() {
        super(AnnotationHoverOut.eventName, { bubbles: true, composed: true });
    }
}
export const DEFAULT_SIDEBAR_TAB = "insights" /* SidebarTabs.INSIGHTS */;
export const DEFAULT_SIDEBAR_WIDTH_PX = 240;
const MIN_SIDEBAR_WIDTH_PX = 170;
export class SidebarWidget extends UI.Widget.VBox {
    #tabbedPane = new UI.TabbedPane.TabbedPane();
    #insightsView = new InsightsView();
    #annotationsView = new AnnotationsView();
    /**
     * If the user has an Insight open and then they collapse the sidebar, we
     * deactivate that Insight to avoid it showing overlays etc - as the user has
     * hidden the Sidebar & Insight from view. But we store it because when the
     * user pops the sidebar open, we want to re-activate it.
     */
    #insightToRestoreOnOpen = null;
    constructor() {
        super();
        this.setMinimumSize(MIN_SIDEBAR_WIDTH_PX, 0);
        this.#tabbedPane.appendTab("insights" /* SidebarTabs.INSIGHTS */, 'Insights', this.#insightsView, undefined, undefined, false, false, 0, 'timeline.insights-tab');
        this.#tabbedPane.appendTab("annotations" /* SidebarTabs.ANNOTATIONS */, 'Annotations', this.#annotationsView, undefined, undefined, false, false, 1, 'timeline.annotations-tab');
        // Default the selected tab to Insights. In wasShown() we will change this
        // if this is a trace that has no insights.
        this.#tabbedPane.selectTab("insights" /* SidebarTabs.INSIGHTS */);
    }
    wasShown() {
        super.wasShown();
        this.#tabbedPane.show(this.element);
        this.#updateAnnotationsCountBadge();
        if (this.#insightToRestoreOnOpen) {
            this.element.dispatchEvent(new InsightActivated(this.#insightToRestoreOnOpen.model, this.#insightToRestoreOnOpen.insightSetKey));
            this.#insightToRestoreOnOpen = null;
        }
        // Swap to the Annotations tab if:
        // 1. Insights is currently selected.
        // 2. The Insights tab is disabled (which means we have no insights for this trace)
        if (this.#tabbedPane.selectedTabId === "insights" /* SidebarTabs.INSIGHTS */ &&
            this.#tabbedPane.tabIsDisabled("insights" /* SidebarTabs.INSIGHTS */)) {
            this.#tabbedPane.selectTab("annotations" /* SidebarTabs.ANNOTATIONS */);
        }
    }
    willHide() {
        super.willHide();
        const currentlyActiveInsight = this.#insightsView.getActiveInsight();
        this.#insightToRestoreOnOpen = currentlyActiveInsight;
        if (currentlyActiveInsight) {
            this.element.dispatchEvent(new InsightDeactivated());
        }
    }
    setAnnotations(updatedAnnotations, annotationEntryToColorMap) {
        this.#annotationsView.setAnnotations(updatedAnnotations, annotationEntryToColorMap);
        this.#updateAnnotationsCountBadge();
    }
    #updateAnnotationsCountBadge() {
        const annotations = this.#annotationsView.deduplicatedAnnotations();
        this.#tabbedPane.setBadge('annotations', annotations.length > 0 ? annotations.length.toString() : null);
    }
    setParsedTrace(parsedTrace) {
        this.#insightsView.setParsedTrace(parsedTrace);
        this.#tabbedPane.setTabEnabled("insights" /* SidebarTabs.INSIGHTS */, Boolean(parsedTrace?.insights && parsedTrace.insights.size > 0));
    }
    setActiveInsight(activeInsight, opts) {
        this.#insightsView.setActiveInsight(activeInsight, opts);
        if (activeInsight) {
            this.#tabbedPane.selectTab("insights" /* SidebarTabs.INSIGHTS */);
        }
    }
}
class InsightsView extends UI.Widget.VBox {
    #component = SidebarInsightsTab.createWidgetElement();
    constructor() {
        super();
        this.element.classList.add('sidebar-insights');
        this.element.appendChild(this.#component);
    }
    setParsedTrace(parsedTrace) {
        this.#component.widgetConfig = UI.Widget.widgetConfig(SidebarInsightsTab, { parsedTrace });
    }
    getActiveInsight() {
        const widget = this.#component.getWidget();
        if (widget) {
            return widget.activeInsight;
        }
        return null;
    }
    setActiveInsight(active, opts) {
        const widget = this.#component.getWidget();
        if (!widget) {
            return;
        }
        widget.activeInsight = active;
        if (opts.highlight && active) {
            // Wait for the rendering of the component to be done, otherwise we
            // might highlight the wrong insight. The UI needs to be fully
            // re-rendered before we can highlight the newly-expanded insight.
            void widget.updateComplete.then(() => {
                widget.highlightActiveInsight();
            });
        }
    }
}
class AnnotationsView extends UI.Widget.VBox {
    #component = new SidebarAnnotationsTab();
    constructor() {
        super();
        this.element.classList.add('sidebar-annotations');
        this.#component.show(this.element);
    }
    setAnnotations(annotations, annotationEntryToColorMap) {
        this.#component.setData({ annotations, annotationEntryToColorMap });
    }
    /**
     * The component "de-duplicates" annotations to ensure implementation details
     * about how we create pending annotations don't leak into the UI. We expose
     * these here because we use this count to show the number of annotations in
     * the small adorner in the sidebar tab.
     */
    deduplicatedAnnotations() {
        return this.#component.deduplicatedAnnotations();
    }
}
//# sourceMappingURL=Sidebar.js.map
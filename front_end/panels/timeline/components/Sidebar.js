// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Common from '../../../core/common/common.js';
import * as i18n from '../../../core/i18n/i18n.js';
import * as UI from '../../../ui/legacy/legacy.js';
import { Directives, html, render } from '../../../ui/lit/lit.js';
import * as Insights from './insights/insights.js';
import { SidebarAnnotationsTab } from './SidebarAnnotationsTab.js';
import { SidebarInsightsTab } from './SidebarInsightsTab.js';
const { ifDefined } = Directives;
const { widget, widgetRef } = UI.Widget;
const UIStrings = {
    /**
     * @description Title of the Insights tab in the Performance panel sidebar.
     */
    insights: 'Insights',
    /**
     * @description Title of the Annotations tab in the Performance panel sidebar.
     */
    annotations: 'Annotations',
};
const str_ = i18n.i18n.registerUIStrings('panels/timeline/components/Sidebar.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
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
export var SidebarTabs;
(function (SidebarTabs) {
    SidebarTabs["INSIGHTS"] = "insights";
    SidebarTabs["ANNOTATIONS"] = "annotations";
})(SidebarTabs || (SidebarTabs = {}));
export const DEFAULT_SIDEBAR_TAB = "insights" /* SidebarTabs.INSIGHTS */;
export const DEFAULT_SIDEBAR_WIDTH_PX = 240;
const MIN_SIDEBAR_WIDTH_PX = 170;
export const DEFAULT_VIEW = (input, output, target) => {
    // clang-format off
    render(html `
    <devtools-tabbed-pane
      @select=${(event) => {
        if (event.detail.isUserGesture) {
            input.onTabSelected(event.detail.tabId);
        }
    }}>
      <devtools-widget
        id=${"insights" /* SidebarTabs.INSIGHTS */}
        label=${i18nString(UIStrings.insights)}
        jslogcontext="timeline.insights-tab"
        class="sidebar-insights"
        ?selected=${input.selectedTabId === "insights" /* SidebarTabs.INSIGHTS */}
        ?disabled=${!input.insightsTabEnabled}
        ${widget(SidebarInsightsTab, {
        parsedTrace: input.parsedTrace,
        activeInsight: input.activeInsight,
    })}
        ${widgetRef(SidebarInsightsTab, insightsTab => {
        output.highlightActiveInsight = () => {
            void insightsTab.updateComplete.then(() => {
                insightsTab.highlightActiveInsight();
            });
        };
        output.setActiveInsightSet = (insightSetKey) => {
            insightsTab.setActiveInsightSet(insightSetKey);
        };
    })}>
      </devtools-widget>
      <devtools-widget
        id=${"annotations" /* SidebarTabs.ANNOTATIONS */}
        label=${i18nString(UIStrings.annotations)}
        badge=${ifDefined(input.annotationsBadge ?? undefined)}
        jslogcontext="timeline.annotations-tab"
        class="sidebar-annotations"
        ?selected=${input.selectedTabId === "annotations" /* SidebarTabs.ANNOTATIONS */}
        ${widget(SidebarAnnotationsTab, {
        annotations: input.annotations,
        annotationEntryToColorMap: input.annotationEntryToColorMap,
    })}>
      </devtools-widget>
    </devtools-tabbed-pane>
  `, target);
    // clang-format on
};
export class SidebarWidget extends UI.Widget.VBox {
    #view;
    #viewOutput = {};
    #parsedTrace = null;
    #activeInsight = null;
    #annotations = [];
    #annotationEntryToColorMap = new Map();
    #annotationsBadge = null;
    #selectedTabId = DEFAULT_SIDEBAR_TAB;
    #onTabSelectedBound = (tabId) => {
        if (this.#selectedTabId === tabId) {
            return;
        }
        this.#selectedTabId = tabId;
        this.requestUpdate();
    };
    /**
     * If the user has an Insight open and then they collapse the sidebar, we
     * deactivate that Insight to avoid it showing overlays etc - as the user has
     * hidden the Sidebar & Insight from view. But we store it because when the
     * user pops the sidebar open, we want to re-activate it.
     */
    #insightToRestoreOnOpen = null;
    /**
     * We track if the user has opened the sidebar once. This is used to
     * automatically show the sidebar for new users when they first record or
     * import a trace, but then persist its state (so if they close it, it stays
     * closed).
     */
    #hasOpenedOnce = Common.Settings.Settings.instance().createSetting('timeline-sidebar-opened-at-least-once', false);
    constructor(view = DEFAULT_VIEW) {
        super();
        this.#view = view;
        this.setMinimumSize(MIN_SIDEBAR_WIDTH_PX, 0);
    }
    #hasInsights() {
        return Boolean(this.#parsedTrace?.insights && this.#parsedTrace.insights.size > 0);
    }
    performUpdate() {
        this.#view({
            parsedTrace: this.#parsedTrace,
            activeInsight: this.#activeInsight,
            annotations: this.#annotations,
            annotationEntryToColorMap: this.#annotationEntryToColorMap,
            annotationsBadge: this.#annotationsBadge,
            insightsTabEnabled: this.#hasInsights(),
            selectedTabId: this.#selectedTabId,
            onTabSelected: this.#onTabSelectedBound,
        }, this.#viewOutput, this.contentElement);
    }
    wasShown() {
        super.wasShown();
        this.#hasOpenedOnce.set(true);
        if (this.#insightToRestoreOnOpen) {
            this.element.dispatchEvent(new Insights.SidebarInsight.InsightActivated(this.#insightToRestoreOnOpen.model, this.#insightToRestoreOnOpen.insightSetKey));
            this.#insightToRestoreOnOpen = null;
        }
        // Swap to the Annotations tab if:
        // 1. Insights is currently selected.
        // 2. The Insights tab is disabled (which means we have no insights for this trace)
        if (this.#selectedTabId === "insights" /* SidebarTabs.INSIGHTS */ && !this.#hasInsights()) {
            this.#selectedTabId = "annotations" /* SidebarTabs.ANNOTATIONS */;
        }
        this.requestUpdate();
    }
    willHide() {
        super.willHide();
        const currentlyActiveInsight = this.#activeInsight;
        this.#insightToRestoreOnOpen = currentlyActiveInsight;
        if (currentlyActiveInsight) {
            this.element.dispatchEvent(new Insights.SidebarInsight.InsightDeactivated());
        }
    }
    setAnnotations(updatedAnnotations, annotationEntryToColorMap) {
        if (this.#annotations === updatedAnnotations && this.#annotationEntryToColorMap === annotationEntryToColorMap) {
            return;
        }
        this.#annotations = updatedAnnotations;
        this.#annotationEntryToColorMap = annotationEntryToColorMap;
        const deduplicatedAnnotations = SidebarAnnotationsTab.processAnnotationsList(updatedAnnotations);
        this.#annotationsBadge = deduplicatedAnnotations.length > 0 ? deduplicatedAnnotations.length.toString() : null;
        this.requestUpdate();
    }
    setParsedTrace(parsedTrace) {
        if (this.#parsedTrace === parsedTrace) {
            return;
        }
        this.#parsedTrace = parsedTrace;
        this.requestUpdate();
    }
    setActiveInsight(activeInsight, opts) {
        const tabChanged = Boolean(activeInsight && this.#selectedTabId !== "insights" /* SidebarTabs.INSIGHTS */);
        if (this.#activeInsight !== activeInsight || tabChanged) {
            this.#activeInsight = activeInsight;
            if (activeInsight) {
                this.#selectedTabId = "insights" /* SidebarTabs.INSIGHTS */;
            }
            this.requestUpdate();
        }
        if (opts.highlight && activeInsight) {
            void this.updateComplete.then(() => {
                this.#viewOutput.highlightActiveInsight?.();
            });
        }
    }
    openInsightsTab() {
        if (this.#selectedTabId === "insights" /* SidebarTabs.INSIGHTS */) {
            return;
        }
        this.#selectedTabId = "insights" /* SidebarTabs.INSIGHTS */;
        this.requestUpdate();
    }
    setActiveInsightSet(insightSetKey) {
        void this.updateComplete.then(() => {
            this.#viewOutput.setActiveInsightSet?.(insightSetKey);
        });
    }
    /**
     * True if the sidebar has been visible at least one time. This is persisted
     * to the user settings so it persists across sessions. This is used because
     * we do not force the RPP sidebar open by default; if a user has seen it &
     * then closed it, we will not re-open it automatically. But if a user
     * has never seen it, we want them to see it once to know it exists.
     */
    sidebarHasBeenOpened() {
        return this.#hasOpenedOnce.get();
    }
}
//# sourceMappingURL=Sidebar.js.map
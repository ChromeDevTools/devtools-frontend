// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable rulesdir/no-imperative-dom-api */

import type * as Trace from '../../../models/trace/trace.js';
import * as RenderCoordinator from '../../../ui/components/render_coordinator/render_coordinator.js';
import * as UI from '../../../ui/legacy/legacy.js';

import {InsightActivated, InsightDeactivated} from './insights/SidebarInsight.js';
import {SidebarAnnotationsTab} from './SidebarAnnotationsTab.js';
import {SidebarInsightsTab} from './SidebarInsightsTab.js';

export interface ActiveInsight {
  model: Trace.Insights.Types.InsightModel;
  insightSetKey: string;
}

export class RemoveAnnotation extends Event {
  static readonly eventName = 'removeannotation';

  constructor(public removedAnnotation: Trace.Types.File.Annotation) {
    super(RemoveAnnotation.eventName, {bubbles: true, composed: true});
  }
}

export class RevealAnnotation extends Event {
  static readonly eventName = 'revealannotation';

  constructor(public annotation: Trace.Types.File.Annotation) {
    super(RevealAnnotation.eventName, {bubbles: true, composed: true});
  }
}
export class HoverAnnotation extends Event {
  static readonly eventName = 'hoverannotation';

  constructor(public annotation: Trace.Types.File.Annotation) {
    super(HoverAnnotation.eventName, {bubbles: true, composed: true});
  }
}

export class AnnotationHoverOut extends Event {
  static readonly eventName = 'annotationhoverout';

  constructor() {
    super(AnnotationHoverOut.eventName, {bubbles: true, composed: true});
  }
}

declare global {
  interface GlobalEventHandlersEventMap {
    [RevealAnnotation.eventName]: RevealAnnotation;
    [HoverAnnotation.eventName]: HoverAnnotation;
    [AnnotationHoverOut.eventName]: AnnotationHoverOut;
  }
}

export const enum SidebarTabs {
  INSIGHTS = 'insights',
  ANNOTATIONS = 'annotations',
}
export const DEFAULT_SIDEBAR_TAB = SidebarTabs.INSIGHTS;

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
  #insightToRestoreOnOpen: ActiveInsight|null = null;

  constructor() {
    super();
    this.setMinimumSize(MIN_SIDEBAR_WIDTH_PX, 0);
    this.#tabbedPane.appendTab(
        SidebarTabs.INSIGHTS, 'Insights', this.#insightsView, undefined, undefined, false, false, 0,
        'timeline.insights-tab');
    this.#tabbedPane.appendTab(
        SidebarTabs.ANNOTATIONS, 'Annotations', this.#annotationsView, undefined, undefined, false, false, 1,
        'timeline.annotations-tab');

    // Default the selected tab to Insights. In wasShown() we will change this
    // if this is a trace that has no insights.
    this.#tabbedPane.selectTab(SidebarTabs.INSIGHTS);
  }

  override wasShown(): void {
    this.#tabbedPane.show(this.element);
    this.#updateAnnotationsCountBadge();

    if (this.#insightToRestoreOnOpen) {
      this.element.dispatchEvent(new InsightActivated(
          this.#insightToRestoreOnOpen.model,
          this.#insightToRestoreOnOpen.insightSetKey,
          ));
      this.#insightToRestoreOnOpen = null;
    }

    // Swap to the Annotations tab if:
    // 1. Insights is currently selected.
    // 2. The Insights tab is disabled (which means we have no insights for this trace)
    if (this.#tabbedPane.selectedTabId === SidebarTabs.INSIGHTS &&
        this.#tabbedPane.tabIsDisabled(SidebarTabs.INSIGHTS)) {
      this.#tabbedPane.selectTab(SidebarTabs.ANNOTATIONS);
    }
  }

  override willHide(): void {
    const currentlyActiveInsight = this.#insightsView.getActiveInsight();
    this.#insightToRestoreOnOpen = currentlyActiveInsight;

    if (currentlyActiveInsight) {
      this.element.dispatchEvent(new InsightDeactivated());
    }
  }

  setAnnotations(
      updatedAnnotations: Trace.Types.File.Annotation[],
      annotationEntryToColorMap: Map<Trace.Types.Events.Event, string>): void {
    this.#annotationsView.setAnnotations(updatedAnnotations, annotationEntryToColorMap);
    this.#updateAnnotationsCountBadge();
  }

  #updateAnnotationsCountBadge(): void {
    const annotations = this.#annotationsView.deduplicatedAnnotations();
    this.#tabbedPane.setBadge('annotations', annotations.length > 0 ? annotations.length.toString() : null);
  }

  setParsedTrace(parsedTrace: Trace.Handlers.Types.ParsedTrace|null, metadata: Trace.Types.File.MetaData|null): void {
    this.#insightsView.setParsedTrace(parsedTrace, metadata);
  }

  setInsights(insights: Trace.Insights.Types.TraceInsightSets|null): void {
    this.#insightsView.setInsights(insights);

    this.#tabbedPane.setTabEnabled(
        SidebarTabs.INSIGHTS,
        insights !== null && insights.size > 0,
    );
  }

  setActiveInsight(activeInsight: ActiveInsight|null, opts: {
    highlight: boolean,
  }): void {
    this.#insightsView.setActiveInsight(activeInsight, opts);

    if (activeInsight) {
      this.#tabbedPane.selectTab(SidebarTabs.INSIGHTS);
    }
  }
}

class InsightsView extends UI.Widget.VBox {
  #component = new SidebarInsightsTab();

  constructor() {
    super();
    this.element.classList.add('sidebar-insights');
    this.element.appendChild(this.#component);
  }

  setParsedTrace(parsedTrace: Trace.Handlers.Types.ParsedTrace|null, metadata: Trace.Types.File.MetaData|null): void {
    this.#component.parsedTrace = parsedTrace;
    this.#component.traceMetadata = metadata;
  }

  setInsights(data: Trace.Insights.Types.TraceInsightSets|null): void {
    this.#component.insights = data;
  }

  getActiveInsight(): ActiveInsight|null {
    return this.#component.activeInsight;
  }

  setActiveInsight(active: ActiveInsight|null, opts: {highlight: boolean}): void {
    this.#component.activeInsight = active;
    if (opts.highlight && active) {
      // Wait for the rendering of the component to be done, otherwise we
      // might highlight the wrong insight. The UI needs to be fully
      // re-rendered before we can highlight the newly-expanded insight.
      void RenderCoordinator.done().then(() => {
        this.#component.highlightActiveInsight();
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

  setAnnotations(
      annotations: Trace.Types.File.Annotation[],
      annotationEntryToColorMap: Map<Trace.Types.Events.Event, string>): void {
    this.#component.setData({annotations, annotationEntryToColorMap});
  }

  /**
   * The component "de-duplicates" annotations to ensure implementation details
   * about how we create pending annotations don't leak into the UI. We expose
   * these here because we use this count to show the number of annotations in
   * the small adorner in the sidebar tab.
   */
  deduplicatedAnnotations(): readonly Trace.Types.File.Annotation[] {
    return this.#component.deduplicatedAnnotations();
  }
}

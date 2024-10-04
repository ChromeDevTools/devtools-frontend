// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../core/common/common.js';
import * as Root from '../../../core/root/root.js';
import type * as Trace from '../../../models/trace/trace.js';
import * as Adorners from '../../../ui/components/adorners/adorners.js';
import * as UI from '../../../ui/legacy/legacy.js';
import type * as Overlays from '../overlays/overlays.js';

import {SidebarAnnotationsTab} from './SidebarAnnotationsTab.js';
import {SidebarInsightsTab} from './SidebarInsightsTab.js';

export interface ActiveInsight {
  name: string;
  insightSetKey: string;
  overlays: Overlays.Overlays.TimelineOverlay[];
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

declare global {
  interface GlobalEventHandlersEventMap {
    [RevealAnnotation.eventName]: RevealAnnotation;
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

  #annotationCount = 0;

  /**
   * Track if the user has opened the sidebar before. We do this so that the
   * very first time they record/import a trace after the sidebar ships, we can
   * automatically pop it open to aid discovery. But, after that, the sidebar
   * visibility will be persisted based on if the user opens or closes it - the
   * SplitWidget tracks its state in its own setting.
   */
  #userHasOpenedSidebarOnce =
      Common.Settings.Settings.instance().createSetting<boolean>('timeline-user-has-opened-siderbar-once', false);

  userHasOpenedSidebarOnce(): boolean {
    return this.#userHasOpenedSidebarOnce.get();
  }

  constructor() {
    super();
    this.setMinimumSize(MIN_SIDEBAR_WIDTH_PX, 0);
    if (Root.Runtime.experiments.isEnabled(Root.Runtime.ExperimentName.TIMELINE_INSIGHTS)) {
      this.#tabbedPane.appendTab(
          SidebarTabs.INSIGHTS, 'Insights', this.#insightsView, undefined, undefined, false, false, 0,
          'timeline.insights-tab');
    }
    if (Root.Runtime.experiments.isEnabled(Root.Runtime.ExperimentName.TIMELINE_ANNOTATIONS)) {
      this.#tabbedPane.appendTab(
          SidebarTabs.ANNOTATIONS, 'Annotations', this.#annotationsView, undefined, undefined, false, false, 1,
          'timeline.annotations-tab');
    }

    // Default the selected tab to Insights. In wasShown() we will change this
    // if this is a trace that has no insights.
    this.#tabbedPane.selectTab(SidebarTabs.INSIGHTS);
  }

  override wasShown(): void {
    this.#userHasOpenedSidebarOnce.set(true);
    this.#tabbedPane.show(this.element);
    this.#updateAnnotationsCountBadge();

    // Swap to the Annotations tab if:
    // 1. Insights is currently selected.
    // 2. The Insights tab is disabled (which means we have no insights for this trace)
    // 3. The annotations tab exists (we can remove this check once annotations
    //    are non-experimental)
    if (this.#tabbedPane.selectedTabId === SidebarTabs.INSIGHTS &&
        this.#tabbedPane.tabIsDisabled(SidebarTabs.INSIGHTS) && this.#tabbedPane.hasTab(SidebarTabs.ANNOTATIONS)) {
      this.#tabbedPane.selectTab(SidebarTabs.ANNOTATIONS);
    }
  }

  setAnnotations(
      updatedAnnotations: Trace.Types.File.Annotation[],
      annotationEntryToColorMap: Map<Trace.Types.Events.Event, string>): void {
    this.#annotationsView.setAnnotations(updatedAnnotations, annotationEntryToColorMap);
    this.#annotationCount = updatedAnnotations.length;
    this.#updateAnnotationsCountBadge();
  }

  #updateAnnotationsCountBadge(): void {
    let countAdorner: Adorners.Adorner.Adorner|null = null;
    if (this.#annotationCount > 0) {
      countAdorner = new Adorners.Adorner.Adorner();
      const countSpan = document.createElement('span');
      countSpan.textContent = this.#annotationCount.toString();
      countAdorner.data = {
        name: 'countWrapper',
        content: countSpan,
      };
      countAdorner.classList.add('annotations-count');
    }
    this.#tabbedPane.setSuffixElement('annotations', countAdorner);
  }

  setParsedTrace(parsedTrace: Trace.Handlers.Types.ParsedTrace|null): void {
    this.#insightsView.setParsedTrace(parsedTrace);
  }

  setInsights(insights: Trace.Insights.Types.TraceInsightSets|null): void {
    this.#insightsView.setInsights(insights);

    this.#tabbedPane.setTabEnabled(
        SidebarTabs.INSIGHTS,
        insights !== null,
    );
  }

  setActiveInsight(activeInsight: ActiveInsight|null): void {
    this.#insightsView.setActiveInsight(activeInsight);
  }
}

class InsightsView extends UI.Widget.VBox {
  #component = new SidebarInsightsTab();

  constructor() {
    super();
    this.element.classList.add('sidebar-insights');
    this.element.appendChild(this.#component);
  }

  setParsedTrace(data: Trace.Handlers.Types.ParsedTrace|null): void {
    this.#component.parsedTrace = data;
  }

  setInsights(data: Trace.Insights.Types.TraceInsightSets|null): void {
    this.#component.insights = data;
  }

  setActiveInsight(active: ActiveInsight|null): void {
    this.#component.activeInsight = active;
  }
}

class AnnotationsView extends UI.Widget.VBox {
  #component = new SidebarAnnotationsTab();

  constructor() {
    super();
    this.element.classList.add('sidebar-annotations');
    this.element.appendChild(this.#component);
  }

  setAnnotations(
      annotations: Trace.Types.File.Annotation[],
      annotationEntryToColorMap: Map<Trace.Types.Events.Event, string>): void {
    // The component will only re-render when set the annotations, so we should
    // set the `annotationEntryToColorMap` first.
    this.#component.annotationEntryToColorMap = annotationEntryToColorMap;
    this.#component.annotations = annotations;
  }
}

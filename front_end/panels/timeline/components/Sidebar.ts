// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as TraceEngine from '../../../models/trace/trace.js';
import * as UI from '../../../ui/legacy/legacy.js';
import type * as Overlays from '../overlays/overlays.js';

import {SidebarAnnotationsTab} from './SidebarAnnotationsTab.js';
import {SidebarInsightsTab} from './SidebarInsightsTab.js';

export interface ActiveInsight {
  name: string;
  navigationId: string;
  createOverlayFn: (() => Overlays.Overlays.TimelineOverlay[]);
}

export class RemoveAnnotation extends Event {
  static readonly eventName = 'removeannotation';

  constructor(public removedAnnotation: TraceEngine.Types.File.Annotation) {
    super(RemoveAnnotation.eventName, {bubbles: true, composed: true});
  }
}

export const enum SidebarTabs {
  INSIGHTS = 'insights',
  ANNOTATIONS = 'annotations',
}
export const DEFAULT_SIDEBAR_TAB = SidebarTabs.INSIGHTS;

export class SidebarWidget extends UI.Widget.VBox {
  #tabbedPane = new UI.TabbedPane.TabbedPane();

  #insightsView = new InsightsView();
  #annotationsView = new AnnotationsView();

  override wasShown(): void {
    this.#tabbedPane.show(this.element);
    if (!this.#tabbedPane.hasTab(SidebarTabs.INSIGHTS)) {
      this.#tabbedPane.appendTab(SidebarTabs.INSIGHTS, 'Insights', this.#insightsView);
    }
    if (!this.#tabbedPane.hasTab(SidebarTabs.ANNOTATIONS)) {
      this.#tabbedPane.appendTab('annotations', 'Annotations', this.#annotationsView);
    }
    // TODO: automatically select the right tab depending on what content is
    // available to us.
  }

  setAnnotations(updatedAnnotations: TraceEngine.Types.File.Annotation[]): void {
    this.#annotationsView.setAnnotations(updatedAnnotations);
  }

  setTraceParsedData(traceParsedData: TraceEngine.Handlers.Types.TraceParseData|null): void {
    this.#insightsView.setTraceParsedData(traceParsedData);
  }

  setInsights(insights: TraceEngine.Insights.Types.TraceInsightData): void {
    this.#insightsView.setInsights(insights);
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

  setTraceParsedData(data: TraceEngine.Handlers.Types.TraceParseData|null): void {
    this.#component.traceParsedData = data;
  }

  setInsights(data: TraceEngine.Insights.Types.TraceInsightData|null): void {
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

  setAnnotations(annotations: TraceEngine.Types.File.Annotation[]): void {
    this.#component.annotations = annotations;
  }
}

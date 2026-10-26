// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../core/common/common.js';
import * as i18n from '../../../core/i18n/i18n.js';
import type * as Trace from '../../../models/trace/trace.js';
import * as UI from '../../../ui/legacy/legacy.js';
import {Directives, html, render} from '../../../ui/lit/lit.js';

import * as Insights from './insights/insights.js';
import {SidebarAnnotationsTab} from './SidebarAnnotationsTab.js';
import {SidebarInsightsTab} from './SidebarInsightsTab.js';

const {ifDefined} = Directives;
const {widget, widgetRef} = UI.Widget;

const UIStrings = {
  /**
   * @description Title of the Insights tab in the Performance panel sidebar.
   */
  insights: 'Insights',
  /**
   * @description Title of the Annotations tab in the Performance panel sidebar.
   */
  annotations: 'Annotations',
} as const;

const str_ = i18n.i18n.registerUIStrings('panels/timeline/components/Sidebar.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

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
export const DEFAULT_SIDEBAR_TAB: SidebarTabs = SidebarTabs.INSIGHTS;

export const DEFAULT_SIDEBAR_WIDTH_PX = 240;
const MIN_SIDEBAR_WIDTH_PX = 170;

export interface ViewInput {
  parsedTrace: Trace.TraceModel.ParsedTrace|null;
  activeInsight: ActiveInsight|null;
  annotations: Trace.Types.File.Annotation[];
  annotationEntryToColorMap: Map<Trace.Types.Events.Event, string>;
  annotationsBadge: string|null;
  insightsTabEnabled: boolean;
  selectedTabId: SidebarTabs;
  onTabSelected: (tabId: SidebarTabs) => void;
}

export interface ViewOutput {
  highlightActiveInsight?: () => void;
  setActiveInsightSet?: (insightSetKey: string) => void;
}

export type View = (input: ViewInput, output: ViewOutput, target: HTMLElement) => void;

export const DEFAULT_VIEW: View = (input, output, target) => {
  // clang-format off
  render(html`
    <devtools-tabbed-pane
      @select=${(event: CustomEvent<{tabId: string, isUserGesture?: boolean}>) => {
        if (event.detail.isUserGesture) {
          input.onTabSelected(event.detail.tabId as SidebarTabs);
        }
      }}>
      <devtools-widget
        id=${SidebarTabs.INSIGHTS}
        label=${i18nString(UIStrings.insights)}
        jslogcontext="timeline.insights-tab"
        class="sidebar-insights"
        ?selected=${input.selectedTabId === SidebarTabs.INSIGHTS}
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
          output.setActiveInsightSet = (insightSetKey: string) => {
            insightsTab.setActiveInsightSet(insightSetKey);
          };
        })}>
      </devtools-widget>
      <devtools-widget
        id=${SidebarTabs.ANNOTATIONS}
        label=${i18nString(UIStrings.annotations)}
        badge=${ifDefined(input.annotationsBadge ?? undefined)}
        jslogcontext="timeline.annotations-tab"
        class="sidebar-annotations"
        ?selected=${input.selectedTabId === SidebarTabs.ANNOTATIONS}
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
  readonly #view: View;
  readonly #viewOutput: ViewOutput = {};
  #parsedTrace: Trace.TraceModel.ParsedTrace|null = null;
  #activeInsight: ActiveInsight|null = null;
  #annotations: Trace.Types.File.Annotation[] = [];
  #annotationEntryToColorMap = new Map<Trace.Types.Events.Event, string>();
  #annotationsBadge: string|null = null;
  #selectedTabId: SidebarTabs = DEFAULT_SIDEBAR_TAB;
  readonly #onTabSelectedBound = (tabId: SidebarTabs): void => {
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
  #insightToRestoreOnOpen: ActiveInsight|null = null;
  /**
   * We track if the user has opened the sidebar once. This is used to
   * automatically show the sidebar for new users when they first record or
   * import a trace, but then persist its state (so if they close it, it stays
   * closed).
   */
  #hasOpenedOnce =
      Common.Settings.Settings.instance().createSetting<boolean>('timeline-sidebar-opened-at-least-once', false);

  constructor(view: View = DEFAULT_VIEW) {
    super();
    this.#view = view;
    this.setMinimumSize(MIN_SIDEBAR_WIDTH_PX, 0);
  }

  #hasInsights(): boolean {
    return Boolean(this.#parsedTrace?.insights && this.#parsedTrace.insights.size > 0);
  }

  override performUpdate(): void {
    this.#view(
        {
          parsedTrace: this.#parsedTrace,
          activeInsight: this.#activeInsight,
          annotations: this.#annotations,
          annotationEntryToColorMap: this.#annotationEntryToColorMap,
          annotationsBadge: this.#annotationsBadge,
          insightsTabEnabled: this.#hasInsights(),
          selectedTabId: this.#selectedTabId,
          onTabSelected: this.#onTabSelectedBound,
        },
        this.#viewOutput,
        this.contentElement,
    );
  }

  override wasShown(): void {
    super.wasShown();
    this.#hasOpenedOnce.set(true);

    if (this.#insightToRestoreOnOpen) {
      this.element.dispatchEvent(new Insights.SidebarInsight.InsightActivated(
          this.#insightToRestoreOnOpen.model,
          this.#insightToRestoreOnOpen.insightSetKey,
          ));
      this.#insightToRestoreOnOpen = null;
    }

    // Swap to the Annotations tab if:
    // 1. Insights is currently selected.
    // 2. The Insights tab is disabled (which means we have no insights for this trace)
    if (this.#selectedTabId === SidebarTabs.INSIGHTS && !this.#hasInsights()) {
      this.#selectedTabId = SidebarTabs.ANNOTATIONS;
    }
    this.requestUpdate();
  }

  override willHide(): void {
    super.willHide();
    const currentlyActiveInsight = this.#activeInsight;
    this.#insightToRestoreOnOpen = currentlyActiveInsight;

    if (currentlyActiveInsight) {
      this.element.dispatchEvent(new Insights.SidebarInsight.InsightDeactivated());
    }
  }

  setAnnotations(updatedAnnotations: Trace.Types.File.Annotation[],
                 annotationEntryToColorMap: Map<Trace.Types.Events.Event, string>): void {
    if (this.#annotations === updatedAnnotations && this.#annotationEntryToColorMap === annotationEntryToColorMap) {
      return;
    }
    this.#annotations = updatedAnnotations;
    this.#annotationEntryToColorMap = annotationEntryToColorMap;
    const deduplicatedAnnotations = SidebarAnnotationsTab.processAnnotationsList(updatedAnnotations);
    this.#annotationsBadge = deduplicatedAnnotations.length > 0 ? deduplicatedAnnotations.length.toString() : null;
    this.requestUpdate();
  }

  setParsedTrace(parsedTrace: Trace.TraceModel.ParsedTrace|null): void {
    if (this.#parsedTrace === parsedTrace) {
      return;
    }
    this.#parsedTrace = parsedTrace;
    this.requestUpdate();
  }

  setActiveInsight(activeInsight: ActiveInsight|null, opts: {
    highlight: boolean,
  }): void {
    const tabChanged = Boolean(activeInsight && this.#selectedTabId !== SidebarTabs.INSIGHTS);
    if (this.#activeInsight !== activeInsight || tabChanged) {
      this.#activeInsight = activeInsight;
      if (activeInsight) {
        this.#selectedTabId = SidebarTabs.INSIGHTS;
      }
      this.requestUpdate();
    }
    if (opts.highlight && activeInsight) {
      void this.updateComplete.then(() => {
        this.#viewOutput.highlightActiveInsight?.();
      });
    }
  }

  openInsightsTab(): void {
    if (this.#selectedTabId === SidebarTabs.INSIGHTS) {
      return;
    }
    this.#selectedTabId = SidebarTabs.INSIGHTS;
    this.requestUpdate();
  }

  setActiveInsightSet(insightSetKey: string): void {
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
  sidebarHasBeenOpened(): boolean {
    return this.#hasOpenedOnce.get();
  }
}

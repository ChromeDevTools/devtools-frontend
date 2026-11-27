// Copyright 2017 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-imperative-dom-api */

import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Trace from '../../models/trace/trace.js';
import * as TraceBounds from '../../services/trace_bounds/trace_bounds.js';
import * as Tracing from '../../services/tracing/tracing.js';
import * as Components from '../../ui/legacy/components/utils/utils.js';
import * as UI from '../../ui/legacy/legacy.js';
import {Directive, Directives, html, type LitTemplate, noChange, nothing, render} from '../../ui/lit/lit.js';
import * as SettingsUI from '../../ui/settings/settings.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import * as TimelineComponents from './components/components.js';
import {EventsTimelineTreeView} from './EventsTimelineTreeView.js';
import {targetForEvent} from './TargetForEvent.js';
import {ThirdPartyTreeViewWidget} from './ThirdPartyTreeView.js';
import detailsViewStyles from './timelineDetailsView.css.js';
import {TimelineLayersView} from './TimelineLayersView.js';
import {TimelinePaintProfilerView} from './TimelinePaintProfilerView.js';
import type {TimelineModeViewDelegate} from './TimelinePanel.js';
import {
  selectionFromRangeMilliSeconds,
  selectionIsEvent,
  selectionIsRange,
  type TimelineSelection,
} from './TimelineSelection.js';
import {TimelineSelectorStatsView} from './TimelineSelectorStatsView.js';
import {
  AggregatedTimelineTreeView,
  BottomUpTimelineTreeView,
  CallTreeTimelineTreeView,
  GridNode,
  TimelineTreeView,
} from './TimelineTreeView.js';
import {TimelineUIUtils} from './TimelineUIUtils.js';
import {TracingFrameLayerTree} from './TracingLayerTree.js';

const UIStrings = {
  /**
   * @description Title for the summary tab in the details view of the Performance panel.
   */
  summary: 'Summary',
  /**
   * @description Title for the bottom-up tab in the details view of the Performance panel.
   */
  bottomup: 'Bottom-up',
  /**
   * @description Title for the call tree tab in the details view of the Performance panel.
   */
  callTree: 'Call tree',
  /**
   * @description Title for the event log tab in the details view of the Performance panel.
   */
  eventLog: 'Event log',
  /**
   * @description Title for the paint profiler tab in the details view of the Performance panel.
   */
  paintProfiler: 'Paint profiler',
  /**
   * @description Title for the layers tab in the details view of the Performance panel.
   */
  layers: 'Layers',
  /**
   * @description Title for the selector stats tab in the details view of the Performance panel.
   */
  selectorStats: 'Selector stats',
} as const;
const str_ = i18n.i18n.registerUIStrings('panels/timeline/TimelineDetailsView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
const {widget} = UI.Widget;

export enum Tab {
  /* eslint-disable @typescript-eslint/naming-convention -- Used by web_tests. */
  Details = 'details',
  EventLog = 'event-log',
  CallTree = 'call-tree',
  BottomUp = 'bottom-up',
  PaintProfiler = 'paint-profiler',
  LayerViewer = 'layer-viewer',
  SelectorStats = 'selector-stats',
  /* eslint-enable @typescript-eslint/naming-convention */
}

/** The tabs that show a tree view of the selected range. */
type RangeTab = Tab.BottomUp|Tab.CallTree|Tab.EventLog;

function isTab(tabId: string|null|undefined): tabId is Tab {
  return Object.values(Tab).includes(tabId as Tab);
}

function isRangeTab(tab: Tab): tab is RangeTab {
  return tab === Tab.BottomUp || tab === Tab.CallTree || tab === Tab.EventLog;
}

export interface TimelineDetailsModel {
  parsedTrace: Trace.TraceModel.ParsedTrace|null;
  selectedEvents: Trace.Types.Events.Event[]|null;
  eventToRelatedInsightsMap: TimelineComponents.RelatedInsightChips.EventToRelatedInsightsMap|null;
  entityMapper: Trace.EntityMapper.EntityMapper|null;
}

interface TreeViewModel {
  selectedEvents: Trace.Types.Events.Event[]|null;
  parsedTrace: Trace.TraceModel.ParsedTrace|null;
  entityMapper: Trace.EntityMapper.EntityMapper|null;
}

function revealNodeInBottomUpTree(bottomUp: BottomUpTimelineTreeView, node: Trace.Extras.TraceTree.Node|null,
                                  groupBySetting?: AggregatedTimelineTreeView.GroupBy): void {
  if (groupBySetting) {
    bottomUp.setGroupBySetting(groupBySetting);
    bottomUp.refreshTree();
  }
  if (!node) {
    return;
  }
  // Match GroupNodes by group ID instead of scanning each group's events array.
  const gridNode = node.isGroupNode() ?
      bottomUp.dataGrid.rootNode().children.find((child): child is GridNode =>
                                                     child instanceof GridNode && child.profileNode.id === node.id) ??
          null :
      bottomUp.gridNodeForEvent(node.event);
  if (!gridNode) {
    return;
  }
  bottomUp.selectProfileNode(gridNode.profileNode, true);
  gridNode.expand();
}

interface SelectedRange {
  startTime: Trace.Types.Timing.Milli;
  endTime: Trace.Types.Timing.Milli;
  events: Trace.Types.Events.Event[];
  selection: TimelineSelection|null;
}

/** The data shown in the Summary tab. */
interface SummaryData {
  selectedEvent: Trace.Types.Events.Event|null;
  eventToRelatedInsightsMap: TimelineComponents.RelatedInsightChips.EventToRelatedInsightsMap|null;
  parsedTrace: Trace.TraceModel.ParsedTrace|null;
  entityMapper: Trace.EntityMapper.EntityMapper|null;
  target: SDK.Target.Target|null;
  linkifier: Components.Linkifier.Linkifier|null;
  filmStrip: Trace.Extras.FilmStrip.Data|null;
  selectedRange: SelectedRange|null;
}

type TreeRowCallback = (node: Trace.Extras.TraceTree.Node|null, events?: Trace.Types.Events.Event[]) => void;

export interface SummaryTabViewInput {
  summary: SummaryData;
  onTreeRowHovered: TreeRowCallback;
  onTreeRowClicked: TreeRowCallback;
  onBottomUpButtonClicked: (node: Trace.Extras.TraceTree.Node|null) => void;
}

export type SummaryTabView = (input: SummaryTabViewInput, output: undefined, target: HTMLElement) => void;

/**
 * Renders the summary content only when the committed summary changes, so
 * unrelated re-renders of the details pane don't re-run the async rendering of
 * the selected event details.
 */
class SummaryContentDirective extends Directive.Directive {
  #summary?: SummaryData;

  render(_summary: SummaryData, renderContent: () => LitTemplate): LitTemplate {
    return renderContent();
  }

  override update(_part: Directive.Part, [summary, renderContent]: [SummaryData, () => LitTemplate]): LitTemplate|
      typeof noChange {
    if (summary === this.#summary) {
      return noChange;
    }
    this.#summary = summary;
    return this.render(summary, renderContent);
  }
}

const summaryContent = Directive.directive(SummaryContentDirective);

export const SUMMARY_TAB_VIEW: SummaryTabView =
    (input: SummaryTabViewInput, _output: undefined, target: HTMLElement): void => {
      const renderContent = (): LitTemplate => {
        const summaryInput: SummaryViewInput = {
          ...input.summary,
          onTreeRowHovered: input.onTreeRowHovered,
          onBottomUpButtonClicked: input.onBottomUpButtonClicked,
          onTreeRowClicked: input.onTreeRowClicked,
        };
        // clang-format off
        return html`
          <style>${detailsViewStyles}</style>
          ${Directives.until(renderSelectedEventDetails(summaryInput))}
          ${input.summary.selectedRange ? generateRangeSummaryDetails(summaryInput) : nothing}
          <devtools-widget data-related-insight-chips ${widget(
            TimelineComponents.RelatedInsightChips.RelatedInsightChips, {
              activeEvent: input.summary.selectedEvent,
              eventToInsightsMap: input.summary.eventToRelatedInsightsMap,
            })}></devtools-widget>`;
        // clang-format on
      };
      // clang-format off
      render(html`
        <div
            id=${Tab.Details}
            label=${i18nString(UIStrings.summary)}
            class="timeline-details-view timeline-details-view-body"
            jslog=${VisualLogging.pane('details').track({resize: true})}>
          ${summaryContent(input.summary, renderContent)}
        </div>`, target);
      // clang-format on
    };

/**
 * Hosts the Summary tab. The rendered summary element is the scroll container,
 * so its scroll position is kept when switching to another tab and back.
 */
class SummaryTabWidget extends UI.Widget.VBox {
  override elementsToRestoreScrollPositionsFor(): Element[] {
    const summaryElement = this.contentElement.querySelector(`#${Tab.Details}`);
    return summaryElement ? [summaryElement] : [];
  }
}

const TimelineDetailsPaneBase: Common.ObjectWrapper.EventMixin<TimelineTreeView.EventTypes, typeof UI.Widget.VBox> =
    Common.ObjectWrapper.eventMixin(
        UI.Widget.VBox,
    );

export class TimelineDetailsPane extends TimelineDetailsPaneBase {
  delegate?: Pick<TimelineModeViewDelegate, 'highlightEvent'>;
  readonly #summaryTabView: SummaryTabView;
  readonly #detailsLinkifier = new Components.Linkifier.Linkifier();
  private tabbedPane: UI.TabbedPane.TabbedPane;
  private readonly defaultDetailsWidget: UI.Widget.VBox;
  #summary: SummaryData = {
    selectedEvent: null,
    eventToRelatedInsightsMap: null,
    parsedTrace: null,
    entityMapper: null,
    target: null,
    linkifier: null,
    filmStrip: null,
    selectedRange: null,
  };
  #renderedSummary: SummaryData = {...this.#summary};
  #summaryNeedsUpdate = false;
  private rangeDetailViews: Map<string, TimelineTreeView>;
  #selectedEvents: Trace.Types.Events.Event[]|null = null;
  private lazyPaintProfilerView?: TimelinePaintProfilerView|null;
  private lazyLayersView?: TimelineLayersView|null;
  #headerHidden = false;
  #tabHistory: Tab[] = [Tab.Details];
  #preferredTab: Tab = Tab.Details;
  #treeViewModel: TreeViewModel = {selectedEvents: null, parsedTrace: null, entityMapper: null};
  #renderedTreeViewModel: TreeViewModel|null = null;
  readonly #rangeSelections = new Map<RangeTab, TimelineSelection>();
  readonly #renderedRangeSelections = new Map<RangeTab, TimelineSelection>();
  #selection: TimelineSelection|null = null;
  #hasPendingWindowUpdate = false;
  #debouncedUpdateContentsFromWindow: (() => void)&
      {cancel: () => void} = Common.Debouncer.debounce(() => this.updateContentsFromWindow(), 100);
  private lazySelectorStatsView: TimelineSelectorStatsView|null;
  #parsedTrace: Trace.TraceModel.ParsedTrace|null = null;
  #modelInput?: TimelineDetailsModel;
  #eventToRelatedInsightsMap: TimelineComponents.RelatedInsightChips.EventToRelatedInsightsMap|null = null;
  #onTraceBoundsChangeBound = this.#onTraceBoundsChange.bind(this);
  #boundsStateWhenHidden?: Readonly<TraceBounds.TraceBounds.TraceWindows<Trace.Types.Timing.Micro>>;
  #entityMapper: Trace.EntityMapper.EntityMapper|null = null;

  static makeEventWidget(
      event: Trace.Types.Events.Event,
      parsedTrace: Trace.TraceModel.ParsedTrace,
      ): TimelineDetailsPane {
    // Highlighting events from the event log is not relevant for an AI
    // assistant widget, which only shows the summary.
    const pane = new TimelineDetailsPane({highlightEvent: () => {}});
    pane.hideHeader();
    const entityMapper = new Trace.EntityMapper.EntityMapper(parsedTrace);
    void pane
        .setModel({
          parsedTrace,
          selectedEvents: [event],
          eventToRelatedInsightsMap: null,
          entityMapper,
        })
        .then(() => {
          void pane.setSelection({
            event,
          });
        });
    return pane;
  }

  constructor(
      delegate: Pick<TimelineModeViewDelegate, 'highlightEvent'>,
      summaryTabView?: SummaryTabView,
  );
  constructor(element?: HTMLElement, summaryTabView?: SummaryTabView);
  constructor(
      delegateOrElement?: Pick<TimelineModeViewDelegate, 'highlightEvent'>|HTMLElement,
      summaryTabView: SummaryTabView = SUMMARY_TAB_VIEW,
  ) {
    super(delegateOrElement instanceof HTMLElement ? delegateOrElement : undefined);
    if (delegateOrElement && !(delegateOrElement instanceof HTMLElement)) {
      this.delegate = delegateOrElement;
    }
    this.#summaryTabView = summaryTabView;
    this.registerRequiredCSS(detailsViewStyles);
    this.element.classList.add('timeline-details');

    this.tabbedPane = new UI.TabbedPane.TabbedPane();
    this.tabbedPane.show(this.element);
    this.tabbedPane.headerElement().setAttribute(
        'jslog',
        `${VisualLogging.toolbar('sidebar').track({keydown: 'ArrowUp|ArrowLeft|ArrowDown|ArrowRight|Enter|Space'})}`);

    this.defaultDetailsWidget = new SummaryTabWidget();
    this.appendTab(Tab.Details, i18nString(UIStrings.summary), this.defaultDetailsWidget);

    this.rangeDetailViews = new Map();

    const bottomUpView = new BottomUpTimelineTreeView();
    this.appendTab(Tab.BottomUp, i18nString(UIStrings.bottomup), bottomUpView);
    this.rangeDetailViews.set(Tab.BottomUp, bottomUpView);

    const callTreeView = new CallTreeTimelineTreeView();
    this.appendTab(Tab.CallTree, i18nString(UIStrings.callTree), callTreeView);
    this.rangeDetailViews.set(Tab.CallTree, callTreeView);

    const eventsView = new EventsTimelineTreeView({
      highlightEvent: event => this.delegate?.highlightEvent(event),
    });
    this.appendTab(Tab.EventLog, i18nString(UIStrings.eventLog), eventsView);
    this.rangeDetailViews.set(Tab.EventLog, eventsView);

    // Listeners for hover dimming
    this.rangeDetailViews.values().forEach(view => {
      view.addEventListener(
          TimelineTreeView.Events.TREE_ROW_HOVERED,
          node => this.dispatchEventToListeners(TimelineTreeView.Events.TREE_ROW_HOVERED, node.data));

      view.addEventListener(TimelineTreeView.Events.TREE_ROW_CLICKED, node => {
        // Re-dispatch to reach the tree row dimmer.
        this.dispatchEventToListeners(TimelineTreeView.Events.TREE_ROW_CLICKED, node.data);
      });

    });

    this.tabbedPane.addEventListener(UI.TabbedPane.Events.TabSelected, this.tabSelected, this);
    this.tabbedPane.addEventListener(UI.TabbedPane.Events.TabClosed, event => {
      if (isTab(event.data.tabId)) {
        this.#onTabClosed(event.data.tabId);
      }
    });
    this.lazySelectorStatsView = null;
    this.requestUpdate();
  }

  override performUpdate(): void {
    this.#summaryTabView(
        {
          summary: this.#renderedSummary,
          onTreeRowHovered: this.#onTreeRowHovered,
          onTreeRowClicked: this.#onTreeRowClicked,
          onBottomUpButtonClicked: this.#onBottomUpButtonClicked,
        },
        undefined,
        this.defaultDetailsWidget.contentElement,
    );
    const modelChanged = this.#renderedTreeViewModel !== this.#treeViewModel;
    this.#renderedTreeViewModel = this.#treeViewModel;
    for (const [tabId, view] of this.rangeDetailViews.entries()) {
      if (modelChanged) {
        view.model = this.#treeViewModel;
      }
      if (isTab(tabId) && isRangeTab(tabId)) {
        const activeSel = this.#rangeSelections.get(tabId);
        if (activeSel && this.#renderedRangeSelections.get(tabId) !== activeSel) {
          this.#renderedRangeSelections.set(tabId, activeSel);
          view.activeSelection = activeSel;
        }
      }
    }
    this.tabbedPane.headerElement().classList.toggle('hidden', this.#headerHidden);
    const targetTab = this.#selectedTab();
    if (this.tabbedPane.hasTab(targetTab) && this.tabbedPane.selectedTabId !== targetTab) {
      this.tabbedPane.selectTab(targetTab);
    }
  }

  readonly #onTreeRowHovered: TreeRowCallback = (node, events) => {
    this.dispatchEventToListeners(TimelineTreeView.Events.TREE_ROW_HOVERED, {node, events});
  };

  readonly #onTreeRowClicked: TreeRowCallback = (node, events) => {
    this.dispatchEventToListeners(TimelineTreeView.Events.TREE_ROW_CLICKED, {node, events});
  };

  readonly #onBottomUpButtonClicked = (node: Trace.Extras.TraceTree.Node|null): void => {
    this.selectTab(Tab.BottomUp, node, AggregatedTimelineTreeView.GroupBy.ThirdParties);
  };

  override wasShown(): void {
    super.wasShown();
    TraceBounds.TraceBounds.onChange(this.#onTraceBoundsChangeBound);
    const micro = TraceBounds.TraceBounds.BoundsManager.instance().state()?.micro;
    const prev = this.#boundsStateWhenHidden;
    const boundsChanged = Boolean(prev && micro &&
                                  (prev.entireTraceBounds !== micro.entireTraceBounds ||
                                   prev.minimapTraceBounds !== micro.minimapTraceBounds ||
                                   prev.timelineTraceWindow !== micro.timelineTraceWindow));
    if (boundsChanged || this.#hasPendingWindowUpdate) {
      if (this.#selection) {
        void this.setSelection(this.#selection);
      } else {
        this.scheduleUpdateContentsFromWindow();
      }
    }
    this.#boundsStateWhenHidden = undefined;
  }

  override willHide(): void {
    TraceBounds.TraceBounds.removeListener(this.#onTraceBoundsChangeBound);
    this.#debouncedUpdateContentsFromWindow.cancel();
    const micro = TraceBounds.TraceBounds.BoundsManager.instance().state()?.micro;
    this.#boundsStateWhenHidden = micro ? {...micro} : undefined;
    super.willHide();
  }

  override onDetach(): void {
    this.#debouncedUpdateContentsFromWindow.cancel();
    super.onDetach();
  }

  /**
   * This selects a given tabbedPane tab.
   * Additionally, if provided a node, we open that node and
   * if a groupBySetting is included, we groupBy.
   */
  selectTab(tabName: Tab, node: Trace.Extras.TraceTree.Node|null, groupBySetting?: AggregatedTimelineTreeView.GroupBy):
      void {
    if (!this.#isTabAvailable(tabName)) {
      return;
    }
    this.#onTabSelected(tabName, /* isUserGesture */ true);
    void this.#revealSelectedTab(tabName, node, groupBySetting);
  }

  async #revealSelectedTab(tabName: Tab, node: Trace.Extras.TraceTree.Node|null,
                           groupBySetting?: AggregatedTimelineTreeView.GroupBy): Promise<void> {
    await this.updateComplete;
    /**
     * For a11y, ensure that the header is focused.
     */
    this.tabbedPane.focusSelectedTabHeader();

    // We currently only support selecting Details and BottomUp via the 3P insight.
    switch (tabName) {
      case Tab.CallTree:
      case Tab.EventLog:
      case Tab.PaintProfiler:
      case Tab.LayerViewer:
      case Tab.SelectorStats: {
        break;
      }
      case Tab.Details: {
        this.updateContentsFromWindow();
        break;
      }
      case Tab.BottomUp: {
        if (this.tabbedPane.visibleView instanceof BottomUpTimelineTreeView) {
          revealNodeInBottomUpTree(this.tabbedPane.visibleView, node, groupBySetting);
        }
        break;
      }
      default: {
        Platform.assertNever(tabName, `Unknown Tab: ${tabName}. Add new case to switch.`);
      }
    }
  }

  private selectorStatsView(): TimelineSelectorStatsView {
    if (this.lazySelectorStatsView) {
      return this.lazySelectorStatsView;
    }

    this.lazySelectorStatsView = new TimelineSelectorStatsView(undefined, this.#parsedTrace);
    return this.lazySelectorStatsView;
  }

  getDetailsContentElementForTest(): HTMLElement {
    const summaryElement = this.element.querySelector<HTMLElement>(`#${Tab.Details}`);
    if (!summaryElement) {
      throw new Error('The summary view is not rendered.');
    }
    return summaryElement;
  }

  revealEventInTreeView(event: Trace.Types.Events.Event|null): void {
    if (this.tabbedPane.visibleView instanceof TimelineTreeView) {
      this.tabbedPane.visibleView.highlightEventInTree(event);
    }
  }

  async #onTraceBoundsChange(event: TraceBounds.TraceBounds.StateChangedEvent): Promise<void> {
    if (event.updateType === 'MINIMAP_BOUNDS') {
      // If new minimap bounds are set, we might need to update the selected entry summary because
      // the links to other entries (ex. initiator) might be outside of the new breadcrumb.
      if (this.#selection) {
        await this.setSelection(this.#selection);
      }
    }

    if (event.updateType === 'RESET' || event.updateType === 'VISIBLE_WINDOW') {
      // If the update type was a changing of the minimap bounds, we do not
      // need to redraw.
      if (!this.#selection) {
        this.scheduleUpdateContentsFromWindow();
      }
    }
  }

  set model(data: TimelineDetailsModel) {
    if (this.#modelInput && this.#modelInput.parsedTrace === data.parsedTrace &&
        this.#modelInput.selectedEvents === data.selectedEvents &&
        this.#modelInput.eventToRelatedInsightsMap === data.eventToRelatedInsightsMap &&
        this.#modelInput.entityMapper === data.entityMapper) {
      return;
    }
    void this.setModel(data);
  }

  async setModel(data: TimelineDetailsModel): Promise<void> {
    this.#modelInput = data;
    if (this.#parsedTrace !== data.parsedTrace) {
      // Clear the selector stats view, so the next time the user views it we
      // reconstruct it with the new trace data.
      this.lazySelectorStatsView = null;

      this.#parsedTrace = data.parsedTrace;
    }
    if (data.parsedTrace) {
      this.#summary.filmStrip = Trace.Extras.FilmStrip.fromHandlerData(data.parsedTrace.data);
      this.#entityMapper = data.entityMapper ?? new Trace.EntityMapper.EntityMapper(data.parsedTrace);
    } else {
      this.#summary.filmStrip = null;
      this.#entityMapper = null;
    }
    this.#summary.selectedEvent = null;
    this.#summary.selectedRange = null;
    this.#selectedEvents = data.selectedEvents;
    this.#eventToRelatedInsightsMap = data.eventToRelatedInsightsMap;
    this.#summary.eventToRelatedInsightsMap = this.#eventToRelatedInsightsMap;
    this.#summary.parsedTrace = this.#parsedTrace;
    this.#summary.entityMapper = this.#entityMapper;
    this.tabbedPane.closeTabs([Tab.PaintProfiler, Tab.LayerViewer], false);
    this.#rangeSelections.clear();
    this.#renderedRangeSelections.clear();
    this.#treeViewModel = {
      selectedEvents: data.selectedEvents,
      parsedTrace: data.parsedTrace,
      entityMapper: this.#entityMapper,
    };
    this.requestUpdate();
    // `setSelection(null)` short-circuits without updating the summary pane when any
    // of these dependencies are missing, so trigger the update directly.
    if (!this.#parsedTrace || !this.#selectedEvents || !TraceBounds.TraceBounds.BoundsManager.instance().state()) {
      this.#closeExtraTabs();
      void this.updateSummaryPane();
    }
    this.lazyPaintProfilerView = null;
    this.lazyLayersView = null;
    await this.setSelection(null);
  }

  #closeExtraTabs(): void {
    this.#summaryNeedsUpdate = false;
    const allTabs = this.tabbedPane.otherTabs(Tab.Details);
    for (let i = 0; i < allTabs.length; ++i) {
      if (!this.rangeDetailViews.has(allTabs[i])) {
        this.tabbedPane.closeTab(allTabs[i]);
      }
    }
  }

  /**
   * Updates the UI shown in the Summary tab. If the summary tab is not
   * currently selected, the update is deferred until the tab becomes active.
   */
  private async updateSummaryPane(): Promise<void> {
    if (this.#selectedTab() !== Tab.Details) {
      this.#summaryNeedsUpdate = true;
      return;
    }

    this.#summaryNeedsUpdate = false;
    this.#commitSummary();
    this.requestUpdate();
    await this.updateComplete;
  }

  #commitSummary(): void {
    this.#renderedSummary = {...this.#summary};
  }

  private updateContents(): void {
    const traceBoundsState = TraceBounds.TraceBounds.BoundsManager.instance().state();
    if (!traceBoundsState) {
      return;
    }
    const visibleWindow = traceBoundsState.milli.timelineTraceWindow;
    const selectedTab = this.#selectedTab();
    if (isRangeTab(selectedTab)) {
      const activeSel = this.#selection || selectionFromRangeMilliSeconds(visibleWindow.min, visibleWindow.max);
      this.#rangeSelections.set(selectedTab, activeSel);
      this.requestUpdate();
    }
  }

  private appendTab(id: Tab, tabTitle: string, view: UI.Widget.Widget, isCloseable?: boolean): void {
    this.tabbedPane.appendTab(id, tabTitle, view, undefined, undefined, isCloseable);
    this.#onTabAppended(id);
    if (this.tabbedPane.selectedTabId !== this.#selectedTab()) {
      this.tabbedPane.selectTab(this.#selectedTab());
    }
  }

  headerElement(): Element {
    return this.tabbedPane.headerElement();
  }

  hideHeader(): void {
    this.#headerHidden = true;
    this.tabbedPane.headerElement().classList.add('hidden');
    this.requestUpdate();
  }

  /**
   * Recalculates and renders the timing breakdown for the active details tab.
   * Panning or zooming triggers rapid bounds updates, so we debounce this call
   * using a trailing debounce. This ensures expensive tree recalculations in
   * detailed views (e.g. Call Tree, Bottom-Up) only run once after user
   * interaction finishes, preventing main-thread CPU spikes mid-gesture.
   */
  private scheduleUpdateContentsFromWindow(forceImmediateUpdate = false): void {
    if (!this.#parsedTrace) {
      this.#hasPendingWindowUpdate = false;
      this.#closeExtraTabs();
      void this.updateSummaryPane();
      return;
    }
    if (forceImmediateUpdate) {
      this.#debouncedUpdateContentsFromWindow.cancel();
      this.#hasPendingWindowUpdate = false;
      this.updateContentsFromWindow();
      return;
    }

    this.#hasPendingWindowUpdate = true;
    this.#debouncedUpdateContentsFromWindow();
  }

  private updateContentsFromWindow(): void {
    this.#hasPendingWindowUpdate = false;
    const traceBoundsState = TraceBounds.TraceBounds.BoundsManager.instance().state();
    if (!traceBoundsState) {
      return;
    }
    const visibleWindow = traceBoundsState.milli.timelineTraceWindow;
    void this.updateSelectedRangeStats(visibleWindow.min, visibleWindow.max);
    this.updateContents();
  }

  #addLayerTreeForSelectedFrame(frame: Trace.Types.Events.LegacyTimelineFrame): void {
    const target = SDK.TargetManager.TargetManager.instance().rootTarget();
    if (frame.layerTree && target) {
      const layerTreeForFrame = new TracingFrameLayerTree(target, frame.layerTree);
      const layersView = this.layersView();
      layersView.showLayerTree(layerTreeForFrame);
      if (!this.tabbedPane.hasTab(Tab.LayerViewer)) {
        this.appendTab(Tab.LayerViewer, i18nString(UIStrings.layers), layersView);
      }
    }
  }

  async #setSelectionForTraceEvent(event: Trace.Types.Events.Event): Promise<void> {
    if (!this.#parsedTrace) {
      return;
    }

    this.#summary.selectedRange = null;
    this.#summary.selectedEvent = event;
    this.#summary.eventToRelatedInsightsMap = this.#eventToRelatedInsightsMap;
    this.#summary.linkifier = this.#detailsLinkifier;
    this.#summary.target = targetForEvent(this.#parsedTrace, event);
    this.#closeExtraTabs();
    if (Trace.Types.Events.isLegacyTimelineFrame(event)) {
      this.#addLayerTreeForSelectedFrame(event);
    }
    this.appendExtraDetailsTabsForTraceEvent(event);
    await this.updateSummaryPane();
  }

  async setSelection(selection: TimelineSelection|null): Promise<void> {
    if (!this.#parsedTrace) {
      // You can't make a selection if we have no trace data.
      return;
    }
    this.#detailsLinkifier.reset();
    this.#selection = selection;
    if (!this.#selection) {
      this.#summary.selectedEvent = null;
      // Update instantly using forceImmediateUpdate, since we are only
      // making a single call and don't need to debounce.
      this.scheduleUpdateContentsFromWindow(/* forceImmediateUpdate */ true);
      return;
    }

    if (selectionIsEvent(selection)) {
      // Cancel any pending debounced range stats update
      this.#debouncedUpdateContentsFromWindow.cancel();
      this.#hasPendingWindowUpdate = false;

      await this.#setSelectionForTraceEvent(selection.event);
    } else if (selectionIsRange(selection)) {
      this.#debouncedUpdateContentsFromWindow.cancel();
      this.#hasPendingWindowUpdate = false;
      const timings = Trace.Helpers.Timing.traceWindowMicroSecondsToMilliSeconds(selection.bounds);
      await this.updateSelectedRangeStats(timings.min, timings.max);
    }

    this.updateContents();
  }

  private tabSelected(event: Common.EventTarget.EventTargetEvent<UI.TabbedPane.EventData>): void {
    if (isTab(event.data.tabId)) {
      this.#onTabSelected(event.data.tabId, Boolean(event.data.isUserGesture));
    }
  }

  #selectedTab(): Tab {
    if (this.#headerHidden) {
      return Tab.Details;
    }
    return this.#tabHistory.find(tab => this.#isTabAvailable(tab)) ?? Tab.Details;
  }

  #isTabAvailable(tab: Tab): boolean {
    switch (tab) {
      case Tab.Details:
      case Tab.BottomUp:
      case Tab.CallTree:
      case Tab.EventLog:
        return true;
      case Tab.PaintProfiler:
      case Tab.LayerViewer:
      case Tab.SelectorStats:
        return this.tabbedPane.hasTab(tab);
      default:
        Platform.assertNever(tab, `Unknown Tab: ${tab}. Add new case to switch.`);
    }
  }

  #recordSelectedTab(tab: Tab): void {
    this.#tabHistory = [tab, ...this.#tabHistory.filter(previousTab => previousTab !== tab)];
  }

  #onTabAppended(tab: Tab): void {
    if (this.#preferredTab === tab) {
      this.#recordSelectedTab(tab);
    }
  }

  readonly #onTabSelected = (tab: Tab, isUserGesture: boolean): void => {
    const previousTab = this.#selectedTab();
    this.#recordSelectedTab(tab);
    let needsUpdate = previousTab !== tab;
    if (tab === Tab.Details && this.#summaryNeedsUpdate) {
      this.#summaryNeedsUpdate = false;
      this.#commitSummary();
      needsUpdate = true;
    }
    if (isUserGesture) {
      this.#preferredTab = tab;
      this.updateContents();
    }
    if (needsUpdate) {
      this.requestUpdate();
    }
  };

  readonly #onTabClosed = (tab: Tab): void => {
    this.#tabHistory = this.#tabHistory.filter(previousTab => previousTab !== tab);
    this.requestUpdate();
  };

  private layersView(): TimelineLayersView {
    if (this.lazyLayersView) {
      return this.lazyLayersView;
    }
    this.lazyLayersView = new TimelineLayersView(this.showSnapshotInPaintProfiler.bind(this));
    return this.lazyLayersView;
  }

  private paintProfilerView(): TimelinePaintProfilerView|null {
    if (this.lazyPaintProfilerView) {
      return this.lazyPaintProfilerView;
    }
    if (!this.#parsedTrace) {
      return null;
    }
    this.lazyPaintProfilerView = new TimelinePaintProfilerView(undefined, this.#parsedTrace);
    return this.lazyPaintProfilerView;
  }

  private showSnapshotInPaintProfiler(snapshot: SDK.PaintProfiler.PaintProfilerSnapshot): void {
    const paintProfilerView = this.paintProfilerView();
    if (!paintProfilerView) {
      return;
    }
    paintProfilerView.setSnapshot(snapshot);
    if (!this.tabbedPane.hasTab(Tab.PaintProfiler)) {
      this.appendTab(Tab.PaintProfiler, i18nString(UIStrings.paintProfiler), paintProfilerView, true);
    }
    this.tabbedPane.selectTab(Tab.PaintProfiler, true);
  }

  private showSelectorStatsForIndividualEvent(event: Trace.Types.Events.RecalcStyle): void {
    this.showAggregatedSelectorStats([event]);
  }

  private showAggregatedSelectorStats(events: Trace.Types.Events.RecalcStyle[]): void {
    const selectorStatsView = this.selectorStatsView();

    selectorStatsView.setAggregatedEvents(events);

    if (!this.tabbedPane.hasTab(Tab.SelectorStats)) {
      this.appendTab(Tab.SelectorStats, i18nString(UIStrings.selectorStats), selectorStatsView);
    }
  }

  /**
   * When some events are selected, we show extra tabs. E.g. paint events get
   * the Paint Profiler, and layout events might get CSS Selector Stats if
   * they are available in the trace.
   */
  private appendExtraDetailsTabsForTraceEvent(event: Trace.Types.Events.Event): void {
    if (Trace.Types.Events.isPaint(event) || Trace.Types.Events.isRasterTask(event)) {
      this.showEventInPaintProfiler(event);
    }

    if (Trace.Types.Events.isRecalcStyle(event)) {
      this.showSelectorStatsForIndividualEvent(event);
    }
  }

  private showEventInPaintProfiler(event: Trace.Types.Events.Event): void {
    const paintProfilerModel =
        SDK.TargetManager.TargetManager.instance().models(SDK.PaintProfiler.PaintProfilerModel)[0];
    if (!paintProfilerModel) {
      return;
    }
    const paintProfilerView = this.paintProfilerView();
    if (!paintProfilerView) {
      return;
    }
    const hasProfileData = paintProfilerView.setEvent(paintProfilerModel, event);
    if (!hasProfileData) {
      return;
    }
    if (this.tabbedPane.hasTab(Tab.PaintProfiler)) {
      return;
    }
    this.appendTab(Tab.PaintProfiler, i18nString(UIStrings.paintProfiler), paintProfilerView);
  }

  private async updateSelectedRangeStats(startTime: Trace.Types.Timing.Milli,
                                         endTime: Trace.Types.Timing.Milli): Promise<void> {
    if (!this.#selectedEvents || !this.#parsedTrace || !this.#entityMapper) {
      return;
    }

    this.#summary.selectedEvent = null;
    this.#summary.selectedRange = {
      events: this.#selectedEvents,
      startTime,
      endTime,
      selection: this.#selection,
    };

    this.#closeExtraTabs();

    // Find all recalculate style events data from range
    const isSelectorStatsEnabled =
        Common.Settings.Settings.instance()
            .resolve(SettingsUI.TimelineSettings.timelineCaptureSelectorStatsSettingDescriptor)
            .get();
    if (this.#selectedEvents && isSelectorStatsEnabled) {
      const eventsInRange = Trace.Helpers.Trace.findRecalcStyleEvents(
          this.#selectedEvents,
          Trace.Helpers.Timing.milliToMicro(startTime),
          Trace.Helpers.Timing.milliToMicro(endTime),
      );
      if (eventsInRange.length > 0) {
        this.showAggregatedSelectorStats(eventsInRange);
      }
    }

    await this.updateSummaryPane();
  }
}

interface SummaryViewInput extends SummaryData {
  onTreeRowHovered: TreeRowCallback;
  onBottomUpButtonClicked: (_node: Trace.Extras.TraceTree.Node|null) => void;
  onTreeRowClicked: TreeRowCallback;
}

function generateRangeSummaryDetails(input: SummaryViewInput): LitTemplate {
  // clang-format off
  return html`${widget(TimelineComponents.TimelineRangeSummaryView.TimelineRangeSummaryView, {
    data: {
      parsedTrace: input.parsedTrace,
      events: input.selectedRange?.events,
      startTime: input.selectedRange?.startTime,
      endTime: input.selectedRange?.endTime,
      thirdPartyTreeTemplate:  input.selectedRange ? html`${widget(ThirdPartyTreeViewWidget, {
        model: {
          parsedTrace: input.parsedTrace,
          entityMapper: input.entityMapper,
          selectedEvents: input.selectedRange.events ?? null,
        },
        activeSelection: input.selectedRange.selection ||
            selectionFromRangeMilliSeconds(input.selectedRange.startTime, input.selectedRange.endTime),
        onRowHovered: input.onTreeRowHovered,
        onBottomUpButtonClicked: input.onBottomUpButtonClicked,
        onRowClicked: input.onTreeRowClicked,
        })}` : nothing,
    } as TimelineComponents.TimelineRangeSummaryView.TimelineRangeSummaryViewData,
  })}`;
  // clang-format on
}

async function renderSelectedEventDetails(
    input: SummaryViewInput,
    ): Promise<LitTemplate> {
  const {selectedEvent, parsedTrace, linkifier} = input;
  if (!selectedEvent || !parsedTrace || !linkifier) {
    return nothing;
  }
  const traceRecordingIsFresh =
      parsedTrace ? Tracing.FreshRecording.Tracker.instance().recordingIsFresh(parsedTrace) : false;

  if (Trace.Types.Events.isSyntheticLayoutShift(selectedEvent) ||
      Trace.Types.Events.isSyntheticLayoutShiftCluster(selectedEvent)) {
    // clang-format off
    return html`
      <devtools-widget data-layout-shift-details ${widget(
        TimelineComponents.LayoutShiftDetails.LayoutShiftDetails, {
          event: selectedEvent,
          parsedTrace: input.parsedTrace,
          isFreshRecording: traceRecordingIsFresh,
        })}
      ></devtools-widget>`;
    // clang-format on
  }

  if (Trace.Types.Events.isSyntheticNetworkRequest(selectedEvent)) {
    // clang-format off
    return html`
      <devtools-widget data-network-request-details ${widget(
        TimelineComponents.NetworkRequestDetails.NetworkRequestDetails, {
          request: selectedEvent,
          entityMapper: input.entityMapper,
          target: input.target,
          linkifier: input.linkifier,
          parsedTrace: input.parsedTrace,
        })}
      ></devtools-widget>
    `;
    // clang-format on
  }

  if (Trace.Types.Events.isLegacyTimelineFrame(selectedEvent) && input.filmStrip) {
    const matchedFilmStripFrame = getFilmStripFrame(input.filmStrip, selectedEvent);
    const content =
        TimelineUIUtils.generateDetailsContentForFrame(selectedEvent, input.filmStrip, matchedFilmStripFrame);
    return html`${content}`;
  }

  // Fall back to the default trace event details. Long term this needs to use
  // the UI Eng Vision.
  const traceEventDetails =
      await TimelineUIUtils.buildTraceEventDetails(parsedTrace, selectedEvent, linkifier, true, input.entityMapper);
  return html`${traceEventDetails}`;
}

const filmStripFrameCache = new WeakMap<Trace.Types.Events.LegacyTimelineFrame, Trace.Extras.FilmStrip.Frame|null>();

function getFilmStripFrame(filmStrip: Trace.Extras.FilmStrip.Data, frame: Trace.Types.Events.LegacyTimelineFrame):
    Trace.Extras.FilmStrip.Frame|null {
  const fromCache = filmStripFrameCache.get(frame);
  if (typeof fromCache !== 'undefined') {
    return fromCache;
  }

  const screenshotTime = (frame.idle ? frame.startTime : frame.endTime);
  const filmStripFrame = Trace.Extras.FilmStrip.frameClosestToTimestamp(filmStrip, screenshotTime);
  if (!filmStripFrame) {
    filmStripFrameCache.set(frame, null);
    return null;
  }

  const frameTimeMilliSeconds = Trace.Helpers.Timing.microToMilli(filmStripFrame.screenshotEvent.ts);
  const frameEndTimeMilliSeconds = Trace.Helpers.Timing.microToMilli(frame.endTime);
  if (frameTimeMilliSeconds - frameEndTimeMilliSeconds < 10) {
    filmStripFrameCache.set(frame, filmStripFrame);
    return filmStripFrame;
  }

  filmStripFrameCache.set(frame, null);
  return null;
}

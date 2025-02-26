// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as Root from '../../core/root/root.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Bindings from '../../models/bindings/bindings.js';
import * as CrUXManager from '../../models/crux-manager/crux-manager.js';
import * as Trace from '../../models/trace/trace.js';
import * as TraceBounds from '../../services/trace_bounds/trace_bounds.js';
import * as PerfUI from '../../ui/legacy/components/perf_ui/perf_ui.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import {getAnnotationEntries, getAnnotationWindow} from './AnnotationHelpers.js';
import type * as TimelineComponents from './components/components.js';
import * as TimelineInsights from './components/insights/insights.js';
import {CountersGraph} from './CountersGraph.js';
import {SHOULD_SHOW_EASTER_EGG} from './EasterEgg.js';
import {ModificationsManager} from './ModificationsManager.js';
import * as OverlayComponents from './overlays/components/components.js';
import * as Overlays from './overlays/overlays.js';
import {targetForEvent} from './TargetForEvent.js';
import {type Tab, TimelineDetailsPane} from './TimelineDetailsView.js';
import {TimelineRegExp} from './TimelineFilters.js';
import {
  Events as TimelineFlameChartDataProviderEvents,
  TimelineFlameChartDataProvider,
} from './TimelineFlameChartDataProvider.js';
import {TimelineFlameChartNetworkDataProvider} from './TimelineFlameChartNetworkDataProvider.js';
import timelineFlameChartViewStyles from './timelineFlameChartView.css.js';
import type {TimelineModeViewDelegate} from './TimelinePanel.js';
import {
  rangeForSelection,
  selectionFromEvent,
  selectionFromRangeMilliSeconds,
  selectionIsEvent,
  selectionIsRange,
  type TimelineSelection,
} from './TimelineSelection.js';
import {AggregatedTimelineTreeView, TimelineTreeView} from './TimelineTreeView.js';
import type {TimelineMarkerStyle} from './TimelineUIUtils.js';
import * as Utils from './utils/utils.js';

const UIStrings = {
  /**
   *@description Text in Timeline Flame Chart View of the Performance panel
   *@example {Frame} PH1
   *@example {10ms} PH2
   */
  sAtS: '{PH1} at {PH2}',
} as const;
const str_ = i18n.i18n.registerUIStrings('panels/timeline/TimelineFlameChartView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

/**
 * This defines the order these markers will be rendered if they are at the
 * same timestamp. The smaller number will be shown first - e.g. so if NavigationStart, MarkFCP,
 * MarkLCPCandidate have the same timestamp, visually we
 * will render [Nav][FCP][DCL][LCP] everytime.
 */
export const SORT_ORDER_PAGE_LOAD_MARKERS: Readonly<Record<string, number>> = {
  [Trace.Types.Events.Name.NAVIGATION_START]: 0,
  [Trace.Types.Events.Name.MARK_LOAD]: 1,
  [Trace.Types.Events.Name.MARK_FCP]: 2,
  [Trace.Types.Events.Name.MARK_DOM_CONTENT]: 3,
  [Trace.Types.Events.Name.MARK_LCP_CANDIDATE]: 4,
};

// Threshold to match up overlay markers that are off by a tiny amount so they aren't rendered
// on top of each other.
const TIMESTAMP_THRESHOLD_MS = Trace.Types.Timing.Micro(10);

interface FlameChartDimmer {
  active: boolean;
  mainChartIndices: number[];
  networkChartIndices: number[];
  /** When true, the provided indices will be dimmed. When false, all others will be dimmed. */
  inclusive: boolean;
  /** When true, all undimmed entries are outlined. When a number array, only those indices are outlined (if not dimmed). */
  outline: boolean|{main: number[] | boolean, network: number[]|boolean};
}

export class TimelineFlameChartView extends Common.ObjectWrapper.eventMixin<EventTypes, typeof UI.Widget.VBox>(
    UI.Widget.VBox) implements PerfUI.FlameChart.FlameChartDelegate, UI.SearchableView.Searchable {
  private readonly delegate: TimelineModeViewDelegate;
  /**
   * Tracks the indexes of matched entries when the user searches the panel.
   * Defaults to undefined which indicates the user has not searched.
   */
  private searchResults: PerfUI.FlameChart.DataProviderSearchResult[]|undefined = undefined;
  private eventListeners: Common.EventTarget.EventDescriptor[];
  // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
  private readonly networkSplitWidget: UI.SplitWidget.SplitWidget;
  private mainDataProvider: TimelineFlameChartDataProvider;
  private readonly mainFlameChart: PerfUI.FlameChart.FlameChart;
  // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private readonly networkFlameChartGroupExpansionSetting: Common.Settings.Setting<any>;
  private networkDataProvider: TimelineFlameChartNetworkDataProvider;
  private readonly networkFlameChart: PerfUI.FlameChart.FlameChart;
  private readonly networkPane: UI.Widget.VBox;
  private readonly splitResizer: HTMLElement;
  private readonly chartSplitWidget: UI.SplitWidget.SplitWidget;
  private brickGame?: PerfUI.BrickBreaker.BrickBreaker;
  private readonly countersView: CountersGraph;
  private readonly detailsSplitWidget: UI.SplitWidget.SplitWidget;
  private readonly detailsView: TimelineDetailsPane;
  private readonly onMainAddEntryLabelAnnotation: (event: Common.EventTarget.EventTargetEvent<{
    entryIndex: number,
    withLinkCreationButton: boolean,
  }>) => void;
  private readonly onNetworkAddEntryLabelAnnotation: (event: Common.EventTarget.EventTargetEvent<{
    entryIndex: number,
    withLinkCreationButton: boolean,
  }>) => void;
  readonly #onMainEntriesLinkAnnotationCreated:
      (event: Common.EventTarget.EventTargetEvent<{entryFromIndex: number}>) => void;
  readonly #onNetworkEntriesLinkAnnotationCreated:
      (event: Common.EventTarget.EventTargetEvent<{entryFromIndex: number}>) => void;
  private readonly onMainEntrySelected: (event: Common.EventTarget.EventTargetEvent<number>) => void;
  private readonly onNetworkEntrySelected: (event: Common.EventTarget.EventTargetEvent<number>) => void;
  readonly #boundRefreshAfterIgnoreList: () => void;
  #selectedEvents: Trace.Types.Events.Event[]|null;
  // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private readonly groupBySetting: Common.Settings.Setting<any>;
  private searchableView!: UI.SearchableView.SearchableView;
  private needsResizeToPreferredHeights?: boolean;
  private selectedSearchResult?: PerfUI.FlameChart.DataProviderSearchResult;
  private searchRegex?: RegExp;
  #parsedTrace: Trace.Handlers.Types.ParsedTrace|null;
  #traceMetadata: Trace.Types.File.MetaData|null;
  #traceInsightSets: Trace.Insights.Types.TraceInsightSets|null = null;
  #eventToRelatedInsightsMap: TimelineComponents.RelatedInsightChips.EventToRelatedInsightsMap|null = null;
  #selectedGroupName: string|null = null;
  #onTraceBoundsChangeBound = this.#onTraceBoundsChange.bind(this);
  #gameKeyMatches = 0;
  #gameTimeout = setTimeout(() => ({}), 0);

  #overlaysContainer: HTMLElement = document.createElement('div');
  #overlays: Overlays.Overlays.Overlays;

  // Tracks the in-progress time range annotation when the user alt/option clicks + drags, or when the user uses the keyboard
  #timeRangeSelectionAnnotation: Trace.Types.File.TimeRangeAnnotation|null = null;

  // Keep track of the link annotation that hasn't been fully selected yet.
  // We only store it here when only 'entryFrom' has been selected and
  // 'EntryTo' selection still needs to be updated.
  #linkSelectionAnnotation: Trace.Types.File.EntriesLinkAnnotation|null = null;

  #currentInsightOverlays: Overlays.Overlays.TimelineOverlay[] = [];
  #activeInsight: TimelineComponents.Sidebar.ActiveInsight|null = null;
  #markers: Overlays.Overlays.TimingsMarker[] = [];

  #tooltipElement = document.createElement('div');

  // We use an symbol as the loggable for each group. This is because
  // groups can get re-built at times and we need a common reference to act as
  // the reference for each group that we log. By storing these symbols in
  // a map keyed off the context of the group, we ensure we persist the
  // loggable even if the group gets rebuilt at some point in time.
  #loggableForGroupByLogContext = new Map<string, Symbol>();

  #onMainEntryInvoked: (event: Common.EventTarget.EventTargetEvent<number>) => void;
  #onNetworkEntryInvoked: (event: Common.EventTarget.EventTargetEvent<number>) => void;
  #currentSelection: TimelineSelection|null = null;
  #entityMapper: Utils.EntityMapper.EntityMapper|null = null;

  // Only one dimmer is used at a time. The first dimmer, as defined by the following
  // order, that is `active` within this array is used.
  #flameChartDimmers: FlameChartDimmer[] = [];
  #searchDimmer = this.#registerFlameChartDimmer({inclusive: false, outline: true});
  #treeRowHoverDimmer = this.#registerFlameChartDimmer({inclusive: false, outline: true});
  #thirdPartyRowHoverDimmer = this.#registerFlameChartDimmer({inclusive: false, outline: false});
  #activeInsightDimmer = this.#registerFlameChartDimmer({inclusive: false, outline: true});
  #thirdPartyCheckboxDimmer = this.#registerFlameChartDimmer({inclusive: true, outline: false});

  constructor(delegate: TimelineModeViewDelegate) {
    super();
    this.registerRequiredCSS(timelineFlameChartViewStyles);
    this.element.classList.add('timeline-flamechart');

    this.delegate = delegate;
    this.eventListeners = [];
    this.#parsedTrace = null;
    this.#traceMetadata = null;

    const flameChartsContainer = new UI.Widget.VBox();
    flameChartsContainer.element.classList.add('flame-charts-container');

    // Create main and network flamecharts.
    this.networkSplitWidget = new UI.SplitWidget.SplitWidget(false, false, 'timeline-flamechart-main-view', 150);
    this.networkSplitWidget.show(flameChartsContainer.element);

    this.#overlaysContainer.classList.add('timeline-overlays-container');
    flameChartsContainer.element.appendChild(this.#overlaysContainer);

    this.#tooltipElement.classList.add('timeline-entry-tooltip-element');
    flameChartsContainer.element.appendChild(this.#tooltipElement);

    // Ensure that the network panel & resizer appears above the main thread.
    this.networkSplitWidget.sidebarElement().style.zIndex = '120';

    const mainViewGroupExpansionSetting =
        Common.Settings.Settings.instance().createSetting('timeline-flamechart-main-view-group-expansion', {});
    this.mainDataProvider = new TimelineFlameChartDataProvider();
    this.mainDataProvider.addEventListener(
        TimelineFlameChartDataProviderEvents.DATA_CHANGED, () => this.mainFlameChart.scheduleUpdate());
    this.mainDataProvider.addEventListener(
        TimelineFlameChartDataProviderEvents.FLAME_CHART_ITEM_HOVERED,
        e => this.detailsView.revealEventInTreeView(e.data));

    this.mainFlameChart = new PerfUI.FlameChart.FlameChart(this.mainDataProvider, this, {
      groupExpansionSetting: mainViewGroupExpansionSetting,
      // The TimelineOverlays are used for selected elements
      selectedElementOutline: false,
      tooltipElement: this.#tooltipElement,
      useOverlaysForCursorRuler: true,
    });
    this.mainFlameChart.alwaysShowVerticalScroll();
    this.mainFlameChart.enableRuler(false);

    this.mainFlameChart.addEventListener(PerfUI.FlameChart.Events.LATEST_DRAW_DIMENSIONS, dimensions => {
      this.#overlays.updateChartDimensions('main', dimensions.data.chart);
      this.#overlays.updateVisibleWindow(dimensions.data.traceWindow);
      void this.#overlays.update();
    });

    this.networkFlameChartGroupExpansionSetting =
        Common.Settings.Settings.instance().createSetting('timeline-flamechart-network-view-group-expansion', {});
    this.networkDataProvider = new TimelineFlameChartNetworkDataProvider();
    this.networkFlameChart = new PerfUI.FlameChart.FlameChart(this.networkDataProvider, this, {
      groupExpansionSetting: this.networkFlameChartGroupExpansionSetting,
      // The TimelineOverlays are used for selected elements
      selectedElementOutline: false,
      tooltipElement: this.#tooltipElement,
      useOverlaysForCursorRuler: true,
    });
    this.networkFlameChart.alwaysShowVerticalScroll();
    this.networkFlameChart.addEventListener(PerfUI.FlameChart.Events.LATEST_DRAW_DIMENSIONS, dimensions => {
      this.#overlays.updateChartDimensions('network', dimensions.data.chart);
      this.#overlays.updateVisibleWindow(dimensions.data.traceWindow);
      void this.#overlays.update();

      // If the height of the network chart has changed, we need to tell the
      // main flame chart because its tooltips are positioned based in part on
      // the height of the network chart.
      this.mainFlameChart.setTooltipYPixelAdjustment(this.#overlays.networkChartOffsetHeight());
    });

    this.mainFlameChart.addEventListener(PerfUI.FlameChart.Events.MOUSE_MOVE, event => {
      void this.#processFlameChartMouseMoveEvent(event.data);
    });

    this.networkFlameChart.addEventListener(PerfUI.FlameChart.Events.MOUSE_MOVE, event => {
      void this.#processFlameChartMouseMoveEvent(event.data);
    });

    this.#overlays = new Overlays.Overlays.Overlays({
      container: this.#overlaysContainer,
      flameChartsContainers: {
        main: this.mainFlameChart.element,
        network: this.networkFlameChart.element,
      },
      charts: {
        mainChart: this.mainFlameChart,
        mainProvider: this.mainDataProvider,
        networkChart: this.networkFlameChart,
        networkProvider: this.networkDataProvider,
      },
      entryQueries: {
        isEntryCollapsedByUser: (entry: Trace.Types.Events.Event): boolean => {
          return ModificationsManager.activeManager()?.getEntriesFilter().entryIsInvisible(entry) ?? false;
        },
        firstVisibleParentForEntry(entry) {
          return ModificationsManager.activeManager()?.getEntriesFilter().firstVisibleParentEntryForEntry(entry) ??
              null;
        },
      },
    });

    this.#overlays.addEventListener(Overlays.Overlays.EntryLabelMouseClick.eventName, event => {
      const {overlay} = (event as Overlays.Overlays.EntryLabelMouseClick);
      this.dispatchEventToListeners(
          Events.ENTRY_LABEL_ANNOTATION_CLICKED,
          {
            entry: overlay.entry,
          },
      );
    });

    this.#overlays.addEventListener(Overlays.Overlays.AnnotationOverlayActionEvent.eventName, event => {
      const {overlay, action} = (event as Overlays.Overlays.AnnotationOverlayActionEvent);
      if (action === 'Remove') {
        // If the overlay removed is the current time range, set it to null so that
        // we would create a new time range overlay and annotation on the next time range selection instead
        // of trying to update the current overlay that does not exist.
        if (ModificationsManager.activeManager()?.getAnnotationByOverlay(overlay) ===
            this.#timeRangeSelectionAnnotation) {
          this.#timeRangeSelectionAnnotation = null;
        }
        ModificationsManager.activeManager()?.removeAnnotationOverlay(overlay);
      } else if (action === 'Update') {
        ModificationsManager.activeManager()?.updateAnnotationOverlay(overlay);
      }
    });

    this.element.addEventListener(OverlayComponents.EntriesLinkOverlay.EntryLinkStartCreating.eventName, () => {
      /**
       * When the user creates an entries link, they click on the arrow icon to
       * begin creating it. At this point the arrow icon gets deleted. This
       * causes the focus of the page by default to jump to the entire Timeline
       * Panel. This is a bit aggressive; and problematic as it means we cannot
       * use <ESC> to cancel the creation of the entry. So instead we focus the
       * TimelineFlameChartView instead. This means that the user's <ESC> gets
       * dealt with in its keydown.
       * If the user goes ahead and creates the entry, they will end up
       * focused on whichever target entry they pick, so this only matters for
       * the case where the user hits <ESC> to cancel.
       */
      this.focus();
    });

    this.element.setAttribute('jslog', `${VisualLogging.section('timeline.flame-chart-view')}`);

    this.networkPane = new UI.Widget.VBox();
    this.networkPane.setMinimumSize(23, 23);
    this.networkFlameChart.show(this.networkPane.element);
    this.splitResizer = this.networkPane.element.createChild('div', 'timeline-flamechart-resizer');
    this.networkSplitWidget.hideDefaultResizer(true);
    this.networkSplitWidget.installResizer(this.splitResizer);
    this.networkSplitWidget.setMainWidget(this.mainFlameChart);
    this.networkSplitWidget.setSidebarWidget(this.networkPane);

    // Create counters chart splitter.
    this.chartSplitWidget = new UI.SplitWidget.SplitWidget(false, true, 'timeline-counters-split-view-state');
    this.countersView = new CountersGraph(this.delegate);
    this.chartSplitWidget.setMainWidget(flameChartsContainer);
    this.chartSplitWidget.setSidebarWidget(this.countersView);
    this.chartSplitWidget.hideDefaultResizer();
    this.chartSplitWidget.installResizer((this.countersView.resizerElement() as Element));

    // Create top level properties splitter.
    this.detailsSplitWidget = new UI.SplitWidget.SplitWidget(false, true, 'timeline-panel-details-split-view-state');
    this.detailsSplitWidget.element.classList.add('timeline-details-split');
    this.detailsView = new TimelineDetailsPane(delegate);
    this.detailsSplitWidget.installResizer(this.detailsView.headerElement());
    this.detailsSplitWidget.setMainWidget(this.chartSplitWidget);
    this.detailsSplitWidget.setSidebarWidget(this.detailsView);
    this.detailsSplitWidget.show(this.element);

    // Event listeners for annotations.
    this.onMainAddEntryLabelAnnotation = this.onAddEntryLabelAnnotation.bind(this, this.mainDataProvider);
    this.onNetworkAddEntryLabelAnnotation = this.onAddEntryLabelAnnotation.bind(this, this.networkDataProvider);
    this.#onMainEntriesLinkAnnotationCreated = event =>
        this.onEntriesLinkAnnotationCreate(this.mainDataProvider, event.data.entryFromIndex);
    this.#onNetworkEntriesLinkAnnotationCreated = event =>
        this.onEntriesLinkAnnotationCreate(this.networkDataProvider, event.data.entryFromIndex);
    this.mainFlameChart.addEventListener(
        PerfUI.FlameChart.Events.ENTRY_LABEL_ANNOTATION_ADDED, this.onMainAddEntryLabelAnnotation, this);
    this.networkFlameChart.addEventListener(
        PerfUI.FlameChart.Events.ENTRY_LABEL_ANNOTATION_ADDED, this.onNetworkAddEntryLabelAnnotation, this);

    this.mainFlameChart.addEventListener(
        PerfUI.FlameChart.Events.ENTRIES_LINK_ANNOTATION_CREATED, this.#onMainEntriesLinkAnnotationCreated, this);
    this.networkFlameChart.addEventListener(
        PerfUI.FlameChart.Events.ENTRIES_LINK_ANNOTATION_CREATED, this.#onNetworkEntriesLinkAnnotationCreated, this);

    this.mainFlameChart.addEventListener(PerfUI.FlameChart.Events.TRACKS_REORDER_STATE_CHANGED, event => {
      this.#overlays.toggleAllOverlaysDisplayed(!event.data);
    });

    this.detailsView.addEventListener(TimelineTreeView.Events.TREE_ROW_HOVERED, node => {
      if (!Root.Runtime.experiments.isEnabled(Root.Runtime.ExperimentName.TIMELINE_DIM_UNRELATED_EVENTS)) {
        return;
      }

      const events = node?.data?.events ?? null;
      this.#updateFlameChartDimmerWithEvents(this.#treeRowHoverDimmer, events);
    });

    this.detailsView.addEventListener(TimelineTreeView.Events.THIRD_PARTY_ROW_HOVERED, node => {
      const events = node?.data?.events ?? null;
      this.#updateFlameChartDimmerWithEvents(this.#thirdPartyRowHoverDimmer, events);
    });

    /**
     * NOTE: ENTRY_SELECTED, ENTRY_INVOKED and ENTRY_HOVERED are not always super obvious:
     * ENTRY_SELECTED: is KEYBOARD ONLY selection of events (e.g. navigating through the flamechart with your arrow keys)
     * ENTRY_HOVERED: is MOUSE ONLY when an event is hovered over with the mouse.
     * ENTRY_INVOKED: is when the user cilcks on an event, or hits the "enter" key whilst an event is selected.
     */
    this.onMainEntrySelected = this.onEntrySelected.bind(this, this.mainDataProvider);
    this.onNetworkEntrySelected = this.onEntrySelected.bind(this, this.networkDataProvider);
    this.mainFlameChart.addEventListener(PerfUI.FlameChart.Events.ENTRY_SELECTED, this.onMainEntrySelected, this);
    this.networkFlameChart.addEventListener(PerfUI.FlameChart.Events.ENTRY_SELECTED, this.onNetworkEntrySelected, this);

    this.#onMainEntryInvoked = this.#onEntryInvoked.bind(this, this.mainDataProvider);
    this.#onNetworkEntryInvoked = this.#onEntryInvoked.bind(this, this.networkDataProvider);
    this.mainFlameChart.addEventListener(PerfUI.FlameChart.Events.ENTRY_INVOKED, this.#onMainEntryInvoked, this);
    this.networkFlameChart.addEventListener(PerfUI.FlameChart.Events.ENTRY_INVOKED, this.#onNetworkEntryInvoked, this);

    this.mainFlameChart.addEventListener(PerfUI.FlameChart.Events.ENTRY_HOVERED, event => {
      this.onEntryHovered(event);
      this.updateLinkSelectionAnnotationWithToEntry(this.mainDataProvider, event.data);
    }, this);
    this.networkFlameChart.addEventListener(PerfUI.FlameChart.Events.ENTRY_HOVERED, event => {
      this.updateLinkSelectionAnnotationWithToEntry(this.networkDataProvider, event.data);
    }, this);

    // This listener is used for timings marker, when they are clicked, open the details view for them. They are
    // rendered in the overlays system, not in flame chart (canvas), so need this extra handling.
    this.#overlays.addEventListener(Overlays.Overlays.EventReferenceClick.eventName, event => {
      const eventRef = (event as Overlays.Overlays.EventReferenceClick);
      const fromTraceEvent = selectionFromEvent(eventRef.event);
      this.openSelectionDetailsView(fromTraceEvent);
    });

    // This is for the detail view of layout shift.
    this.element.addEventListener(TimelineInsights.EventRef.EventReferenceClick.eventName, event => {
      this.setSelectionAndReveal(selectionFromEvent(event.event));
    });

    this.element.addEventListener('keydown', this.#keydownHandler.bind(this));
    this.element.addEventListener('pointerdown', this.#pointerDownHandler.bind(this));
    this.#boundRefreshAfterIgnoreList = this.#refreshAfterIgnoreList.bind(this);
    this.#selectedEvents = null;

    this.groupBySetting = Common.Settings.Settings.instance().createSetting(
        'timeline-tree-group-by', AggregatedTimelineTreeView.GroupBy.None);
    this.groupBySetting.addChangeListener(this.refreshMainFlameChart, this);
    this.refreshMainFlameChart();

    TraceBounds.TraceBounds.onChange(this.#onTraceBoundsChangeBound);
  }

  containingElement(): HTMLElement {
    return this.element;
  }

  // Activates or disables dimming when setting is toggled.
  dimThirdPartiesIfRequired(): void {
    if (!this.#parsedTrace) {
      return;
    }
    const dim = Common.Settings.Settings.instance().createSetting('timeline-dim-third-parties', false).get();
    const thirdPartyEvents = this.#entityMapper?.thirdPartyEvents() ?? [];
    if (dim && thirdPartyEvents.length) {
      this.#updateFlameChartDimmerWithEvents(this.#thirdPartyCheckboxDimmer, thirdPartyEvents);
    } else {
      this.#updateFlameChartDimmerWithEvents(this.#thirdPartyCheckboxDimmer, null);
    }
  }

  #registerFlameChartDimmer(opts: {inclusive: boolean, outline: boolean}): FlameChartDimmer {
    const dimmer: FlameChartDimmer = {
      active: false,
      mainChartIndices: [],
      networkChartIndices: [],
      inclusive: opts.inclusive,
      outline: opts.outline
    };
    this.#flameChartDimmers.push(dimmer);
    return dimmer;
  }

  #updateFlameChartDimmerWithEvents(dimmer: FlameChartDimmer, events: Trace.Types.Events.Event[]|null): void {
    if (events) {
      dimmer.active = true;
      dimmer.mainChartIndices = events.map(event => this.mainDataProvider.indexForEvent(event) ?? -1);
      dimmer.networkChartIndices = events.map(event => this.networkDataProvider.indexForEvent(event) ?? -1);
    } else {
      dimmer.active = false;
      dimmer.mainChartIndices = [];
      dimmer.networkChartIndices = [];
    }

    this.#refreshDimming();
  }

  #updateFlameChartDimmerWithIndices(
      dimmer: FlameChartDimmer, mainChartIndices: number[], networkChartIndices: number[]): void {
    dimmer.active = true;
    dimmer.mainChartIndices = mainChartIndices;
    dimmer.networkChartIndices = networkChartIndices;

    this.#refreshDimming();
  }

  #refreshDimming(): void {
    const dimmer = this.#flameChartDimmers.find(dimmer => dimmer.active);

    // This checkbox should only be enabled if its dimmer is being used.
    this.delegate.set3PCheckboxDisabled(Boolean(dimmer && dimmer !== this.#thirdPartyCheckboxDimmer));

    if (!dimmer) {
      this.mainFlameChart.disableDimming();
      this.networkFlameChart.disableDimming();
      return;
    }

    const mainOutline = typeof dimmer.outline === 'boolean' ? dimmer.outline : dimmer.outline.main;
    const networkOutline = typeof dimmer.outline === 'boolean' ? dimmer.outline : dimmer.outline.network;

    this.mainFlameChart.enableDimming(dimmer.mainChartIndices, dimmer.inclusive, mainOutline);
    this.networkFlameChart.enableDimming(dimmer.networkChartIndices, dimmer.inclusive, networkOutline);
  }

  #dimInsightRelatedEvents(relatedEvents: Trace.Types.Events.Event[]): void {
    // Dim all events except those related to the active insight.
    const relatedMainIndices = relatedEvents.map(event => this.mainDataProvider.indexForEvent(event) ?? -1);
    const relatedNetworkIndices = relatedEvents.map(event => this.networkDataProvider.indexForEvent(event) ?? -1);

    // Only outline the events that are individually/specifically identified as being related. Don't outline
    // the events covered by range overlays.
    this.#activeInsightDimmer.outline = {
      main: [...relatedMainIndices],
      network: [...relatedNetworkIndices],
    };

    // Further, overlays defining a trace bounds do not dim an event that falls within those bounds.
    for (const overlay of this.#currentInsightOverlays) {
      let bounds;
      if (overlay.type === 'TIMESPAN_BREAKDOWN') {
        const firstSection = overlay.sections.at(0);
        const lastSection = overlay.sections.at(-1);
        if (firstSection && lastSection) {
          bounds = Trace.Helpers.Timing.traceWindowFromMicroSeconds(firstSection.bounds.min, lastSection.bounds.max);
        }
      } else if (overlay.type === 'TIME_RANGE') {
        bounds = overlay.bounds;
      }

      if (!bounds) {
        continue;
      }

      let provider, relevantEvents;

      // Using a relevant event for the overlay, determine which provider this overlay is for.
      const overlayEvent = Overlays.Overlays.entriesForOverlay(overlay).at(0);
      if (overlayEvent) {
        if (this.mainDataProvider.indexForEvent(overlayEvent) !== null) {
          provider = this.mainDataProvider;
          relevantEvents = relatedMainIndices;
        } else if (this.networkDataProvider.indexForEvent(overlayEvent) !== null) {
          provider = this.networkDataProvider;
          relevantEvents = relatedNetworkIndices;
        }
      } else if (overlay.type === 'TIMESPAN_BREAKDOWN') {
        // For this overlay type, if there is no associated event it is rendered on mainFlameChart.
        provider = this.mainDataProvider;
        relevantEvents = relatedMainIndices;
      }

      if (!provider || !relevantEvents) {
        continue;
      }

      relevantEvents.push(...provider.search(bounds).map(r => r.index));
    }

    this.#updateFlameChartDimmerWithIndices(this.#activeInsightDimmer, relatedMainIndices, relatedNetworkIndices);
  }

  #sortMarkersForPreferredVisualOrder(markers: Trace.Types.Events.Event[]): void {
    markers.sort((m1, m2) => {
      const m1Index = SORT_ORDER_PAGE_LOAD_MARKERS[m1.name] ?? Infinity;
      const m2Index = SORT_ORDER_PAGE_LOAD_MARKERS[m2.name] ?? Infinity;
      return m1Index - m2Index;
    });
  }

  #amendMarkerWithFieldData(): void {
    if (!this.#traceMetadata?.cruxFieldData || !this.#traceInsightSets) {
      return;
    }

    const fieldMetricResultsByNavigationId = new Map<string, Trace.Insights.Common.CrUXFieldMetricResults|null>();
    for (const [key, insightSet] of this.#traceInsightSets) {
      if (insightSet.navigation) {
        fieldMetricResultsByNavigationId.set(
            key,
            Trace.Insights.Common.getFieldMetricsForInsightSet(
                insightSet, this.#traceMetadata, CrUXManager.CrUXManager.instance().getSelectedScope()));
      }
    }

    for (const marker of this.#markers) {
      for (const event of marker.entries) {
        const navigationId = event.args?.data?.navigationId;
        if (!navigationId) {
          continue;
        }

        const fieldMetricResults = fieldMetricResultsByNavigationId.get(navigationId);
        if (!fieldMetricResults) {
          continue;
        }

        let fieldMetricResult;
        if (event.name === Trace.Types.Events.Name.MARK_FCP) {
          fieldMetricResult = fieldMetricResults.fcp;
        } else if (event.name === Trace.Types.Events.Name.MARK_LCP_CANDIDATE) {
          fieldMetricResult = fieldMetricResults.lcp;
        }

        if (!fieldMetricResult) {
          continue;
        }

        marker.entryToFieldResult.set(event, fieldMetricResult);
      }
    }
  }

  setMarkers(parsedTrace: Trace.Handlers.Types.ParsedTrace|null): void {
    if (!parsedTrace) {
      return;
    }
    // Clear out any markers.
    this.bulkRemoveOverlays(this.#markers);
    const markerEvents = parsedTrace.PageLoadMetrics.allMarkerEvents;
    // Set markers for Navigations, LCP, FCP, DCL, L.
    const markers = markerEvents.filter(
        event => event.name === Trace.Types.Events.Name.NAVIGATION_START ||
            event.name === Trace.Types.Events.Name.MARK_LCP_CANDIDATE ||
            event.name === Trace.Types.Events.Name.MARK_FCP ||
            event.name === Trace.Types.Events.Name.MARK_DOM_CONTENT ||
            event.name === Trace.Types.Events.Name.MARK_LOAD);

    this.#sortMarkersForPreferredVisualOrder(markers);
    const overlayByTs = new Map<Trace.Types.Timing.Micro, Overlays.Overlays.TimingsMarker>();
    markers.forEach(marker => {
      const adjustedTimestamp = Trace.Helpers.Timing.timeStampForEventAdjustedByClosestNavigation(
          marker,
          parsedTrace.Meta.traceBounds,
          parsedTrace.Meta.navigationsByNavigationId,
          parsedTrace.Meta.navigationsByFrameId,
      );
      // If any of the markers overlap in timing, lets put them on the same marker.
      let matchingOverlay = false;
      for (const [ts, overlay] of overlayByTs.entries()) {
        if (Math.abs(marker.ts - ts) <= TIMESTAMP_THRESHOLD_MS) {
          overlay.entries.push(marker);
          matchingOverlay = true;
          break;
        }
      }
      if (!matchingOverlay) {
        const overlay: Overlays.Overlays.TimingsMarker = {
          type: 'TIMINGS_MARKER',
          entries: [marker],
          entryToFieldResult: new Map(),
          adjustedTimestamp,
        };
        overlayByTs.set(marker.ts, overlay);
      }
    });
    const markerOverlays: Overlays.Overlays.TimingsMarker[] = [...overlayByTs.values()];
    this.#markers = markerOverlays;
    if (this.#markers.length === 0) {
      return;
    }

    this.#amendMarkerWithFieldData();
    this.bulkAddOverlays(this.#markers);
  }

  setOverlays(overlays: Overlays.Overlays.TimelineOverlay[], options: Overlays.Overlays.TimelineOverlaySetOptions):
      void {
    this.bulkRemoveOverlays(this.#currentInsightOverlays);

    this.#currentInsightOverlays = overlays;
    if (this.#currentInsightOverlays.length === 0) {
      return;
    }

    const traceBounds = TraceBounds.TraceBounds.BoundsManager.instance().state()?.micro.entireTraceBounds;
    if (!traceBounds) {
      return;
    }

    this.bulkAddOverlays(this.#currentInsightOverlays);

    const entries: Trace.Types.Events.Event[] = [];
    for (const overlay of this.#currentInsightOverlays) {
      entries.push(...Overlays.Overlays.entriesForOverlay(overlay));
    }

    for (const entry of entries) {
      // Ensure that the track for the entries are open.
      this.#expandEntryTrack(entry);
    }

    if (Root.Runtime.experiments.isEnabled(Root.Runtime.ExperimentName.TIMELINE_DIM_UNRELATED_EVENTS)) {
      // The insight's `relatedEvents` property likely already includes the events associated with
      // an overlay, but just in case not, include both arrays. Duplicates are fine.
      let relatedEventsList = this.#activeInsight?.model.relatedEvents;
      if (!relatedEventsList) {
        relatedEventsList = [];
      } else if (relatedEventsList instanceof Map) {
        relatedEventsList = Array.from(relatedEventsList.keys());
      }
      this.#dimInsightRelatedEvents([...entries, ...relatedEventsList]);
    }

    if (options.updateTraceWindow) {
      const overlaysBounds = Overlays.Overlays.traceWindowContainingOverlays(this.#currentInsightOverlays);
      if (overlaysBounds) {
        // Trace window covering all overlays expanded by 100% so that the overlays cover 50% of the visible window.
        const expandedBounds =
            Trace.Helpers.Timing.expandWindowByPercentOrToOneMillisecond(overlaysBounds, traceBounds, 100);

        // Set the timeline visible window and ignore the minimap bounds. This
        // allows us to pick a visible window even if the overlays are outside of
        // the current breadcrumb. If this happens, the event listener for
        // BoundsManager changes in TimelineMiniMap will detect it and activate
        // the correct breadcrumb for us.
        TraceBounds.TraceBounds.BoundsManager.instance().setTimelineVisibleWindow(
            expandedBounds, {ignoreMiniMapBounds: true, shouldAnimate: true});
      }
    }

    // Reveal entry if we have one.
    if (entries.length !== 0) {
      const earliestEntry =
          entries.reduce((earliest, current) => (earliest.ts < current.ts ? earliest : current), entries[0]);
      this.revealEventVertically(earliestEntry);
    }
  }

  revealAnnotation(annotation: Trace.Types.File.Annotation): void {
    const traceBounds = TraceBounds.TraceBounds.BoundsManager.instance().state()?.micro.entireTraceBounds;
    if (!traceBounds) {
      return;
    }

    const annotationWindow = getAnnotationWindow(annotation);
    if (!annotationWindow) {
      return;
    }

    const annotationEntries = getAnnotationEntries(annotation);

    for (const entry of annotationEntries) {
      this.#expandEntryTrack(entry);
    }
    const firstEntry = annotationEntries.at(0);
    if (firstEntry) {
      this.revealEventVertically(firstEntry);
    }

    // Trace window covering all overlays expanded by 100% so that the overlays cover 50% of the visible window.
    const expandedBounds =
        Trace.Helpers.Timing.expandWindowByPercentOrToOneMillisecond(annotationWindow, traceBounds, 100);
    TraceBounds.TraceBounds.BoundsManager.instance().setTimelineVisibleWindow(
        expandedBounds, {ignoreMiniMapBounds: true, shouldAnimate: true});
  }

  setActiveInsight(insight: TimelineComponents.Sidebar.ActiveInsight|null): void {
    this.#activeInsight = insight;
    this.bulkRemoveOverlays(this.#currentInsightOverlays);

    if (!this.#activeInsight) {
      this.#updateFlameChartDimmerWithEvents(this.#activeInsightDimmer, null);
    }
  }

  /**
   * Expands the track / group that the given entry is in.
   */
  #expandEntryTrack(entry: Trace.Types.Events.Event): void {
    const chartName = Overlays.Overlays.chartForEntry(entry);
    const provider = chartName === 'main' ? this.mainDataProvider : this.networkDataProvider;
    const entryChart = chartName === 'main' ? this.mainFlameChart : this.networkFlameChart;

    const entryIndex = provider.indexForEvent?.(entry) ?? null;
    if (entryIndex === null) {
      return;
    }

    const group = provider.groupForEvent?.(entryIndex) ?? null;
    if (!group) {
      return;
    }
    const groupIndex = provider.timelineData().groups.indexOf(group);

    if (!group.expanded && groupIndex > -1) {
      entryChart.toggleGroupExpand(groupIndex);
    }
  }

  addTimestampMarkerOverlay(timestamp: Trace.Types.Timing.Micro): void {
    // TIMESTAMP_MARKER is a singleton. If one already exists, it will
    // be updated instead of creating a new one.
    this.addOverlay({
      type: 'TIMESTAMP_MARKER',
      timestamp,
    });
  }

  async removeTimestampMarkerOverlay(): Promise<void> {
    const removedCount = this.#overlays.removeOverlaysOfType('TIMESTAMP_MARKER');
    if (removedCount > 0) {
      // Don't trigger lots of updates on a mouse move if we didn't actually
      // remove any overlays.
      await this.#overlays.update();
    }
  }

  async #processFlameChartMouseMoveEvent(data: PerfUI.FlameChart.EventTypes['MouseMove']): Promise<void> {
    const {mouseEvent, timeInMicroSeconds} = data;
    // If the user is no longer holding shift, remove any existing marker.
    if (!mouseEvent.shiftKey) {
      await this.removeTimestampMarkerOverlay();
    }

    if (!mouseEvent.metaKey && mouseEvent.shiftKey) {
      this.addTimestampMarkerOverlay(timeInMicroSeconds);
    }
  }

  #pointerDownHandler(event: PointerEvent): void {
    /**
     * If the user is in the middle of creating an entry link annotation and
     * right clicks, let's take that as a sign to exit and cancel.
     * (buttons === 2 indicates a right click)
     */
    if (event.buttons === 2 && this.#linkSelectionAnnotation) {
      this.#clearLinkSelectionAnnotation(true);
      event.stopPropagation();
    }
  }

  #clearLinkSelectionAnnotation(deleteCurrentLink: boolean): void {
    if (this.#linkSelectionAnnotation === null) {
      return;
    }
    // If the link in progress in cleared, make sure it's creation is complete. If not, delete it.
    if (deleteCurrentLink || this.#linkSelectionAnnotation.state !== Trace.Types.File.EntriesLinkState.CONNECTED) {
      ModificationsManager.activeManager()?.removeAnnotation(this.#linkSelectionAnnotation);
    }
    this.mainFlameChart.setLinkSelectionAnnotationIsInProgress(false);
    this.networkFlameChart.setLinkSelectionAnnotationIsInProgress(false);
    this.#linkSelectionAnnotation = null;
  }

  #setLinkSelectionAnnotation(linkSelectionAnnotation: Trace.Types.File.EntriesLinkAnnotation): void {
    this.mainFlameChart.setLinkSelectionAnnotationIsInProgress(true);
    this.networkFlameChart.setLinkSelectionAnnotationIsInProgress(true);
    this.#linkSelectionAnnotation = linkSelectionAnnotation;
  }

  #createNewTimeRangeFromKeyboard(startTime: Trace.Types.Timing.Micro, endTime: Trace.Types.Timing.Micro): void {
    if (this.#timeRangeSelectionAnnotation) {
      return;
    }

    this.#timeRangeSelectionAnnotation = {
      bounds: Trace.Helpers.Timing.traceWindowFromMicroSeconds(startTime, endTime),
      type: 'TIME_RANGE',
      label: '',
    };
    ModificationsManager.activeManager()?.createAnnotation(this.#timeRangeSelectionAnnotation);
  }

  /**
   * Handles key presses that could impact the creation of a time range overlay with the keyboard.
   * @returns `true` if the event should not be propogated + have its default behaviour stopped.
   */
  #handleTimeRangeKeyboardCreation(event: KeyboardEvent): boolean {
    const visibleWindow = TraceBounds.TraceBounds.BoundsManager.instance().state()?.micro.timelineTraceWindow;
    if (!visibleWindow) {
      return false;
    }

    // The amount we increment the time range by when using the arrow keys is
    // 2% of the visible window.
    const timeRangeIncrementValue = visibleWindow.range * 0.02;

    switch (event.key) {
      // ArrowLeft + ArrowRight adjusts the right hand bound (the max) of the time range
      // alt/option + ArrowRight also starts a range if there isn't one already
      case 'ArrowRight': {
        if (!this.#timeRangeSelectionAnnotation) {
          if (event.altKey) {
            let startTime = visibleWindow.min;
            // Prefer the start time of the selected event, if there is one.
            if (this.#currentSelection) {
              startTime = rangeForSelection(this.#currentSelection).min;
            }
            this.#createNewTimeRangeFromKeyboard(
                startTime, Trace.Types.Timing.Micro(startTime + timeRangeIncrementValue));
            return true;
          }
          return false;
        }

        // Grow the RHS of the range, but limit it to the visible window.
        this.#timeRangeSelectionAnnotation.bounds.max = Trace.Types.Timing.Micro(
            Math.min(this.#timeRangeSelectionAnnotation.bounds.max + timeRangeIncrementValue, visibleWindow.max),
        );
        this.#timeRangeSelectionAnnotation.bounds.range = Trace.Types.Timing.Micro(
            this.#timeRangeSelectionAnnotation.bounds.max - this.#timeRangeSelectionAnnotation.bounds.min,
        );
        ModificationsManager.activeManager()?.updateAnnotation(this.#timeRangeSelectionAnnotation);
        return true;
      }
      case 'ArrowLeft': {
        if (!this.#timeRangeSelectionAnnotation) {
          return false;
        }
        this.#timeRangeSelectionAnnotation.bounds.max = Trace.Types.Timing.Micro(
            // Shrink the RHS of the range, but make sure it cannot go below the min value.
            Math.max(
                this.#timeRangeSelectionAnnotation.bounds.max - timeRangeIncrementValue,
                this.#timeRangeSelectionAnnotation.bounds.min + 1),
        );
        this.#timeRangeSelectionAnnotation.bounds.range = Trace.Types.Timing.Micro(
            this.#timeRangeSelectionAnnotation.bounds.max - this.#timeRangeSelectionAnnotation.bounds.min,
        );
        ModificationsManager.activeManager()?.updateAnnotation(this.#timeRangeSelectionAnnotation);
        return true;
      }
        // ArrowDown + ArrowUp adjusts the left hand bound (the min) of the time range
      case 'ArrowUp': {
        if (!this.#timeRangeSelectionAnnotation) {
          return false;
        }
        this.#timeRangeSelectionAnnotation.bounds.min = Trace.Types.Timing.Micro(
            // Increase the LHS of the range, but make sure it cannot go above the max value.
            Math.min(
                this.#timeRangeSelectionAnnotation.bounds.min + timeRangeIncrementValue,
                this.#timeRangeSelectionAnnotation.bounds.max - 1),
        );
        this.#timeRangeSelectionAnnotation.bounds.range = Trace.Types.Timing.Micro(
            this.#timeRangeSelectionAnnotation.bounds.max - this.#timeRangeSelectionAnnotation.bounds.min,
        );
        ModificationsManager.activeManager()?.updateAnnotation(this.#timeRangeSelectionAnnotation);
        return true;
      }
      case 'ArrowDown': {
        if (!this.#timeRangeSelectionAnnotation) {
          return false;
        }
        this.#timeRangeSelectionAnnotation.bounds.min = Trace.Types.Timing.Micro(
            // Decrease the LHS, but make sure it cannot go beyond the minimum visible window.
            Math.max(this.#timeRangeSelectionAnnotation.bounds.min - timeRangeIncrementValue, visibleWindow.min),
        );
        this.#timeRangeSelectionAnnotation.bounds.range = Trace.Types.Timing.Micro(
            this.#timeRangeSelectionAnnotation.bounds.max - this.#timeRangeSelectionAnnotation.bounds.min,
        );
        ModificationsManager.activeManager()?.updateAnnotation(this.#timeRangeSelectionAnnotation);
        return true;
      }
      default: {
        // If we get any other key, we take that as a sign the user is done. Most likely the keys come from them typing into the label :)
        // If they do not type into the label, then the time range is not created.
        this.#timeRangeSelectionAnnotation = null;

        return false;
      }
    }
  }

  #keydownHandler(event: KeyboardEvent): void {
    const keyCombo = 'fixme';

    // `CREATION_NOT_STARTED` is only true in the state when both empty label and button to create connection are
    // created at the same time. If any key is typed in that state, it means that the label is in focus and the key
    // is typed into the label. This tells us that the user chose to create the
    // label, not the connection. In that case, delete the connection.
    if (this.#linkSelectionAnnotation &&
        this.#linkSelectionAnnotation.state === Trace.Types.File.EntriesLinkState.CREATION_NOT_STARTED) {
      this.#clearLinkSelectionAnnotation(true);
      // We have dealt with the keypress as the user is typing into the label, so do not let it propogate up.
      // This also ensures that if the user uses "Escape" they don't toggle the DevTools drawer.
      event.stopPropagation();
    }

    /**
     * If the user is in the middle of creating an entry link and hits Esc,
     * cancel and clear out the pending annotation.
     */
    if (event.key === 'Escape' && this.#linkSelectionAnnotation) {
      this.#clearLinkSelectionAnnotation(true);
      event.stopPropagation();
      event.preventDefault();
    }

    const eventHandledByKeyboardTimeRange = this.#handleTimeRangeKeyboardCreation(event);
    if (eventHandledByKeyboardTimeRange) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    if (event.key === keyCombo[this.#gameKeyMatches]) {
      this.#gameKeyMatches++;
      clearTimeout(this.#gameTimeout);
      this.#gameTimeout = setTimeout(() => {
        this.#gameKeyMatches = 0;
      }, 2000);
    } else {
      this.#gameKeyMatches = 0;
      clearTimeout(this.#gameTimeout);
    }
    if (this.#gameKeyMatches !== keyCombo.length) {
      return;
    }
    this.runBrickBreakerGame();
  }

  runBrickBreakerGame(): void {
    if (!SHOULD_SHOW_EASTER_EGG) {
      return;
    }
    if ([...this.element.childNodes].find(child => child instanceof PerfUI.BrickBreaker.BrickBreaker)) {
      return;
    }
    this.brickGame = new PerfUI.BrickBreaker.BrickBreaker(this.mainFlameChart);
    this.brickGame.classList.add('brick-game');
    this.element.append(this.brickGame);
  }

  #onTraceBoundsChange(event: TraceBounds.TraceBounds.StateChangedEvent): void {
    if (event.updateType === 'MINIMAP_BOUNDS') {
      // If the update type was a changing of the minimap bounds, we do not
      // need to redraw the timeline.
      return;
    }

    const visibleWindow = event.state.milli.timelineTraceWindow;

    // If the user has set a preference for reduced motion, we disable any animations.
    const userHasReducedMotionSet = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const shouldAnimate = Boolean(event.options.shouldAnimate) && !userHasReducedMotionSet;

    this.mainFlameChart.setWindowTimes(visibleWindow.min, visibleWindow.max, shouldAnimate);
    this.networkDataProvider.setWindowTimes(visibleWindow.min, visibleWindow.max);
    this.networkFlameChart.setWindowTimes(visibleWindow.min, visibleWindow.max, shouldAnimate);
    // Updating search results can be very expensive. Debounce to avoid over-calling it.
    const debouncedUpdate = Common.Debouncer.debounce(() => {
      this.updateSearchResults(false, false);
    }, 100);
    debouncedUpdate();
  }

  isNetworkTrackShownForTests(): boolean {
    return this.networkSplitWidget.showMode() !== UI.SplitWidget.ShowMode.ONLY_MAIN;
  }

  getLinkSelectionAnnotation(): Trace.Types.File.EntriesLinkAnnotation|null {
    return this.#linkSelectionAnnotation;
  }

  getMainDataProvider(): TimelineFlameChartDataProvider {
    return this.mainDataProvider;
  }

  getNetworkDataProvider(): TimelineFlameChartNetworkDataProvider {
    return this.networkDataProvider;
  }

  refreshMainFlameChart(): void {
    this.mainFlameChart.update();
  }

  windowChanged(windowStartTime: Trace.Types.Timing.Milli, windowEndTime: Trace.Types.Timing.Milli, animate: boolean):
      void {
    TraceBounds.TraceBounds.BoundsManager.instance().setTimelineVisibleWindow(
        Trace.Helpers.Timing.traceWindowFromMilliSeconds(
            Trace.Types.Timing.Milli(windowStartTime),
            Trace.Types.Timing.Milli(windowEndTime),
            ),
        {shouldAnimate: animate},
    );
  }

  /**
   * @param startTime - the start time of the selection in MilliSeconds
   * @param endTime - the end time of the selection in MilliSeconds
   * TODO(crbug.com/346312365): update the type definitions in ChartViewport.ts
   */
  updateRangeSelection(startTime: number, endTime: number): void {
    this.delegate.select(
        selectionFromRangeMilliSeconds(Trace.Types.Timing.Milli(startTime), Trace.Types.Timing.Milli(endTime)));

    // We need to check if the user is updating the range because they are
    // creating a time range annotation.
    const bounds = Trace.Helpers.Timing.traceWindowFromMilliSeconds(
        Trace.Types.Timing.Milli(startTime),
        Trace.Types.Timing.Milli(endTime),
    );

    // If the current time range annotation exists, the range selection
    // for it is in progress and we need to update its bounds.
    //
    // When the range selection is finished, the current range is set to null.
    // If the current selection is null, create a new time range annotations.
    if (this.#timeRangeSelectionAnnotation) {
      this.#timeRangeSelectionAnnotation.bounds = bounds;
      ModificationsManager.activeManager()?.updateAnnotation(this.#timeRangeSelectionAnnotation);
    } else {
      this.#timeRangeSelectionAnnotation = {
        type: 'TIME_RANGE',
        label: '',
        bounds,
      };
      // Before creating a new range, make sure to delete the empty ranges.
      ModificationsManager.activeManager()?.deleteEmptyRangeAnnotations();
      ModificationsManager.activeManager()?.createAnnotation(this.#timeRangeSelectionAnnotation);
    }
  }

  getMainFlameChart(): PerfUI.FlameChart.FlameChart {
    return this.mainFlameChart;
  }

  // This function is public for test purpose.
  getNetworkFlameChart(): PerfUI.FlameChart.FlameChart {
    return this.networkFlameChart;
  }

  updateSelectedGroup(flameChart: PerfUI.FlameChart.FlameChart, group: PerfUI.FlameChart.Group|null): void {
    if (flameChart !== this.mainFlameChart || this.#selectedGroupName === group?.name) {
      return;
    }
    this.#selectedGroupName = group?.name || null;
    this.#selectedEvents = group ? this.mainDataProvider.groupTreeEvents(group) : null;
    this.#updateDetailViews();
  }

  setModel(newParsedTrace: Trace.Handlers.Types.ParsedTrace, traceMetadata: Trace.Types.File.MetaData|null): void {
    if (newParsedTrace === this.#parsedTrace) {
      return;
    }

    this.#parsedTrace = newParsedTrace;
    this.#traceMetadata = traceMetadata;
    for (const dimmer of this.#flameChartDimmers) {
      dimmer.active = false;
      dimmer.mainChartIndices = [];
      dimmer.networkChartIndices = [];
    }
    this.rebuildDataForTrace();
  }

  /**
   * Resets the state of the UI data and initializes it again with the
   * current parsed trace.
   */
  rebuildDataForTrace(): void {
    if (!this.#parsedTrace) {
      return;
    }

    this.#selectedGroupName = null;
    Common.EventTarget.removeEventListeners(this.eventListeners);
    this.#selectedEvents = null;
    this.#entityMapper = new Utils.EntityMapper.EntityMapper(this.#parsedTrace);
    // order is important: |reset| needs to be called after the trace
    // model has been set in the data providers.
    this.mainDataProvider.setModel(this.#parsedTrace, this.#entityMapper);
    this.networkDataProvider.setModel(this.#parsedTrace, this.#entityMapper);
    this.reset();
    this.setupWindowTimes();
    this.updateSearchResults(false, false);
    this.refreshMainFlameChart();
    this.#updateFlameCharts();
    this.resizeToPreferredHeights();
    this.setMarkers(this.#parsedTrace);
    this.dimThirdPartiesIfRequired();
  }

  setInsights(
      insights: Trace.Insights.Types.TraceInsightSets|null,
      eventToRelatedInsightsMap: TimelineComponents.RelatedInsightChips.EventToRelatedInsightsMap): void {
    if (this.#traceInsightSets === insights) {
      return;
    }

    this.#traceInsightSets = insights;
    this.#eventToRelatedInsightsMap = eventToRelatedInsightsMap;
    // The DetailsView is provided with the InsightSets, so make sure we update it.
    this.#updateDetailViews();
  }

  reset(): void {
    if (this.networkDataProvider.isEmpty()) {
      this.mainFlameChart.enableRuler(true);
      this.networkSplitWidget.hideSidebar();
    } else {
      this.mainFlameChart.enableRuler(false);
      this.networkSplitWidget.showBoth();
      this.resizeToPreferredHeights();
    }
    this.#overlays.reset();
    this.mainFlameChart.reset();
    this.networkFlameChart.reset();
    this.updateSearchResults(false, false);
  }

  // TODO(paulirish): It's possible this is being called more than necessary. Attempt to clean up the lifecycle.
  setupWindowTimes(): void {
    const traceBoundsState = TraceBounds.TraceBounds.BoundsManager.instance().state();
    if (!traceBoundsState) {
      throw new Error('TimelineFlameChartView could not set the window bounds.');
    }
    const visibleWindow = traceBoundsState.milli.timelineTraceWindow;
    this.mainFlameChart.setWindowTimes(visibleWindow.min, visibleWindow.max);
    this.networkDataProvider.setWindowTimes(visibleWindow.min, visibleWindow.max);
    this.networkFlameChart.setWindowTimes(visibleWindow.min, visibleWindow.max);
  }

  #refreshAfterIgnoreList(): void {
    // The ignore list will only affect Thread tracks, which will only be in main flame chart.
    // So just force recalculate and redraw the main flame chart here.
    this.mainDataProvider.timelineData(true);
    this.mainFlameChart.scheduleUpdate();
  }

  #updateDetailViews(): void {
    this.countersView.setModel(this.#parsedTrace, this.#selectedEvents);
    void this.detailsView.setModel({
      parsedTrace: this.#parsedTrace,
      selectedEvents: this.#selectedEvents,
      traceInsightsSets: this.#traceInsightSets,
      eventToRelatedInsightsMap: this.#eventToRelatedInsightsMap,
      entityMapper: this.#entityMapper,
    });
  }

  #updateFlameCharts(): void {
    this.mainFlameChart.scheduleUpdate();
    this.networkFlameChart.scheduleUpdate();

    this.#registerLoggableGroups();
  }

  #registerLoggableGroups(): void {
    const groups = [
      ...this.mainFlameChart.timelineData()?.groups ?? [],
      ...this.networkFlameChart.timelineData()?.groups ?? [],
    ];
    for (const group of groups) {
      if (!group.jslogContext) {
        continue;
      }
      const loggable = this.#loggableForGroupByLogContext.get(group.jslogContext) ?? Symbol(group.jslogContext);

      if (!this.#loggableForGroupByLogContext.has(group.jslogContext)) {
        // This is the first time this group has been created, so register its loggable.
        this.#loggableForGroupByLogContext.set(group.jslogContext, loggable);
        VisualLogging.registerLoggable(
            loggable, `${VisualLogging.section().context(`timeline.${group.jslogContext}`)}`, this.delegate.element);
      }
    }
  }

  // If an entry is hovered over and a creation of link annotation is in progress, update that annotation with a hovered entry.
  updateLinkSelectionAnnotationWithToEntry(
      dataProvider: TimelineFlameChartDataProvider|TimelineFlameChartNetworkDataProvider, entryIndex: number): void {
    if (!this.#linkSelectionAnnotation ||
        this.#linkSelectionAnnotation.state === Trace.Types.File.EntriesLinkState.CREATION_NOT_STARTED) {
      return;
    }
    const toSelectionObject = this.#selectionIfTraceEvent(entryIndex, dataProvider);

    if (toSelectionObject) {
      // Prevent the user from creating a link that connects an entry to itself.
      if (toSelectionObject === this.#linkSelectionAnnotation.entryFrom) {
        return;
      }
      // Prevent the user from creating a link that connects an entry it's already connected to.
      const linkBetweenEntriesExists = ModificationsManager.activeManager()?.linkAnnotationBetweenEntriesExists(
          this.#linkSelectionAnnotation.entryFrom, toSelectionObject);
      if (linkBetweenEntriesExists) {
        return;
      }

      this.#linkSelectionAnnotation.state = Trace.Types.File.EntriesLinkState.CONNECTED;
      this.#linkSelectionAnnotation.entryTo = toSelectionObject;
    } else {
      this.#linkSelectionAnnotation.state = Trace.Types.File.EntriesLinkState.PENDING_TO_EVENT;
      delete this.#linkSelectionAnnotation['entryTo'];
    }
    ModificationsManager.activeManager()?.updateAnnotation(this.#linkSelectionAnnotation);
  }

  private onEntryHovered(commonEvent: Common.EventTarget.EventTargetEvent<number>): void {
    SDK.OverlayModel.OverlayModel.hideDOMNodeHighlight();
    const entryIndex = commonEvent.data;
    const event = this.mainDataProvider.eventByIndex(entryIndex);
    if (!event || !this.#parsedTrace) {
      return;
    }
    if (Trace.Types.Events.isLegacyTimelineFrame(event)) {
      return;
    }

    const target = targetForEvent(this.#parsedTrace, event);
    if (!target) {
      return;
    }

    const nodeIds = Trace.Extras.FetchNodes.nodeIdsForEvent(this.#parsedTrace, event);
    for (const nodeId of nodeIds) {
      new SDK.DOMModel.DeferredDOMNode(target, nodeId).highlight();
    }
  }

  highlightEvent(event: Trace.Types.Events.Event|null): void {
    const entryIndex = event ? this.mainDataProvider.entryIndexForSelection(selectionFromEvent(event)) : -1;
    if (entryIndex >= 0) {
      this.mainFlameChart.highlightEntry(entryIndex);
    } else {
      this.mainFlameChart.hideHighlight();
    }
  }

  override willHide(): void {
    this.networkFlameChartGroupExpansionSetting.removeChangeListener(this.resizeToPreferredHeights, this);
    Bindings.IgnoreListManager.IgnoreListManager.instance().removeChangeListener(this.#boundRefreshAfterIgnoreList);
  }

  override wasShown(): void {
    super.wasShown();
    this.networkFlameChartGroupExpansionSetting.addChangeListener(this.resizeToPreferredHeights, this);
    Bindings.IgnoreListManager.IgnoreListManager.instance().addChangeListener(this.#boundRefreshAfterIgnoreList);
    if (this.needsResizeToPreferredHeights) {
      this.resizeToPreferredHeights();
    }
    this.#updateFlameCharts();
  }

  updateCountersGraphToggle(showMemoryGraph: boolean): void {
    if (showMemoryGraph) {
      this.chartSplitWidget.showBoth();
    } else {
      this.chartSplitWidget.hideSidebar();
    }
  }

  revealEvent(event: Trace.Types.Events.Event): void {
    const mainIndex = this.mainDataProvider.indexForEvent(event);
    const networkIndex = this.networkDataProvider.indexForEvent(event);
    if (mainIndex !== null) {
      this.mainFlameChart.revealEntry(mainIndex);
    } else if (networkIndex !== null) {
      this.networkFlameChart.revealEntry(networkIndex);
    }
  }

  // Given an event, it reveals its position vertically
  revealEventVertically(event: Trace.Types.Events.Event): void {
    const mainIndex = this.mainDataProvider.indexForEvent(event);
    const networkIndex = this.networkDataProvider.indexForEvent(event);
    if (mainIndex !== null) {
      this.mainFlameChart.revealEntryVertically(mainIndex);
    } else if (networkIndex !== null) {
      this.networkFlameChart.revealEntryVertically(networkIndex);
    }
  }

  setSelectionAndReveal(selection: TimelineSelection|null): void {
    this.#currentSelection = selection;

    // Clear any existing entry selection.
    this.#overlays.removeOverlaysOfType('ENTRY_SELECTED');
    // If:
    // 1. There is no selection, or the selection is not a range selection
    // AND 2. we have an active time range selection overlay
    // AND 3. The label of the selection is empty
    // then we need to remove it.
    if ((selection === null || !selectionIsRange(selection)) && this.#timeRangeSelectionAnnotation &&
        !this.#timeRangeSelectionAnnotation.label) {
      ModificationsManager.activeManager()?.removeAnnotation(this.#timeRangeSelectionAnnotation);
      this.#timeRangeSelectionAnnotation = null;
    }

    // Check if this is an entry from main flame chart or network flame chart.
    // If so build the initiators and select the entry.
    // Otherwise clear the initiators and the selection.
    //   - This is done by the same functions, when the index is -1, it will clear everything.
    const mainIndex = this.mainDataProvider.entryIndexForSelection(selection);
    this.mainDataProvider.buildFlowForInitiator(mainIndex);
    this.mainFlameChart.setSelectedEntry(mainIndex);
    const networkIndex = this.networkDataProvider.entryIndexForSelection(selection);
    this.networkDataProvider.buildFlowForInitiator(networkIndex);
    this.networkFlameChart.setSelectedEntry(networkIndex);

    if (this.detailsView) {
      // TODO(crbug.com/1459265):  Change to await after migration work.
      void this.detailsView.setSelection(selection);
    }

    // Create the entry selected overlay if the selection represents a trace event
    if (selectionIsEvent(selection)) {
      this.addOverlay({
        type: 'ENTRY_SELECTED',
        entry: selection.event,
      });
    }

    if (this.#linkSelectionAnnotation &&
        this.#linkSelectionAnnotation.state === Trace.Types.File.EntriesLinkState.CREATION_NOT_STARTED) {
      this.#clearLinkSelectionAnnotation(true);
    }

    // If the user has selected an event which the Performance AI Assistance
    // supports (currently, only main thread events), then set the context's
    // "flavor" to be the AI Call Tree of the active event.
    // This is listened to by the AI Assistance panel to update its state.
    // Note that we do not change the Context back to `null` if the user picks
    // an invalid event - we don't want to reset it back as it may be they are
    // clicking around in order to understand something.
    if (selectionIsEvent(selection) && this.#parsedTrace) {
      const aiCallTree = Utils.AICallTree.AICallTree.fromEvent(selection.event, this.#parsedTrace);
      if (aiCallTree) {
        UI.Context.Context.instance().setFlavor(Utils.AICallTree.AICallTree, aiCallTree);
      }
    }
  }

  // Only opens the details view of a selection. This is used for Timing Markers. Timing markers replace
  // their entry with a new UI. Becuase of that, thier entries can no longer be "selected" in the timings track,
  // so if clicked, we only open their details view.
  openSelectionDetailsView(selection: TimelineSelection|null): void {
    if (this.detailsView) {
      void this.detailsView.setSelection(selection);
    }
  }

  /**
   * Used to create multiple overlays at once without triggering a redraw for each one.
   */
  bulkAddOverlays(overlays: Overlays.Overlays.TimelineOverlay[]): void {
    for (const overlay of overlays) {
      this.#overlays.add(overlay);
    }
    void this.#overlays.update();
  }

  addOverlay<T extends Overlays.Overlays.TimelineOverlay>(newOverlay: T): T {
    const overlay = this.#overlays.add(newOverlay);
    void this.#overlays.update();
    return overlay;
  }

  bulkRemoveOverlays(overlays: Overlays.Overlays.TimelineOverlay[]): void {
    if (!overlays.length) {
      return;
    }

    for (const overlay of overlays) {
      this.#overlays.remove(overlay);
    }
    void this.#overlays.update();
  }

  removeOverlay(removedOverlay: Overlays.Overlays.TimelineOverlay): void {
    this.#overlays.remove(removedOverlay);
    void this.#overlays.update();
  }

  updateExistingOverlay<T extends Overlays.Overlays.TimelineOverlay>(existingOverlay: T, newData: Partial<T>): void {
    this.#overlays.updateExisting(existingOverlay, newData);
    void this.#overlays.update();
  }

  enterLabelEditMode(overlay: Overlays.Overlays.EntryLabel): void {
    this.#overlays.enterLabelEditMode(overlay);
  }

  private onAddEntryLabelAnnotation(
      dataProvider: TimelineFlameChartDataProvider|TimelineFlameChartNetworkDataProvider,
      event: Common.EventTarget.EventTargetEvent<{entryIndex: number, withLinkCreationButton: boolean}>): void {
    const selection = dataProvider.createSelection(event.data.entryIndex);
    if (selectionIsEvent(selection)) {
      this.setSelectionAndReveal(selection);
      ModificationsManager.activeManager()?.createAnnotation({
        type: 'ENTRY_LABEL',
        entry: selection.event,
        label: '',
      });
      if (event.data.withLinkCreationButton) {
        this.onEntriesLinkAnnotationCreate(dataProvider, event.data.entryIndex, true);
      }
    }
  }

  onEntriesLinkAnnotationCreate(
      dataProvider: TimelineFlameChartDataProvider|TimelineFlameChartNetworkDataProvider, entryFromIndex: number,
      linkCreateButton?: boolean): void {
    const fromSelectionObject = (entryFromIndex) ? this.#selectionIfTraceEvent(entryFromIndex, dataProvider) : null;

    if (fromSelectionObject) {
      this.#setLinkSelectionAnnotation({
        type: 'ENTRIES_LINK',
        entryFrom: fromSelectionObject,
        state: (linkCreateButton) ? Trace.Types.File.EntriesLinkState.CREATION_NOT_STARTED :
                                    Trace.Types.File.EntriesLinkState.PENDING_TO_EVENT,
      });
      if (this.#linkSelectionAnnotation) {
        ModificationsManager.activeManager()?.createAnnotation(this.#linkSelectionAnnotation);
      }
    }
  }

  #selectionIfTraceEvent(
      index: number, dataProvider: TimelineFlameChartDataProvider|TimelineFlameChartNetworkDataProvider):
      Trace.Types.Events.Event|null {
    const selection = dataProvider.createSelection(index);
    return selectionIsEvent(selection) ? selection.event : null;
  }

  /**
   * Called when the user either:
   * 1. clicks with their mouse on an entry
   * 2. Uses the keyboard and presses "enter" whilst an entry is selected
   */
  #onEntryInvoked(
      dataProvider: TimelineFlameChartDataProvider|TimelineFlameChartNetworkDataProvider,
      event: Common.EventTarget.EventTargetEvent<number>): void {
    this.#updateSelectedEntryStatus(dataProvider, event);

    const entryIndex = event.data;
    // If we have a pending link connection, create it if we can now the final entry has been pressed.
    if (this.#linkSelectionAnnotation) {
      this.handleToEntryOfLinkBetweenEntriesSelection(entryIndex);
    }
  }

  #updateSelectedEntryStatus(
      dataProvider: TimelineFlameChartDataProvider|TimelineFlameChartNetworkDataProvider,
      event: Common.EventTarget.EventTargetEvent<number>): void {
    const data = dataProvider.timelineData();
    if (!data) {
      return;
    }
    const entryIndex = event.data;

    const entryLevel = data.entryLevels[entryIndex];

    // Find the group that contains this level and log a click for it.
    const group = groupForLevel(data.groups, entryLevel);
    if (group?.jslogContext) {
      const loggable = this.#loggableForGroupByLogContext.get(group.jslogContext) ?? null;
      if (loggable) {
        VisualLogging.logClick(loggable, new MouseEvent('click'));
      }
    }

    dataProvider.buildFlowForInitiator(entryIndex);
    this.delegate.select(dataProvider.createSelection(entryIndex));
  }

  /**
   * This is invoked when the user uses their KEYBOARD ONLY to navigate between
   * events.
   * It IS NOT called when the user uses the mouse. See `onEntryInvoked`.
   */
  private onEntrySelected(
      dataProvider: TimelineFlameChartDataProvider|TimelineFlameChartNetworkDataProvider,
      event: Common.EventTarget.EventTargetEvent<number>): void {
    this.#updateSelectedEntryStatus(dataProvider, event);

    // Update any pending link selection to point the entryTo to what the user has selected.
    const entryIndex = event.data;
    const toSelectionObject = this.#selectionIfTraceEvent(entryIndex, dataProvider);
    if (toSelectionObject && toSelectionObject !== this.#linkSelectionAnnotation?.entryTo) {
      this.updateLinkSelectionAnnotationWithToEntry(dataProvider, entryIndex);
    }
  }

  handleToEntryOfLinkBetweenEntriesSelection(toIndex: number): void {
    // If there is a link annotation in the process of being created when an empty
    // space in the Flamechart is clicked, delete the link being created.
    //
    // If an entry is clicked when a link between entries in created and the entry that an arrow
    // is pointing to is earlier than the one it starts from, switch 'to' and 'from' entries to
    // reverse the arrow.
    if (this.#linkSelectionAnnotation && toIndex === -1) {
      ModificationsManager.activeManager()?.removeAnnotation(this.#linkSelectionAnnotation);
    } else if (
        this.#linkSelectionAnnotation && this.#linkSelectionAnnotation?.entryTo &&
        (this.#linkSelectionAnnotation?.entryFrom.ts > this.#linkSelectionAnnotation?.entryTo.ts)) {
      const entryFrom = this.#linkSelectionAnnotation.entryFrom;
      const entryTo = this.#linkSelectionAnnotation.entryTo;
      this.#linkSelectionAnnotation.entryTo = entryFrom;
      this.#linkSelectionAnnotation.entryFrom = entryTo;
      ModificationsManager.activeManager()?.updateAnnotation(this.#linkSelectionAnnotation);
    }
    // Regardless of if the link in progress was deleted or the clicked entry is the final selection,
    // set the link selection in progress to null so a new one is created if the an event to create
    // of update the current link is dispatched.
    this.#clearLinkSelectionAnnotation(false);
  }

  resizeToPreferredHeights(): void {
    if (!this.isShowing()) {
      this.needsResizeToPreferredHeights = true;
      return;
    }
    this.needsResizeToPreferredHeights = false;
    this.networkPane.element.classList.toggle(
        'timeline-network-resizer-disabled', !this.networkDataProvider.isExpanded());
    this.networkSplitWidget.setSidebarSize(
        this.networkDataProvider.preferredHeight() + this.splitResizer.clientHeight + PerfUI.FlameChart.RulerHeight +
        2);
  }

  setSearchableView(searchableView: UI.SearchableView.SearchableView): void {
    this.searchableView = searchableView;
  }

  // UI.SearchableView.Searchable implementation

  searchResultIndexForEntryIndex(index: number): number {
    if (!this.searchResults) {
      return -1;
    }
    return this.searchResults.findIndex(result => result.index === index);
  }

  jumpToNextSearchResult(): void {
    if (!this.searchResults?.length) {
      return;
    }
    const index =
        typeof this.selectedSearchResult !== 'undefined' ? this.searchResults.indexOf(this.selectedSearchResult) : -1;
    this.#selectSearchResult(Platform.NumberUtilities.mod(index + 1, this.searchResults.length));
  }

  jumpToPreviousSearchResult(): void {
    if (!this.searchResults?.length) {
      return;
    }
    const index =
        typeof this.selectedSearchResult !== 'undefined' ? this.searchResults.indexOf(this.selectedSearchResult) : 0;
    this.#selectSearchResult(Platform.NumberUtilities.mod(index - 1, this.searchResults.length));
  }

  supportsCaseSensitiveSearch(): boolean {
    return true;
  }

  supportsRegexSearch(): boolean {
    return true;
  }

  #selectSearchResult(searchResultIndex: number): void {
    this.searchableView.updateCurrentMatchIndex(searchResultIndex);
    const matchedResult = this.searchResults?.at(searchResultIndex) ?? null;
    if (!matchedResult) {
      return;
    }

    switch (matchedResult.provider) {
      case 'main': {
        this.delegate.select(this.mainDataProvider.createSelection(matchedResult.index));
        this.mainFlameChart.showPopoverForSearchResult(matchedResult.index);
        break;
      }
      case 'network': {
        this.delegate.select(this.networkDataProvider.createSelection(matchedResult.index));
        this.networkFlameChart.showPopoverForSearchResult(matchedResult.index);
        break;
      }
      case 'other':
        // TimelineFlameChartView only has main/network so we can ignore.
        break;
      default:
        Platform.assertNever(matchedResult.provider, `Unknown SearchResult[provider]: ${matchedResult.provider}`);
    }
    this.selectedSearchResult = matchedResult;
  }

  private updateSearchResults(shouldJump: boolean, jumpBackwards?: boolean): void {
    const traceBoundsState = TraceBounds.TraceBounds.BoundsManager.instance().state();
    if (!traceBoundsState) {
      return;
    }

    const oldSelectedSearchResult = this.selectedSearchResult;
    delete this.selectedSearchResult;
    this.searchResults = [];
    if (!this.searchRegex) {
      return;
    }

    const regExpFilter = new TimelineRegExp(this.searchRegex);
    const visibleWindow = traceBoundsState.micro.timelineTraceWindow;

    /**
     * Get the matches for the user's search result. We search both providers
     * but before storing the results we need to "tag" the results with the
     * provider they came from. We do this so that when the user highlights a
     * search result we know which flame chart to talk to to highlight it.
     */
    const mainMatches = this.mainDataProvider.search(visibleWindow, regExpFilter);
    const networkMatches = this.networkDataProvider.search(visibleWindow, regExpFilter);

    // Merge both result sets into one, sorted by start time. This means as the
    // user navigates back/forwards they will do so in time order and not do
    // all the main results before the network results, or some other
    // unexpected ordering.
    this.searchResults = mainMatches.concat(networkMatches).sort((m1, m2) => {
      return m1.startTimeMilli - m2.startTimeMilli;
    });

    this.searchableView.updateSearchMatchesCount(this.searchResults.length);

    if (Root.Runtime.experiments.isEnabled(Root.Runtime.ExperimentName.TIMELINE_DIM_UNRELATED_EVENTS)) {
      this.#updateFlameChartDimmerWithIndices(
          this.#searchDimmer, mainMatches.map(m => m.index), networkMatches.map(m => m.index));
    }

    if (!shouldJump || !this.searchResults.length) {
      return;
    }

    let selectedIndex = this.#indexOfSearchResult(oldSelectedSearchResult);
    if (selectedIndex === -1) {
      selectedIndex = jumpBackwards ? this.searchResults.length - 1 : 0;
    }
    this.#selectSearchResult(selectedIndex);
  }

  #indexOfSearchResult(target?: PerfUI.FlameChart.DataProviderSearchResult): number {
    if (!target) {
      return -1;
    }

    return this.searchResults?.findIndex(result => {
      return result.provider === target.provider && result.index === target.index;
    }) ??
        -1;
  }

  /**
   * Returns the indexes of the elements that matched the most recent
   * query. Elements are indexed by the data provider and correspond
   * to their position in the data provider entry data array.
   * Public only for tests.
   */
  getSearchResults(): PerfUI.FlameChart.DataProviderSearchResult[]|undefined {
    return this.searchResults;
  }

  onSearchCanceled(): void {
    if (typeof this.selectedSearchResult !== 'undefined') {
      this.delegate.select(null);
    }
    delete this.searchResults;
    delete this.selectedSearchResult;
    delete this.searchRegex;
    this.mainFlameChart.showPopoverForSearchResult(null);
    this.networkFlameChart.showPopoverForSearchResult(null);
    this.#updateFlameChartDimmerWithEvents(this.#searchDimmer, null);
  }

  performSearch(searchConfig: UI.SearchableView.SearchConfig, shouldJump: boolean, jumpBackwards?: boolean): void {
    this.searchRegex = searchConfig.toSearchRegex().regex;
    this.updateSearchResults(shouldJump, jumpBackwards);
  }

  togglePopover({event, show}: {event: Trace.Types.Events.Event, show: boolean}): void {
    const entryIndex = this.mainDataProvider.indexForEvent(event);
    if (show && entryIndex) {
      this.mainFlameChart.setSelectedEntry(entryIndex);
      this.mainFlameChart.showPopoverForSearchResult(entryIndex);
    } else {
      this.mainFlameChart.hideHighlight();
    }
  }

  overlays(): Overlays.Overlays.Overlays {
    return this.#overlays;
  }

  selectDetailsViewTab(tabName: Tab, node: Trace.Extras.TraceTree.Node|null): void {
    this.detailsView.selectTab(tabName, node);
  }
}

export class Selection {
  timelineSelection: TimelineSelection;
  entryIndex: number;
  constructor(selection: TimelineSelection, entryIndex: number) {
    this.timelineSelection = selection;
    this.entryIndex = entryIndex;
  }
}

export const FlameChartStyle = {
  textColor: '#333',
};

export class TimelineFlameChartMarker implements PerfUI.FlameChart.FlameChartMarker {
  private readonly startTimeInternal: number;
  private readonly startOffset: number;
  private style: TimelineMarkerStyle;
  constructor(startTime: number, startOffset: number, style: TimelineMarkerStyle) {
    this.startTimeInternal = startTime;
    this.startOffset = startOffset;
    this.style = style;
  }

  startTime(): number {
    return this.startTimeInternal;
  }

  color(): string {
    return this.style.color;
  }

  title(): string|null {
    if (this.style.lowPriority) {
      return null;
    }
    const startTime = i18n.TimeUtilities.millisToString(this.startOffset);
    return i18nString(UIStrings.sAtS, {PH1: this.style.title, PH2: startTime});
  }

  draw(context: CanvasRenderingContext2D, x: number, height: number, pixelsPerMillisecond: number): void {
    const lowPriorityVisibilityThresholdInPixelsPerMs = 4;

    if (this.style.lowPriority && pixelsPerMillisecond < lowPriorityVisibilityThresholdInPixelsPerMs) {
      return;
    }

    if (!this.style.tall) {
      return;
    }

    context.save();

    context.strokeStyle = this.style.color;
    context.lineWidth = this.style.lineWidth;
    context.translate(this.style.lineWidth < 1 || (this.style.lineWidth & 1) ? 0.5 : 0, 0.5);
    context.beginPath();
    context.moveTo(x, 0);
    context.setLineDash(this.style.dashStyle);
    context.lineTo(x, context.canvas.height);
    context.stroke();

    context.restore();
  }
}

export const enum ColorBy {
  URL = 'URL',
}

/**
 * Find the Group that contains the provided level, or `null` if no group is
 * found.
 */
export function groupForLevel(groups: PerfUI.FlameChart.Group[], level: number): PerfUI.FlameChart.Group|null {
  const groupForLevel = groups.find((group, groupIndex) => {
    const nextGroup = groups.at(groupIndex + 1);
    const groupEndLevel = nextGroup ? nextGroup.startLevel - 1 : Infinity;

    return group.startLevel <= level && groupEndLevel >= level;
  });
  return groupForLevel ?? null;
}

export const enum Events {
  ENTRY_LABEL_ANNOTATION_CLICKED = 'EntryLabelAnnotationClicked',
}
export interface EventTypes {
  [Events.ENTRY_LABEL_ANNOTATION_CLICKED]: {
    entry: Trace.Types.Events.Event,
  };
}

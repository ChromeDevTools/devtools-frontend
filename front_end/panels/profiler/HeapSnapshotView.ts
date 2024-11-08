/*
 * Copyright (C) 2011 Google Inc. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as Root from '../../core/root/root.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import * as Bindings from '../../models/bindings/bindings.js';
import * as HeapSnapshotModel from '../../models/heap_snapshot_model/heap_snapshot_model.js';
import * as DataGrid from '../../ui/legacy/components/data_grid/data_grid.js';
import * as ObjectUI from '../../ui/legacy/components/object_ui/object_ui.js';
import * as PerfUI from '../../ui/legacy/components/perf_ui/perf_ui.js';
import * as Components from '../../ui/legacy/components/utils/utils.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import {
  AllocationDataGrid,
  HeapSnapshotConstructorsDataGrid,
  HeapSnapshotContainmentDataGrid,
  HeapSnapshotDiffDataGrid,
  HeapSnapshotRetainmentDataGrid,
  type HeapSnapshotSortableDataGrid,
  HeapSnapshotSortableDataGridEvents,
} from './HeapSnapshotDataGrids.js';
import {
  type AllocationGridNode,
  HeapSnapshotGenericObjectNode,
  type HeapSnapshotGridNode,
} from './HeapSnapshotGridNodes.js';
import {type HeapSnapshotProxy, HeapSnapshotWorkerProxy} from './HeapSnapshotProxy.js';
import {Events, HeapTimelineOverview, type IdsRangeChangedEvent, Samples} from './HeapTimelineOverview.js';
import * as ModuleUIStrings from './ModuleUIStrings.js';
import {
  type DataDisplayDelegate,
  Events as ProfileHeaderEvents,
  ProfileEvents as ProfileTypeEvents,
  ProfileHeader,
  ProfileType,
} from './ProfileHeader.js';
import {ProfileSidebarTreeElement} from './ProfileSidebarTreeElement.js';
import {instance} from './ProfileTypeRegistry.js';

const UIStrings = {
  /**
   *@description Text to find an item
   */
  find: 'Find',
  /**
   *@description Text in Heap Snapshot View of a profiler tool
   */
  containment: 'Containment',
  /**
   *@description Retaining paths title text content in Heap Snapshot View of a profiler tool
   */
  retainers: 'Retainers',
  /**
   *@description Text in Heap Snapshot View of a profiler tool
   */
  allocationStack: 'Allocation stack',
  /**
   *@description Screen reader label for a select box that chooses the perspective in the Memory panel when vieweing a Heap Snapshot
   */
  perspective: 'Perspective',
  /**
   *@description Screen reader label for a select box that chooses the snapshot to use as a base in the Memory panel when vieweing a Heap Snapshot
   */
  baseSnapshot: 'Base snapshot',
  /**
   *@description Text to filter result items
   */
  filter: 'Filter',
  /**
   *@description Placeholder text in the filter bar to filter by JavaScript class names for a heap
   */
  filterByClass: 'Filter by class',
  /**
   *@description Text in Heap Snapshot View of a profiler tool
   */
  code: 'Code',
  /**
   *@description Text in Heap Snapshot View of a profiler tool
   */
  strings: 'Strings',
  /**
   *@description Label on a pie chart in the statistics view for the Heap Snapshot tool
   */
  jsArrays: 'JS arrays',
  /**
   *@description Label on a pie chart in the statistics view for the Heap Snapshot tool
   */
  typedArrays: 'Typed arrays',
  /**
   *@description Label on a pie chart in the statistics view for the Heap Snapshot tool
   */
  systemObjects: 'System objects',
  /**
   *@description The reported total size used in the selected time frame of the allocation sampling profile
   *@example {3 MB} PH1
   */
  selectedSizeS: 'Selected size: {PH1}',
  /**
   *@description Text in Heap Snapshot View of a profiler tool
   */
  allObjects: 'All objects',
  /**
   *@description Title in Heap Snapshot View of a profiler tool
   *@example {Profile 2} PH1
   */
  objectsAllocatedBeforeS: 'Objects allocated before {PH1}',
  /**
   *@description Title in Heap Snapshot View of a profiler tool
   *@example {Profile 1} PH1
   *@example {Profile 2} PH2
   */
  objectsAllocatedBetweenSAndS: 'Objects allocated between {PH1} and {PH2}',
  /**
   *@description An option which will filter the heap snapshot to show only
   * strings which exactly match at least one other string
   */
  duplicatedStrings: 'Duplicated strings',
  /**
   *@description An option which will filter the heap snapshot to show only
   * detached DOM nodes and other objects kept alive by detached DOM nodes
   */
  objectsRetainedByDetachedDomNodes: 'Objects retained by detached DOM nodes',
  /**
   *@description An option which will filter the heap snapshot to show only
   * objects kept alive by the DevTools console
   */
  objectsRetainedByConsole: 'Objects retained by DevTools Console',
  /**
   *@description Text for the summary view
   */
  summary: 'Summary',
  /**
   *@description Text in Heap Snapshot View of a profiler tool
   */
  comparison: 'Comparison',
  /**
   *@description Text in Heap Snapshot View of a profiler tool
   */
  allocation: 'Allocation',
  /**
   *@description Title text content in Heap Snapshot View of a profiler tool
   */
  liveObjects: 'Live objects',
  /**
   *@description Text in Heap Snapshot View of a profiler tool
   */
  statistics: 'Statistics',
  /**
   *@description Text in Heap Snapshot View of a profiler tool
   */
  heapSnapshot: 'Heap snapshot',
  /**
   *@description Text in Heap Snapshot View of a profiler tool
   */
  takeHeapSnapshot: 'Take heap snapshot',
  /**
   *@description Text in Heap Snapshot View of a profiler tool
   */
  heapSnapshots: 'Heap snapshots',
  /**
   *@description Text in Heap Snapshot View of a profiler tool
   */
  heapSnapshotProfilesShowMemory: 'See the memory distribution of JavaScript objects and related DOM nodes',
  /**
   *@description Label for a checkbox in the heap snapshot view of the profiler tool. The "heap snapshot" contains the
   * current state of JavaScript memory. With this checkbox enabled, the snapshot also includes internal data that is
   * specific to Chrome (hence implementation-specific).
   */
  exposeInternals: 'Internals with implementation details',
  /**
   *@description Progress update that the profiler is capturing a snapshot of the heap
   */
  snapshotting: 'Snapshotting…',
  /**
   *@description Profile title in Heap Snapshot View of a profiler tool
   *@example {1} PH1
   */
  snapshotD: 'Snapshot {PH1}',
  /**
   *@description Text for a percentage value
   *@example {13.0} PH1
   */
  percentagePlaceholder: '{PH1}%',
  /**
   *@description Text in Heap Snapshot View of a profiler tool
   */
  allocationInstrumentationOn: 'Allocations on timeline',
  /**
   *@description Text in Heap Snapshot View of a profiler tool
   */
  stopRecordingHeapProfile: 'Stop recording heap profile',
  /**
   *@description Text in Heap Snapshot View of a profiler tool
   */
  startRecordingHeapProfile: 'Start recording heap profile',
  /**
   *@description Text in Heap Snapshot View of a profiler tool.
   * A stack trace is a list of functions that were called.
   * This option turns on recording of a stack trace at each allocation.
   * The recording itself is a somewhat expensive operation, so turning this option on, the website's performance may be affected negatively (e.g. everything becomes slower).
   */
  recordAllocationStacksExtra: 'Allocation stack traces (more overhead)',
  /**
   *@description Text in CPUProfile View of a profiler tool
   */
  recording: 'Recording…',
  /**
   *@description Text in Heap Snapshot View of a profiler tool
   */
  allocationTimelines: 'Allocation timelines',
  /**
   *@description Description for the 'Allocation timeline' tool in the Memory panel.
   */
  AllocationTimelinesShowInstrumented:
      'Record memory allocations over time and isolate memory leaks by selecting intervals with allocations that are still alive',
  /**
   *@description Text when something is loading
   */
  loading: 'Loading…',
  /**
   *@description Text in Heap Snapshot View of a profiler tool
   *@example {30} PH1
   */
  savingD: 'Saving… {PH1}%',
  /**
   *@description Text in Heap Snapshot View of a profiler tool
   */
  heapMemoryUsage: 'Heap memory usage',
  /**
   *@description Text of a DOM element in Heap Snapshot View of a profiler tool
   */
  stackWasNotRecordedForThisObject:
      'Stack wasn\'t recorded for this object because it had been allocated before this profile recording started.',
  /**
   *@description Text in Heap Snapshot View of a profiler tool.
   * This text is on a button to undo all previous "Ignore this retainer" actions.
   */
  restoreIgnoredRetainers: 'Restore ignored retainers',
};
const str_ = i18n.i18n.registerUIStrings('panels/profiler/HeapSnapshotView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

// The way this is handled is to workaround the strings inside the heap_snapshot_worker
// If strings are removed from inside the worker strings can be declared in this module
// as any other.
// eslint-disable-next-line @typescript-eslint/naming-convention
const moduleUIstr_ = i18n.i18n.registerUIStrings('panels/profiler/ModuleUIStrings.ts', ModuleUIStrings.UIStrings);
const moduleI18nString = i18n.i18n.getLocalizedString.bind(undefined, moduleUIstr_);
export class HeapSnapshotView extends UI.View.SimpleView implements DataDisplayDelegate, UI.SearchableView.Searchable {
  searchResults: number[];
  profile: HeapProfileHeader;
  readonly linkifier: Components.Linkifier.Linkifier;
  readonly parentDataDisplayDelegate: DataDisplayDelegate;
  readonly searchableViewInternal: UI.SearchableView.SearchableView;
  readonly splitWidget: UI.SplitWidget.SplitWidget;
  readonly containmentDataGrid: HeapSnapshotContainmentDataGrid;
  readonly containmentWidget: DataGrid.DataGrid.DataGridWidget<HeapSnapshotGridNode>;
  readonly statisticsView: HeapSnapshotStatisticsView;
  readonly constructorsDataGrid: HeapSnapshotConstructorsDataGrid;
  readonly constructorsWidget: DataGrid.DataGrid.DataGridWidget<HeapSnapshotGridNode>;
  readonly diffDataGrid: HeapSnapshotDiffDataGrid;
  readonly diffWidget: DataGrid.DataGrid.DataGridWidget<HeapSnapshotGridNode>;
  readonly allocationDataGrid: AllocationDataGrid|null;
  readonly allocationWidget: DataGrid.DataGrid.DataGridWidget<HeapSnapshotGridNode>|undefined;
  readonly allocationStackView: HeapAllocationStackView|undefined;
  readonly tabbedPane: UI.TabbedPane.TabbedPane|undefined;
  readonly retainmentDataGrid: HeapSnapshotRetainmentDataGrid;
  readonly retainmentWidget: DataGrid.DataGrid.DataGridWidget<HeapSnapshotGridNode>;
  readonly objectDetailsView: UI.Widget.VBox;
  readonly perspectives: (SummaryPerspective|ComparisonPerspective|ContainmentPerspective|AllocationPerspective|
                          StatisticsPerspective)[];
  readonly comparisonPerspective: ComparisonPerspective;
  readonly perspectiveSelect: UI.Toolbar.ToolbarComboBox;
  baseSelect: UI.Toolbar.ToolbarComboBox;
  readonly filterSelect: UI.Toolbar.ToolbarComboBox;
  readonly classNameFilter: UI.Toolbar.ToolbarInput;
  readonly selectedSizeText: UI.Toolbar.ToolbarText;
  readonly resetRetainersButton: UI.Toolbar.ToolbarButton;
  readonly popoverHelper: UI.PopoverHelper.PopoverHelper;
  currentPerspectiveIndex: number;
  currentPerspective: SummaryPerspective|ComparisonPerspective|ContainmentPerspective|AllocationPerspective|
      StatisticsPerspective;
  dataGrid: HeapSnapshotSortableDataGrid|null;
  readonly searchThrottler: Common.Throttler.Throttler;
  baseProfile!: HeapProfileHeader|null;
  trackingOverviewGrid?: HeapTimelineOverview;
  currentSearchResultIndex: number = -1;
  currentQuery?: HeapSnapshotModel.HeapSnapshotModel.SearchConfig;
  constructor(dataDisplayDelegate: DataDisplayDelegate, profile: HeapProfileHeader) {
    super(i18nString(UIStrings.heapSnapshot));

    this.searchResults = [];

    this.element.classList.add('heap-snapshot-view');
    this.profile = profile;
    this.linkifier = new Components.Linkifier.Linkifier();
    const profileType = profile.profileType();

    profileType.addEventListener(HeapSnapshotProfileTypeEvents.SNAPSHOT_RECEIVED, this.onReceiveSnapshot, this);
    profileType.addEventListener(ProfileTypeEvents.REMOVE_PROFILE_HEADER, this.onProfileHeaderRemoved, this);

    const isHeapTimeline = profileType.id === TrackingHeapSnapshotProfileType.TypeId;
    if (isHeapTimeline) {
      this.createOverview();
    }
    const hasAllocationStacks = instance.trackingHeapSnapshotProfileType.recordAllocationStacksSetting().get();

    this.parentDataDisplayDelegate = dataDisplayDelegate;

    this.searchableViewInternal = new UI.SearchableView.SearchableView(this, null);
    this.searchableViewInternal.setPlaceholder(i18nString(UIStrings.find), i18nString(UIStrings.find));
    this.searchableViewInternal.show(this.element);

    this.splitWidget = new UI.SplitWidget.SplitWidget(false, true, 'heap-snapshot-split-view-state', 200, 200);
    this.splitWidget.show(this.searchableViewInternal.element);

    const heapProfilerModel = profile.heapProfilerModel();
    this.containmentDataGrid = new HeapSnapshotContainmentDataGrid(
        heapProfilerModel, this, /* displayName */ i18nString(UIStrings.containment));
    this.containmentDataGrid.addEventListener(DataGrid.DataGrid.Events.SELECTED_NODE, this.selectionChanged, this);
    this.containmentWidget = this.containmentDataGrid.asWidget();
    this.containmentWidget.setMinimumSize(50, 25);

    this.statisticsView = new HeapSnapshotStatisticsView();

    this.constructorsDataGrid = new HeapSnapshotConstructorsDataGrid(heapProfilerModel, this);
    this.constructorsDataGrid.addEventListener(DataGrid.DataGrid.Events.SELECTED_NODE, this.selectionChanged, this);
    this.constructorsWidget = this.constructorsDataGrid.asWidget();
    this.constructorsWidget.setMinimumSize(50, 25);
    this.constructorsWidget.element.setAttribute(
        'jslog', `${VisualLogging.pane('heap-snapshot.constructors-view').track({resize: true})}`);

    this.diffDataGrid = new HeapSnapshotDiffDataGrid(heapProfilerModel, this);
    this.diffDataGrid.addEventListener(DataGrid.DataGrid.Events.SELECTED_NODE, this.selectionChanged, this);
    this.diffWidget = this.diffDataGrid.asWidget();
    this.diffWidget.setMinimumSize(50, 25);

    this.allocationDataGrid = null;

    if (isHeapTimeline && hasAllocationStacks) {
      this.allocationDataGrid = new AllocationDataGrid(heapProfilerModel, this);
      this.allocationDataGrid.addEventListener(
          DataGrid.DataGrid.Events.SELECTED_NODE, this.onSelectAllocationNode, this);
      this.allocationWidget = this.allocationDataGrid.asWidget();
      this.allocationWidget.setMinimumSize(50, 25);

      this.allocationStackView = new HeapAllocationStackView(heapProfilerModel);
      this.allocationStackView.setMinimumSize(50, 25);

      this.tabbedPane = new UI.TabbedPane.TabbedPane();
    }

    this.retainmentDataGrid = new HeapSnapshotRetainmentDataGrid(heapProfilerModel, this);
    this.retainmentWidget = this.retainmentDataGrid.asWidget();
    this.retainmentWidget.setMinimumSize(50, 21);
    this.retainmentWidget.element.classList.add('retaining-paths-view');
    this.retainmentWidget.element.setAttribute(
        'jslog', `${VisualLogging.pane('heap-snapshot.retaining-paths-view').track({resize: true})}`);

    let splitWidgetResizer;
    if (this.allocationStackView) {
      this.tabbedPane = new UI.TabbedPane.TabbedPane();

      this.tabbedPane.appendTab('retainers', i18nString(UIStrings.retainers), this.retainmentWidget);
      this.tabbedPane.appendTab('allocation-stack', i18nString(UIStrings.allocationStack), this.allocationStackView);

      splitWidgetResizer = this.tabbedPane.headerElement();
      this.objectDetailsView = this.tabbedPane;
    } else {
      const retainmentViewHeader = document.createElement('div');
      retainmentViewHeader.classList.add('heap-snapshot-view-resizer');
      const retainingPathsTitleDiv = retainmentViewHeader.createChild('div', 'title');
      retainmentViewHeader.createChild('div', 'verticalResizerIcon');
      const retainingPathsTitle = retainingPathsTitleDiv.createChild('span');
      retainingPathsTitle.textContent = i18nString(UIStrings.retainers);

      splitWidgetResizer = retainmentViewHeader;
      this.objectDetailsView = new UI.Widget.VBox();
      this.objectDetailsView.element.appendChild(retainmentViewHeader);
      this.retainmentWidget.show(this.objectDetailsView.element);
    }
    this.splitWidget.hideDefaultResizer();
    this.splitWidget.installResizer(splitWidgetResizer);

    this.retainmentDataGrid.addEventListener(DataGrid.DataGrid.Events.SELECTED_NODE, this.inspectedObjectChanged, this);
    this.retainmentDataGrid.reset();

    this.perspectives = [];
    this.comparisonPerspective = new ComparisonPerspective();
    this.perspectives.push(new SummaryPerspective());
    if (profile.profileType() !== instance.trackingHeapSnapshotProfileType) {
      this.perspectives.push(this.comparisonPerspective);
    }
    this.perspectives.push(new ContainmentPerspective());
    if (this.allocationWidget) {
      this.perspectives.push(new AllocationPerspective());
    }
    this.perspectives.push(new StatisticsPerspective());

    this.perspectiveSelect = new UI.Toolbar.ToolbarComboBox(
        this.onSelectedPerspectiveChanged.bind(this), i18nString(UIStrings.perspective), undefined,
        'profiler.heap-snapshot-perspective');
    this.updatePerspectiveOptions();

    this.baseSelect = new UI.Toolbar.ToolbarComboBox(
        this.changeBase.bind(this), i18nString(UIStrings.baseSnapshot), undefined, 'profiler.heap-snapshot-base');
    this.baseSelect.setVisible(false);
    this.updateBaseOptions();

    this.filterSelect = new UI.Toolbar.ToolbarComboBox(
        this.changeFilter.bind(this), i18nString(UIStrings.filter), undefined, 'profiler.heap-snapshot-filter');
    this.filterSelect.setVisible(false);
    this.updateFilterOptions();

    this.classNameFilter = new UI.Toolbar.ToolbarFilter(i18nString(UIStrings.filterByClass));
    this.classNameFilter.setVisible(false);
    this.constructorsDataGrid.setNameFilter(this.classNameFilter);
    this.diffDataGrid.setNameFilter(this.classNameFilter);

    this.selectedSizeText = new UI.Toolbar.ToolbarText();

    const restoreIgnoredRetainers = i18nString(UIStrings.restoreIgnoredRetainers);
    this.resetRetainersButton =
        new UI.Toolbar.ToolbarButton(restoreIgnoredRetainers, 'clear-list', restoreIgnoredRetainers);
    this.resetRetainersButton.setVisible(false);
    this.resetRetainersButton.addEventListener(UI.Toolbar.ToolbarButton.Events.CLICK, async () => {
      // The reset retainers button acts upon whichever snapshot is currently shown in the Retainers pane.
      await this.retainmentDataGrid.snapshot?.unignoreAllNodesInRetainersView();
      await this.retainmentDataGrid.dataSourceChanged();
    });
    this.retainmentDataGrid.resetRetainersButton = this.resetRetainersButton;

    this.popoverHelper = new UI.PopoverHelper.PopoverHelper(
        this.element, this.getPopoverRequest.bind(this), 'profiler.heap-snapshot-object');
    this.popoverHelper.setDisableOnClick(true);
    this.popoverHelper.setHasPadding(true);
    this.element.addEventListener('scroll', this.popoverHelper.hidePopover.bind(this.popoverHelper), true);

    this.currentPerspectiveIndex = 0;
    this.currentPerspective = this.perspectives[0];
    this.currentPerspective.activate(this);
    this.dataGrid = this.currentPerspective.masterGrid(this);

    void this.populate();
    this.searchThrottler = new Common.Throttler.Throttler(0);

    for (const existingProfile of this.profiles()) {
      existingProfile.addEventListener(ProfileHeaderEvents.PROFILE_TITLE_CHANGED, this.updateControls, this);
    }
  }

  createOverview(): void {
    const profileType = this.profile.profileType();
    this.trackingOverviewGrid = new HeapTimelineOverview();
    this.trackingOverviewGrid.addEventListener(Events.IDS_RANGE_CHANGED, this.onIdsRangeChanged.bind(this));
    if (!this.profile.fromFile() && profileType.profileBeingRecorded() === this.profile) {
      (profileType as TrackingHeapSnapshotProfileType)
          .addEventListener(TrackingHeapSnapshotProfileTypeEvents.HEAP_STATS_UPDATE, this.onHeapStatsUpdate, this);
      (profileType as TrackingHeapSnapshotProfileType)
          .addEventListener(TrackingHeapSnapshotProfileTypeEvents.TRACKING_STOPPED, this.onStopTracking, this);
      this.trackingOverviewGrid.start();
    }
  }

  onStopTracking(): void {
    const profileType = this.profile.profileType() as TrackingHeapSnapshotProfileType;
    profileType.removeEventListener(
        TrackingHeapSnapshotProfileTypeEvents.HEAP_STATS_UPDATE, this.onHeapStatsUpdate, this);
    profileType.removeEventListener(TrackingHeapSnapshotProfileTypeEvents.TRACKING_STOPPED, this.onStopTracking, this);
    if (this.trackingOverviewGrid) {
      this.trackingOverviewGrid.stop();
    }
  }

  onHeapStatsUpdate({data: samples}: Common.EventTarget.EventTargetEvent<Samples>): void {
    if (this.trackingOverviewGrid) {
      this.trackingOverviewGrid.setSamples(samples);
    }
  }

  searchableView(): UI.SearchableView.SearchableView {
    return this.searchableViewInternal;
  }

  showProfile(profile: ProfileHeader|null): UI.Widget.Widget|null {
    return this.parentDataDisplayDelegate.showProfile(profile);
  }

  showObject(snapshotObjectId: string, perspectiveName: string): void {
    if (Number(snapshotObjectId) <= this.profile.maxJSObjectId) {
      void this.selectLiveObject(perspectiveName, snapshotObjectId);
    } else {
      this.parentDataDisplayDelegate.showObject(snapshotObjectId, perspectiveName);
    }
  }

  async linkifyObject(nodeIndex: number): Promise<Element|null> {
    const heapProfilerModel = this.profile.heapProfilerModel();
    // heapProfilerModel is null if snapshot was loaded from file
    if (!heapProfilerModel) {
      return null;
    }
    const location = await this.profile.getLocation(nodeIndex);
    if (!location) {
      return null;
    }
    const debuggerModel = heapProfilerModel.runtimeModel().debuggerModel();
    const rawLocation = debuggerModel.createRawLocationByScriptId(
        String(location.scriptId) as Protocol.Runtime.ScriptId, location.lineNumber, location.columnNumber);
    if (!rawLocation) {
      return null;
    }
    const script = rawLocation.script();
    const sourceURL = script && script.sourceURL;
    return sourceURL && this.linkifier ? this.linkifier.linkifyRawLocation(rawLocation, sourceURL) : null;
  }

  async populate(): Promise<void> {
    const heapSnapshotProxy = await this.profile.loadPromise;

    void this.retrieveStatistics(heapSnapshotProxy);
    if (this.dataGrid) {
      void this.dataGrid.setDataSource(heapSnapshotProxy, 0);
    }

    if (this.profile.profileType().id === TrackingHeapSnapshotProfileType.TypeId && this.profile.fromFile()) {
      const samples = await heapSnapshotProxy.getSamples();
      if (samples) {
        console.assert(Boolean(samples.timestamps.length));
        const profileSamples = new Samples();
        profileSamples.sizes = samples.sizes;
        profileSamples.ids = samples.lastAssignedIds;
        profileSamples.timestamps = samples.timestamps;
        profileSamples.max = samples.sizes;
        profileSamples.totalTime = Math.max(samples.timestamps[samples.timestamps.length - 1] || 0, 10000);
        if (this.trackingOverviewGrid) {
          this.trackingOverviewGrid.setSamples(profileSamples);
        }
      }
    }

    const list = this.profiles();
    const profileIndex = list.indexOf(this.profile);
    this.baseSelect.setSelectedIndex(Math.max(0, profileIndex - 1));
    if (this.trackingOverviewGrid) {
      this.trackingOverviewGrid.updateGrid();
    }
  }

  async retrieveStatistics(heapSnapshotProxy: HeapSnapshotProxy):
      Promise<HeapSnapshotModel.HeapSnapshotModel.Statistics> {
    const statistics = await heapSnapshotProxy.getStatistics();

    const records = [
      {value: statistics.code, color: '#f77', title: i18nString(UIStrings.code)},
      {value: statistics.strings, color: '#5e5', title: i18nString(UIStrings.strings)},
      {value: statistics.jsArrays, color: '#7af', title: i18nString(UIStrings.jsArrays)},
      {value: statistics.native, color: '#fc5', title: i18nString(UIStrings.typedArrays)},
      {value: statistics.system, color: '#98f', title: i18nString(UIStrings.systemObjects)},
    ];
    this.statisticsView.setTotalAndRecords(statistics.total, records);
    return statistics;
  }

  onIdsRangeChanged(event: Common.EventTarget.EventTargetEvent<IdsRangeChangedEvent>): void {
    const {minId, maxId} = event.data;
    this.selectedSizeText.setText(
        i18nString(UIStrings.selectedSizeS, {PH1: Platform.NumberUtilities.bytesToString(event.data.size)}));
    if (this.constructorsDataGrid.snapshot) {
      this.constructorsDataGrid.setSelectionRange(minId, maxId);
    }
  }

  override async toolbarItems(): Promise<UI.Toolbar.ToolbarItem[]> {
    const result: UI.Toolbar.ToolbarItem[] = [this.perspectiveSelect, this.classNameFilter];
    if (this.profile.profileType() !== instance.trackingHeapSnapshotProfileType) {
      result.push(this.baseSelect, this.filterSelect);
    }
    result.push(this.selectedSizeText);
    result.push(this.resetRetainersButton);
    return result;
  }

  override willHide(): void {
    this.currentSearchResultIndex = -1;
    this.popoverHelper.hidePopover();
  }

  supportsCaseSensitiveSearch(): boolean {
    return true;
  }

  supportsRegexSearch(): boolean {
    return false;
  }

  onSearchCanceled(): void {
    this.currentSearchResultIndex = -1;
    this.searchResults = [];
  }

  selectRevealedNode(node: HeapSnapshotGridNode|null): void {
    if (node) {
      node.select();
    }
  }

  performSearch(searchConfig: UI.SearchableView.SearchConfig, shouldJump: boolean, jumpBackwards?: boolean): void {
    const nextQuery = new HeapSnapshotModel.HeapSnapshotModel.SearchConfig(
        searchConfig.query.trim(), searchConfig.caseSensitive, searchConfig.isRegex, shouldJump,
        jumpBackwards || false);

    void this.searchThrottler.schedule(this.performSearchInternal.bind(this, nextQuery));
  }

  async performSearchInternal(nextQuery: HeapSnapshotModel.HeapSnapshotModel.SearchConfig): Promise<void> {
    // Call onSearchCanceled since it will reset everything we need before doing a new search.
    this.onSearchCanceled();

    if (!this.currentPerspective.supportsSearch()) {
      return;
    }

    this.currentQuery = nextQuery;
    const query = nextQuery.query.trim();

    if (!query) {
      return;
    }

    if (query.charAt(0) === '@') {
      const snapshotNodeId = parseInt(query.substring(1), 10);
      if (isNaN(snapshotNodeId)) {
        return;
      }
      if (!this.dataGrid) {
        return;
      }
      const node = await this.dataGrid.revealObjectByHeapSnapshotId(String(snapshotNodeId));
      this.selectRevealedNode(node);
      return;
    }

    if (!this.profile.snapshotProxy || !this.dataGrid) {
      return;
    }

    const filter = this.dataGrid.nodeFilter();
    this.searchResults = filter ? await this.profile.snapshotProxy.search(this.currentQuery, filter) : [];

    this.searchableViewInternal.updateSearchMatchesCount(this.searchResults.length);
    if (this.searchResults.length) {
      this.currentSearchResultIndex = nextQuery.jumpBackward ? this.searchResults.length - 1 : 0;
    }
    await this.jumpToSearchResult(this.currentSearchResultIndex);
  }

  jumpToNextSearchResult(): void {
    if (!this.searchResults.length) {
      return;
    }
    this.currentSearchResultIndex = (this.currentSearchResultIndex + 1) % this.searchResults.length;
    void this.searchThrottler.schedule(this.jumpToSearchResult.bind(this, this.currentSearchResultIndex));
  }

  jumpToPreviousSearchResult(): void {
    if (!this.searchResults.length) {
      return;
    }
    this.currentSearchResultIndex =
        (this.currentSearchResultIndex + this.searchResults.length - 1) % this.searchResults.length;
    void this.searchThrottler.schedule(this.jumpToSearchResult.bind(this, this.currentSearchResultIndex));
  }

  async jumpToSearchResult(searchResultIndex: number): Promise<void> {
    this.searchableViewInternal.updateCurrentMatchIndex(searchResultIndex);
    if (searchResultIndex === -1) {
      return;
    }
    if (!this.dataGrid) {
      return;
    }
    const node = await this.dataGrid.revealObjectByHeapSnapshotId(String(this.searchResults[searchResultIndex]));
    this.selectRevealedNode(node);
  }

  refreshVisibleData(): void {
    if (!this.dataGrid) {
      return;
    }
    let child: (HeapSnapshotGridNode|null) = (this.dataGrid.rootNode().children[0] as HeapSnapshotGridNode | null);
    while (child) {
      child.refresh();
      child = (child.traverseNextNode(false, null, true) as HeapSnapshotGridNode | null);
    }
  }

  changeBase(): void {
    if (this.baseProfile === this.profiles()[this.baseSelect.selectedIndex()]) {
      return;
    }
    this.baseProfile = (this.profiles()[this.baseSelect.selectedIndex()] as HeapProfileHeader);
    const dataGrid = (this.dataGrid as HeapSnapshotDiffDataGrid);
    // Change set base data source only if main data source is already set.
    if (dataGrid.snapshot) {
      void this.baseProfile.loadPromise.then(dataGrid.setBaseDataSource.bind(dataGrid));
    }

    if (!this.currentQuery || !this.searchResults) {
      return;
    }

    // The current search needs to be performed again. First negate out previous match
    // count by calling the search finished callback with a negative number of matches.
    // Then perform the search again with the same query and callback.
    this.performSearch(this.currentQuery, false);
  }

  static readonly ALWAYS_AVAILABLE_FILTERS = [
    {uiName: i18nString(UIStrings.duplicatedStrings), filterName: 'duplicatedStrings'},
    {uiName: i18nString(UIStrings.objectsRetainedByDetachedDomNodes), filterName: 'objectsRetainedByDetachedDomNodes'},
    {uiName: i18nString(UIStrings.objectsRetainedByConsole), filterName: 'objectsRetainedByConsole'},
  ] as readonly{uiName: string, filterName: string}[];

  changeFilter(): void {
    let selectedIndex = this.filterSelect.selectedIndex();
    let filterName = undefined;
    const indexOfFirstAlwaysAvailableFilter =
        this.filterSelect.size() - HeapSnapshotView.ALWAYS_AVAILABLE_FILTERS.length;
    if (selectedIndex >= indexOfFirstAlwaysAvailableFilter) {
      filterName =
          HeapSnapshotView.ALWAYS_AVAILABLE_FILTERS[selectedIndex - indexOfFirstAlwaysAvailableFilter].filterName;
      selectedIndex = 0;
    }
    const profileIndex = selectedIndex - 1;
    if (!this.dataGrid) {
      return;
    }
    (this.dataGrid as HeapSnapshotConstructorsDataGrid)
        .filterSelectIndexChanged((this.profiles() as HeapProfileHeader[]), profileIndex, filterName);

    if (!this.currentQuery || !this.searchResults) {
      return;
    }

    // The current search needs to be performed again. First negate out previous match
    // count by calling the search finished callback with a negative number of matches.
    // Then perform the search again with the same query and callback.
    this.performSearch(this.currentQuery, false);
  }

  profiles(): ProfileHeader[] {
    return this.profile.profileType().getProfiles();
  }

  selectionChanged(event: Common.EventTarget.EventTargetEvent<DataGrid.DataGrid.DataGridNode<HeapSnapshotGridNode>>):
      void {
    const selectedNode = (event.data as HeapSnapshotGridNode);
    this.setSelectedNodeForDetailsView(selectedNode);
    this.inspectedObjectChanged(event);
  }

  onSelectAllocationNode(
      event: Common.EventTarget.EventTargetEvent<DataGrid.DataGrid.DataGridNode<HeapSnapshotGridNode>>): void {
    const selectedNode = (event.data as AllocationGridNode);
    this.constructorsDataGrid.setAllocationNodeId(selectedNode.allocationNodeId());
    this.setSelectedNodeForDetailsView(null);
  }

  inspectedObjectChanged(
      event: Common.EventTarget.EventTargetEvent<DataGrid.DataGrid.DataGridNode<HeapSnapshotGridNode>>): void {
    const selectedNode = (event.data as HeapSnapshotGridNode);
    const heapProfilerModel = this.profile.heapProfilerModel();
    if (heapProfilerModel && selectedNode instanceof HeapSnapshotGenericObjectNode) {
      void heapProfilerModel.addInspectedHeapObject(
          String(selectedNode.snapshotNodeId) as Protocol.HeapProfiler.HeapSnapshotObjectId);
    }
  }

  setSelectedNodeForDetailsView(nodeItem: HeapSnapshotGridNode|null): void {
    const dataSource = nodeItem && nodeItem.retainersDataSource();
    if (dataSource) {
      void this.retainmentDataGrid.setDataSource(
          dataSource.snapshot, dataSource.snapshotNodeIndex, dataSource.snapshotNodeId);
      if (this.allocationStackView) {
        void this.allocationStackView.setAllocatedObject(dataSource.snapshot, dataSource.snapshotNodeIndex);
      }
    } else {
      if (this.allocationStackView) {
        this.allocationStackView.clear();
      }
      this.retainmentDataGrid.reset();
    }
  }

  async changePerspectiveAndWait(perspectiveTitle: string): Promise<void> {
    const perspectiveIndex = this.perspectives.findIndex(perspective => perspective.title() === perspectiveTitle);
    if (perspectiveIndex === -1 || this.currentPerspectiveIndex === perspectiveIndex) {
      return;
    }
    const dataGrid = this.perspectives[perspectiveIndex].masterGrid(this);

    if (!dataGrid) {
      return;
    }

    const promise = dataGrid.once(HeapSnapshotSortableDataGridEvents.ContentShown);

    const option = this.perspectiveSelect.options().find(option => option.value === String(perspectiveIndex));
    this.perspectiveSelect.select((option as Element));
    this.changePerspective(perspectiveIndex);
    await promise;
  }

  async updateDataSourceAndView(): Promise<void> {
    const dataGrid = this.dataGrid;
    if (!dataGrid || dataGrid.snapshot) {
      return;
    }

    const snapshotProxy = await this.profile.loadPromise;

    if (this.dataGrid !== dataGrid) {
      return;
    }
    if (dataGrid.snapshot !== snapshotProxy) {
      void dataGrid.setDataSource(snapshotProxy, 0);
    }
    if (dataGrid !== this.diffDataGrid) {
      return;
    }
    if (!this.baseProfile) {
      this.baseProfile = (this.profiles()[this.baseSelect.selectedIndex()] as HeapProfileHeader);
    }

    const baseSnapshotProxy = await this.baseProfile.loadPromise;

    if (this.diffDataGrid.baseSnapshot !== baseSnapshotProxy) {
      this.diffDataGrid.setBaseDataSource(baseSnapshotProxy);
    }
  }

  onSelectedPerspectiveChanged(event: Event): void {
    this.changePerspective(Number((event.target as HTMLSelectElement).selectedOptions[0].value));
  }

  changePerspective(selectedIndex: number): void {
    if (selectedIndex === this.currentPerspectiveIndex) {
      return;
    }

    this.currentPerspectiveIndex = selectedIndex;

    this.currentPerspective.deactivate(this);
    const perspective = this.perspectives[selectedIndex];
    this.currentPerspective = perspective;
    this.dataGrid = (perspective.masterGrid(this) as HeapSnapshotSortableDataGrid);
    perspective.activate(this);

    this.refreshVisibleData();
    if (this.dataGrid) {
      this.dataGrid.updateWidths();
    }

    void this.updateDataSourceAndView();

    if (!this.currentQuery || !this.searchResults) {
      return;
    }

    // The current search needs to be performed again. First negate out previous match
    // count by calling the search finished callback with a negative number of matches.
    // Then perform the search again the with same query and callback.
    this.performSearch(this.currentQuery, false);
  }

  async selectLiveObject(perspectiveName: string, snapshotObjectId: string): Promise<void> {
    await this.changePerspectiveAndWait(perspectiveName);
    if (!this.dataGrid) {
      return;
    }
    const node = await this.dataGrid.revealObjectByHeapSnapshotId(snapshotObjectId);
    if (node) {
      node.select();
    } else {
      Common.Console.Console.instance().error('Cannot find corresponding heap snapshot node');
    }
  }

  getPopoverRequest(event: Event): UI.PopoverHelper.PopoverRequest|null {
    const span = UI.UIUtils.enclosingNodeOrSelfWithNodeName((event.target as Node), 'span');
    const row = UI.UIUtils.enclosingNodeOrSelfWithNodeName((event.target as Node), 'tr');
    if (!row) {
      return null;
    }
    if (!this.dataGrid) {
      return null;
    }
    const node = this.dataGrid.dataGridNodeFromNode(row) || this.containmentDataGrid.dataGridNodeFromNode(row) ||
        this.constructorsDataGrid.dataGridNodeFromNode(row) || this.diffDataGrid.dataGridNodeFromNode(row) ||
        (this.allocationDataGrid && this.allocationDataGrid.dataGridNodeFromNode(row)) ||
        this.retainmentDataGrid.dataGridNodeFromNode(row);
    const heapProfilerModel = this.profile.heapProfilerModel();
    if (!node || !span || !heapProfilerModel) {
      return null;
    }
    let objectPopoverHelper: ObjectUI.ObjectPopoverHelper.ObjectPopoverHelper|null;
    return {
      // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration)
      // @ts-expect-error
      box: span.boxInWindow(),
      show: async (popover: UI.GlassPane.GlassPane) => {
        if (!heapProfilerModel) {
          return false;
        }
        const remoteObject = await (node as HeapSnapshotGridNode).queryObjectContent(heapProfilerModel, 'popover');
        if (remoteObject instanceof SDK.RemoteObject.RemoteObject) {
          objectPopoverHelper =
              await ObjectUI.ObjectPopoverHelper.ObjectPopoverHelper.buildObjectPopover(remoteObject, popover);
        } else {
          objectPopoverHelper = ObjectUI.ObjectPopoverHelper.ObjectPopoverHelper.buildDescriptionPopover(
              remoteObject.description, remoteObject.link, popover);
        }
        if (!objectPopoverHelper) {
          heapProfilerModel.runtimeModel().releaseObjectGroup('popover');
          return false;
        }
        return true;
      },
      hide: () => {
        heapProfilerModel.runtimeModel().releaseObjectGroup('popover');
        if (objectPopoverHelper) {
          objectPopoverHelper.dispose();
        }
      },
    };
  }

  updatePerspectiveOptions(): void {
    const multipleSnapshots = this.profiles().length > 1;
    this.perspectiveSelect.removeOptions();
    this.perspectives.forEach((perspective, index) => {
      if (multipleSnapshots || perspective !== this.comparisonPerspective) {
        const option = this.perspectiveSelect.createOption(perspective.title(), String(index));
        if (perspective === this.currentPerspective) {
          this.perspectiveSelect.select(option);
        }
      }
    });
  }

  updateBaseOptions(): void {
    const list = this.profiles();
    const selectedIndex = this.baseSelect.selectedIndex();

    this.baseSelect.removeOptions();
    for (const item of list) {
      this.baseSelect.createOption(item.title);
    }

    if (selectedIndex > -1) {
      this.baseSelect.setSelectedIndex(selectedIndex);
    }
  }

  updateFilterOptions(): void {
    const list = this.profiles();
    const selectedIndex = this.filterSelect.selectedIndex();
    const originalSize = this.filterSelect.size();

    this.filterSelect.removeOptions();
    this.filterSelect.createOption(i18nString(UIStrings.allObjects));
    for (let i = 0; i < list.length; ++i) {
      let title;
      if (!i) {
        title = i18nString(UIStrings.objectsAllocatedBeforeS, {PH1: list[i].title});
      } else {
        title = i18nString(UIStrings.objectsAllocatedBetweenSAndS, {PH1: list[i - 1].title, PH2: list[i].title});
      }
      this.filterSelect.createOption(title);
    }

    // Create a dividing line using em dashes.
    const dividerIndex = this.filterSelect.size();
    const divider = this.filterSelect.createOption('\u2014'.repeat(18));
    (divider as HTMLOptionElement).disabled = true;

    for (const filter of HeapSnapshotView.ALWAYS_AVAILABLE_FILTERS) {
      this.filterSelect.createOption(filter.uiName);
    }

    const newSize = this.filterSelect.size();

    if (selectedIndex > -1) {
      const distanceFromEnd = originalSize - selectedIndex;
      if (distanceFromEnd <= HeapSnapshotView.ALWAYS_AVAILABLE_FILTERS.length) {
        // If one of the always-available filters was selected, then select the
        // same filter again even though its index may have changed.
        this.filterSelect.setSelectedIndex(newSize - distanceFromEnd);
      } else if (selectedIndex >= dividerIndex) {
        // If the select list is now shorter than it was, such that we can't
        // keep the index unchanged, set it to -1, which causes it to be blank.
        this.filterSelect.setSelectedIndex(-1);
      } else {
        this.filterSelect.setSelectedIndex(selectedIndex);
      }
    }
  }

  updateControls(): void {
    this.updatePerspectiveOptions();
    this.updateBaseOptions();
    this.updateFilterOptions();
  }

  onReceiveSnapshot(event: Common.EventTarget.EventTargetEvent<ProfileHeader>): void {
    this.updateControls();
    const profile = event.data;
    profile.addEventListener(ProfileHeaderEvents.PROFILE_TITLE_CHANGED, this.updateControls, this);
  }

  onProfileHeaderRemoved(event: Common.EventTarget.EventTargetEvent<ProfileHeader>): void {
    const profile = event.data;
    profile.removeEventListener(ProfileHeaderEvents.PROFILE_TITLE_CHANGED, this.updateControls, this);

    if (this.profile === profile) {
      this.detach();
      this.profile.profileType().removeEventListener(
          HeapSnapshotProfileTypeEvents.SNAPSHOT_RECEIVED, this.onReceiveSnapshot, this);
      this.profile.profileType().removeEventListener(
          ProfileTypeEvents.REMOVE_PROFILE_HEADER, this.onProfileHeaderRemoved, this);
      this.dispose();
    } else {
      this.updateControls();
    }
  }

  dispose(): void {
    this.linkifier.dispose();
    this.popoverHelper.dispose();
    if (this.allocationStackView) {
      this.allocationStackView.clear();
      if (this.allocationDataGrid) {
        this.allocationDataGrid.dispose();
      }
    }
    this.onStopTracking();
    if (this.trackingOverviewGrid) {
      this.trackingOverviewGrid.removeEventListener(Events.IDS_RANGE_CHANGED, this.onIdsRangeChanged.bind(this));
    }
  }
}

export class Perspective {
  readonly titleInternal: string;
  constructor(title: string) {
    this.titleInternal = title;
  }

  activate(_heapSnapshotView: HeapSnapshotView): void {
  }

  deactivate(heapSnapshotView: HeapSnapshotView): void {
    heapSnapshotView.baseSelect.setVisible(false);
    heapSnapshotView.filterSelect.setVisible(false);
    heapSnapshotView.classNameFilter.setVisible(false);
    if (heapSnapshotView.trackingOverviewGrid) {
      heapSnapshotView.trackingOverviewGrid.detach();
    }
    if (heapSnapshotView.allocationWidget) {
      heapSnapshotView.allocationWidget.detach();
    }
    if (heapSnapshotView.statisticsView) {
      heapSnapshotView.statisticsView.detach();
    }

    heapSnapshotView.splitWidget.detach();
    heapSnapshotView.splitWidget.detachChildWidgets();
  }

  masterGrid(_heapSnapshotView: HeapSnapshotView): HeapSnapshotSortableDataGrid|null {
    return null;
  }

  title(): string {
    return this.titleInternal;
  }

  supportsSearch(): boolean {
    return false;
  }
}

export class SummaryPerspective extends Perspective {
  constructor() {
    super(i18nString(UIStrings.summary));
  }

  override activate(heapSnapshotView: HeapSnapshotView): void {
    heapSnapshotView.splitWidget.setMainWidget(heapSnapshotView.constructorsWidget);
    heapSnapshotView.splitWidget.setSidebarWidget(heapSnapshotView.objectDetailsView);
    heapSnapshotView.splitWidget.show(heapSnapshotView.searchableViewInternal.element);
    heapSnapshotView.filterSelect.setVisible(true);
    heapSnapshotView.classNameFilter.setVisible(true);
    if (!heapSnapshotView.trackingOverviewGrid) {
      return;
    }
    heapSnapshotView.trackingOverviewGrid.show(
        heapSnapshotView.searchableViewInternal.element, heapSnapshotView.splitWidget.element);
    heapSnapshotView.trackingOverviewGrid.update();
    heapSnapshotView.trackingOverviewGrid.updateGrid();
  }

  override masterGrid(heapSnapshotView: HeapSnapshotView): HeapSnapshotSortableDataGrid {
    return heapSnapshotView.constructorsDataGrid;
  }

  override supportsSearch(): boolean {
    return true;
  }
}

export class ComparisonPerspective extends Perspective {
  constructor() {
    super(i18nString(UIStrings.comparison));
  }

  override activate(heapSnapshotView: HeapSnapshotView): void {
    heapSnapshotView.splitWidget.setMainWidget(heapSnapshotView.diffWidget);
    heapSnapshotView.splitWidget.setSidebarWidget(heapSnapshotView.objectDetailsView);
    heapSnapshotView.splitWidget.show(heapSnapshotView.searchableViewInternal.element);
    heapSnapshotView.baseSelect.setVisible(true);
    heapSnapshotView.classNameFilter.setVisible(true);
  }

  override masterGrid(heapSnapshotView: HeapSnapshotView): HeapSnapshotSortableDataGrid {
    return heapSnapshotView.diffDataGrid;
  }

  override supportsSearch(): boolean {
    return true;
  }
}

export class ContainmentPerspective extends Perspective {
  constructor() {
    super(i18nString(UIStrings.containment));
  }

  override activate(heapSnapshotView: HeapSnapshotView): void {
    heapSnapshotView.splitWidget.setMainWidget(heapSnapshotView.containmentWidget);
    heapSnapshotView.splitWidget.setSidebarWidget(heapSnapshotView.objectDetailsView);
    heapSnapshotView.splitWidget.show(heapSnapshotView.searchableViewInternal.element);
  }

  override masterGrid(heapSnapshotView: HeapSnapshotView): HeapSnapshotSortableDataGrid {
    return heapSnapshotView.containmentDataGrid;
  }
}

export class AllocationPerspective extends Perspective {
  readonly allocationSplitWidget: UI.SplitWidget.SplitWidget;
  constructor() {
    super(i18nString(UIStrings.allocation));
    this.allocationSplitWidget =
        new UI.SplitWidget.SplitWidget(false, true, 'heap-snapshot-allocation-split-view-state', 200, 200);
    this.allocationSplitWidget.setSidebarWidget(new UI.Widget.VBox());
  }

  override activate(heapSnapshotView: HeapSnapshotView): void {
    if (heapSnapshotView.allocationWidget) {
      this.allocationSplitWidget.setMainWidget(heapSnapshotView.allocationWidget);
    }
    heapSnapshotView.splitWidget.setMainWidget(heapSnapshotView.constructorsWidget);
    heapSnapshotView.splitWidget.setSidebarWidget(heapSnapshotView.objectDetailsView);

    const allocatedObjectsView = new UI.Widget.VBox();
    const resizer = document.createElement('div');
    resizer.classList.add('heap-snapshot-view-resizer');
    const title = resizer.createChild('div', 'title').createChild('span');
    resizer.createChild('div', 'verticalResizerIcon');
    title.textContent = i18nString(UIStrings.liveObjects);
    this.allocationSplitWidget.hideDefaultResizer();
    this.allocationSplitWidget.installResizer(resizer);
    allocatedObjectsView.element.appendChild(resizer);
    heapSnapshotView.splitWidget.show(allocatedObjectsView.element);
    this.allocationSplitWidget.setSidebarWidget(allocatedObjectsView);

    this.allocationSplitWidget.show(heapSnapshotView.searchableViewInternal.element);

    heapSnapshotView.constructorsDataGrid.clear();
    if (heapSnapshotView.allocationDataGrid) {
      const selectedNode = (heapSnapshotView.allocationDataGrid.selectedNode as AllocationGridNode);
      if (selectedNode) {
        heapSnapshotView.constructorsDataGrid.setAllocationNodeId(selectedNode.allocationNodeId());
      }
    }
  }

  override deactivate(heapSnapshotView: HeapSnapshotView): void {
    this.allocationSplitWidget.detach();
    super.deactivate(heapSnapshotView);
  }

  override masterGrid(heapSnapshotView: HeapSnapshotView): HeapSnapshotSortableDataGrid|null {
    return heapSnapshotView.allocationDataGrid;
  }
}

export class StatisticsPerspective extends Perspective {
  constructor() {
    super(i18nString(UIStrings.statistics));
  }

  override activate(heapSnapshotView: HeapSnapshotView): void {
    heapSnapshotView.statisticsView.show(heapSnapshotView.searchableViewInternal.element);
  }

  override masterGrid(_heapSnapshotView: HeapSnapshotView): HeapSnapshotSortableDataGrid|null {
    return null;
  }
}

export class HeapSnapshotProfileType extends
    Common.ObjectWrapper.eventMixin<HeapSnapshotProfileTypeEventTypes, typeof ProfileType>(ProfileType)
        implements SDK.TargetManager.SDKModelObserver<SDK.HeapProfilerModel.HeapProfilerModel> {
  readonly exposeInternals: Common.Settings.Setting<boolean>;
  customContentInternal: UI.UIUtils.CheckboxLabel|null;
  constructor(id?: string, title?: string) {
    super(id || HeapSnapshotProfileType.TypeId, title || i18nString(UIStrings.heapSnapshot));
    SDK.TargetManager.TargetManager.instance().observeModels(SDK.HeapProfilerModel.HeapProfilerModel, this);
    SDK.TargetManager.TargetManager.instance().addModelListener(
        SDK.HeapProfilerModel.HeapProfilerModel, SDK.HeapProfilerModel.Events.RESET_PROFILES, this.resetProfiles, this);
    SDK.TargetManager.TargetManager.instance().addModelListener(
        SDK.HeapProfilerModel.HeapProfilerModel, SDK.HeapProfilerModel.Events.ADD_HEAP_SNAPSHOT_CHUNK,
        this.addHeapSnapshotChunk, this);
    SDK.TargetManager.TargetManager.instance().addModelListener(
        SDK.HeapProfilerModel.HeapProfilerModel, SDK.HeapProfilerModel.Events.REPORT_HEAP_SNAPSHOT_PROGRESS,
        this.reportHeapSnapshotProgress, this);
    this.exposeInternals = Common.Settings.Settings.instance().createSetting('expose-internals', false);
    this.customContentInternal = null;
  }

  modelAdded(heapProfilerModel: SDK.HeapProfilerModel.HeapProfilerModel): void {
    void heapProfilerModel.enable();
  }

  modelRemoved(_heapProfilerModel: SDK.HeapProfilerModel.HeapProfilerModel): void {
  }

  override getProfiles(): HeapProfileHeader[] {
    return super.getProfiles() as HeapProfileHeader[];
  }

  override fileExtension(): string {
    return '.heapsnapshot';
  }

  override get buttonTooltip(): Common.UIString.LocalizedString {
    return i18nString(UIStrings.takeHeapSnapshot);
  }

  override isInstantProfile(): boolean {
    return true;
  }

  override buttonClicked(): boolean {
    void this.takeHeapSnapshot();
    Host.userMetrics.actionTaken(Host.UserMetrics.Action.ProfilesHeapProfileTaken);
    return false;
  }

  override get treeItemTitle(): Common.UIString.LocalizedString {
    return i18nString(UIStrings.heapSnapshots);
  }

  override get description(): Common.UIString.LocalizedString {
    return i18nString(UIStrings.heapSnapshotProfilesShowMemory);
  }

  override customContent(): Element|null {
    const showOptionToExposeInternalsInHeapSnapshot =
        Root.Runtime.experiments.isEnabled('show-option-tp-expose-internals-in-heap-snapshot');
    const omitParagraphElement = true;
    const exposeInternalsInHeapSnapshotCheckbox = UI.SettingsUI.createSettingCheckbox(
        i18nString(UIStrings.exposeInternals), this.exposeInternals, omitParagraphElement);
    this.customContentInternal = exposeInternalsInHeapSnapshotCheckbox as UI.UIUtils.CheckboxLabel;
    return showOptionToExposeInternalsInHeapSnapshot ? exposeInternalsInHeapSnapshotCheckbox : null;
  }

  override setCustomContentEnabled(enable: boolean): void {
    if (this.customContentInternal) {
      this.customContentInternal.checkboxElement.disabled = !enable;
    }
  }

  override createProfileLoadedFromFile(title: string): ProfileHeader {
    return new HeapProfileHeader(null, this, title);
  }

  async takeHeapSnapshot(): Promise<void> {
    if (this.profileBeingRecorded()) {
      return;
    }
    const heapProfilerModel = UI.Context.Context.instance().flavor(SDK.HeapProfilerModel.HeapProfilerModel);
    if (!heapProfilerModel) {
      return;
    }

    let profile: HeapProfileHeader = new HeapProfileHeader(heapProfilerModel, this);
    this.setProfileBeingRecorded(profile);
    this.addProfile(profile);
    profile.updateStatus(i18nString(UIStrings.snapshotting));

    await heapProfilerModel.takeHeapSnapshot({
      reportProgress: true,
      captureNumericValue: true,
      exposeInternals: this.exposeInternals.get(),
    });
    profile = this.profileBeingRecorded() as HeapProfileHeader;
    if (!profile) {
      return;
    }
    profile.title = i18nString(UIStrings.snapshotD, {PH1: profile.uid});
    profile.finishLoad();
    this.setProfileBeingRecorded(null);
    this.dispatchEventToListeners(ProfileTypeEvents.PROFILE_COMPLETE, profile);
  }

  addHeapSnapshotChunk(event: Common.EventTarget.EventTargetEvent<string>): void {
    const profile = (this.profileBeingRecorded() as HeapProfileHeader | null);
    if (!profile) {
      return;
    }
    profile.transferChunk(event.data);
  }

  reportHeapSnapshotProgress(event: Common.EventTarget.EventTargetEvent<SDK.HeapProfilerModel.HeapSnapshotProgress>):
      void {
    const profile = (this.profileBeingRecorded() as HeapProfileHeader | null);
    if (!profile) {
      return;
    }
    const {done, total, finished} = event.data;
    profile.updateStatus(i18nString(UIStrings.percentagePlaceholder, {PH1: ((done / total) * 100).toFixed(0)}), true);
    if (finished) {
      profile.prepareToLoad();
    }
  }

  resetProfiles(event: Common.EventTarget.EventTargetEvent<SDK.HeapProfilerModel.HeapProfilerModel>): void {
    const heapProfilerModel = event.data;
    for (const profile of this.getProfiles()) {
      if (profile.heapProfilerModel() === heapProfilerModel) {
        this.removeProfile(profile);
      }
    }
  }

  snapshotReceived(profile: ProfileHeader): void {
    if (this.profileBeingRecorded() === profile) {
      this.setProfileBeingRecorded(null);
    }
    this.dispatchEventToListeners(HeapSnapshotProfileTypeEvents.SNAPSHOT_RECEIVED, profile);
  }

  // eslint-disable-next-line @typescript-eslint/naming-convention
  static readonly TypeId: string = 'HEAP';
  // TODO(crbug.com/1228674): Remove event string once its no longer used in web tests.
  // eslint-disable-next-line @typescript-eslint/naming-convention
  static readonly SnapshotReceived = 'SnapshotReceived';
}

export const enum HeapSnapshotProfileTypeEvents {
  SNAPSHOT_RECEIVED = 'SnapshotReceived',
}

export type HeapSnapshotProfileTypeEventTypes = {
  [HeapSnapshotProfileTypeEvents.SNAPSHOT_RECEIVED]: ProfileHeader,
};

export class TrackingHeapSnapshotProfileType extends
    Common.ObjectWrapper.eventMixin<TrackingHeapSnapshotProfileTypeEventTypes, typeof HeapSnapshotProfileType>(
        HeapSnapshotProfileType) {
  readonly recordAllocationStacksSettingInternal: Common.Settings.Setting<boolean>;
  override customContentInternal: UI.UIUtils.CheckboxLabel|null;
  recording: boolean;
  profileSamples?: Samples|null;

  constructor() {
    super(TrackingHeapSnapshotProfileType.TypeId, i18nString(UIStrings.allocationInstrumentationOn));
    this.recordAllocationStacksSettingInternal =
        Common.Settings.Settings.instance().createSetting('record-allocation-stacks', false);
    this.customContentInternal = null;
    this.recording = false;
  }

  override modelAdded(heapProfilerModel: SDK.HeapProfilerModel.HeapProfilerModel): void {
    super.modelAdded(heapProfilerModel);
    heapProfilerModel.addEventListener(SDK.HeapProfilerModel.Events.HEAP_STATS_UPDATED, this.heapStatsUpdate, this);
    heapProfilerModel.addEventListener(SDK.HeapProfilerModel.Events.LAST_SEEN_OBJECT_ID, this.lastSeenObjectId, this);
  }

  override modelRemoved(heapProfilerModel: SDK.HeapProfilerModel.HeapProfilerModel): void {
    super.modelRemoved(heapProfilerModel);
    heapProfilerModel.removeEventListener(SDK.HeapProfilerModel.Events.HEAP_STATS_UPDATED, this.heapStatsUpdate, this);
    heapProfilerModel.removeEventListener(
        SDK.HeapProfilerModel.Events.LAST_SEEN_OBJECT_ID, this.lastSeenObjectId, this);
  }

  heapStatsUpdate(event: Common.EventTarget.EventTargetEvent<SDK.HeapProfilerModel.HeapStatsUpdateSamples>): void {
    if (!this.profileSamples) {
      return;
    }
    const samples = event.data;
    let index;
    for (let i = 0; i < samples.length; i += 3) {
      index = samples[i];
      const size = samples[i + 2];
      this.profileSamples.sizes[index] = size;
      if (!this.profileSamples.max[index]) {
        this.profileSamples.max[index] = size;
      }
    }
  }

  lastSeenObjectId(event: Common.EventTarget.EventTargetEvent<SDK.HeapProfilerModel.LastSeenObjectId>): void {
    const profileSamples = this.profileSamples;
    if (!profileSamples) {
      return;
    }
    const {lastSeenObjectId, timestamp} = event.data;
    const currentIndex = Math.max(profileSamples.ids.length, profileSamples.max.length - 1);
    profileSamples.ids[currentIndex] = lastSeenObjectId;
    if (!profileSamples.max[currentIndex]) {
      profileSamples.max[currentIndex] = 0;
      profileSamples.sizes[currentIndex] = 0;
    }
    profileSamples.timestamps[currentIndex] = timestamp;
    if (profileSamples.totalTime < timestamp - profileSamples.timestamps[0]) {
      profileSamples.totalTime *= 2;
    }
    if (this.profileSamples) {
      this.dispatchEventToListeners(TrackingHeapSnapshotProfileTypeEvents.HEAP_STATS_UPDATE, this.profileSamples);
    }
    const profile = this.profileBeingRecorded();
    if (profile) {
      profile.updateStatus(null, true);
    }
  }

  override hasTemporaryView(): boolean {
    return true;
  }

  override get buttonTooltip(): Common.UIString.LocalizedString {
    return this.recording ? i18nString(UIStrings.stopRecordingHeapProfile) :
                            i18nString(UIStrings.startRecordingHeapProfile);
  }

  override isInstantProfile(): boolean {
    return false;
  }

  override buttonClicked(): boolean {
    return this.toggleRecording();
  }

  startRecordingProfile(): void {
    if (this.profileBeingRecorded()) {
      return;
    }
    const heapProfilerModel = this.addNewProfile();
    if (!heapProfilerModel) {
      return;
    }
    void heapProfilerModel.startTrackingHeapObjects(this.recordAllocationStacksSettingInternal.get());
  }

  override customContent(): Element|null {
    const checkboxSetting = UI.SettingsUI.createSettingCheckbox(
        i18nString(UIStrings.recordAllocationStacksExtra), this.recordAllocationStacksSettingInternal, true);
    this.customContentInternal = (checkboxSetting as UI.UIUtils.CheckboxLabel);
    return checkboxSetting;
  }

  override setCustomContentEnabled(enable: boolean): void {
    if (this.customContentInternal) {
      this.customContentInternal.checkboxElement.disabled = !enable;
    }
  }

  recordAllocationStacksSetting(): Common.Settings.Setting<boolean> {
    return this.recordAllocationStacksSettingInternal;
  }

  addNewProfile(): SDK.HeapProfilerModel.HeapProfilerModel|null {
    const heapProfilerModel = UI.Context.Context.instance().flavor(SDK.HeapProfilerModel.HeapProfilerModel);
    if (!heapProfilerModel) {
      return null;
    }
    this.setProfileBeingRecorded(new HeapProfileHeader(heapProfilerModel, this, undefined));
    this.profileSamples = new Samples();
    // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (this.profileBeingRecorded() as any)._profileSamples = this.profileSamples;
    this.recording = true;
    this.addProfile((this.profileBeingRecorded() as ProfileHeader));
    (this.profileBeingRecorded() as HeapProfileHeader).updateStatus(i18nString(UIStrings.recording));
    this.dispatchEventToListeners(TrackingHeapSnapshotProfileTypeEvents.TRACKING_STARTED);
    return heapProfilerModel;
  }

  async stopRecordingProfile(): Promise<void> {
    let profile: HeapProfileHeader = (this.profileBeingRecorded() as HeapProfileHeader);
    profile.updateStatus(i18nString(UIStrings.snapshotting));
    const stopPromise =
        (profile.heapProfilerModel() as SDK.HeapProfilerModel.HeapProfilerModel).stopTrackingHeapObjects(true);
    this.recording = false;
    this.dispatchEventToListeners(TrackingHeapSnapshotProfileTypeEvents.TRACKING_STOPPED);
    await stopPromise;
    profile = (this.profileBeingRecorded() as HeapProfileHeader);
    if (!profile) {
      return;
    }
    profile.finishLoad();
    this.profileSamples = null;
    this.setProfileBeingRecorded(null);
    this.dispatchEventToListeners(ProfileTypeEvents.PROFILE_COMPLETE, profile);
  }

  toggleRecording(): boolean {
    if (this.recording) {
      void this.stopRecordingProfile();
    } else {
      this.startRecordingProfile();
    }
    return this.recording;
  }

  override fileExtension(): string {
    return '.heaptimeline';
  }

  override get treeItemTitle(): Common.UIString.LocalizedString {
    return i18nString(UIStrings.allocationTimelines);
  }

  override get description(): Common.UIString.LocalizedString {
    return i18nString(UIStrings.AllocationTimelinesShowInstrumented);
  }

  override resetProfiles(event: Common.EventTarget.EventTargetEvent<SDK.HeapProfilerModel.HeapProfilerModel>): void {
    const wasRecording = this.recording;
    // Clear current profile to avoid stopping backend.
    this.setProfileBeingRecorded(null);
    super.resetProfiles(event);
    this.profileSamples = null;
    if (wasRecording) {
      this.addNewProfile();
    }
  }

  override profileBeingRecordedRemoved(): void {
    void this.stopRecordingProfile();
    this.profileSamples = null;
  }

  // eslint-disable-next-line @typescript-eslint/naming-convention
  static override readonly TypeId = 'HEAP-RECORD';
  // TODO(crbug.com/1228674): Remove event strings once they are no longer used in web tests.
  // eslint-disable-next-line @typescript-eslint/naming-convention
  static readonly HeapStatsUpdate = 'HeapStatsUpdate';
  // eslint-disable-next-line @typescript-eslint/naming-convention
  static readonly TrackingStarted = 'TrackingStarted';
  // eslint-disable-next-line @typescript-eslint/naming-convention
  static readonly TrackingStopped = 'TrackingStopped';
}

export const enum TrackingHeapSnapshotProfileTypeEvents {
  HEAP_STATS_UPDATE = 'HeapStatsUpdate',
  TRACKING_STARTED = 'TrackingStarted',
  TRACKING_STOPPED = 'TrackingStopped',
}

export type TrackingHeapSnapshotProfileTypeEventTypes = {
  [TrackingHeapSnapshotProfileTypeEvents.HEAP_STATS_UPDATE]: Samples,
  [TrackingHeapSnapshotProfileTypeEvents.TRACKING_STARTED]: void,
  [TrackingHeapSnapshotProfileTypeEvents.TRACKING_STOPPED]: void,
};

export class HeapProfileHeader extends ProfileHeader {
  readonly heapProfilerModelInternal: SDK.HeapProfilerModel.HeapProfilerModel|null;
  maxJSObjectId: number;
  workerProxy: HeapSnapshotWorkerProxy|null;
  receiver: Common.StringOutputStream.OutputStream|null;
  snapshotProxy: HeapSnapshotProxy|null;
  readonly loadPromise: Promise<HeapSnapshotProxy>;
  fulfillLoad?: (value: HeapSnapshotProxy|PromiseLike<HeapSnapshotProxy>) => void;
  totalNumberOfChunks: number;
  bufferedWriter: Bindings.TempFile.TempFile|null;
  onTempFileReady: (() => void)|null;
  failedToCreateTempFile?: boolean;
  wasDisposed?: boolean;
  fileName?: Platform.DevToolsPath.RawPathString;

  constructor(
      heapProfilerModel: SDK.HeapProfilerModel.HeapProfilerModel|null, type: HeapSnapshotProfileType, title?: string) {
    super(type, title || i18nString(UIStrings.snapshotD, {PH1: type.nextProfileUid()}));
    this.heapProfilerModelInternal = heapProfilerModel;
    this.maxJSObjectId = -1;
    this.workerProxy = null;
    this.receiver = null;
    this.snapshotProxy = null;
    this.loadPromise = new Promise(resolve => {
      this.fulfillLoad = resolve;
    });
    this.totalNumberOfChunks = 0;
    this.bufferedWriter = null;
    this.onTempFileReady = null;
  }

  heapProfilerModel(): SDK.HeapProfilerModel.HeapProfilerModel|null {
    return this.heapProfilerModelInternal;
  }

  async getLocation(nodeIndex: number): Promise<HeapSnapshotModel.HeapSnapshotModel.Location|null> {
    if (!this.snapshotProxy) {
      return null;
    }
    return this.snapshotProxy.getLocation(nodeIndex);
  }

  override createSidebarTreeElement(dataDisplayDelegate: DataDisplayDelegate): ProfileSidebarTreeElement {
    return new ProfileSidebarTreeElement(dataDisplayDelegate, this, 'heap-snapshot-sidebar-tree-item');
  }

  override createView(dataDisplayDelegate: DataDisplayDelegate): HeapSnapshotView {
    return new HeapSnapshotView(dataDisplayDelegate, this);
  }

  prepareToLoad(): void {
    console.assert(!this.receiver, 'Already loading');
    this.setupWorker();
    this.updateStatus(i18nString(UIStrings.loading), true);
  }

  finishLoad(): void {
    if (!this.wasDisposed && this.receiver) {
      void this.receiver.close();
    }
    if (!this.bufferedWriter) {
      return;
    }
    this.didWriteToTempFile(this.bufferedWriter);
  }

  didWriteToTempFile(tempFile: Bindings.TempFile.TempFile): void {
    if (this.wasDisposed) {
      if (tempFile) {
        tempFile.remove();
      }
      return;
    }
    this.tempFile = tempFile;
    if (!tempFile) {
      this.failedToCreateTempFile = true;
    }
    if (this.onTempFileReady) {
      this.onTempFileReady();
      this.onTempFileReady = null;
    }
  }

  setupWorker(): void {
    console.assert(!this.workerProxy, 'HeapSnapshotWorkerProxy already exists');
    this.workerProxy = new HeapSnapshotWorkerProxy(this.handleWorkerEvent.bind(this));
    this.workerProxy.addEventListener(HeapSnapshotWorkerProxy.Events.WAIT, event => {
      this.updateStatus(null, event.data);
    }, this);
    this.receiver = this.workerProxy.createLoader(this.uid, this.snapshotReceived.bind(this));
  }

  // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handleWorkerEvent(eventName: string, data: any): void {
    if (HeapSnapshotModel.HeapSnapshotModel.HeapSnapshotProgressEvent.BrokenSnapshot === eventName) {
      const error = (data as string);
      Common.Console.Console.instance().error(error);
      return;
    }

    if (HeapSnapshotModel.HeapSnapshotModel.HeapSnapshotProgressEvent.Update !== eventName) {
      return;
    }
    const serializedMessage = (data as string);
    const messageObject = i18n.i18n.deserializeUIString(serializedMessage);
    // We know all strings from the worker are declared inside a single file so we can
    // use a custom function.
    this.updateStatus(moduleI18nString(messageObject.string, messageObject.values));
  }

  override dispose(): void {
    if (this.workerProxy) {
      this.workerProxy.dispose();
    }
    this.removeTempFile();
    this.wasDisposed = true;
  }

  didCompleteSnapshotTransfer(): void {
    if (!this.snapshotProxy) {
      return;
    }
    this.updateStatus(Platform.NumberUtilities.bytesToString(this.snapshotProxy.totalSize), false);
  }

  transferChunk(chunk: string): void {
    if (!this.bufferedWriter) {
      this.bufferedWriter = new Bindings.TempFile.TempFile();
    }
    this.bufferedWriter.write([chunk]);

    ++this.totalNumberOfChunks;
    if (this.receiver) {
      void this.receiver.write(chunk);
    }
  }

  snapshotReceived(snapshotProxy: HeapSnapshotProxy): void {
    if (this.wasDisposed) {
      return;
    }
    this.receiver = null;
    this.snapshotProxy = snapshotProxy;
    this.maxJSObjectId = snapshotProxy.maxJSObjectId();
    this.didCompleteSnapshotTransfer();
    if (this.workerProxy) {
      this.workerProxy.startCheckingForLongRunningCalls();
    }
    this.notifySnapshotReceived();
  }

  notifySnapshotReceived(): void {
    if (this.snapshotProxy && this.fulfillLoad) {
      this.fulfillLoad(this.snapshotProxy);
    }
    (this.profileType() as HeapSnapshotProfileType).snapshotReceived(this);
  }

  override canSaveToFile(): boolean {
    return !this.fromFile();
  }

  override async saveToFile(): Promise<void> {
    await this.loadPromise;
    const fileOutputStream = new Bindings.FileUtils.FileOutputStream();
    this.fileName = this.fileName ||
        'Heap-' + Platform.DateUtilities.toISO8601Compact(new Date()) + this.profileType().fileExtension() as
            Platform.DevToolsPath.RawPathString;
    const onOpen = async(accepted: boolean): Promise<void> => {
      if (!accepted) {
        return;
      }
      if (this.failedToCreateTempFile) {
        Common.Console.Console.instance().error('Failed to open temp file with heap snapshot');
        void fileOutputStream.close();
        return;
      }
      if (this.tempFile) {
        const error = (await this.tempFile.copyToOutputStream(fileOutputStream, this.onChunkTransferred.bind(this)) as {
          message: string,
        } | null);
        if (error) {
          Common.Console.Console.instance().error('Failed to read heap snapshot from temp file: ' + error.message);
        }
        this.didCompleteSnapshotTransfer();
        return;
      }
      this.onTempFileReady = () => {
        void onOpen(accepted);
      };
      this.updateSaveProgress(0, 1);
    };

    await fileOutputStream.open(this.fileName).then(onOpen.bind(this));
  }

  onChunkTransferred(reader: Bindings.FileUtils.ChunkedReader): void {
    this.updateSaveProgress(reader.loadedSize(), reader.fileSize());
  }

  updateSaveProgress(value: number, total: number): void {
    const percentValue = ((total && value / total) * 100).toFixed(0);
    this.updateStatus(i18nString(UIStrings.savingD, {PH1: percentValue}));
  }

  override async loadFromFile(file: File): Promise<DOMError|null> {
    this.updateStatus(i18nString(UIStrings.loading), true);
    this.setupWorker();
    const reader = new Bindings.FileUtils.ChunkedFileReader(file, 10000000);
    const success = await reader.read((this.receiver as Common.StringOutputStream.OutputStream));
    if (!success) {
      const error = (reader.error() as {
        message: string,
      } | null);
      if (error) {
        this.updateStatus(error.message);
      }
    }
    return success ? null : reader.error();
  }

  override profileType(): HeapSnapshotProfileType {
    return super.profileType() as HeapSnapshotProfileType;
  }
}

export class HeapSnapshotStatisticsView extends UI.Widget.VBox {
  pieChart: PerfUI.PieChart.PieChart;
  constructor() {
    super();
    this.element.classList.add('heap-snapshot-statistics-view');
    this.element.setAttribute(
        'jslog', `${VisualLogging.pane('profiler.heap-snapshot-statistics-view').track({resize: true})}`);
    this.pieChart = new PerfUI.PieChart.PieChart();
    this.setTotalAndRecords(0, []);
    this.pieChart.classList.add('heap-snapshot-stats-pie-chart');
    this.element.appendChild(this.pieChart);
  }

  static valueFormatter(value: number): string {
    const formatter = new Intl.NumberFormat(i18n.DevToolsLocale.DevToolsLocale.instance().locale, {
      style: 'unit',
      unit: 'kilobyte',
    });
    return formatter.format(Math.round(value / 1000));
  }

  setTotalAndRecords(total: number, records: PerfUI.PieChart.Slice[]): void {
    this.pieChart.data = {
      chartName: i18nString(UIStrings.heapMemoryUsage),
      size: 150,
      formatter: HeapSnapshotStatisticsView.valueFormatter,
      showLegend: true,
      total,
      slices: records,
    };
  }
}

export class HeapAllocationStackView extends UI.Widget.Widget {
  readonly heapProfilerModel: SDK.HeapProfilerModel.HeapProfilerModel|null;
  readonly linkifier: Components.Linkifier.Linkifier;
  frameElements: HTMLElement[];
  constructor(heapProfilerModel: SDK.HeapProfilerModel.HeapProfilerModel|null) {
    super();
    this.heapProfilerModel = heapProfilerModel;
    this.linkifier = new Components.Linkifier.Linkifier();
    this.frameElements = [];
  }

  onContextMenu(link: Element, event: Event): void {
    const contextMenu = new UI.ContextMenu.ContextMenu(event);
    contextMenu.appendApplicableItems(link);
    void contextMenu.show();
    event.consume(true);
  }

  onStackViewKeydown(event: KeyboardEvent): void {
    const target = (event.target as HTMLElement | null);
    if (!target) {
      return;
    }
    if (event.key === 'Enter') {
      const link = stackFrameToURLElement.get(target);
      if (!link) {
        return;
      }
      const linkInfo = Components.Linkifier.Linkifier.linkInfo(link);
      if (!linkInfo) {
        return;
      }
      if (Components.Linkifier.Linkifier.invokeFirstAction(linkInfo)) {
        event.consume(true);
      }
      return;
    }

    let navDown;
    const keyboardEvent = (event as KeyboardEvent);
    if (keyboardEvent.key === 'ArrowUp') {
      navDown = false;
    } else if (keyboardEvent.key === 'ArrowDown') {
      navDown = true;
    } else {
      return;
    }

    const index = this.frameElements.indexOf(target);
    if (index === -1) {
      return;
    }
    const nextIndex = navDown ? index + 1 : index - 1;
    if (nextIndex < 0 || nextIndex >= this.frameElements.length) {
      return;
    }

    const nextFrame = this.frameElements[nextIndex];
    nextFrame.tabIndex = 0;
    target.tabIndex = -1;
    nextFrame.focus();
    event.consume(true);
  }

  async setAllocatedObject(snapshot: HeapSnapshotProxy, snapshotNodeIndex: number): Promise<void> {
    this.clear();
    const frames = await snapshot.allocationStack(snapshotNodeIndex);

    if (!frames) {
      const stackDiv = this.element.createChild('div', 'no-heap-allocation-stack');
      UI.UIUtils.createTextChild(stackDiv, i18nString(UIStrings.stackWasNotRecordedForThisObject));
      return;
    }

    const stackDiv = this.element.createChild('div', 'heap-allocation-stack');
    stackDiv.addEventListener('keydown', this.onStackViewKeydown.bind(this), false);
    for (const frame of frames) {
      const frameDiv = (stackDiv.createChild('div', 'stack-frame') as HTMLElement);
      this.frameElements.push(frameDiv);
      frameDiv.tabIndex = -1;
      const name = frameDiv.createChild('div');
      name.textContent = UI.UIUtils.beautifyFunctionName(frame.functionName);
      if (!frame.scriptId) {
        continue;
      }
      const target = this.heapProfilerModel ? this.heapProfilerModel.target() : null;
      const options = {columnNumber: frame.column - 1, inlineFrameIndex: 0};
      const urlElement = this.linkifier.linkifyScriptLocation(
          target, String(frame.scriptId) as Protocol.Runtime.ScriptId,
          frame.scriptName as Platform.DevToolsPath.UrlString, frame.line - 1, options);
      frameDiv.appendChild(urlElement);
      stackFrameToURLElement.set(frameDiv, urlElement);
      frameDiv.addEventListener('contextmenu', this.onContextMenu.bind(this, urlElement));
    }
    this.frameElements[0].tabIndex = 0;
  }

  clear(): void {
    this.element.removeChildren();
    this.frameElements = [];
    this.linkifier.reset();
  }
}

const stackFrameToURLElement = new WeakMap<HTMLElement, HTMLElement>();

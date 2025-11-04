// Copyright 2011 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-imperative-dom-api */
import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as Root from '../../core/root/root.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Bindings from '../../models/bindings/bindings.js';
import * as HeapSnapshotModel from '../../models/heap_snapshot_model/heap_snapshot_model.js';
import * as DataGrid from '../../ui/legacy/components/data_grid/data_grid.js';
import * as ObjectUI from '../../ui/legacy/components/object_ui/object_ui.js';
import * as PerfUI from '../../ui/legacy/components/perf_ui/perf_ui.js';
import * as SettingsUI from '../../ui/legacy/components/settings_ui/settings_ui.js';
import * as Components from '../../ui/legacy/components/utils/utils.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import { AllocationDataGrid, HeapSnapshotConstructorsDataGrid, HeapSnapshotContainmentDataGrid, HeapSnapshotDiffDataGrid, HeapSnapshotRetainmentDataGrid, HeapSnapshotSortableDataGridEvents, } from './HeapSnapshotDataGrids.js';
import { HeapSnapshotGenericObjectNode, } from './HeapSnapshotGridNodes.js';
import { HeapSnapshotWorkerProxy } from './HeapSnapshotProxy.js';
import { HeapTimelineOverview, Samples } from './HeapTimelineOverview.js';
import * as ModuleUIStrings from './ModuleUIStrings.js';
import { ProfileHeader, ProfileType, } from './ProfileHeader.js';
import { ProfileSidebarTreeElement } from './ProfileSidebarTreeElement.js';
import { instance } from './ProfileTypeRegistry.js';
const UIStrings = {
    /**
     * @description Text to find an item
     */
    find: 'Find',
    /**
     * @description Text in Heap Snapshot View of a profiler tool
     */
    containment: 'Containment',
    /**
     * @description Retaining paths title text content in Heap Snapshot View of a profiler tool
     */
    retainers: 'Retainers',
    /**
     * @description Text in Heap Snapshot View of a profiler tool
     */
    allocationStack: 'Allocation stack',
    /**
     * @description Screen reader label for a select box that chooses the perspective in the Memory panel when viewing a Heap Snapshot
     */
    perspective: 'Perspective',
    /**
     * @description Screen reader label for a select box that chooses the snapshot to use as a base in the Memory panel when viewing a Heap Snapshot
     */
    baseSnapshot: 'Base snapshot',
    /**
     * @description Text to filter result items
     */
    filter: 'Filter',
    /**
     * @description Placeholder text in the filter bar to filter by JavaScript class names for a heap
     */
    filterByClass: 'Filter by class',
    /**
     * @description Text in Heap Snapshot View of a profiler tool
     */
    code: 'Code',
    /**
     * @description Text in Heap Snapshot View of a profiler tool
     */
    strings: 'Strings',
    /**
     * @description Label on a pie chart in the statistics view for the Heap Snapshot tool
     */
    jsArrays: 'JS arrays',
    /**
     * @description Label on a pie chart in the statistics view for the Heap Snapshot tool
     */
    typedArrays: 'Typed arrays',
    /**
     * @description Label on a pie chart in the statistics view for the Heap Snapshot tool
     */
    systemObjects: 'System objects',
    /**
     * @description Label on a pie chart in the statistics view for the Heap Snapshot tool
     */
    otherJSObjects: 'Other JS objects',
    /**
     * @description Label on a pie chart in the statistics view for the Heap Snapshot tool
     */
    otherNonJSObjects: 'Other non-JS objects (such as HTML and CSS)',
    /**
     * @description The reported total size used in the selected time frame of the allocation sampling profile
     * @example {3 MB} PH1
     */
    selectedSizeS: 'Selected size: {PH1}',
    /**
     * @description Text in Heap Snapshot View of a profiler tool
     */
    allObjects: 'All objects',
    /**
     * @description Title in Heap Snapshot View of a profiler tool
     * @example {Profile 2} PH1
     */
    objectsAllocatedBeforeS: 'Objects allocated before {PH1}',
    /**
     * @description Title in Heap Snapshot View of a profiler tool
     * @example {Profile 1} PH1
     * @example {Profile 2} PH2
     */
    objectsAllocatedBetweenSAndS: 'Objects allocated between {PH1} and {PH2}',
    /**
     * @description An option which will filter the heap snapshot to show only
     * strings which exactly match at least one other string
     */
    duplicatedStrings: 'Duplicated strings',
    /**
     * @description An option which will filter the heap snapshot to show only
     * detached DOM nodes and other objects kept alive by detached DOM nodes
     */
    objectsRetainedByDetachedDomNodes: 'Objects retained by detached DOM nodes',
    /**
     * @description An option which will filter the heap snapshot to show only
     * objects kept alive by the DevTools console
     */
    objectsRetainedByConsole: 'Objects retained by DevTools Console',
    /**
     * @description An option which will filter the heap snapshot to show only
     * objects retained by event handlers
     */
    objectsRetainedByEventHandlers: 'Objects retained by Event Handlers',
    /**
     * @description Text for the summary view
     */
    summary: 'Summary',
    /**
     * @description Text in Heap Snapshot View of a profiler tool
     */
    comparison: 'Comparison',
    /**
     * @description Text in Heap Snapshot View of a profiler tool
     */
    allocation: 'Allocation',
    /**
     * @description Title text content in Heap Snapshot View of a profiler tool
     */
    liveObjects: 'Live objects',
    /**
     * @description Text in Heap Snapshot View of a profiler tool
     */
    statistics: 'Statistics',
    /**
     * @description Text in Heap Snapshot View of a profiler tool
     */
    heapSnapshot: 'Heap snapshot',
    /**
     * @description Text in Heap Snapshot View of a profiler tool
     */
    takeHeapSnapshot: 'Take heap snapshot',
    /**
     * @description Text in Heap Snapshot View of a profiler tool
     */
    heapSnapshots: 'Heap snapshots',
    /**
     * @description Text in Heap Snapshot View of a profiler tool
     */
    heapSnapshotProfilesShowMemory: 'See the memory distribution of JavaScript objects and related DOM nodes',
    /**
     * @description Label for a checkbox in the heap snapshot view of the profiler tool. The "heap snapshot" contains the
     * current state of JavaScript memory. With this checkbox enabled, the snapshot also includes internal data that is
     * specific to Chrome (hence implementation-specific).
     */
    exposeInternals: 'Internals with implementation details',
    /**
     * @description Progress update that the profiler is capturing a snapshot of the heap
     */
    snapshotting: 'Snapshotting…',
    /**
     * @description Profile title in Heap Snapshot View of a profiler tool
     * @example {1} PH1
     */
    snapshotD: 'Snapshot {PH1}',
    /**
     * @description Text for a percentage value
     * @example {13.0} PH1
     */
    percentagePlaceholder: '{PH1}%',
    /**
     * @description Text in Heap Snapshot View of a profiler tool
     */
    allocationInstrumentationOn: 'Allocations on timeline',
    /**
     * @description Text in Heap Snapshot View of a profiler tool
     */
    stopRecordingHeapProfile: 'Stop recording heap profile',
    /**
     * @description Text in Heap Snapshot View of a profiler tool
     */
    startRecordingHeapProfile: 'Start recording heap profile',
    /**
     * @description Text in Heap Snapshot View of a profiler tool.
     * A stack trace is a list of functions that were called.
     * This option turns on recording of a stack trace at each allocation.
     * The recording itself is a somewhat expensive operation, so turning this option on, the website's performance may be affected negatively (e.g. everything becomes slower).
     */
    recordAllocationStacksExtra: 'Allocation stack traces (more overhead)',
    /**
     * @description Text in CPUProfile View of a profiler tool
     */
    recording: 'Recording…',
    /**
     * @description Text in Heap Snapshot View of a profiler tool
     */
    allocationTimelines: 'Allocation timelines',
    /**
     * @description Description for the 'Allocation timeline' tool in the Memory panel.
     */
    AllocationTimelinesShowInstrumented: 'Record memory allocations over time and isolate memory leaks by selecting intervals with allocations that are still alive',
    /**
     * @description Text when something is loading
     */
    loading: 'Loading…',
    /**
     * @description Text in Heap Snapshot View of a profiler tool
     * @example {30} PH1
     */
    savingD: 'Saving… {PH1}%',
    /**
     * @description Text in Heap Snapshot View of a profiler tool
     */
    heapMemoryUsage: 'Heap memory usage',
    /**
     * @description Text of a DOM element in Heap Snapshot View of a profiler tool
     */
    stackWasNotRecordedForThisObject: 'Stack wasn\'t recorded for this object because it had been allocated before this profile recording started.',
    /**
     * @description Text in Heap Snapshot View of a profiler tool.
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
export class HeapSnapshotView extends UI.View.SimpleView {
    searchResults;
    profile;
    linkifier;
    parentDataDisplayDelegate;
    searchableViewInternal;
    splitWidget;
    containmentDataGrid;
    containmentWidget;
    statisticsView;
    constructorsDataGrid;
    constructorsWidget;
    diffDataGrid;
    diffWidget;
    allocationDataGrid;
    allocationWidget;
    allocationStackView;
    tabbedPane;
    retainmentDataGrid;
    retainmentWidget;
    objectDetailsView;
    perspectives;
    comparisonPerspective;
    perspectiveSelect;
    baseSelect;
    filterSelect;
    classNameFilter;
    selectedSizeText;
    resetRetainersButton;
    popoverHelper;
    currentPerspectiveIndex;
    currentPerspective;
    dataGrid;
    searchThrottler;
    baseProfile;
    trackingOverviewGrid;
    currentSearchResultIndex = -1;
    currentSearch;
    get currentQuery() {
        return this.currentSearch?.query;
    }
    set currentQuery(value) {
        if (this.currentSearch) {
            this.currentSearch.query = value;
        }
    }
    constructor(dataDisplayDelegate, profile) {
        super({
            title: i18nString(UIStrings.heapSnapshot),
            viewId: 'heap-snapshot',
        });
        this.searchResults = [];
        this.element.classList.add('heap-snapshot-view');
        this.profile = profile;
        this.linkifier = new Components.Linkifier.Linkifier();
        const profileType = profile.profileType();
        profileType.addEventListener("SnapshotReceived" /* HeapSnapshotProfileTypeEvents.SNAPSHOT_RECEIVED */, this.onReceiveSnapshot, this);
        profileType.addEventListener("remove-profile-header" /* ProfileTypeEvents.REMOVE_PROFILE_HEADER */, this.onProfileHeaderRemoved, this);
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
        this.containmentDataGrid = new HeapSnapshotContainmentDataGrid(heapProfilerModel, this, /* displayName */ i18nString(UIStrings.containment));
        this.containmentDataGrid.addEventListener("SelectedNode" /* DataGrid.DataGrid.Events.SELECTED_NODE */, this.selectionChanged, this);
        this.containmentWidget = this.containmentDataGrid.asWidget();
        this.containmentWidget.setMinimumSize(50, 25);
        this.statisticsView = new HeapSnapshotStatisticsView();
        this.constructorsDataGrid = new HeapSnapshotConstructorsDataGrid(heapProfilerModel, this);
        this.constructorsDataGrid.addEventListener("SelectedNode" /* DataGrid.DataGrid.Events.SELECTED_NODE */, this.selectionChanged, this);
        this.constructorsWidget = this.constructorsDataGrid.asWidget();
        this.constructorsWidget.setMinimumSize(50, 25);
        this.constructorsWidget.element.setAttribute('jslog', `${VisualLogging.pane('heap-snapshot.constructors-view').track({ resize: true })}`);
        this.diffDataGrid = new HeapSnapshotDiffDataGrid(heapProfilerModel, this);
        this.diffDataGrid.addEventListener("SelectedNode" /* DataGrid.DataGrid.Events.SELECTED_NODE */, this.selectionChanged, this);
        this.diffWidget = this.diffDataGrid.asWidget();
        this.diffWidget.setMinimumSize(50, 25);
        this.allocationDataGrid = null;
        if (isHeapTimeline && hasAllocationStacks) {
            this.allocationDataGrid = new AllocationDataGrid(heapProfilerModel, this);
            this.allocationDataGrid.addEventListener("SelectedNode" /* DataGrid.DataGrid.Events.SELECTED_NODE */, this.onSelectAllocationNode, this);
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
        this.retainmentWidget.element.setAttribute('jslog', `${VisualLogging.pane('heap-snapshot.retaining-paths-view').track({ resize: true })}`);
        let splitWidgetResizer;
        if (this.allocationStackView) {
            this.tabbedPane = new UI.TabbedPane.TabbedPane();
            this.tabbedPane.appendTab('retainers', i18nString(UIStrings.retainers), this.retainmentWidget);
            this.tabbedPane.appendTab('allocation-stack', i18nString(UIStrings.allocationStack), this.allocationStackView);
            splitWidgetResizer = this.tabbedPane.headerElement();
            this.objectDetailsView = this.tabbedPane;
        }
        else {
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
        this.retainmentDataGrid.addEventListener("SelectedNode" /* DataGrid.DataGrid.Events.SELECTED_NODE */, this.inspectedObjectChanged, this);
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
        this.perspectiveSelect = new UI.Toolbar.ToolbarComboBox(this.onSelectedPerspectiveChanged.bind(this), i18nString(UIStrings.perspective), undefined, 'profiler.heap-snapshot-perspective');
        this.updatePerspectiveOptions();
        this.baseSelect = new UI.Toolbar.ToolbarComboBox(this.changeBase.bind(this), i18nString(UIStrings.baseSnapshot), undefined, 'profiler.heap-snapshot-base');
        this.baseSelect.setVisible(false);
        this.updateBaseOptions();
        this.filterSelect = new UI.Toolbar.ToolbarComboBox(this.changeFilter.bind(this), i18nString(UIStrings.filter), undefined, 'profiler.heap-snapshot-filter');
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
        this.resetRetainersButton.addEventListener("Click" /* UI.Toolbar.ToolbarButton.Events.CLICK */, async () => {
            // The reset retainers button acts upon whichever snapshot is currently shown in the Retainers pane.
            await this.retainmentDataGrid.snapshot?.unignoreAllNodesInRetainersView();
            await this.retainmentDataGrid.dataSourceChanged();
        });
        this.retainmentDataGrid.resetRetainersButton = this.resetRetainersButton;
        this.popoverHelper = new UI.PopoverHelper.PopoverHelper(this.element, this.getPopoverRequest.bind(this), 'profiler.heap-snapshot-object');
        this.popoverHelper.setDisableOnClick(true);
        this.element.addEventListener('scroll', this.popoverHelper.hidePopover.bind(this.popoverHelper), true);
        this.currentPerspectiveIndex = 0;
        this.currentPerspective = this.perspectives[0];
        this.currentPerspective.activate(this);
        this.dataGrid = this.currentPerspective.masterGrid(this);
        void this.populate();
        this.searchThrottler = new Common.Throttler.Throttler(0);
        for (const existingProfile of this.profiles()) {
            existingProfile.addEventListener("ProfileTitleChanged" /* ProfileHeaderEvents.PROFILE_TITLE_CHANGED */, this.updateControls, this);
        }
    }
    createOverview() {
        const profileType = this.profile.profileType();
        this.trackingOverviewGrid = new HeapTimelineOverview();
        this.trackingOverviewGrid.addEventListener("IdsRangeChanged" /* Events.IDS_RANGE_CHANGED */, this.onIdsRangeChanged.bind(this));
        if (!this.profile.fromFile() && profileType.profileBeingRecorded() === this.profile) {
            profileType
                .addEventListener("HeapStatsUpdate" /* TrackingHeapSnapshotProfileTypeEvents.HEAP_STATS_UPDATE */, this.onHeapStatsUpdate, this);
            profileType
                .addEventListener("TrackingStopped" /* TrackingHeapSnapshotProfileTypeEvents.TRACKING_STOPPED */, this.onStopTracking, this);
            this.trackingOverviewGrid.start();
        }
    }
    onStopTracking() {
        const profileType = this.profile.profileType();
        profileType.removeEventListener("HeapStatsUpdate" /* TrackingHeapSnapshotProfileTypeEvents.HEAP_STATS_UPDATE */, this.onHeapStatsUpdate, this);
        profileType.removeEventListener("TrackingStopped" /* TrackingHeapSnapshotProfileTypeEvents.TRACKING_STOPPED */, this.onStopTracking, this);
        if (this.trackingOverviewGrid) {
            this.trackingOverviewGrid.stop();
        }
    }
    onHeapStatsUpdate({ data: samples }) {
        if (this.trackingOverviewGrid) {
            this.trackingOverviewGrid.setSamples(samples);
        }
    }
    searchableView() {
        return this.searchableViewInternal;
    }
    showProfile(profile) {
        return this.parentDataDisplayDelegate.showProfile(profile);
    }
    showObject(snapshotObjectId, perspectiveName) {
        if (Number(snapshotObjectId) <= this.profile.maxJSObjectId) {
            void this.selectLiveObject(perspectiveName, snapshotObjectId);
        }
        else {
            this.parentDataDisplayDelegate.showObject(snapshotObjectId, perspectiveName);
        }
    }
    async linkifyObject(nodeIndex) {
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
        const rawLocation = debuggerModel.createRawLocationByScriptId(String(location.scriptId), location.lineNumber, location.columnNumber);
        if (!rawLocation) {
            return null;
        }
        const script = rawLocation.script();
        const sourceURL = script?.sourceURL;
        return sourceURL && this.linkifier ? this.linkifier.linkifyRawLocation(rawLocation, sourceURL) : null;
    }
    async populate() {
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
    async retrieveStatistics(heapSnapshotProxy) {
        const statistics = await heapSnapshotProxy.getStatistics();
        const { v8heap, native } = statistics;
        const otherJSObjectsSize = v8heap.total - v8heap.code - v8heap.strings - v8heap.jsArrays - v8heap.system;
        const records = [
            { value: v8heap.code, color: 'var(--app-color-code)', title: i18nString(UIStrings.code) },
            { value: v8heap.strings, color: 'var(--app-color-strings)', title: i18nString(UIStrings.strings) },
            { value: v8heap.jsArrays, color: 'var(--app-color-js-arrays)', title: i18nString(UIStrings.jsArrays) },
            { value: native.typedArrays, color: 'var(--app-color-typed-arrays)', title: i18nString(UIStrings.typedArrays) },
            { value: v8heap.system, color: 'var(--app-color-system)', title: i18nString(UIStrings.systemObjects) },
            {
                value: otherJSObjectsSize,
                color: 'var(--app-color-other-js-objects)',
                title: i18nString(UIStrings.otherJSObjects)
            },
            {
                value: native.total - native.typedArrays,
                color: 'var(--app-color-other-non-js-objects)',
                title: i18nString(UIStrings.otherNonJSObjects)
            },
        ];
        this.statisticsView.setTotalAndRecords(statistics.total, records);
        return statistics;
    }
    onIdsRangeChanged(event) {
        const { minId, maxId } = event.data;
        this.selectedSizeText.setText(i18nString(UIStrings.selectedSizeS, { PH1: i18n.ByteUtilities.bytesToString(event.data.size) }));
        if (this.constructorsDataGrid.snapshot) {
            this.constructorsDataGrid.setSelectionRange(minId, maxId);
        }
    }
    async toolbarItems() {
        const result = [this.perspectiveSelect, this.classNameFilter];
        if (this.profile.profileType() !== instance.trackingHeapSnapshotProfileType) {
            result.push(this.baseSelect, this.filterSelect);
        }
        result.push(this.selectedSizeText);
        result.push(this.resetRetainersButton);
        return result;
    }
    willHide() {
        super.willHide();
        this.currentSearchResultIndex = -1;
        this.popoverHelper.hidePopover();
    }
    supportsCaseSensitiveSearch() {
        return true;
    }
    supportsWholeWordSearch() {
        return false;
    }
    supportsRegexSearch() {
        return false;
    }
    onSearchCanceled() {
        this.currentSearchResultIndex = -1;
        this.searchResults = [];
    }
    selectRevealedNode(node) {
        if (node) {
            node.select();
        }
    }
    performSearch(searchConfig, shouldJump, jumpBackwards) {
        const nextQuery = new HeapSnapshotModel.HeapSnapshotModel.SearchConfig(searchConfig.query.trim(), searchConfig.caseSensitive, searchConfig.wholeWord, searchConfig.isRegex, shouldJump, jumpBackwards || false);
        void this.searchThrottler.schedule(this.performSearchInternal.bind(this, nextQuery));
    }
    async performSearchInternal(nextQuery) {
        // Call onSearchCanceled since it will reset everything we need before doing a new search.
        this.onSearchCanceled();
        if (!this.currentPerspective.supportsSearch()) {
            return;
        }
        this.currentSearch = nextQuery;
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
        this.searchResults = filter ? await this.profile.snapshotProxy.search(this.currentSearch, filter) : [];
        this.searchableViewInternal.updateSearchMatchesCount(this.searchResults.length);
        if (this.searchResults.length) {
            this.currentSearchResultIndex = nextQuery.jumpBackward ? this.searchResults.length - 1 : 0;
        }
        await this.jumpToSearchResult(this.currentSearchResultIndex);
    }
    jumpToNextSearchResult() {
        if (!this.searchResults.length) {
            return;
        }
        this.currentSearchResultIndex = (this.currentSearchResultIndex + 1) % this.searchResults.length;
        void this.searchThrottler.schedule(this.jumpToSearchResult.bind(this, this.currentSearchResultIndex));
    }
    jumpToPreviousSearchResult() {
        if (!this.searchResults.length) {
            return;
        }
        this.currentSearchResultIndex =
            (this.currentSearchResultIndex + this.searchResults.length - 1) % this.searchResults.length;
        void this.searchThrottler.schedule(this.jumpToSearchResult.bind(this, this.currentSearchResultIndex));
    }
    async jumpToSearchResult(searchResultIndex) {
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
    refreshVisibleData() {
        if (!this.dataGrid) {
            return;
        }
        let child = this.dataGrid.rootNode().children[0];
        while (child) {
            child.refresh();
            child = child.traverseNextNode(false, null, true);
        }
    }
    changeBase() {
        if (this.baseProfile === this.profiles()[this.baseSelect.selectedIndex()]) {
            return;
        }
        this.baseProfile = this.profiles()[this.baseSelect.selectedIndex()];
        const dataGrid = this.dataGrid;
        // Change set base data source only if main data source is already set.
        if (dataGrid.snapshot) {
            void this.baseProfile.loadPromise.then(dataGrid.setBaseDataSource.bind(dataGrid));
        }
        if (!this.currentSearch || !this.searchResults) {
            return;
        }
        // The current search needs to be performed again. First negate out previous match
        // count by calling the search finished callback with a negative number of matches.
        // Then perform the search again with the same query and callback.
        this.performSearch(this.currentSearch, false);
    }
    static ALWAYS_AVAILABLE_FILTERS = [
        { uiName: i18nString(UIStrings.duplicatedStrings), filterName: 'duplicatedStrings' },
        { uiName: i18nString(UIStrings.objectsRetainedByDetachedDomNodes), filterName: 'objectsRetainedByDetachedDomNodes' },
        { uiName: i18nString(UIStrings.objectsRetainedByConsole), filterName: 'objectsRetainedByConsole' },
        { uiName: i18nString(UIStrings.objectsRetainedByEventHandlers), filterName: 'objectsRetainedByEventHandlers' },
    ];
    changeFilter() {
        let selectedIndex = this.filterSelect.selectedIndex();
        let filterName = undefined;
        const indexOfFirstAlwaysAvailableFilter = this.filterSelect.size() - HeapSnapshotView.ALWAYS_AVAILABLE_FILTERS.length;
        if (selectedIndex >= indexOfFirstAlwaysAvailableFilter) {
            filterName =
                HeapSnapshotView.ALWAYS_AVAILABLE_FILTERS[selectedIndex - indexOfFirstAlwaysAvailableFilter].filterName;
            selectedIndex = 0;
        }
        const profileIndex = selectedIndex - 1;
        if (!this.dataGrid) {
            return;
        }
        this.dataGrid
            .filterSelectIndexChanged(this.profiles(), profileIndex, filterName);
        if (!this.currentSearch || !this.searchResults) {
            return;
        }
        // The current search needs to be performed again. First negate out previous match
        // count by calling the search finished callback with a negative number of matches.
        // Then perform the search again with the same query and callback.
        this.performSearch(this.currentSearch, false);
    }
    profiles() {
        return this.profile.profileType().getProfiles();
    }
    selectionChanged(event) {
        const selectedNode = event.data;
        this.setSelectedNodeForDetailsView(selectedNode);
        this.inspectedObjectChanged(event);
    }
    onSelectAllocationNode(event) {
        const selectedNode = event.data;
        this.constructorsDataGrid.setAllocationNodeId(selectedNode.allocationNodeId());
        this.setSelectedNodeForDetailsView(null);
    }
    inspectedObjectChanged(event) {
        const selectedNode = event.data;
        const heapProfilerModel = this.profile.heapProfilerModel();
        if (heapProfilerModel && selectedNode instanceof HeapSnapshotGenericObjectNode) {
            void heapProfilerModel.addInspectedHeapObject(String(selectedNode.snapshotNodeId));
        }
    }
    setSelectedNodeForDetailsView(nodeItem) {
        const dataSource = nodeItem?.retainersDataSource();
        if (dataSource) {
            void this.retainmentDataGrid.setDataSource(dataSource.snapshot, dataSource.snapshotNodeIndex, dataSource.snapshotNodeId);
            if (this.allocationStackView) {
                void this.allocationStackView.setAllocatedObject(dataSource.snapshot, dataSource.snapshotNodeIndex);
            }
        }
        else {
            if (this.allocationStackView) {
                this.allocationStackView.clear();
            }
            this.retainmentDataGrid.reset();
        }
    }
    async changePerspectiveAndWait(perspectiveTitle) {
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
        this.perspectiveSelect.select(option);
        this.changePerspective(perspectiveIndex);
        await promise;
    }
    async updateDataSourceAndView() {
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
            this.baseProfile = this.profiles()[this.baseSelect.selectedIndex()];
        }
        const baseSnapshotProxy = await this.baseProfile.loadPromise;
        if (this.diffDataGrid.baseSnapshot !== baseSnapshotProxy) {
            this.diffDataGrid.setBaseDataSource(baseSnapshotProxy);
        }
    }
    onSelectedPerspectiveChanged(event) {
        this.changePerspective(Number(event.target.selectedOptions[0].value));
    }
    changePerspective(selectedIndex) {
        if (selectedIndex === this.currentPerspectiveIndex) {
            return;
        }
        this.currentPerspectiveIndex = selectedIndex;
        this.currentPerspective.deactivate(this);
        const perspective = this.perspectives[selectedIndex];
        this.currentPerspective = perspective;
        this.dataGrid = perspective.masterGrid(this);
        perspective.activate(this);
        this.refreshVisibleData();
        if (this.dataGrid) {
            this.dataGrid.updateWidths();
        }
        void this.updateDataSourceAndView();
        if (!this.currentSearch || !this.searchResults) {
            return;
        }
        // The current search needs to be performed again. First negate out previous match
        // count by calling the search finished callback with a negative number of matches.
        // Then perform the search again the with same query and callback.
        this.performSearch(this.currentSearch, false);
    }
    async selectLiveObject(perspectiveName, snapshotObjectId) {
        await this.changePerspectiveAndWait(perspectiveName);
        if (!this.dataGrid) {
            return;
        }
        const node = await this.dataGrid.revealObjectByHeapSnapshotId(snapshotObjectId);
        if (node) {
            node.select();
        }
        else {
            Common.Console.Console.instance().error('Cannot find corresponding heap snapshot node');
        }
    }
    getPopoverRequest(event) {
        const span = UI.UIUtils.enclosingNodeOrSelfWithNodeName(event.target, 'span');
        const row = UI.UIUtils.enclosingNodeOrSelfWithNodeName(event.target, 'tr');
        if (!row) {
            return null;
        }
        if (!this.dataGrid) {
            return null;
        }
        const node = this.dataGrid.dataGridNodeFromNode(row) || this.containmentDataGrid.dataGridNodeFromNode(row) ||
            this.constructorsDataGrid.dataGridNodeFromNode(row) || this.diffDataGrid.dataGridNodeFromNode(row) ||
            (this.allocationDataGrid?.dataGridNodeFromNode(row)) || this.retainmentDataGrid.dataGridNodeFromNode(row);
        const heapProfilerModel = this.profile.heapProfilerModel();
        if (!node || !span || !heapProfilerModel) {
            return null;
        }
        let objectPopoverHelper;
        return {
            // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration)
            // @ts-expect-error
            box: span.boxInWindow(),
            show: async (popover) => {
                if (!heapProfilerModel) {
                    return false;
                }
                const remoteObject = await node.queryObjectContent(heapProfilerModel, 'popover');
                if (remoteObject instanceof SDK.RemoteObject.RemoteObject) {
                    objectPopoverHelper =
                        await ObjectUI.ObjectPopoverHelper.ObjectPopoverHelper.buildObjectPopover(remoteObject, popover);
                }
                else {
                    objectPopoverHelper = ObjectUI.ObjectPopoverHelper.ObjectPopoverHelper.buildDescriptionPopover(remoteObject.description, remoteObject.link, popover);
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
    updatePerspectiveOptions() {
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
    updateBaseOptions() {
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
    updateFilterOptions() {
        const list = this.profiles();
        const selectedIndex = this.filterSelect.selectedIndex();
        const originalSize = this.filterSelect.size();
        this.filterSelect.removeOptions();
        this.filterSelect.createOption(i18nString(UIStrings.allObjects));
        for (let i = 0; i < list.length; ++i) {
            let title;
            if (!i) {
                title = i18nString(UIStrings.objectsAllocatedBeforeS, { PH1: list[i].title });
            }
            else {
                title = i18nString(UIStrings.objectsAllocatedBetweenSAndS, { PH1: list[i - 1].title, PH2: list[i].title });
            }
            this.filterSelect.createOption(title);
        }
        // Create a dividing line using em dashes.
        const dividerIndex = this.filterSelect.size();
        const divider = this.filterSelect.createOption('\u2014'.repeat(18));
        (divider).disabled = true;
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
            }
            else if (selectedIndex >= dividerIndex) {
                // If the select list is now shorter than it was, such that we can't
                // keep the index unchanged, set it to -1, which causes it to be blank.
                this.filterSelect.setSelectedIndex(-1);
            }
            else {
                this.filterSelect.setSelectedIndex(selectedIndex);
            }
        }
    }
    updateControls() {
        this.updatePerspectiveOptions();
        this.updateBaseOptions();
        this.updateFilterOptions();
    }
    onReceiveSnapshot(event) {
        this.updateControls();
        const profile = event.data;
        profile.addEventListener("ProfileTitleChanged" /* ProfileHeaderEvents.PROFILE_TITLE_CHANGED */, this.updateControls, this);
    }
    onProfileHeaderRemoved(event) {
        const profile = event.data;
        profile.removeEventListener("ProfileTitleChanged" /* ProfileHeaderEvents.PROFILE_TITLE_CHANGED */, this.updateControls, this);
        if (this.profile === profile) {
            this.detach();
            this.profile.profileType().removeEventListener("SnapshotReceived" /* HeapSnapshotProfileTypeEvents.SNAPSHOT_RECEIVED */, this.onReceiveSnapshot, this);
            this.profile.profileType().removeEventListener("remove-profile-header" /* ProfileTypeEvents.REMOVE_PROFILE_HEADER */, this.onProfileHeaderRemoved, this);
            this.dispose();
        }
        else {
            this.updateControls();
        }
    }
    dispose() {
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
            this.trackingOverviewGrid.removeEventListener("IdsRangeChanged" /* Events.IDS_RANGE_CHANGED */, this.onIdsRangeChanged.bind(this));
        }
    }
}
export class Perspective {
    titleInternal;
    constructor(title) {
        this.titleInternal = title;
    }
    activate(_heapSnapshotView) {
    }
    deactivate(heapSnapshotView) {
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
    masterGrid(_heapSnapshotView) {
        return null;
    }
    title() {
        return this.titleInternal;
    }
    supportsSearch() {
        return false;
    }
}
export class SummaryPerspective extends Perspective {
    constructor() {
        super(i18nString(UIStrings.summary));
    }
    activate(heapSnapshotView) {
        heapSnapshotView.splitWidget.setMainWidget(heapSnapshotView.constructorsWidget);
        heapSnapshotView.splitWidget.setSidebarWidget(heapSnapshotView.objectDetailsView);
        heapSnapshotView.splitWidget.show(heapSnapshotView.searchableViewInternal.element);
        heapSnapshotView.filterSelect.setVisible(true);
        heapSnapshotView.classNameFilter.setVisible(true);
        if (!heapSnapshotView.trackingOverviewGrid) {
            return;
        }
        heapSnapshotView.trackingOverviewGrid.show(heapSnapshotView.searchableViewInternal.element, heapSnapshotView.splitWidget.element);
        heapSnapshotView.trackingOverviewGrid.update();
        heapSnapshotView.trackingOverviewGrid.updateGrid();
    }
    masterGrid(heapSnapshotView) {
        return heapSnapshotView.constructorsDataGrid;
    }
    supportsSearch() {
        return true;
    }
}
export class ComparisonPerspective extends Perspective {
    constructor() {
        super(i18nString(UIStrings.comparison));
    }
    activate(heapSnapshotView) {
        heapSnapshotView.splitWidget.setMainWidget(heapSnapshotView.diffWidget);
        heapSnapshotView.splitWidget.setSidebarWidget(heapSnapshotView.objectDetailsView);
        heapSnapshotView.splitWidget.show(heapSnapshotView.searchableViewInternal.element);
        heapSnapshotView.baseSelect.setVisible(true);
        heapSnapshotView.classNameFilter.setVisible(true);
    }
    masterGrid(heapSnapshotView) {
        return heapSnapshotView.diffDataGrid;
    }
    supportsSearch() {
        return true;
    }
}
export class ContainmentPerspective extends Perspective {
    constructor() {
        super(i18nString(UIStrings.containment));
    }
    activate(heapSnapshotView) {
        heapSnapshotView.splitWidget.setMainWidget(heapSnapshotView.containmentWidget);
        heapSnapshotView.splitWidget.setSidebarWidget(heapSnapshotView.objectDetailsView);
        heapSnapshotView.splitWidget.show(heapSnapshotView.searchableViewInternal.element);
    }
    masterGrid(heapSnapshotView) {
        return heapSnapshotView.containmentDataGrid;
    }
}
export class AllocationPerspective extends Perspective {
    allocationSplitWidget;
    constructor() {
        super(i18nString(UIStrings.allocation));
        this.allocationSplitWidget =
            new UI.SplitWidget.SplitWidget(false, true, 'heap-snapshot-allocation-split-view-state', 200, 200);
        this.allocationSplitWidget.setSidebarWidget(new UI.Widget.VBox());
    }
    activate(heapSnapshotView) {
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
            const selectedNode = heapSnapshotView.allocationDataGrid.selectedNode;
            if (selectedNode) {
                heapSnapshotView.constructorsDataGrid.setAllocationNodeId(selectedNode.allocationNodeId());
            }
        }
    }
    deactivate(heapSnapshotView) {
        this.allocationSplitWidget.detach();
        super.deactivate(heapSnapshotView);
    }
    masterGrid(heapSnapshotView) {
        return heapSnapshotView.allocationDataGrid;
    }
}
export class StatisticsPerspective extends Perspective {
    constructor() {
        super(i18nString(UIStrings.statistics));
    }
    activate(heapSnapshotView) {
        heapSnapshotView.statisticsView.show(heapSnapshotView.searchableViewInternal.element);
    }
    masterGrid(_heapSnapshotView) {
        return null;
    }
}
export class HeapSnapshotProfileType extends Common.ObjectWrapper.eventMixin(ProfileType) {
    exposeInternals;
    customContentInternal;
    constructor(id, title) {
        super(id || HeapSnapshotProfileType.TypeId, title || i18nString(UIStrings.heapSnapshot));
        SDK.TargetManager.TargetManager.instance().observeModels(SDK.HeapProfilerModel.HeapProfilerModel, this);
        SDK.TargetManager.TargetManager.instance().addModelListener(SDK.HeapProfilerModel.HeapProfilerModel, "ResetProfiles" /* SDK.HeapProfilerModel.Events.RESET_PROFILES */, this.resetProfiles, this);
        SDK.TargetManager.TargetManager.instance().addModelListener(SDK.HeapProfilerModel.HeapProfilerModel, "AddHeapSnapshotChunk" /* SDK.HeapProfilerModel.Events.ADD_HEAP_SNAPSHOT_CHUNK */, this.addHeapSnapshotChunk, this);
        SDK.TargetManager.TargetManager.instance().addModelListener(SDK.HeapProfilerModel.HeapProfilerModel, "ReportHeapSnapshotProgress" /* SDK.HeapProfilerModel.Events.REPORT_HEAP_SNAPSHOT_PROGRESS */, this.reportHeapSnapshotProgress, this);
        this.exposeInternals = Common.Settings.Settings.instance().createSetting('expose-internals', false);
        this.customContentInternal = null;
    }
    modelAdded(heapProfilerModel) {
        void heapProfilerModel.enable();
    }
    modelRemoved(_heapProfilerModel) {
    }
    getProfiles() {
        return super.getProfiles();
    }
    fileExtension() {
        return '.heapsnapshot';
    }
    get buttonTooltip() {
        return i18nString(UIStrings.takeHeapSnapshot);
    }
    isInstantProfile() {
        return true;
    }
    buttonClicked() {
        void this.takeHeapSnapshot();
        Host.userMetrics.actionTaken(Host.UserMetrics.Action.ProfilesHeapProfileTaken);
        return false;
    }
    get treeItemTitle() {
        return i18nString(UIStrings.heapSnapshots);
    }
    get description() {
        return i18nString(UIStrings.heapSnapshotProfilesShowMemory);
    }
    customContent() {
        const showOptionToExposeInternalsInHeapSnapshot = Root.Runtime.experiments.isEnabled('show-option-tp-expose-internals-in-heap-snapshot');
        const exposeInternalsInHeapSnapshotCheckbox = SettingsUI.SettingsUI.createSettingCheckbox(i18nString(UIStrings.exposeInternals), this.exposeInternals);
        this.customContentInternal = exposeInternalsInHeapSnapshotCheckbox;
        return showOptionToExposeInternalsInHeapSnapshot ? exposeInternalsInHeapSnapshotCheckbox : null;
    }
    setCustomContentEnabled(enable) {
        if (this.customContentInternal) {
            this.customContentInternal.disabled = !enable;
        }
    }
    createProfileLoadedFromFile(title) {
        return new HeapProfileHeader(null, this, title);
    }
    async takeHeapSnapshot() {
        if (this.profileBeingRecorded()) {
            return;
        }
        const heapProfilerModel = UI.Context.Context.instance().flavor(SDK.HeapProfilerModel.HeapProfilerModel);
        if (!heapProfilerModel) {
            return;
        }
        let profile = new HeapProfileHeader(heapProfilerModel, this);
        this.setProfileBeingRecorded(profile);
        this.addProfile(profile);
        profile.updateStatus(i18nString(UIStrings.snapshotting));
        // Release all the animations before taking a heap snapshot.
        // The animations are stored for replay in the animations panel and they might cause
        // detached nodes to appear in snapshots. Because of this, we release
        // all the animations first before taking a heap snapshot.
        const animationModel = heapProfilerModel.target().model(SDK.AnimationModel.AnimationModel);
        if (animationModel) {
            await animationModel.releaseAllAnimations();
        }
        await heapProfilerModel.takeHeapSnapshot({
            reportProgress: true,
            captureNumericValue: true,
            exposeInternals: this.exposeInternals.get(),
        });
        profile = this.profileBeingRecorded();
        if (!profile) {
            return;
        }
        profile.title = i18nString(UIStrings.snapshotD, { PH1: profile.uid });
        profile.finishLoad();
        this.setProfileBeingRecorded(null);
        this.dispatchEventToListeners("profile-complete" /* ProfileTypeEvents.PROFILE_COMPLETE */, profile);
    }
    addHeapSnapshotChunk(event) {
        const profile = this.profileBeingRecorded();
        if (!profile) {
            return;
        }
        profile.transferChunk(event.data);
    }
    reportHeapSnapshotProgress(event) {
        const profile = this.profileBeingRecorded();
        if (!profile) {
            return;
        }
        const { done, total, finished } = event.data;
        profile.updateStatus(i18nString(UIStrings.percentagePlaceholder, { PH1: ((done / total) * 100).toFixed(0) }), true);
        if (finished) {
            profile.prepareToLoad();
        }
    }
    resetProfiles(event) {
        const heapProfilerModel = event.data;
        for (const profile of this.getProfiles()) {
            if (profile.heapProfilerModel() === heapProfilerModel) {
                this.removeProfile(profile);
            }
        }
    }
    snapshotReceived(profile) {
        if (this.profileBeingRecorded() === profile) {
            this.setProfileBeingRecorded(null);
        }
        this.dispatchEventToListeners("SnapshotReceived" /* HeapSnapshotProfileTypeEvents.SNAPSHOT_RECEIVED */, profile);
    }
    // eslint-disable-next-line @typescript-eslint/naming-convention
    static TypeId = 'HEAP';
    // TODO(crbug.com/1228674): Remove event string once its no longer used in web tests.
    // eslint-disable-next-line @typescript-eslint/naming-convention
    static SnapshotReceived = 'SnapshotReceived';
}
export class TrackingHeapSnapshotProfileType extends Common.ObjectWrapper.eventMixin(HeapSnapshotProfileType) {
    recordAllocationStacksSettingInternal;
    customContentInternal;
    recording;
    profileSamples;
    constructor() {
        super(TrackingHeapSnapshotProfileType.TypeId, i18nString(UIStrings.allocationInstrumentationOn));
        this.recordAllocationStacksSettingInternal =
            Common.Settings.Settings.instance().createSetting('record-allocation-stacks', false);
        this.customContentInternal = null;
        this.recording = false;
    }
    modelAdded(heapProfilerModel) {
        super.modelAdded(heapProfilerModel);
        heapProfilerModel.addEventListener("HeapStatsUpdate" /* SDK.HeapProfilerModel.Events.HEAP_STATS_UPDATED */, this.heapStatsUpdate, this);
        heapProfilerModel.addEventListener("LastSeenObjectId" /* SDK.HeapProfilerModel.Events.LAST_SEEN_OBJECT_ID */, this.lastSeenObjectId, this);
    }
    modelRemoved(heapProfilerModel) {
        super.modelRemoved(heapProfilerModel);
        heapProfilerModel.removeEventListener("HeapStatsUpdate" /* SDK.HeapProfilerModel.Events.HEAP_STATS_UPDATED */, this.heapStatsUpdate, this);
        heapProfilerModel.removeEventListener("LastSeenObjectId" /* SDK.HeapProfilerModel.Events.LAST_SEEN_OBJECT_ID */, this.lastSeenObjectId, this);
    }
    heapStatsUpdate(event) {
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
    lastSeenObjectId(event) {
        const profileSamples = this.profileSamples;
        if (!profileSamples) {
            return;
        }
        const { lastSeenObjectId, timestamp } = event.data;
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
            this.dispatchEventToListeners("HeapStatsUpdate" /* TrackingHeapSnapshotProfileTypeEvents.HEAP_STATS_UPDATE */, this.profileSamples);
        }
        const profile = this.profileBeingRecorded();
        if (profile) {
            profile.updateStatus(null, true);
        }
    }
    hasTemporaryView() {
        return true;
    }
    get buttonTooltip() {
        return this.recording ? i18nString(UIStrings.stopRecordingHeapProfile) :
            i18nString(UIStrings.startRecordingHeapProfile);
    }
    isInstantProfile() {
        return false;
    }
    buttonClicked() {
        return this.toggleRecording();
    }
    async startRecordingProfile() {
        if (this.profileBeingRecorded()) {
            return;
        }
        const heapProfilerModel = this.addNewProfile();
        if (!heapProfilerModel) {
            return;
        }
        const animationModel = heapProfilerModel.target().model(SDK.AnimationModel.AnimationModel);
        if (animationModel) {
            // TODO(b/406904348): Remove this once we correctly release animations on the backend.
            await animationModel.releaseAllAnimations();
        }
        void heapProfilerModel.startTrackingHeapObjects(this.recordAllocationStacksSettingInternal.get());
    }
    customContent() {
        const checkboxSetting = SettingsUI.SettingsUI.createSettingCheckbox(i18nString(UIStrings.recordAllocationStacksExtra), this.recordAllocationStacksSettingInternal);
        this.customContentInternal = (checkboxSetting);
        return checkboxSetting;
    }
    setCustomContentEnabled(enable) {
        if (this.customContentInternal) {
            this.customContentInternal.disabled = !enable;
        }
    }
    recordAllocationStacksSetting() {
        return this.recordAllocationStacksSettingInternal;
    }
    addNewProfile() {
        const heapProfilerModel = UI.Context.Context.instance().flavor(SDK.HeapProfilerModel.HeapProfilerModel);
        if (!heapProfilerModel) {
            return null;
        }
        this.setProfileBeingRecorded(new HeapProfileHeader(heapProfilerModel, this, undefined));
        this.profileSamples = new Samples();
        // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        this.profileBeingRecorded()._profileSamples = this.profileSamples;
        this.recording = true;
        this.addProfile(this.profileBeingRecorded());
        this.profileBeingRecorded().updateStatus(i18nString(UIStrings.recording));
        this.dispatchEventToListeners("TrackingStarted" /* TrackingHeapSnapshotProfileTypeEvents.TRACKING_STARTED */);
        return heapProfilerModel;
    }
    async stopRecordingProfile() {
        let profile = this.profileBeingRecorded();
        profile.updateStatus(i18nString(UIStrings.snapshotting));
        const stopPromise = profile.heapProfilerModel().stopTrackingHeapObjects(true);
        this.recording = false;
        this.dispatchEventToListeners("TrackingStopped" /* TrackingHeapSnapshotProfileTypeEvents.TRACKING_STOPPED */);
        await stopPromise;
        profile = this.profileBeingRecorded();
        if (!profile) {
            return;
        }
        profile.finishLoad();
        this.profileSamples = null;
        this.setProfileBeingRecorded(null);
        this.dispatchEventToListeners("profile-complete" /* ProfileTypeEvents.PROFILE_COMPLETE */, profile);
    }
    toggleRecording() {
        if (this.recording) {
            void this.stopRecordingProfile();
        }
        else {
            void this.startRecordingProfile();
        }
        return this.recording;
    }
    fileExtension() {
        return '.heaptimeline';
    }
    get treeItemTitle() {
        return i18nString(UIStrings.allocationTimelines);
    }
    get description() {
        return i18nString(UIStrings.AllocationTimelinesShowInstrumented);
    }
    resetProfiles(event) {
        const wasRecording = this.recording;
        // Clear current profile to avoid stopping backend.
        this.setProfileBeingRecorded(null);
        super.resetProfiles(event);
        this.profileSamples = null;
        if (wasRecording) {
            this.addNewProfile();
        }
    }
    profileBeingRecordedRemoved() {
        void this.stopRecordingProfile();
        this.profileSamples = null;
    }
    // eslint-disable-next-line @typescript-eslint/naming-convention
    static TypeId = 'HEAP-RECORD';
    // TODO(crbug.com/1228674): Remove event strings once they are no longer used in web tests.
    // eslint-disable-next-line @typescript-eslint/naming-convention
    static HeapStatsUpdate = 'HeapStatsUpdate';
    // eslint-disable-next-line @typescript-eslint/naming-convention
    static TrackingStarted = 'TrackingStarted';
    // eslint-disable-next-line @typescript-eslint/naming-convention
    static TrackingStopped = 'TrackingStopped';
}
export class HeapProfileHeader extends ProfileHeader {
    heapProfilerModelInternal;
    maxJSObjectId;
    workerProxy;
    receiver;
    snapshotProxy;
    loadPromise;
    fulfillLoad;
    totalNumberOfChunks;
    bufferedWriter;
    onTempFileReady;
    failedToCreateTempFile;
    wasDisposed;
    fileName;
    constructor(heapProfilerModel, type, title) {
        super(type, title || i18nString(UIStrings.snapshotD, { PH1: type.nextProfileUid() }));
        this.heapProfilerModelInternal = heapProfilerModel;
        this.maxJSObjectId = -1;
        this.workerProxy = null;
        this.receiver = null;
        this.snapshotProxy = null;
        const { promise, resolve } = Promise.withResolvers();
        this.loadPromise = promise;
        this.fulfillLoad = resolve;
        this.totalNumberOfChunks = 0;
        this.bufferedWriter = null;
        this.onTempFileReady = null;
    }
    heapProfilerModel() {
        return this.heapProfilerModelInternal;
    }
    async getLocation(nodeIndex) {
        if (!this.snapshotProxy) {
            return null;
        }
        return await this.snapshotProxy.getLocation(nodeIndex);
    }
    createSidebarTreeElement(dataDisplayDelegate) {
        return new ProfileSidebarTreeElement(dataDisplayDelegate, this, 'heap-snapshot-sidebar-tree-item');
    }
    createView(dataDisplayDelegate) {
        return new HeapSnapshotView(dataDisplayDelegate, this);
    }
    prepareToLoad() {
        console.assert(!this.receiver, 'Already loading');
        this.setupWorker();
        this.updateStatus(i18nString(UIStrings.loading), true);
    }
    finishLoad() {
        if (!this.wasDisposed && this.receiver) {
            void this.receiver.close();
        }
        if (!this.bufferedWriter) {
            return;
        }
        this.didWriteToTempFile(this.bufferedWriter);
    }
    didWriteToTempFile(tempFile) {
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
    setupWorker() {
        console.assert(!this.workerProxy, 'HeapSnapshotWorkerProxy already exists');
        this.workerProxy = new HeapSnapshotWorkerProxy(this.handleWorkerEvent.bind(this));
        this.workerProxy.addEventListener("Wait" /* HeapSnapshotWorkerProxy.Events.WAIT */, event => {
            this.updateStatus(null, event.data);
        }, this);
        this.receiver = this.workerProxy.createLoader(this.uid, this.snapshotReceived.bind(this));
    }
    // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    handleWorkerEvent(eventName, data) {
        if (HeapSnapshotModel.HeapSnapshotModel.HeapSnapshotProgressEvent.BrokenSnapshot === eventName) {
            const error = data;
            Common.Console.Console.instance().error(error);
            return;
        }
        if (HeapSnapshotModel.HeapSnapshotModel.HeapSnapshotProgressEvent.Update !== eventName) {
            return;
        }
        const serializedMessage = data;
        const messageObject = i18n.i18n.deserializeUIString(serializedMessage);
        // We know all strings from the worker are declared inside a single file so we can
        // use a custom function.
        this.updateStatus(moduleI18nString(messageObject.string, messageObject.values));
    }
    dispose() {
        if (this.workerProxy) {
            this.workerProxy.dispose();
        }
        this.removeTempFile();
        this.wasDisposed = true;
    }
    didCompleteSnapshotTransfer() {
        if (!this.snapshotProxy) {
            return;
        }
        this.updateStatus(i18n.ByteUtilities.bytesToString(this.snapshotProxy.totalSize), false);
    }
    transferChunk(chunk) {
        if (!this.bufferedWriter) {
            this.bufferedWriter = new Bindings.TempFile.TempFile();
        }
        this.bufferedWriter.write([chunk]);
        ++this.totalNumberOfChunks;
        if (this.receiver) {
            void this.receiver.write(chunk);
        }
    }
    snapshotReceived(snapshotProxy) {
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
    notifySnapshotReceived() {
        if (this.snapshotProxy) {
            this.fulfillLoad(this.snapshotProxy);
        }
        this.profileType().snapshotReceived(this);
    }
    canSaveToFile() {
        return !this.fromFile();
    }
    async saveToFile() {
        await this.loadPromise;
        const fileOutputStream = new Bindings.FileUtils.FileOutputStream();
        this.fileName = this.fileName ||
            'Heap-' + Platform.DateUtilities.toISO8601Compact(new Date()) + this.profileType().fileExtension();
        const onOpen = async (accepted) => {
            if (!accepted) {
                return;
            }
            if (this.failedToCreateTempFile) {
                Common.Console.Console.instance().error('Failed to open temp file with heap snapshot');
                void fileOutputStream.close();
                return;
            }
            if (this.tempFile) {
                const error = await this.tempFile.copyToOutputStream(fileOutputStream, this.onChunkTransferred.bind(this));
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
    onChunkTransferred(reader) {
        this.updateSaveProgress(reader.loadedSize(), reader.fileSize());
    }
    updateSaveProgress(value, total) {
        const percentValue = ((total && value / total) * 100).toFixed(0);
        this.updateStatus(i18nString(UIStrings.savingD, { PH1: percentValue }));
    }
    async loadFromFile(file) {
        this.updateStatus(i18nString(UIStrings.loading), true);
        this.setupWorker();
        const reader = new Bindings.FileUtils.ChunkedFileReader(file, 10000000);
        const success = await reader.read(this.receiver);
        if (!success) {
            const error = reader.error();
            if (error) {
                this.updateStatus(error.message);
            }
        }
        return success ? null : reader.error();
    }
    profileType() {
        return super.profileType();
    }
}
export class HeapSnapshotStatisticsView extends UI.Widget.VBox {
    pieChart;
    constructor() {
        super();
        this.element.classList.add('heap-snapshot-statistics-view');
        this.element.setAttribute('jslog', `${VisualLogging.pane('profiler.heap-snapshot-statistics-view').track({ resize: true })}`);
        this.pieChart = new PerfUI.PieChart.PieChart();
        this.setTotalAndRecords(0, []);
        this.pieChart.classList.add('heap-snapshot-stats-pie-chart');
        this.element.appendChild(this.pieChart);
    }
    static valueFormatter(value) {
        const formatter = new Intl.NumberFormat(i18n.DevToolsLocale.DevToolsLocale.instance().locale, {
            style: 'unit',
            unit: 'kilobyte',
        });
        return formatter.format(Math.round(value / 1000));
    }
    setTotalAndRecords(total, records) {
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
    heapProfilerModel;
    linkifier;
    frameElements;
    constructor(heapProfilerModel) {
        super();
        this.heapProfilerModel = heapProfilerModel;
        this.linkifier = new Components.Linkifier.Linkifier();
        this.frameElements = [];
    }
    onContextMenu(link, event) {
        const contextMenu = new UI.ContextMenu.ContextMenu(event);
        contextMenu.appendApplicableItems(link);
        void contextMenu.show();
        event.consume(true);
    }
    onStackViewKeydown(event) {
        const target = event.target;
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
        const keyboardEvent = (event);
        if (keyboardEvent.key === 'ArrowUp') {
            navDown = false;
        }
        else if (keyboardEvent.key === 'ArrowDown') {
            navDown = true;
        }
        else {
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
    async setAllocatedObject(snapshot, snapshotNodeIndex) {
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
            const frameDiv = stackDiv.createChild('div', 'stack-frame');
            this.frameElements.push(frameDiv);
            frameDiv.tabIndex = -1;
            const name = frameDiv.createChild('div');
            name.textContent = UI.UIUtils.beautifyFunctionName(frame.functionName);
            if (!frame.scriptId) {
                continue;
            }
            const target = this.heapProfilerModel ? this.heapProfilerModel.target() : null;
            const options = { columnNumber: frame.column - 1, inlineFrameIndex: 0 };
            const urlElement = this.linkifier.linkifyScriptLocation(target, String(frame.scriptId), frame.scriptName, frame.line - 1, options);
            frameDiv.appendChild(urlElement);
            stackFrameToURLElement.set(frameDiv, urlElement);
            frameDiv.addEventListener('contextmenu', this.onContextMenu.bind(this, urlElement));
        }
        this.frameElements[0].tabIndex = 0;
    }
    clear() {
        this.element.removeChildren();
        this.frameElements = [];
        this.linkifier.reset();
    }
}
const stackFrameToURLElement = new WeakMap();
//# sourceMappingURL=HeapSnapshotView.js.map
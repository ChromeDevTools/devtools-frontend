// Copyright 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import * as TimelineModel from '../../models/timeline_model/timeline_model.js';
import * as TraceEngine from '../../models/trace/trace.js';
import * as DataGrid from '../../ui/legacy/components/data_grid/data_grid.js';
import * as Components from '../../ui/legacy/components/utils/utils.js';
import * as UI from '../../ui/legacy/legacy.js';

import {type PerformanceModel} from './PerformanceModel.js';
import {TimelineRegExp} from './TimelineFilters.js';
import {type TimelineSelection} from './TimelineSelection.js';
import {TimelineUIUtils} from './TimelineUIUtils.js';

const UIStrings = {
  /**
   *@description Text for the performance of something
   */
  performance: 'Performance',
  /**
   *@description Text to filter result items
   */
  filter: 'Filter',
  /**
   *@description Time of a single activity, as opposed to the total time
   */
  selfTime: 'Self Time',
  /**
   *@description Text for the total time of something
   */
  totalTime: 'Total Time',
  /**
   *@description Text in Timeline Tree View of the Performance panel
   */
  activity: 'Activity',
  /**
   *@description Text of a DOM element in Timeline Tree View of the Performance panel
   */
  selectItemForDetails: 'Select item for details.',
  /**
   * @description This message is presented as a tooltip when developers investigate the performance
   * of a page. The tooltip alerts developers that some parts of code in execution were not optimized
   * (made to run faster) and that associated timing information must be considered with this in
   * mind. The placeholder text is the reason the code was not optimized.
   * @example {Optimized too many times} PH1
   */
  notOptimizedS: 'Not optimized: {PH1}',
  /**
   *@description Time in miliseconds
   *@example {30.1} PH1
   */
  fms: '{PH1} ms',
  /**
   *@description Number followed by percent sign
   *@example {20} PH1
   */
  percentPlaceholder: '{PH1} %',
  /**
   *@description Text in Timeline Tree View of the Performance panel
   */
  chromeExtensionsOverhead: '[`Chrome` extensions overhead]',
  /**
   * @description Text in Timeline Tree View of the Performance panel. The text is presented
   * when developers investigate the performance of a page. 'V8 Runtime' labels the time
   * spent in (i.e. runtime) the V8 JavaScript engine.
   */
  vRuntime: '[`V8` Runtime]',
  /**
   *@description Text in Timeline Tree View of the Performance panel
   */
  unattributed: '[unattributed]',
  /**
   *@description Text in Timeline Tree View of the Performance panel
   */
  javascript: 'JavaScript',
  /**
   *@description Text that refers to one or a group of webpages
   */
  page: 'Page',
  /**
   *@description Text in Timeline Tree View of the Performance panel
   */
  noGrouping: 'No Grouping',
  /**
   *@description Text in Timeline Tree View of the Performance panel
   */
  groupByActivity: 'Group by Activity',
  /**
   *@description Text in Timeline Tree View of the Performance panel
   */
  groupByCategory: 'Group by Category',
  /**
   *@description Text in Timeline Tree View of the Performance panel
   */
  groupByDomain: 'Group by Domain',
  /**
   *@description Text in Timeline Tree View of the Performance panel
   */
  groupByFrame: 'Group by Frame',
  /**
   *@description Text in Timeline Tree View of the Performance panel
   */
  groupBySubdomain: 'Group by Subdomain',
  /**
   *@description Text in Timeline Tree View of the Performance panel
   */
  groupByUrl: 'Group by URL',
  /**
   *@description Aria-label for grouping combo box in Timeline Details View
   */
  groupBy: 'Group by',
  /**
   *@description Aria-label for filter bar in Call Tree view
   */
  filterCallTree: 'Filter call tree',
  /**
   *@description Aria-label for the filter bar in Bottom-Up view
   */
  filterBottomup: 'Filter bottom-up',
  /**
   * @description Title of the sidebar pane in the Performance panel which shows the stack (call
   * stack) where the program spent the most time (out of all the call stacks) while executing.
   */
  heaviestStack: 'Heaviest stack',
  /**
   * @description Tooltip for the the Heaviest stack sidebar toggle in the Timeline Tree View of the
   * Performance panel. Command to open/show the sidebar.
   */
  showHeaviestStack: 'Show Heaviest stack',
  /**
   * @description Tooltip for the the Heaviest stack sidebar toggle in the Timeline Tree View of the
   * Performance panel. Command to close/hide the sidebar.
   */
  hideHeaviestStack: 'Hide Heaviest stack',
  /**
   * @description Screen reader announcement when the heaviest stack sidebar is shown in the Performance panel.
   */
  heaviestStackShown: 'Heaviest stack sidebar shown',
  /**
   * @description Screen reader announcement when the heaviest stack sidebar is hidden in the Performance panel.
   */
  heaviestStackHidden: 'Heaviest stack sidebar hidden',
  /**
   *@description Data grid name for Timeline Stack data grids
   */
  timelineStack: 'Timeline Stack',
};
const str_ = i18n.i18n.registerUIStrings('panels/timeline/TimelineTreeView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class TimelineTreeView extends UI.Widget.VBox implements UI.SearchableView.Searchable {
  modelInternal: PerformanceModel|null;
  #selectedEvents: TraceEngine.Legacy.CompatibleTraceEvent[]|null;
  private searchResults: TimelineModel.TimelineProfileTree.Node[];
  linkifier!: Components.Linkifier.Linkifier;
  dataGrid!: DataGrid.SortableDataGrid.SortableDataGrid<GridNode>;
  private lastHoveredProfileNode!: TimelineModel.TimelineProfileTree.Node|null;
  private textFilterInternal!: TimelineRegExp;
  private taskFilter!: TimelineModel.TimelineModelFilter.ExclusiveNameFilter;
  protected startTime!: number;
  protected endTime!: number;
  splitWidget!: UI.SplitWidget.SplitWidget;
  detailsView!: UI.Widget.Widget;
  private searchableView!: UI.SearchableView.SearchableView;
  // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private currentThreadSetting?: Common.Settings.Setting<any>;
  private lastSelectedNodeInternal?: TimelineModel.TimelineProfileTree.Node|null;
  private root?: TimelineModel.TimelineProfileTree.Node;
  private currentResult?: number;
  textFilterUI?: UI.Toolbar.ToolbarInput;

  #traceParseData: TraceEngine.Handlers.Migration.PartialTraceData|null = null;

  constructor() {
    super();
    this.modelInternal = null;
    this.#selectedEvents = null;
    this.element.classList.add('timeline-tree-view');

    this.searchResults = [];
  }

  static eventNameForSorting(event: TraceEngine.Legacy.Event): string {
    if (TimelineModel.TimelineModel.TimelineModelImpl.isJsFrameEvent(event)) {
      const data = event.args['data'];
      return data['functionName'] + '@' + (data['scriptId'] || data['url'] || '');
    }
    return event.name + ':@' + TimelineModel.TimelineProfileTree.eventURL(event);
  }

  setSearchableView(searchableView: UI.SearchableView.SearchableView): void {
    this.searchableView = searchableView;
  }

  setModelWithEvents(
      model: PerformanceModel|null,
      selectedEvents: TraceEngine.Legacy.CompatibleTraceEvent[]|null,
      traceParseData: TraceEngine.Handlers.Migration.PartialTraceData|null = null,
      ): void {
    this.modelInternal = model;
    this.#traceParseData = traceParseData;
    this.#selectedEvents = selectedEvents;
    this.refreshTree();
  }

  /**
   * This method is included only for preventing layout test failures.
   * TODO(crbug.com/1433692): Port problematic layout tests to unit
   * tests.
   */
  setModel(
      model: PerformanceModel|null,
      track: TimelineModel.TimelineModel.Track|null,
      ): void {
    this.setModelWithEvents(model, track?.eventsForTreeView() || null);
  }

  getToolbarInputAccessiblePlaceHolder(): string {
    return '';
  }

  model(): PerformanceModel|null {
    return this.modelInternal;
  }

  traceParseData(): TraceEngine.Handlers.Migration.PartialTraceData|null {
    return this.#traceParseData;
  }

  init(): void {
    this.linkifier = new Components.Linkifier.Linkifier();

    this.taskFilter =
        new TimelineModel.TimelineModelFilter.ExclusiveNameFilter([TimelineModel.TimelineModel.RecordType.Task]);
    this.textFilterInternal = new TimelineRegExp();

    this.currentThreadSetting = Common.Settings.Settings.instance().createSetting('timelineTreeCurrentThread', 0);
    this.currentThreadSetting.addChangeListener(this.refreshTree, this);

    const columns = ([] as DataGrid.DataGrid.ColumnDescriptor[]);
    this.populateColumns(columns);

    this.splitWidget = new UI.SplitWidget.SplitWidget(true, true, 'timelineTreeViewDetailsSplitWidget');
    const mainView = new UI.Widget.VBox();
    const toolbar = new UI.Toolbar.Toolbar('', mainView.element);
    toolbar.makeWrappable(true);
    this.populateToolbar(toolbar);

    this.dataGrid = new DataGrid.SortableDataGrid.SortableDataGrid({
      displayName: i18nString(UIStrings.performance),
      columns,
      refreshCallback: undefined,
      editCallback: undefined,
      deleteCallback: undefined,
    });
    this.dataGrid.addEventListener(DataGrid.DataGrid.Events.SortingChanged, this.sortingChanged, this);
    this.dataGrid.element.addEventListener('mousemove', this.onMouseMove.bind(this), true);
    this.dataGrid.setResizeMethod(DataGrid.DataGrid.ResizeMethod.Last);
    this.dataGrid.setRowContextMenuCallback(this.onContextMenu.bind(this));
    this.dataGrid.asWidget().show(mainView.element);
    this.dataGrid.addEventListener(DataGrid.DataGrid.Events.SelectedNode, this.updateDetailsForSelection, this);

    this.detailsView = new UI.Widget.VBox();
    this.detailsView.element.classList.add('timeline-details-view', 'timeline-details-view-body');
    this.splitWidget.setMainWidget(mainView);
    this.splitWidget.setSidebarWidget(this.detailsView);
    this.splitWidget.hideSidebar();
    this.splitWidget.show(this.element);
    this.splitWidget.addEventListener(UI.SplitWidget.Events.ShowModeChanged, this.onShowModeChanged, this);

    this.lastSelectedNodeInternal;
  }

  lastSelectedNode(): TimelineModel.TimelineProfileTree.Node|null|undefined {
    return this.lastSelectedNodeInternal;
  }

  updateContents(selection: TimelineSelection): void {
    this.setRange(selection.startTime, selection.endTime);
  }

  setRange(startTime: number, endTime: number): void {
    this.startTime = startTime;
    this.endTime = endTime;
    this.refreshTree();
  }

  filters(): TimelineModel.TimelineModelFilter.TimelineModelFilter[] {
    return [this.taskFilter, this.textFilterInternal, ...(this.modelInternal ? this.modelInternal.filters() : [])];
  }

  filtersWithoutTextFilter(): TimelineModel.TimelineModelFilter.TimelineModelFilter[] {
    return [this.taskFilter, ...(this.modelInternal ? this.modelInternal.filters() : [])];
  }

  textFilter(): TimelineRegExp {
    return this.textFilterInternal;
  }

  exposePercentages(): boolean {
    return false;
  }

  populateToolbar(toolbar: UI.Toolbar.Toolbar): void {
    const textFilterUI =
        new UI.Toolbar.ToolbarInput(i18nString(UIStrings.filter), this.getToolbarInputAccessiblePlaceHolder());
    textFilterUI.addEventListener(UI.Toolbar.ToolbarInput.Event.TextChanged, () => {
      const searchQuery = textFilterUI.value();
      this.textFilterInternal.setRegExp(
          searchQuery ? Platform.StringUtilities.createPlainTextSearchRegex(searchQuery, 'i') : null);
      this.refreshTree();
    }, this);
    this.textFilterUI = textFilterUI;
    toolbar.appendToolbarItem(textFilterUI);
  }

  modelEvents(): TraceEngine.Legacy.CompatibleTraceEvent[] {
    return this.#selectedEvents || [];
  }

  onHover(_node: TimelineModel.TimelineProfileTree.Node|null): void {
  }

  appendContextMenuItems(_contextMenu: UI.ContextMenu.ContextMenu, _node: TimelineModel.TimelineProfileTree.Node):
      void {
  }

  selectProfileNode(treeNode: TimelineModel.TimelineProfileTree.Node, suppressSelectedEvent: boolean): void {
    const pathToRoot = [];
    let node: (TimelineModel.TimelineProfileTree.Node|null)|TimelineModel.TimelineProfileTree.Node = treeNode;
    for (; node; node = node.parent) {
      pathToRoot.push(node);
    }
    for (let i = pathToRoot.length - 1; i > 0; --i) {
      const gridNode = this.dataGridNodeForTreeNode(pathToRoot[i]);
      if (gridNode && gridNode.dataGrid) {
        gridNode.expand();
      }
    }
    const gridNode = this.dataGridNodeForTreeNode(treeNode);
    if (gridNode && gridNode.dataGrid) {
      gridNode.reveal();
      gridNode.select(suppressSelectedEvent);
    }
  }

  refreshTree(): void {
    this.linkifier.reset();
    this.dataGrid.rootNode().removeChildren();
    if (!this.modelInternal) {
      this.updateDetailsForSelection();
      return;
    }
    this.root = this.buildTree();
    const children = this.root.children();
    let maxSelfTime = 0;
    let maxTotalTime = 0;
    const totalUsedTime = this.root.totalTime - this.root.selfTime;
    for (const child of children.values()) {
      maxSelfTime = Math.max(maxSelfTime, child.selfTime);
      maxTotalTime = Math.max(maxTotalTime, child.totalTime);
    }
    for (const child of children.values()) {
      // Exclude the idle time off the total calculation.
      const gridNode = new TreeGridNode(child, totalUsedTime, maxSelfTime, maxTotalTime, this);
      this.dataGrid.insertChild(gridNode);
    }
    this.sortingChanged();
    this.updateDetailsForSelection();
    if (this.searchableView) {
      this.searchableView.refreshSearch();
    }
    const rootNode = this.dataGrid.rootNode();
    if (rootNode.children.length > 0) {
      rootNode.children[0].select(/* supressSelectedEvent */ true);
    }
  }

  buildTree(): TimelineModel.TimelineProfileTree.Node {
    throw new Error('Not Implemented');
  }

  buildTopDownTree(
      doNotAggregate: boolean, groupIdCallback: ((arg0: TraceEngine.Legacy.CompatibleTraceEvent) => string)|null):
      TimelineModel.TimelineProfileTree.Node {
    return new TimelineModel.TimelineProfileTree.TopDownRootNode(
        this.modelEvents(), this.filters(), this.startTime, this.endTime, doNotAggregate, groupIdCallback);
  }

  populateColumns(columns: DataGrid.DataGrid.ColumnDescriptor[]): void {
    columns.push(
        ({id: 'self', title: i18nString(UIStrings.selfTime), width: '120px', fixedWidth: true, sortable: true} as
         DataGrid.DataGrid.ColumnDescriptor));
    columns.push(
        ({id: 'total', title: i18nString(UIStrings.totalTime), width: '120px', fixedWidth: true, sortable: true} as
         DataGrid.DataGrid.ColumnDescriptor));
    columns.push(
        ({id: 'activity', title: i18nString(UIStrings.activity), disclosure: true, sortable: true} as
         DataGrid.DataGrid.ColumnDescriptor));
  }

  private sortingChanged(): void {
    const columnId = this.dataGrid.sortColumnId();
    if (!columnId) {
      return;
    }
    let sortFunction;
    switch (columnId) {
      case 'startTime':
        sortFunction = compareStartTime;
        break;
      case 'self':
        sortFunction = compareNumericField.bind(null, 'selfTime');
        break;
      case 'total':
        sortFunction = compareNumericField.bind(null, 'totalTime');
        break;
      case 'activity':
        sortFunction = compareName;
        break;
      default:
        console.assert(false, 'Unknown sort field: ' + columnId);
        return;
    }
    this.dataGrid.sortNodes(sortFunction, !this.dataGrid.isSortOrderAscending());

    function compareNumericField(
        field: string, a: DataGrid.SortableDataGrid.SortableDataGridNode<GridNode>,
        b: DataGrid.SortableDataGrid.SortableDataGridNode<GridNode>): number {
      const nodeA = (a as TreeGridNode);
      const nodeB = (b as TreeGridNode);
      // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (nodeA.profileNode as any)[field] - (nodeB.profileNode as any)[field];
    }

    function compareStartTime(
        a: DataGrid.SortableDataGrid.SortableDataGridNode<GridNode>,
        b: DataGrid.SortableDataGrid.SortableDataGridNode<GridNode>): number {
      const nodeA = (a as TreeGridNode);
      const nodeB = (b as TreeGridNode);
      const eventA = (nodeA.profileNode.event as TraceEngine.Legacy.Event);
      const eventB = (nodeB.profileNode.event as TraceEngine.Legacy.Event);
      return eventA.startTime - eventB.startTime;
    }

    function compareName(
        a: DataGrid.SortableDataGrid.SortableDataGridNode<GridNode>,
        b: DataGrid.SortableDataGrid.SortableDataGridNode<GridNode>): number {
      const nodeA = (a as TreeGridNode);
      const nodeB = (b as TreeGridNode);
      const eventA = (nodeA.profileNode.event as TraceEngine.Legacy.Event);
      const eventB = (nodeB.profileNode.event as TraceEngine.Legacy.Event);
      const nameA = TimelineTreeView.eventNameForSorting(eventA);
      const nameB = TimelineTreeView.eventNameForSorting(eventB);
      return nameA.localeCompare(nameB);
    }
  }

  private onShowModeChanged(): void {
    if (this.splitWidget.showMode() === UI.SplitWidget.ShowMode.OnlyMain) {
      return;
    }
    this.lastSelectedNodeInternal = undefined;
    this.updateDetailsForSelection();
  }

  private updateDetailsForSelection(): void {
    const selectedNode = this.dataGrid.selectedNode ? (this.dataGrid.selectedNode as TreeGridNode).profileNode : null;
    if (selectedNode === this.lastSelectedNodeInternal) {
      return;
    }
    this.lastSelectedNodeInternal = selectedNode;
    if (this.splitWidget.showMode() === UI.SplitWidget.ShowMode.OnlyMain) {
      return;
    }
    this.detailsView.detachChildWidgets();
    this.detailsView.element.removeChildren();
    if (selectedNode && this.showDetailsForNode(selectedNode)) {
      return;
    }
    const banner = this.detailsView.element.createChild('div', 'full-widget-dimmed-banner');
    UI.UIUtils.createTextChild(banner, i18nString(UIStrings.selectItemForDetails));
  }

  showDetailsForNode(_node: TimelineModel.TimelineProfileTree.Node): boolean {
    return false;
  }

  private onMouseMove(event: Event): void {
    const gridNode = event.target && (event.target instanceof Node) ?
        (this.dataGrid.dataGridNodeFromNode((event.target as Node))) :
        null;
    // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
    // @ts-expect-error
    const profileNode = gridNode && gridNode._profileNode;
    if (profileNode === this.lastHoveredProfileNode) {
      return;
    }
    this.lastHoveredProfileNode = profileNode;
    this.onHover(profileNode);
  }

  private onContextMenu(
      contextMenu: UI.ContextMenu.ContextMenu, eventGridNode: DataGrid.DataGrid.DataGridNode<GridNode>): void {
    const gridNode = (eventGridNode as GridNode);
    if (gridNode.linkElement && !contextMenu.containsTarget(gridNode.linkElement)) {
      contextMenu.appendApplicableItems(gridNode.linkElement);
    }
    const profileNode = gridNode.profileNode;
    if (profileNode) {
      this.appendContextMenuItems(contextMenu, profileNode);
    }
  }

  dataGridNodeForTreeNode(treeNode: TimelineModel.TimelineProfileTree.Node): GridNode|null {
    return profileNodeToTreeGridNode.get(treeNode) || null;
  }

  // UI.SearchableView.Searchable implementation

  onSearchCanceled(): void {
    this.searchResults = [];
    this.currentResult = 0;
  }

  performSearch(searchConfig: UI.SearchableView.SearchConfig, _shouldJump: boolean, _jumpBackwards?: boolean): void {
    this.searchResults = [];
    this.currentResult = 0;
    if (!this.root) {
      return;
    }
    const searchRegex = searchConfig.toSearchRegex();
    this.searchResults = this.root.searchTree(
        event => TimelineUIUtils.testContentMatching(event, searchRegex.regex, this.#traceParseData || undefined));
    this.searchableView.updateSearchMatchesCount(this.searchResults.length);
  }

  jumpToNextSearchResult(): void {
    if (!this.searchResults.length || this.currentResult === undefined) {
      return;
    }
    this.selectProfileNode(this.searchResults[this.currentResult], false);
    this.currentResult = Platform.NumberUtilities.mod(this.currentResult + 1, this.searchResults.length);
  }

  jumpToPreviousSearchResult(): void {
    if (!this.searchResults.length || this.currentResult === undefined) {
      return;
    }
    this.selectProfileNode(this.searchResults[this.currentResult], false);
    this.currentResult = Platform.NumberUtilities.mod(this.currentResult - 1, this.searchResults.length);
  }

  supportsCaseSensitiveSearch(): boolean {
    return true;
  }

  supportsRegexSearch(): boolean {
    return true;
  }
}

export class GridNode extends DataGrid.SortableDataGrid.SortableDataGridNode<GridNode> {
  protected populated: boolean;
  profileNode: TimelineModel.TimelineProfileTree.Node;
  protected treeView: TimelineTreeView;
  protected grandTotalTime: number;
  protected maxSelfTime: number;
  protected maxTotalTime: number;
  linkElement: Element|null;

  constructor(
      profileNode: TimelineModel.TimelineProfileTree.Node, grandTotalTime: number, maxSelfTime: number,
      maxTotalTime: number, treeView: TimelineTreeView) {
    super(null, false);
    this.populated = false;
    this.profileNode = profileNode;
    this.treeView = treeView;
    this.grandTotalTime = grandTotalTime;
    this.maxSelfTime = maxSelfTime;
    this.maxTotalTime = maxTotalTime;
    this.linkElement = null;
  }

  override createCell(columnId: string): HTMLElement {
    if (columnId === 'activity') {
      return this.createNameCell(columnId);
    }
    return this.createValueCell(columnId) || super.createCell(columnId);
  }

  private createNameCell(columnId: string): HTMLElement {
    const cell = this.createTD(columnId);
    const container = cell.createChild('div', 'name-container');
    const iconContainer = container.createChild('div', 'activity-icon-container');
    const icon = iconContainer.createChild('div', 'activity-icon');
    const name = container.createChild('div', 'activity-name');
    const event = this.profileNode.event;
    if (this.profileNode.isGroupNode()) {
      const treeView = (this.treeView as AggregatedTimelineTreeView);
      const info = treeView.displayInfoForGroupNode(this.profileNode);
      name.textContent = info.name;
      icon.style.backgroundColor = info.color;
      if (info.icon) {
        iconContainer.insertBefore(info.icon, icon);
      }
    } else if (event) {
      const data = event.args['data'];
      const deoptReason = data && data['deoptReason'];
      if (deoptReason) {
        container.createChild('div', 'activity-warning').title =
            i18nString(UIStrings.notOptimizedS, {PH1: deoptReason});
      }

      name.textContent = TimelineUIUtils.eventTitle(event);
      const target = this.treeView.modelInternal?.timelineModel().targetByEvent(event) || null;
      const linkifier = this.treeView.linkifier;
      const isFreshRecording = Boolean(this.treeView.modelInternal?.timelineModel().isFreshRecording());
      this.linkElement = TimelineUIUtils.linkifyTopCallFrame(event, target, linkifier, isFreshRecording);
      if (this.linkElement) {
        container.createChild('div', 'activity-link').appendChild(this.linkElement);
      }
      const eventStyle = TimelineUIUtils.eventStyle(event);
      const eventCategory = eventStyle.category;
      UI.ARIAUtils.setLabel(icon, eventCategory.title);
      icon.style.backgroundColor = eventCategory.getComputedValue();
    }
    return cell;
  }

  private createValueCell(columnId: string): HTMLElement|null {
    if (columnId !== 'self' && columnId !== 'total' && columnId !== 'startTime') {
      return null;
    }

    let showPercents = false;
    let value: number;
    let maxTime: number|undefined;
    let event: TraceEngine.Legacy.CompatibleTraceEvent|null;
    switch (columnId) {
      case 'startTime': {
        event = this.profileNode.event;
        const model = this.treeView.model();
        if (!model) {
          throw new Error('Unable to find model for tree view');
        }
        const timings = event && TraceEngine.Legacy.timesForEventInMilliseconds(event);
        const startTime = timings?.startTime ?? 0;
        value = startTime - model.timelineModel().minimumRecordTime();
      } break;
      case 'self':
        value = this.profileNode.selfTime;
        maxTime = this.maxSelfTime;
        showPercents = true;
        break;
      case 'total':
        value = this.profileNode.totalTime;
        maxTime = this.maxTotalTime;
        showPercents = true;
        break;
      default:
        return null;
    }
    const cell = this.createTD(columnId);
    cell.className = 'numeric-column';
    cell.setAttribute('title', i18nString(UIStrings.fms, {PH1: value.toFixed(4)}));
    const textDiv = cell.createChild('div');
    textDiv.createChild('span').textContent = i18nString(UIStrings.fms, {PH1: value.toFixed(1)});

    if (showPercents && this.treeView.exposePercentages()) {
      textDiv.createChild('span', 'percent-column').textContent =
          i18nString(UIStrings.percentPlaceholder, {PH1: (value / this.grandTotalTime * 100).toFixed(1)});
    }
    if (maxTime) {
      textDiv.classList.add('background-percent-bar');
      cell.createChild('div', 'background-bar-container').createChild('div', 'background-bar').style.width =
          (value * 100 / maxTime).toFixed(1) + '%';
    }
    return cell;
  }
}

export class TreeGridNode extends GridNode {
  constructor(
      profileNode: TimelineModel.TimelineProfileTree.Node, grandTotalTime: number, maxSelfTime: number,
      maxTotalTime: number, treeView: TimelineTreeView) {
    super(profileNode, grandTotalTime, maxSelfTime, maxTotalTime, treeView);
    this.setHasChildren(this.profileNode.hasChildren());
    profileNodeToTreeGridNode.set(profileNode, this);
  }

  override populate(): void {
    if (this.populated) {
      return;
    }
    this.populated = true;
    if (!this.profileNode.children) {
      return;
    }
    for (const node of this.profileNode.children().values()) {
      const gridNode = new TreeGridNode(node, this.grandTotalTime, this.maxSelfTime, this.maxTotalTime, this.treeView);
      this.insertChildOrdered(gridNode);
    }
  }
}

const profileNodeToTreeGridNode = new WeakMap<TimelineModel.TimelineProfileTree.Node, TreeGridNode>();

export class AggregatedTimelineTreeView extends TimelineTreeView {
  protected readonly groupBySetting: Common.Settings.Setting<AggregatedTimelineTreeView.GroupBy>;
  private readonly stackView: TimelineStackView;
  private executionContextNamesByOrigin = new Map<Platform.DevToolsPath.UrlString, string>();

  constructor() {
    super();
    this.groupBySetting = Common.Settings.Settings.instance().createSetting(
        'timelineTreeGroupBy', AggregatedTimelineTreeView.GroupBy.None);
    this.groupBySetting.addChangeListener(this.refreshTree.bind(this));
    this.init();
    this.stackView = new TimelineStackView(this);
    this.stackView.addEventListener(TimelineStackView.Events.SelectionChanged, this.onStackViewSelectionChanged, this);
  }

  setGroupBySettingForTests(groupBy: AggregatedTimelineTreeView.GroupBy): void {
    this.groupBySetting.set(groupBy);
  }
  override setModelWithEvents(
      model: PerformanceModel|null,
      selectedEvents: TraceEngine.Legacy.CompatibleTraceEvent[]|null,
      traceParseData: TraceEngine.Handlers.Migration.PartialTraceData|null = null,
      ): void {
    super.setModelWithEvents(model, selectedEvents, traceParseData);
  }

  /**
   * This method is included only for preventing layout test failures.
   * TODO(crbug.com/1433692): Port problematic layout tests to unit
   * tests.
   */
  override setModel(
      model: PerformanceModel|null,
      track: TimelineModel.TimelineModel.Track|null,
      ): void {
    super.setModel(model, track);
  }

  override updateContents(selection: TimelineSelection): void {
    this.updateExtensionResolver();
    super.updateContents(selection);
    const rootNode = this.dataGrid.rootNode();
    if (rootNode.children.length) {
      rootNode.children[0].select(/* suppressSelectedEvent */ true);
    }
  }

  private updateExtensionResolver(): void {
    this.executionContextNamesByOrigin = new Map();
    for (const runtimeModel of SDK.TargetManager.TargetManager.instance().models(SDK.RuntimeModel.RuntimeModel)) {
      for (const context of runtimeModel.executionContexts()) {
        this.executionContextNamesByOrigin.set(context.origin, context.name);
      }
    }
  }

  private beautifyDomainName(this: AggregatedTimelineTreeView, name: string): string {
    if (AggregatedTimelineTreeView.isExtensionInternalURL(name as Platform.DevToolsPath.UrlString)) {
      name = i18nString(UIStrings.chromeExtensionsOverhead);
    } else if (AggregatedTimelineTreeView.isV8NativeURL(name as Platform.DevToolsPath.UrlString)) {
      name = i18nString(UIStrings.vRuntime);
    } else if (name.startsWith('chrome-extension')) {
      name = this.executionContextNamesByOrigin.get(name as Platform.DevToolsPath.UrlString) || name;
    }
    return name;
  }

  displayInfoForGroupNode(node: TimelineModel.TimelineProfileTree.Node): {
    name: string,
    color: string,
    icon: (Element|undefined),
  } {
    const categories = TimelineUIUtils.categories();
    const color = node.id && node.event ? TimelineUIUtils.eventColor(node.event) : categories['other'].color;
    const unattributed = i18nString(UIStrings.unattributed);

    const id = typeof node.id === 'symbol' ? undefined : node.id;

    switch (this.groupBySetting.get()) {
      case AggregatedTimelineTreeView.GroupBy.Category: {
        const category = id ? categories[id] || categories['other'] : {title: unattributed, color: unattributed};
        return {name: category.title, color: category.color, icon: undefined};
      }

      case AggregatedTimelineTreeView.GroupBy.Domain:
      case AggregatedTimelineTreeView.GroupBy.Subdomain: {
        const domainName = id ? this.beautifyDomainName(id) : undefined;
        return {name: domainName || unattributed, color: color, icon: undefined};
      }

      case AggregatedTimelineTreeView.GroupBy.EventName: {
        if (!node.event) {
          throw new Error('Unable to find event for group by operation');
        }
        const name = (TimelineModel.TimelineModel.TimelineModelImpl.isJsFrameEvent(node.event)) ?
            i18nString(UIStrings.javascript) :
            TimelineUIUtils.eventTitle(node.event);
        return {
          name: name,
          color: TimelineModel.TimelineModel.TimelineModelImpl.isJsFrameEvent(node.event) ?
              TimelineUIUtils.eventStyle(node.event).category.color :
              color,
          icon: undefined,
        };
      }

      case AggregatedTimelineTreeView.GroupBy.URL:
        break;

      case AggregatedTimelineTreeView.GroupBy.Frame: {
        if (!this.modelInternal) {
          throw new Error('Unable to find model for group by frame operation');
        }
        const frame = id ? this.modelInternal.timelineModel().pageFrameById(id as Protocol.Page.FrameId) : undefined;
        const frameName = frame ? TimelineUIUtils.displayNameForFrame(frame, 80) : i18nString(UIStrings.page);
        return {name: frameName, color: color, icon: undefined};
      }

      default:
        console.assert(false, 'Unexpected grouping type');
    }
    return {name: id || unattributed, color: color, icon: undefined};
  }

  override populateToolbar(toolbar: UI.Toolbar.Toolbar): void {
    super.populateToolbar(toolbar);
    const groupBy = AggregatedTimelineTreeView.GroupBy;
    const options = [
      {label: i18nString(UIStrings.noGrouping), value: groupBy.None},
      {label: i18nString(UIStrings.groupByActivity), value: groupBy.EventName},
      {label: i18nString(UIStrings.groupByCategory), value: groupBy.Category},
      {label: i18nString(UIStrings.groupByDomain), value: groupBy.Domain},
      {label: i18nString(UIStrings.groupByFrame), value: groupBy.Frame},
      {label: i18nString(UIStrings.groupBySubdomain), value: groupBy.Subdomain},
      {label: i18nString(UIStrings.groupByUrl), value: groupBy.URL},
    ];
    toolbar.appendToolbarItem(
        new UI.Toolbar.ToolbarSettingComboBox(options, this.groupBySetting, i18nString(UIStrings.groupBy)));
    toolbar.appendSpacer();
    toolbar.appendToolbarItem(this.splitWidget.createShowHideSidebarButton(
        i18nString(UIStrings.showHeaviestStack), i18nString(UIStrings.hideHeaviestStack),
        i18nString(UIStrings.heaviestStackShown), i18nString(UIStrings.heaviestStackHidden)));
  }

  private buildHeaviestStack(treeNode: TimelineModel.TimelineProfileTree.Node):
      TimelineModel.TimelineProfileTree.Node[] {
    console.assert(Boolean(treeNode.parent), 'Attempt to build stack for tree root');
    let result: TimelineModel.TimelineProfileTree.Node[] = [];
    // Do not add root to the stack, as it's the tree itself.
    for (let node: TimelineModel.TimelineProfileTree.Node = treeNode; node && node.parent; node = node.parent) {
      result.push(node);
    }
    result = result.reverse();
    for (let node: TimelineModel.TimelineProfileTree.Node = treeNode;
         node && node.children() && node.children().size;) {
      const children = Array.from(node.children().values());
      node = children.reduce((a, b) => a.totalTime > b.totalTime ? a : b);
      result.push(node);
    }
    return result;
  }

  override exposePercentages(): boolean {
    return true;
  }

  private onStackViewSelectionChanged(): void {
    const treeNode = this.stackView.selectedTreeNode();
    if (treeNode) {
      this.selectProfileNode(treeNode, true);
    }
  }

  override showDetailsForNode(node: TimelineModel.TimelineProfileTree.Node): boolean {
    const stack = this.buildHeaviestStack(node);
    this.stackView.setStack(stack, node);
    this.stackView.show(this.detailsView.element);
    return true;
  }

  protected groupingFunction(groupBy: string): ((arg0: TraceEngine.Legacy.CompatibleTraceEvent) => string)|null {
    const GroupBy = AggregatedTimelineTreeView.GroupBy;
    switch (groupBy) {
      case GroupBy.None:
        return null;
      case GroupBy.EventName:
        return (event: TraceEngine.Legacy.CompatibleTraceEvent): string => TimelineUIUtils.eventStyle(event).title;
      case GroupBy.Category:
        return (event: TraceEngine.Legacy.CompatibleTraceEvent): string =>
                   TimelineUIUtils.eventStyle(event).category.name;
      case GroupBy.Subdomain:
        return this.domainByEvent.bind(this, false);
      case GroupBy.Domain:
        return this.domainByEvent.bind(this, true);
      case GroupBy.URL:
        return (event: TraceEngine.Legacy.CompatibleTraceEvent): string =>
                   TimelineModel.TimelineProfileTree.eventURL(event) || '';
      case GroupBy.Frame:
        return (event: TraceEngine.Legacy.CompatibleTraceEvent): string =>
                   TimelineModel.TimelineModel.EventOnTimelineData.forEvent(event).frameId || '';
      default:
        console.assert(false, `Unexpected aggregation setting: ${groupBy}`);
        return null;
    }
  }

  private domainByEvent(groupSubdomains: boolean, event: TraceEngine.Legacy.CompatibleTraceEvent): string {
    const url = TimelineModel.TimelineProfileTree.eventURL(event);
    if (!url) {
      return '';
    }
    if (AggregatedTimelineTreeView.isExtensionInternalURL(url)) {
      return AggregatedTimelineTreeView.extensionInternalPrefix;
    }
    if (AggregatedTimelineTreeView.isV8NativeURL(url)) {
      return AggregatedTimelineTreeView.v8NativePrefix;
    }
    const parsedURL = Common.ParsedURL.ParsedURL.fromString(url);
    if (!parsedURL) {
      return '';
    }
    if (parsedURL.scheme === 'chrome-extension') {
      return parsedURL.scheme + '://' + parsedURL.host;
    }
    if (!groupSubdomains) {
      return parsedURL.host;
    }
    if (/^[.0-9]+$/.test(parsedURL.host)) {
      return parsedURL.host;
    }
    const domainMatch = /([^.]*\.)?[^.]*$/.exec(parsedURL.host);
    return domainMatch && domainMatch[0] || '';
  }

  override appendContextMenuItems(
      contextMenu: UI.ContextMenu.ContextMenu, node: TimelineModel.TimelineProfileTree.Node): void {
    if (this.groupBySetting.get() !== AggregatedTimelineTreeView.GroupBy.Frame) {
      return;
    }
    if (!node.isGroupNode()) {
      return;
    }
    if (!this.modelInternal) {
      return;
    }
    const frame = this.modelInternal.timelineModel().pageFrameById((node.id as Protocol.Page.FrameId));
    if (!frame || !frame.ownerNode) {
      return;
    }
    contextMenu.appendApplicableItems(frame.ownerNode);
  }

  private static isExtensionInternalURL(url: Platform.DevToolsPath.UrlString): boolean {
    return url.startsWith(AggregatedTimelineTreeView.extensionInternalPrefix);
  }

  private static isV8NativeURL(url: Platform.DevToolsPath.UrlString): boolean {
    return url.startsWith(AggregatedTimelineTreeView.v8NativePrefix);
  }

  // eslint-disable-next-line @typescript-eslint/naming-convention
  private static readonly extensionInternalPrefix = 'extensions::';
  // eslint-disable-next-line @typescript-eslint/naming-convention
  private static readonly v8NativePrefix = 'native ';
}
export namespace AggregatedTimelineTreeView {
  // TODO(crbug.com/1167717): Make this a const enum again
  // eslint-disable-next-line rulesdir/const_enum
  export enum GroupBy {
    None = 'None',
    EventName = 'EventName',
    Category = 'Category',
    Domain = 'Domain',
    Subdomain = 'Subdomain',
    URL = 'URL',
    Frame = 'Frame',
  }
}

export class CallTreeTimelineTreeView extends AggregatedTimelineTreeView {
  constructor() {
    super();
    this.dataGrid.markColumnAsSortedBy('total', DataGrid.DataGrid.Order.Descending);
  }

  override getToolbarInputAccessiblePlaceHolder(): string {
    return i18nString(UIStrings.filterCallTree);
  }

  override buildTree(): TimelineModel.TimelineProfileTree.Node {
    const grouping = this.groupBySetting.get();
    return this.buildTopDownTree(false, this.groupingFunction(grouping));
  }
}

export class BottomUpTimelineTreeView extends AggregatedTimelineTreeView {
  constructor() {
    super();
    this.dataGrid.markColumnAsSortedBy('self', DataGrid.DataGrid.Order.Descending);
  }

  override getToolbarInputAccessiblePlaceHolder(): string {
    return i18nString(UIStrings.filterBottomup);
  }

  override buildTree(): TimelineModel.TimelineProfileTree.Node {
    return new TimelineModel.TimelineProfileTree.BottomUpRootNode(
        this.modelEvents(), this.textFilter(), this.filtersWithoutTextFilter(), this.startTime, this.endTime,
        this.groupingFunction(this.groupBySetting.get()));
  }
}

export class TimelineStackView extends
    Common.ObjectWrapper.eventMixin<TimelineStackView.EventTypes, typeof UI.Widget.VBox>(UI.Widget.VBox) {
  private readonly treeView: TimelineTreeView;
  private readonly dataGrid: DataGrid.ViewportDataGrid.ViewportDataGrid<unknown>;

  constructor(treeView: TimelineTreeView) {
    super();
    const header = this.element.createChild('div', 'timeline-stack-view-header');
    header.textContent = i18nString(UIStrings.heaviestStack);
    this.treeView = treeView;
    const columns = ([
      {id: 'total', title: i18nString(UIStrings.totalTime), fixedWidth: true, width: '110px'},
      {id: 'activity', title: i18nString(UIStrings.activity)},
    ] as DataGrid.DataGrid.ColumnDescriptor[]);
    this.dataGrid = new DataGrid.ViewportDataGrid.ViewportDataGrid({
      displayName: i18nString(UIStrings.timelineStack),
      columns,
      deleteCallback: undefined,
      editCallback: undefined,
      refreshCallback: undefined,
    });
    this.dataGrid.setResizeMethod(DataGrid.DataGrid.ResizeMethod.Last);
    this.dataGrid.addEventListener(DataGrid.DataGrid.Events.SelectedNode, this.onSelectionChanged, this);
    this.dataGrid.asWidget().show(this.element);
  }

  setStack(stack: TimelineModel.TimelineProfileTree.Node[], selectedNode: TimelineModel.TimelineProfileTree.Node):
      void {
    const rootNode = this.dataGrid.rootNode();
    rootNode.removeChildren();
    let nodeToReveal: GridNode|null = null;
    const totalTime = Math.max.apply(Math, stack.map(node => node.totalTime));
    for (const node of stack) {
      const gridNode = new GridNode(node, totalTime, totalTime, totalTime, this.treeView);
      rootNode.appendChild(gridNode);
      if (node === selectedNode) {
        nodeToReveal = gridNode;
      }
    }
    if (nodeToReveal) {
      nodeToReveal.revealAndSelect();
    }
  }

  selectedTreeNode(): TimelineModel.TimelineProfileTree.Node|null {
    const selectedNode = this.dataGrid.selectedNode;
    return selectedNode && (selectedNode as GridNode).profileNode;
  }

  private onSelectionChanged(): void {
    this.dispatchEventToListeners(TimelineStackView.Events.SelectionChanged);
  }
}

export namespace TimelineStackView {
  // TODO(crbug.com/1167717): Make this a const enum again
  // eslint-disable-next-line rulesdir/const_enum
  export enum Events {
    SelectionChanged = 'SelectionChanged',
  }

  export type EventTypes = {
    [Events.SelectionChanged]: void,
  };
}

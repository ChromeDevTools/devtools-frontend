// Copyright 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Trace from '../../models/trace/trace.js';
import * as ThirdPartyWeb from '../../third_party/third-party-web/third-party-web.js';
import * as DataGrid from '../../ui/legacy/components/data_grid/data_grid.js';
import * as Components from '../../ui/legacy/components/utils/utils.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import {ActiveFilters} from './ActiveFilters.js';
import * as Extensions from './extensions/extensions.js';
import {Tracker} from './FreshRecording.js';
import {targetForEvent} from './TargetForEvent.js';
import {TimelineRegExp} from './TimelineFilters.js';
import {rangeForSelection, type TimelineSelection} from './TimelineSelection.js';
import {TimelineUIUtils} from './TimelineUIUtils.js';
import * as Utils from './utils/utils.js';

const UIStrings = {
  /**
   *@description Text for the performance of something
   */
  performance: 'Performance',
  /**
   *@description Time of a single activity, as opposed to the total time
   */
  selfTime: 'Self time',
  /**
   *@description Text for the total time of something
   */
  totalTime: 'Total time',
  /**
   *@description Text in Timeline Tree View of the Performance panel
   */
  activity: 'Activity',
  /**
   *@description Text of a DOM element in Timeline Tree View of the Performance panel
   */
  selectItemForDetails: 'Select item for details.',
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
   *@description Text that refers to one or a group of webpages
   */
  page: 'Page',
  /**
   *@description Text in Timeline Tree View of the Performance panel
   */
  noGrouping: 'No grouping',
  /**
   *@description Text in Timeline Tree View of the Performance panel
   */
  groupByActivity: 'Group by activity',
  /**
   *@description Text in Timeline Tree View of the Performance panel
   */
  groupByCategory: 'Group by category',
  /**
   *@description Text in Timeline Tree View of the Performance panel
   */
  groupByDomain: 'Group by domain',
  /**
   *@description Text in Timeline Tree View of the Performance panel
   */
  groupByFrame: 'Group by frame',
  /**
   *@description Text in Timeline Tree View of the Performance panel
   */
  groupBySubdomain: 'Group by subdomain',
  /**
   *@description Text in Timeline Tree View of the Performance panel
   */
  groupByUrl: 'Group by URL',
  /**
   *@description Text in Timeline Tree View of the Performance panel
   */
  groupByThirdParties: 'Group by Third Parties',
  /**
   *@description Aria-label for grouping combo box in Timeline Details View
   */
  groupBy: 'Group by',
  /**
   * @description Title of the sidebar pane in the Performance panel which shows the stack (call
   * stack) where the program spent the most time (out of all the call stacks) while executing.
   */
  heaviestStack: 'Heaviest stack',
  /**
   * @description Tooltip for the the Heaviest stack sidebar toggle in the Timeline Tree View of the
   * Performance panel. Command to open/show the sidebar.
   */
  showHeaviestStack: 'Show heaviest stack',
  /**
   * @description Tooltip for the the Heaviest stack sidebar toggle in the Timeline Tree View of the
   * Performance panel. Command to close/hide the sidebar.
   */
  hideHeaviestStack: 'Hide heaviest stack',
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
  timelineStack: 'Timeline stack',
  /**
  /*@description Text to search by matching case of the input button
   */
  matchCase: 'Match case',
  /**
   *@description Text for searching with regular expression button
   */
  useRegularExpression: 'Use regular expression',
  /**
   * @description Text for Match whole word button
   */
  matchWholeWord: 'Match whole word',
};
const str_ = i18n.i18n.registerUIStrings('panels/timeline/TimelineTreeView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class TimelineTreeView extends UI.Widget.VBox implements UI.SearchableView.Searchable {
  #selectedEvents: Trace.Types.Events.Event[]|null;
  private searchResults: Trace.Extras.TraceTree.Node[];
  linkifier!: Components.Linkifier.Linkifier;
  dataGrid!: DataGrid.SortableDataGrid.SortableDataGrid<GridNode>;
  private lastHoveredProfileNode!: Trace.Extras.TraceTree.Node|null;
  private textFilterInternal!: TimelineRegExp;
  private taskFilter!: Trace.Extras.TraceFilter.ExclusiveNameFilter;
  protected startTime!: Trace.Types.Timing.MilliSeconds;
  protected endTime!: Trace.Types.Timing.MilliSeconds;
  splitWidget!: UI.SplitWidget.SplitWidget;
  detailsView!: UI.Widget.Widget;
  private searchableView!: UI.SearchableView.SearchableView;
  // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private currentThreadSetting?: Common.Settings.Setting<any>;
  private lastSelectedNodeInternal?: Trace.Extras.TraceTree.Node|null;
  private root?: Trace.Extras.TraceTree.Node;
  private currentResult?: number;
  textFilterUI?: UI.Toolbar.ToolbarInput;
  private caseSensitiveButton: UI.Toolbar.ToolbarToggle|undefined;
  private regexButton: UI.Toolbar.ToolbarToggle|undefined;
  private matchWholeWord: UI.Toolbar.ToolbarToggle|undefined;

  #parsedTrace: Trace.Handlers.Types.ParsedTrace|null = null;

  constructor() {
    super();
    this.#selectedEvents = null;
    this.element.classList.add('timeline-tree-view');

    this.searchResults = [];
  }

  #eventNameForSorting(event: Trace.Types.Events.Event): string {
    const name = TimelineUIUtils.eventTitle(event) || event.name;
    if (!this.#parsedTrace) {
      return name;
    }
    return name + ':@' + Trace.Extras.URLForEntry.getNonResolved(this.#parsedTrace, event);
  }

  setSearchableView(searchableView: UI.SearchableView.SearchableView): void {
    this.searchableView = searchableView;
  }

  setModelWithEvents(
      selectedEvents: Trace.Types.Events.Event[]|null,
      parsedTrace: Trace.Handlers.Types.ParsedTrace|null = null,
      ): void {
    this.#parsedTrace = parsedTrace;
    this.#selectedEvents = selectedEvents;
  }

  parsedTrace(): Trace.Handlers.Types.ParsedTrace|null {
    return this.#parsedTrace;
  }

  init(): void {
    this.linkifier = new Components.Linkifier.Linkifier();

    this.taskFilter = new Trace.Extras.TraceFilter.ExclusiveNameFilter([
      Trace.Types.Events.Name.RUN_TASK,
    ]);
    this.textFilterInternal = new TimelineRegExp();

    this.currentThreadSetting = Common.Settings.Settings.instance().createSetting('timeline-tree-current-thread', 0);
    this.currentThreadSetting.addChangeListener(this.refreshTree, this);

    const columns = ([] as DataGrid.DataGrid.ColumnDescriptor[]);
    this.populateColumns(columns);

    this.splitWidget = new UI.SplitWidget.SplitWidget(true, true, 'timeline-tree-view-details-split-widget');
    const mainView = new UI.Widget.VBox();
    const toolbar = new UI.Toolbar.Toolbar('', mainView.element);
    toolbar.element.setAttribute('jslog', `${VisualLogging.toolbar()}`);
    toolbar.makeWrappable(true);
    this.populateToolbar(toolbar);

    this.dataGrid = new DataGrid.SortableDataGrid.SortableDataGrid({
      displayName: i18nString(UIStrings.performance),
      columns,
      refreshCallback: undefined,
      editCallback: undefined,
      deleteCallback: undefined,
    });
    this.dataGrid.addEventListener(DataGrid.DataGrid.Events.SORTING_CHANGED, this.sortingChanged, this);
    this.dataGrid.element.addEventListener('mousemove', this.onMouseMove.bind(this), true);
    this.dataGrid.setResizeMethod(DataGrid.DataGrid.ResizeMethod.LAST);
    this.dataGrid.setRowContextMenuCallback(this.onContextMenu.bind(this));
    this.dataGrid.asWidget().show(mainView.element);
    this.dataGrid.addEventListener(DataGrid.DataGrid.Events.SELECTED_NODE, this.updateDetailsForSelection, this);

    this.detailsView = new UI.Widget.VBox();
    this.detailsView.element.classList.add('timeline-details-view', 'timeline-details-view-body');
    this.splitWidget.setMainWidget(mainView);
    this.splitWidget.setSidebarWidget(this.detailsView);
    this.splitWidget.hideSidebar();
    this.splitWidget.show(this.element);
    this.splitWidget.addEventListener(UI.SplitWidget.Events.SHOW_MODE_CHANGED, this.onShowModeChanged, this);

    this.lastSelectedNodeInternal;
  }

  lastSelectedNode(): Trace.Extras.TraceTree.Node|null|undefined {
    return this.lastSelectedNodeInternal;
  }

  updateContents(selection: TimelineSelection): void {
    const timings = rangeForSelection(selection);
    const timingMilli = Trace.Helpers.Timing.traceWindowMicroSecondsToMilliSeconds(timings);
    this.setRange(timingMilli.min, timingMilli.max);
  }

  setRange(startTime: Trace.Types.Timing.MilliSeconds, endTime: Trace.Types.Timing.MilliSeconds): void {
    this.startTime = startTime;
    this.endTime = endTime;
    this.refreshTree();
  }

  filters(): Trace.Extras.TraceFilter.TraceFilter[] {
    return [this.taskFilter, this.textFilterInternal, ...(ActiveFilters.instance().activeFilters())];
  }

  filtersWithoutTextFilter(): Trace.Extras.TraceFilter.TraceFilter[] {
    return [this.taskFilter, ...(ActiveFilters.instance().activeFilters())];
  }

  textFilter(): TimelineRegExp {
    return this.textFilterInternal;
  }

  exposePercentages(): boolean {
    return false;
  }

  populateToolbar(toolbar: UI.Toolbar.Toolbar): void {
    this.caseSensitiveButton =
        new UI.Toolbar.ToolbarToggle(i18nString(UIStrings.matchCase), 'match-case', undefined, 'match-case');
    this.caseSensitiveButton.addEventListener(UI.Toolbar.ToolbarButton.Events.CLICK, () => {
      this.#filterChanged();
    }, this);
    toolbar.appendToolbarItem(this.caseSensitiveButton);

    this.regexButton = new UI.Toolbar.ToolbarToggle(
        i18nString(UIStrings.useRegularExpression), 'regular-expression', undefined, 'regular-expression');
    this.regexButton.addEventListener(UI.Toolbar.ToolbarButton.Events.CLICK, () => {
      this.#filterChanged();
    }, this);
    toolbar.appendToolbarItem(this.regexButton);

    this.matchWholeWord = new UI.Toolbar.ToolbarToggle(
        i18nString(UIStrings.matchWholeWord), 'match-whole-word', undefined, 'match-whole-word');
    this.matchWholeWord.addEventListener(UI.Toolbar.ToolbarButton.Events.CLICK, () => {
      this.#filterChanged();
    }, this);
    toolbar.appendToolbarItem(this.matchWholeWord);

    const textFilterUI = new UI.Toolbar.ToolbarFilter();
    this.textFilterUI = textFilterUI;
    textFilterUI.addEventListener(UI.Toolbar.ToolbarInput.Event.TEXT_CHANGED, this.#filterChanged, this);
    toolbar.appendToolbarItem(textFilterUI);
  }

  selectedEvents(): Trace.Types.Events.Event[] {
    // TODO: can we make this type readonly?
    return this.#selectedEvents || [];
  }

  onHover(_node: Trace.Extras.TraceTree.Node|null): void {
  }

  appendContextMenuItems(_contextMenu: UI.ContextMenu.ContextMenu, _node: Trace.Extras.TraceTree.Node): void {
  }

  selectProfileNode(treeNode: Trace.Extras.TraceTree.Node, suppressSelectedEvent: boolean): void {
    const pathToRoot = [];
    let node: (Trace.Extras.TraceTree.Node|null)|Trace.Extras.TraceTree.Node = treeNode;
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
    if (!this.element.parentElement) {
      // This function can be called in different views (Bottom-Up and
      // Call Tree) by the same single event whenever the group-by
      // dropdown changes value. Thus, we bail out whenever the view is
      // not visible, which we know if the related element is detached
      // from the document.
      return;
    }
    this.linkifier.reset();
    this.dataGrid.rootNode().removeChildren();
    if (!this.#parsedTrace) {
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

  buildTree(): Trace.Extras.TraceTree.Node {
    throw new Error('Not Implemented');
  }

  buildTopDownTree(doNotAggregate: boolean, groupIdCallback: ((arg0: Trace.Types.Events.Event) => string)|null):
      Trace.Extras.TraceTree.Node {
    return new Trace.Extras.TraceTree.TopDownRootNode(
        this.selectedEvents(), this.filters(), this.startTime, this.endTime, doNotAggregate, groupIdCallback);
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

    const compareNameSortFn =
        (a: DataGrid.SortableDataGrid.SortableDataGridNode<GridNode>,
         b: DataGrid.SortableDataGrid.SortableDataGridNode<GridNode>): number => {
          const nodeA = (a as TreeGridNode);
          const nodeB = (b as TreeGridNode);
          const eventA = nodeA.profileNode.event;
          const eventB = nodeB.profileNode.event;
          // Should not happen, but guard against the nodes not having events.
          if (!eventA || !eventB) {
            return 0;
          }
          if (!this.#parsedTrace) {
            return 0;
          }
          const nameA = this.#eventNameForSorting(eventA);
          const nameB = this.#eventNameForSorting(eventB);
          return nameA.localeCompare(nameB);
        };

    switch (columnId) {
      case 'start-time':
        sortFunction = compareStartTime;
        break;
      case 'self':
        sortFunction = compareSelfTime;
        break;
      case 'total':
        sortFunction = compareTotalTime;
        break;
      case 'activity':
        sortFunction = compareNameSortFn;
        break;
      default:
        console.assert(false, 'Unknown sort field: ' + columnId);
        return;
    }
    this.dataGrid.sortNodes(sortFunction, !this.dataGrid.isSortOrderAscending());

    function compareSelfTime(
        a: DataGrid.SortableDataGrid.SortableDataGridNode<GridNode>,
        b: DataGrid.SortableDataGrid.SortableDataGridNode<GridNode>): number {
      const nodeA = a as TreeGridNode;
      const nodeB = b as TreeGridNode;
      return nodeA.profileNode.selfTime - nodeB.profileNode.selfTime;
    }

    function compareStartTime(
        a: DataGrid.SortableDataGrid.SortableDataGridNode<GridNode>,
        b: DataGrid.SortableDataGrid.SortableDataGridNode<GridNode>): number {
      const nodeA = (a as TreeGridNode);
      const nodeB = (b as TreeGridNode);
      const eventA = nodeA.profileNode.event;
      const eventB = nodeB.profileNode.event;
      // Should not happen, but guard against the nodes not having events.
      if (!eventA || !eventB) {
        return 0;
      }
      return eventA.ts - eventB.ts;
    }

    function compareTotalTime(
        a: DataGrid.SortableDataGrid.SortableDataGridNode<GridNode>,
        b: DataGrid.SortableDataGrid.SortableDataGridNode<GridNode>): number {
      const nodeA = a as TreeGridNode;
      const nodeB = b as TreeGridNode;
      return nodeA.profileNode.totalTime - nodeB.profileNode.totalTime;
    }
  }

  #filterChanged(): void {
    const searchQuery = this.textFilterUI && this.textFilterUI.value();
    const caseSensitive = this.caseSensitiveButton !== undefined && this.caseSensitiveButton.isToggled();
    const isRegex = this.regexButton !== undefined && this.regexButton.isToggled();
    const matchWholeWord = this.matchWholeWord !== undefined && this.matchWholeWord.isToggled();

    this.textFilterInternal.setRegExp(
        searchQuery ? Platform.StringUtilities.createSearchRegex(searchQuery, caseSensitive, isRegex, matchWholeWord) :
                      null);
    this.refreshTree();
  }

  private onShowModeChanged(): void {
    if (this.splitWidget.showMode() === UI.SplitWidget.ShowMode.ONLY_MAIN) {
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
    if (this.splitWidget.showMode() === UI.SplitWidget.ShowMode.ONLY_MAIN) {
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

  showDetailsForNode(_node: Trace.Extras.TraceTree.Node): boolean {
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
    if (gridNode.linkElement) {
      contextMenu.appendApplicableItems(gridNode.linkElement);
    }
    const profileNode = gridNode.profileNode;
    if (profileNode) {
      this.appendContextMenuItems(contextMenu, profileNode);
    }
  }

  dataGridNodeForTreeNode(treeNode: Trace.Extras.TraceTree.Node): GridNode|null {
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
        event => TimelineUIUtils.testContentMatching(event, searchRegex.regex, this.#parsedTrace || undefined));
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
  profileNode: Trace.Extras.TraceTree.Node;
  protected treeView: TimelineTreeView;
  protected grandTotalTime: number;
  protected maxSelfTime: number;
  protected maxTotalTime: number;
  linkElement: Element|null;

  constructor(
      profileNode: Trace.Extras.TraceTree.Node, grandTotalTime: number, maxSelfTime: number, maxTotalTime: number,
      treeView: TimelineTreeView) {
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
      name.textContent = TimelineUIUtils.eventTitle(event);
      const parsedTrace = this.treeView.parsedTrace();
      const target = parsedTrace ? targetForEvent(parsedTrace, event) : null;
      const linkifier = this.treeView.linkifier;
      const isFreshRecording = Boolean(parsedTrace && Tracker.instance().recordingIsFresh(parsedTrace));
      this.linkElement = TimelineUIUtils.linkifyTopCallFrame(event, target, linkifier, isFreshRecording);
      if (this.linkElement) {
        container.createChild('div', 'activity-link').appendChild(this.linkElement);
      }
      const eventStyle = TimelineUIUtils.eventStyle(event);
      const eventCategory = eventStyle.category;
      UI.ARIAUtils.setLabel(icon, eventCategory.title);
      icon.style.backgroundColor = eventCategory.getComputedColorValue();
      if (Trace.Types.Extensions.isSyntheticExtensionEntry(event)) {
        icon.style.backgroundColor = Extensions.ExtensionUI.extensionEntryColor(event);
      }
    }
    return cell;
  }

  private createValueCell(columnId: string): HTMLElement|null {
    if (columnId !== 'self' && columnId !== 'total' && columnId !== 'start-time') {
      return null;
    }

    let showPercents = false;
    let value: number;
    let maxTime: number|undefined;
    let event: Trace.Types.Events.Event|null;
    switch (columnId) {
      case 'start-time': {
        event = this.profileNode.event;
        const parsedTrace = this.treeView.parsedTrace();
        if (!parsedTrace) {
          throw new Error('Unable to load trace data for tree view');
        }
        const timings = event && Trace.Helpers.Timing.eventTimingsMilliSeconds(event);
        const startTime = timings?.startTime ?? 0;
        value = startTime - Trace.Helpers.Timing.microSecondsToMilliseconds(parsedTrace.Meta.traceBounds.min);
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
      profileNode: Trace.Extras.TraceTree.Node, grandTotalTime: number, maxSelfTime: number, maxTotalTime: number,
      treeView: TimelineTreeView) {
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

const profileNodeToTreeGridNode = new WeakMap<Trace.Extras.TraceTree.Node, TreeGridNode>();

export class AggregatedTimelineTreeView extends TimelineTreeView {
  protected readonly groupBySetting: Common.Settings.Setting<AggregatedTimelineTreeView.GroupBy>;
  private readonly stackView: TimelineStackView;
  private executionContextNamesByOrigin = new Map<Platform.DevToolsPath.UrlString, string>();

  constructor() {
    super();
    this.groupBySetting = Common.Settings.Settings.instance().createSetting(
        'timeline-tree-group-by', AggregatedTimelineTreeView.GroupBy.None);
    this.groupBySetting.addChangeListener(this.refreshTree.bind(this));
    this.init();
    this.stackView = new TimelineStackView(this);
    this.stackView.addEventListener(TimelineStackView.Events.SELECTION_CHANGED, this.onStackViewSelectionChanged, this);
  }

  setGroupBySettingForTests(groupBy: AggregatedTimelineTreeView.GroupBy): void {
    this.groupBySetting.set(groupBy);
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

  displayInfoForGroupNode(node: Trace.Extras.TraceTree.Node): {
    name: string,
    color: string,
    icon: (Element|undefined),
  } {
    const categories = Utils.EntryStyles.getCategoryStyles();
    const color = node.id && node.event ? TimelineUIUtils.eventColor(node.event) : categories['other'].color;
    const unattributed = i18nString(UIStrings.unattributed);

    const id = typeof node.id === 'symbol' ? undefined : node.id;

    switch (this.groupBySetting.get()) {
      case AggregatedTimelineTreeView.GroupBy.Category: {
        const idIsValid = id && Utils.EntryStyles.stringIsEventCategory(id);
        const category = idIsValid ? categories[id] || categories['other'] : {title: unattributed, color: unattributed};
        return {name: category.title, color: category.color, icon: undefined};
      }

      case AggregatedTimelineTreeView.GroupBy.Domain:
      case AggregatedTimelineTreeView.GroupBy.Subdomain:
      case AggregatedTimelineTreeView.GroupBy.ThirdParties: {
        const domainName = id ? this.beautifyDomainName(id) : undefined;
        return {name: domainName || unattributed, color, icon: undefined};
      }

      case AggregatedTimelineTreeView.GroupBy.EventName: {
        if (!node.event) {
          throw new Error('Unable to find event for group by operation');
        }
        const name = TimelineUIUtils.eventTitle(node.event);
        return {
          name,
          color,
          icon: undefined,
        };
      }

      case AggregatedTimelineTreeView.GroupBy.URL:
        break;

      case AggregatedTimelineTreeView.GroupBy.Frame: {
        const frame = id ? this.parsedTrace()?.PageFrames.frames.get(id) : undefined;
        const frameName = frame ? TimelineUIUtils.displayNameForFrame(frame) : i18nString(UIStrings.page);
        return {name: frameName, color, icon: undefined};
      }

      default:
        console.assert(false, 'Unexpected grouping type');
    }
    return {name: id || unattributed, color, icon: undefined};
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
      {label: i18nString(UIStrings.groupByThirdParties), value: groupBy.ThirdParties},
    ];
    toolbar.appendToolbarItem(
        new UI.Toolbar.ToolbarSettingComboBox(options, this.groupBySetting, i18nString(UIStrings.groupBy)));
    toolbar.appendSpacer();
    toolbar.appendToolbarItem(this.splitWidget.createShowHideSidebarButton(
        i18nString(UIStrings.showHeaviestStack), i18nString(UIStrings.hideHeaviestStack),
        i18nString(UIStrings.heaviestStackShown), i18nString(UIStrings.heaviestStackHidden)));
  }

  private buildHeaviestStack(treeNode: Trace.Extras.TraceTree.Node): Trace.Extras.TraceTree.Node[] {
    console.assert(Boolean(treeNode.parent), 'Attempt to build stack for tree root');
    let result: Trace.Extras.TraceTree.Node[] = [];
    // Do not add root to the stack, as it's the tree itself.
    for (let node: Trace.Extras.TraceTree.Node = treeNode; node && node.parent; node = node.parent) {
      result.push(node);
    }
    result = result.reverse();
    for (let node: Trace.Extras.TraceTree.Node = treeNode; node && node.children() && node.children().size;) {
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

  override showDetailsForNode(node: Trace.Extras.TraceTree.Node): boolean {
    const stack = this.buildHeaviestStack(node);
    this.stackView.setStack(stack, node);
    this.stackView.show(this.detailsView.element);
    return true;
  }

  protected groupingFunction(groupBy: AggregatedTimelineTreeView.GroupBy):
      ((arg0: Trace.Types.Events.Event) => string)|null {
    const GroupBy = AggregatedTimelineTreeView.GroupBy;
    switch (groupBy) {
      case GroupBy.None:
        return null;
      case GroupBy.EventName:
        return (event: Trace.Types.Events.Event) => TimelineUIUtils.eventStyle(event).title;
      case GroupBy.Category:
        return (event: Trace.Types.Events.Event) => TimelineUIUtils.eventStyle(event).category.name;
      case GroupBy.Subdomain:
      case GroupBy.Domain:
      case GroupBy.ThirdParties:
        return this.domainByEvent.bind(this, groupBy);
      case GroupBy.URL:
        return (event: Trace.Types.Events.Event) => {
          const parsedTrace = this.parsedTrace();
          return parsedTrace ? Trace.Extras.URLForEntry.getNonResolved(parsedTrace, event) ?? '' : '';
        };
      case GroupBy.Frame:
        return (event: Trace.Types.Events.Event) => {
          const frameId = Trace.Helpers.Trace.frameIDForEvent(event);
          return frameId || this.parsedTrace()?.Meta.mainFrameId || '';
        };
      default:
        console.assert(false, `Unexpected aggregation setting: ${groupBy}`);
        return null;
    }
  }

  private domainByEvent(groupBy: AggregatedTimelineTreeView.GroupBy, event: Trace.Types.Events.Event): string {
    const parsedTrace = this.parsedTrace();
    if (!parsedTrace) {
      return '';
    }
    const url = Trace.Extras.URLForEntry.getNonResolved(parsedTrace, event);
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
    if (groupBy === AggregatedTimelineTreeView.GroupBy.ThirdParties) {
      const entity = ThirdPartyWeb.ThirdPartyWeb.getEntity(url);
      if (!entity) {
        return parsedURL.host;
      }
      return entity.name;
    }
    if (groupBy === AggregatedTimelineTreeView.GroupBy.Subdomain) {
      return parsedURL.host;
    }
    if (/^[.0-9]+$/.test(parsedURL.host)) {
      return parsedURL.host;
    }
    const domainMatch = /([^.]*\.)?[^.]*$/.exec(parsedURL.host);
    return domainMatch && domainMatch[0] || '';
  }

  private static isExtensionInternalURL(url: Platform.DevToolsPath.UrlString): boolean {
    return url.startsWith(AggregatedTimelineTreeView.extensionInternalPrefix);
  }

  private static isV8NativeURL(url: Platform.DevToolsPath.UrlString): boolean {
    return url.startsWith(AggregatedTimelineTreeView.v8NativePrefix);
  }

  private static readonly extensionInternalPrefix = 'extensions::';
  private static readonly v8NativePrefix = 'native ';
}
export namespace AggregatedTimelineTreeView {
  export enum GroupBy {
    /* eslint-disable @typescript-eslint/naming-convention -- Used by web_tests. */
    None = 'None',
    EventName = 'EventName',
    Category = 'Category',
    Domain = 'Domain',
    Subdomain = 'Subdomain',
    URL = 'URL',
    Frame = 'Frame',
    ThirdParties = 'ThirdParties',
    /* eslint-enable @typescript-eslint/naming-convention */
  }
}

export class CallTreeTimelineTreeView extends AggregatedTimelineTreeView {
  constructor() {
    super();
    this.element.setAttribute('jslog', `${VisualLogging.pane('call-tree').track({resize: true})}`);
    this.dataGrid.markColumnAsSortedBy('total', DataGrid.DataGrid.Order.Descending);
  }

  override buildTree(): Trace.Extras.TraceTree.Node {
    const grouping = this.groupBySetting.get();
    return this.buildTopDownTree(false, this.groupingFunction(grouping));
  }
}

export class BottomUpTimelineTreeView extends AggregatedTimelineTreeView {
  constructor() {
    super();
    this.element.setAttribute('jslog', `${VisualLogging.pane('bottom-up').track({resize: true})}`);
    this.dataGrid.markColumnAsSortedBy('self', DataGrid.DataGrid.Order.Descending);
  }

  override buildTree(): Trace.Extras.TraceTree.Node {
    return new Trace.Extras.TraceTree.BottomUpRootNode(
        this.selectedEvents(), this.textFilter(), this.filtersWithoutTextFilter(), this.startTime, this.endTime,
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
    this.dataGrid.setResizeMethod(DataGrid.DataGrid.ResizeMethod.LAST);
    this.dataGrid.addEventListener(DataGrid.DataGrid.Events.SELECTED_NODE, this.onSelectionChanged, this);
    this.dataGrid.asWidget().show(this.element);
  }

  setStack(stack: Trace.Extras.TraceTree.Node[], selectedNode: Trace.Extras.TraceTree.Node): void {
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

  selectedTreeNode(): Trace.Extras.TraceTree.Node|null {
    const selectedNode = this.dataGrid.selectedNode;
    return selectedNode && (selectedNode as GridNode).profileNode;
  }

  private onSelectionChanged(): void {
    this.dispatchEventToListeners(TimelineStackView.Events.SELECTION_CHANGED);
  }
}

export namespace TimelineStackView {
  export const enum Events {
    SELECTION_CHANGED = 'SelectionChanged',
  }

  export type EventTypes = {
    [Events.SELECTION_CHANGED]: void,
  };
}

// Copyright 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable rulesdir/no-imperative-dom-api */

import '../../ui/legacy/legacy.js';

import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as Trace from '../../models/trace/trace.js';
import * as Buttons from '../../ui/components/buttons/buttons.js';
import * as DataGrid from '../../ui/legacy/components/data_grid/data_grid.js';
import * as Components from '../../ui/legacy/components/utils/utils.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import {ActiveFilters} from './ActiveFilters.js';
import * as Extensions from './extensions/extensions.js';
import {targetForEvent} from './TargetForEvent.js';
import * as ThirdPartyTreeView from './ThirdPartyTreeView.js';
import {TimelineRegExp} from './TimelineFilters.js';
import {rangeForSelection, type TimelineSelection} from './TimelineSelection.js';
import timelineTreeViewStyles from './timelineTreeView.css.js';
import {TimelineUIUtils} from './TimelineUIUtils.js';
import * as Utils from './utils/utils.js';

const UIStrings = {
  /**
   * @description Text for the performance of something
   */
  performance: 'Performance',
  /**
   * @description Time of a single activity, as opposed to the total time
   */
  selfTime: 'Self time',
  /**
   * @description Text for the total time of something
   */
  totalTime: 'Total time',
  /**
   * @description Text in Timeline Tree View of the Performance panel
   */
  activity: 'Activity',
  /**
   * @description Text of a DOM element in Timeline Tree View of the Performance panel
   */
  selectItemForDetails: 'Select item for details.',
  /**
   * @description Number followed by percent sign
   * @example {20} PH1
   */
  percentPlaceholder: '{PH1} %',
  /**
   * @description Text in Timeline Tree View of the Performance panel
   */
  chromeExtensionsOverhead: '[`Chrome` extensions overhead]',
  /**
   * @description Text in Timeline Tree View of the Performance panel. The text is presented
   * when developers investigate the performance of a page. 'V8 Runtime' labels the time
   * spent in (i.e. runtime) the V8 JavaScript engine.
   */
  vRuntime: '[`V8` Runtime]',
  /**
   * @description Text in Timeline Tree View of the Performance panel
   */
  unattributed: '[unattributed]',
  /**
   * @description Text that refers to one or a group of webpages
   */
  page: 'Page',
  /**
   * @description Text in Timeline Tree View of the Performance panel
   */
  noGrouping: 'No grouping',
  /**
   * @description Text in Timeline Tree View of the Performance panel
   */
  groupByActivity: 'Group by activity',
  /**
   * @description Text in Timeline Tree View of the Performance panel
   */
  groupByCategory: 'Group by category',
  /**
   * @description Text in Timeline Tree View of the Performance panel
   */
  groupByDomain: 'Group by domain',
  /**
   * @description Text in Timeline Tree View of the Performance panel
   */
  groupByFrame: 'Group by frame',
  /**
   * @description Text in Timeline Tree View of the Performance panel
   */
  groupBySubdomain: 'Group by subdomain',
  /**
   * @description Text in Timeline Tree View of the Performance panel
   */
  groupByUrl: 'Group by URL',
  /**
   * @description Text in Timeline Tree View of the Performance panel
   */
  groupByThirdParties: 'Group by Third Parties',
  /**
   * @description Aria-label for grouping combo box in Timeline Details View
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
   * @description Data grid name for Timeline Stack data grids
   */
  timelineStack: 'Timeline stack',
  /**
   * /*@description Text to search by matching case of the input button
   */
  matchCase: 'Match case',
  /**
   * @description Text for searching with regular expression button
   */
  useRegularExpression: 'Use regular expression',
  /**
   * @description Text for Match whole word button
   */
  matchWholeWord: 'Match whole word',
  /**
   * @description Text for bottom up tree button
   */
  bottomUp: 'Bottom-up',
  /**
   * @description Text referring to view bottom up tree
   */
  viewBottomUp: 'View Bottom-up',
  /**
   * @description Text referring to a 1st party entity
   */
  firstParty: '1st party',
  /**
   * @description Text referring to an entity that is an extension
   */
  extension: 'Extension',
} as const;
const str_ = i18n.i18n.registerUIStrings('panels/timeline/TimelineTreeView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

/**
 * For an overview, read: https://chromium.googlesource.com/devtools/devtools-frontend/+/refs/heads/main/front_end/panels/timeline/README.md#timeline-tree-views
 */
export class TimelineTreeView extends
    Common.ObjectWrapper.eventMixin<TimelineTreeView.EventTypes, typeof UI.Widget.VBox>(UI.Widget.VBox)
        implements UI.SearchableView.Searchable {
  #selectedEvents: Trace.Types.Events.Event[]|null;
  private searchResults: Trace.Extras.TraceTree.Node[];
  linkifier!: Components.Linkifier.Linkifier;
  dataGrid!: DataGrid.SortableDataGrid.SortableDataGrid<GridNode>;
  private lastHoveredProfileNode!: Trace.Extras.TraceTree.Node|null;
  private textFilterInternal!: TimelineRegExp;
  private taskFilter!: Trace.Extras.TraceFilter.ExclusiveNameFilter;
  protected startTime!: Trace.Types.Timing.Milli;
  protected endTime!: Trace.Types.Timing.Milli;
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
  #entityMapper: Utils.EntityMapper.EntityMapper|null = null;
  #lastHighlightedEvent: HTMLElement|null = null;
  eventToTreeNode = new WeakMap<Trace.Types.Events.Event, Trace.Extras.TraceTree.Node>();

  /**
   * Determines if the first child in the data grid will be selected
   * by default when refreshTree() gets called.
   */
  protected autoSelectFirstChildOnRefresh = true;

  constructor() {
    super();
    this.#selectedEvents = null;
    this.element.classList.add('timeline-tree-view');
    this.registerRequiredCSS(timelineTreeViewStyles);

    this.searchResults = [];
  }

  #eventNameForSorting(event: Trace.Types.Events.Event): string {
    const name = TimelineUIUtils.eventTitle(event) || event.name;
    if (!this.#parsedTrace) {
      return name;
    }
    return name + ':@' + Trace.Handlers.Helpers.getNonResolvedURL(event, this.#parsedTrace);
  }

  setSearchableView(searchableView: UI.SearchableView.SearchableView): void {
    this.searchableView = searchableView;
  }

  setModelWithEvents(
      selectedEvents: Trace.Types.Events.Event[]|null,
      parsedTrace: Trace.Handlers.Types.ParsedTrace|null = null,
      entityMappings: Utils.EntityMapper.EntityMapper|null = null,
      ): void {
    this.#parsedTrace = parsedTrace;
    this.#selectedEvents = selectedEvents;
    this.#entityMapper = entityMappings;
    this.refreshTree();
  }

  entityMapper(): Utils.EntityMapper.EntityMapper|null {
    return this.#entityMapper;
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
    const toolbar = mainView.element.createChild('devtools-toolbar');
    toolbar.setAttribute('jslog', `${VisualLogging.toolbar()}`);
    toolbar.wrappable = true;
    this.populateToolbar(toolbar);

    this.dataGrid = new DataGrid.SortableDataGrid.SortableDataGrid({
      displayName: i18nString(UIStrings.performance),
      columns,
      refreshCallback: undefined,
      deleteCallback: undefined,
    });
    this.dataGrid.addEventListener(DataGrid.DataGrid.Events.SORTING_CHANGED, this.sortingChanged, this);
    this.dataGrid.element.addEventListener('mousemove', this.onMouseMove.bind(this), true);
    this.dataGrid.element.addEventListener(
        'mouseleave', () => this.dispatchEventToListeners(TimelineTreeView.Events.TREE_ROW_HOVERED, {node: null}));
    this.dataGrid.addEventListener(DataGrid.DataGrid.Events.OPENED_NODE, this.onGridNodeOpened, this);
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
  }

  lastSelectedNode(): Trace.Extras.TraceTree.Node|null|undefined {
    return this.lastSelectedNodeInternal;
  }

  updateContents(selection: TimelineSelection): void {
    const timings = rangeForSelection(selection);
    const timingMilli = Trace.Helpers.Timing.traceWindowMicroSecondsToMilliSeconds(timings);
    this.setRange(timingMilli.min, timingMilli.max);
  }

  setRange(startTime: Trace.Types.Timing.Milli, endTime: Trace.Types.Timing.Milli): void {
    this.startTime = startTime;
    this.endTime = endTime;
    this.refreshTree();
  }

  highlightEventInTree(event: Trace.Types.Events.Event|null): void {
    // Potentially clear last highlight
    const dataGridElem = event && this.dataGridElementForEvent(event);
    if (!event || (dataGridElem && dataGridElem !== this.#lastHighlightedEvent)) {
      this.#lastHighlightedEvent?.style.setProperty('background-color', '');
    }

    if (event) {
      const rowElem = dataGridElem;
      if (rowElem) {
        this.#lastHighlightedEvent = rowElem;
        this.#lastHighlightedEvent.style.backgroundColor = 'var(--sys-color-yellow-container)';
      }
    }
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

  appendContextMenuItems(_contextMenu: UI.ContextMenu.ContextMenu, _node: Trace.Extras.TraceTree.Node): void {
  }

  //  TODO(paulirish): rename profileNode to treeNode
  selectProfileNode(treeNode: Trace.Extras.TraceTree.Node, suppressSelectedEvent: boolean): void {
    const pathToRoot: Trace.Extras.TraceTree.Node[] = [];
    let node: (Trace.Extras.TraceTree.Node|null)|Trace.Extras.TraceTree.Node = treeNode;
    for (; node; node = node.parent) {
      pathToRoot.push(node);
    }
    for (let i = pathToRoot.length - 1; i > 0; --i) {
      const gridNode = this.dataGridNodeForTreeNode(pathToRoot[i]);
      if (gridNode?.dataGrid) {
        gridNode.expand();
      }
    }
    const gridNode = this.dataGridNodeForTreeNode(treeNode);
    if (gridNode?.dataGrid) {
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
      for (const e of child.events) {
        this.eventToTreeNode.set(e, child);
      }
      this.dataGrid.insertChild(gridNode);
    }
    this.sortingChanged();
    this.updateDetailsForSelection();
    if (this.searchableView) {
      this.searchableView.refreshSearch();
    }
    const rootNode = this.dataGrid.rootNode();
    if (this.autoSelectFirstChildOnRefresh && rootNode.children.length > 0) {
      rootNode.children[0].select(/* supressSelectedEvent */ true);
    }
  }

  buildTree(): Trace.Extras.TraceTree.Node {
    throw new Error('Not Implemented');
  }

  buildTopDownTree(doNotAggregate: boolean, eventGroupIdCallback: ((arg0: Trace.Types.Events.Event) => string)|null):
      Trace.Extras.TraceTree.Node {
    return new Trace.Extras.TraceTree.TopDownRootNode(this.selectedEvents(), {
      filters: this.filters(),
      startTime: this.startTime,
      endTime: this.endTime,
      doNotAggregate,
      eventGroupIdCallback,
    });
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

  sortingChanged(): void {
    const columnId = this.dataGrid.sortColumnId();
    if (!columnId) {
      return;
    }
    const sortFunction = this.getSortingFunction(columnId);
    if (sortFunction) {
      this.dataGrid.sortNodes(sortFunction, !this.dataGrid.isSortOrderAscending());
    }
  }

  // Gets the sorting function for the tree view nodes.
  getSortingFunction(columnId: string):
      ((a: DataGrid.SortableDataGrid.SortableDataGridNode<GridNode>,
        b: DataGrid.SortableDataGrid.SortableDataGridNode<GridNode>) => number)|null {
    const compareNameSortFn =
        (a: DataGrid.SortableDataGrid.SortableDataGridNode<GridNode>,
         b: DataGrid.SortableDataGrid.SortableDataGridNode<GridNode>): number => {
          const nodeA = (a as TreeGridNode);
          const nodeB = (b as TreeGridNode);
          const eventA = nodeA.profileNode.event;
          const eventB = nodeB.profileNode.event;
          if (!eventA || !eventB) {
            return 0;
          }
          const nameA = this.#eventNameForSorting(eventA);
          const nameB = this.#eventNameForSorting(eventB);
          return nameA.localeCompare(nameB);
        };

    switch (columnId) {
      case 'start-time':
        return compareStartTime;
      case 'self':
        return compareSelfTime;
      case 'total':
        return compareTotalTime;
      case 'activity':
      case 'site':
        return compareNameSortFn;
      default:
        console.assert(false, 'Unknown sort field: ' + columnId);
        return null;
    }

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
    const searchQuery = this.textFilterUI?.value();
    const caseSensitive = this.caseSensitiveButton?.isToggled() ?? false;
    const isRegex = this.regexButton?.isToggled() ?? false;
    const matchWholeWord = this.matchWholeWord?.isToggled() ?? false;

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

  protected updateDetailsForSelection(): void {
    const selectedNode = this.dataGrid.selectedNode ? (this.dataGrid.selectedNode as TreeGridNode).profileNode : null;
    if (selectedNode === this.lastSelectedNodeInternal) {
      return;
    }
    if (this.splitWidget.showMode() === UI.SplitWidget.ShowMode.ONLY_MAIN) {
      return;
    }
    this.detailsView.detachChildWidgets();
    this.detailsView.element.removeChildren();
    this.lastSelectedNodeInternal = selectedNode;
    if (selectedNode && this.showDetailsForNode(selectedNode)) {
      return;
    }
    const banner = this.detailsView.element.createChild('div', 'empty-state');
    UI.UIUtils.createTextChild(banner, i18nString(UIStrings.selectItemForDetails));
  }

  showDetailsForNode(_node: Trace.Extras.TraceTree.Node): boolean {
    return false;
  }

  private onMouseMove(event: Event): void {
    const gridNode =
        event.target && (event.target instanceof Node) ? (this.dataGrid.dataGridNodeFromNode((event.target))) : null;
    const profileNode = (gridNode as TreeGridNode)?.profileNode;
    if (profileNode === this.lastHoveredProfileNode) {
      return;
    }
    this.lastHoveredProfileNode = profileNode;
    this.onHover(profileNode);
  }

  onHover(node: Trace.Extras.TraceTree.Node|null): void {
    this.dispatchEventToListeners(TimelineTreeView.Events.TREE_ROW_HOVERED, {node});
  }

  onClick(node: Trace.Extras.TraceTree.Node|null): void {
    this.dispatchEventToListeners(TimelineTreeView.Events.TREE_ROW_CLICKED, {node});
  }

  override wasShown(): void {
    this.dataGrid.addEventListener(DataGrid.DataGrid.Events.SELECTED_NODE, this.#onDataGridSelectionChange, this);
    this.dataGrid.addEventListener(DataGrid.DataGrid.Events.DESELECTED_NODE, this.#onDataGridDeselection, this);
  }

  override childWasDetached(_widget: UI.Widget.Widget): void {
    this.dataGrid.removeEventListener(DataGrid.DataGrid.Events.SELECTED_NODE, this.#onDataGridSelectionChange);
    this.dataGrid.removeEventListener(DataGrid.DataGrid.Events.DESELECTED_NODE, this.#onDataGridDeselection);
  }

  /**
   * This event fires when the user selects a row in the grid, either by
   * clicking or by using the arrow keys. We want to have the same effect as
   * when the user hover overs a row.
   */
  #onDataGridSelectionChange(event: Common.EventTarget.EventTargetEvent<DataGrid.DataGrid.DataGridNode<GridNode>>):
      void {
    this.onClick((event.data as GridNode).profileNode);
    this.onHover((event.data as GridNode).profileNode);
  }

  /**
   * Called when the user deselects a row.
   * This can either be because they have selected a new row
   * (you should expect a SELECTED_NODE event after this one)
   * or because they have deselected without a new selection.
   */
  #onDataGridDeselection(): void {
    this.onClick(null);
    this.onHover(null);
  }

  onGridNodeOpened(): void {
    const gridNode = this.dataGrid.selectedNode as TreeGridNode;
    // Use tree's hover method in case of unique hover experiences (like ThirdPartyTree).
    this.onHover(gridNode.profileNode);
    this.updateDetailsForSelection();
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

  dataGridElementForEvent(event: Trace.Types.Events.Event|null): HTMLElement|null {
    if (!event) {
      return null;
    }
    const treeNode = this.eventToTreeNode.get(event);
    return (treeNode && this.dataGridNodeForTreeNode(treeNode)?.element()) ?? null;
  }

  dataGridNodeForTreeNode(treeNode: Trace.Extras.TraceTree.Node): GridNode|null {
    return treeNodeToGridNode.get(treeNode) || null;
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

export namespace TimelineTreeView {
  export const enum Events {
    TREE_ROW_HOVERED = 'TreeRowHovered',
    BOTTOM_UP_BUTTON_CLICKED = 'BottomUpButtonClicked',
    TREE_ROW_CLICKED = 'TreeRowClicked',
  }

  export interface EventTypes {
    [Events.TREE_ROW_HOVERED]: {node: Trace.Extras.TraceTree.Node|null, events?: Trace.Types.Events.Event[]};
    [Events.BOTTOM_UP_BUTTON_CLICKED]: Trace.Extras.TraceTree.Node|null;
    [Events.TREE_ROW_CLICKED]: {node: Trace.Extras.TraceTree.Node|null, events?: Trace.Types.Events.Event[]};
  }
}

/**
 * GridNodes are 1:1 with `TraceTree.Node`s but represent them within the DataGrid. It handles the representation as a row.
 * `TreeGridNode` extends this to maintain relationship to the tree, and handles populate().
 *
 * `TimelineStackView` (aka heaviest stack) uses GridNode directly (as there's no hierarchy there), otherwise these TreeGridNode could probably be consolidated.
 */
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
    if (columnId === 'activity' || columnId === 'site') {
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

      // Include badges with the name, if relevant.
      if (columnId === 'site' && this.treeView instanceof ThirdPartyTreeView.ThirdPartyTreeViewWidget) {
        const thirdPartyTree = this.treeView;
        let badgeText = '';

        if (thirdPartyTree.nodeIsFirstParty(this.profileNode)) {
          badgeText = i18nString(UIStrings.firstParty);
        } else if (thirdPartyTree.nodeIsExtension(this.profileNode)) {
          badgeText = i18nString(UIStrings.extension);
        }

        if (badgeText) {
          const badge = container.createChild('div', 'entity-badge');
          badge.textContent = badgeText;
          UI.ARIAUtils.setLabel(badge, badgeText);
        }
      }
    } else if (event) {
      name.textContent = TimelineUIUtils.eventTitle(event);
      const parsedTrace = this.treeView.parsedTrace();
      const target = parsedTrace ? targetForEvent(parsedTrace, event) : null;
      const linkifier = this.treeView.linkifier;
      const isFreshRecording =
          Boolean(parsedTrace && Utils.FreshRecording.Tracker.instance().recordingIsFresh(parsedTrace));
      this.linkElement = TimelineUIUtils.linkifyTopCallFrame(event, target, linkifier, isFreshRecording);
      if (this.linkElement) {
        container.createChild('div', 'activity-link').appendChild(this.linkElement);
      }
      UI.ARIAUtils.setLabel(icon, TimelineUIUtils.eventStyle(event).category.title);
      icon.style.backgroundColor = TimelineUIUtils.eventColor(event);
      if (Trace.Types.Extensions.isSyntheticExtensionEntry(event)) {
        icon.style.backgroundColor = Extensions.ExtensionUI.extensionEntryColor(event);
      }
    }
    return cell;
  }

  private createValueCell(columnId: string): HTMLElement|null {
    if (columnId !== 'self' && columnId !== 'total' && columnId !== 'start-time' && columnId !== 'transfer-size') {
      return null;
    }

    let showPercents = false;
    let value: number;
    let maxTime: number|undefined;
    let event: Trace.Types.Events.Event|null;
    let isSize = false;
    let showBottomUpButton = false;
    const thirdPartyView = this.treeView;
    switch (columnId) {
      case 'start-time': {
        event = this.profileNode.event;
        const parsedTrace = this.treeView.parsedTrace();
        if (!parsedTrace) {
          throw new Error('Unable to load trace data for tree view');
        }
        const timings = event && Trace.Helpers.Timing.eventTimingsMilliSeconds(event);
        const startTime = timings?.startTime ?? 0;
        value = startTime - Trace.Helpers.Timing.microToMilli(parsedTrace.Meta.traceBounds.min);
      } break;
      case 'self':
        value = this.profileNode.selfTime;
        maxTime = this.maxSelfTime;
        showPercents = true;
        showBottomUpButton = thirdPartyView instanceof ThirdPartyTreeView.ThirdPartyTreeViewWidget;
        break;
      case 'total':
        value = this.profileNode.totalTime;
        maxTime = this.maxTotalTime;
        showPercents = true;
        break;
      case 'transfer-size':
        value = this.profileNode.transferSize;
        isSize = true;
        break;
      default:
        return null;
    }
    const cell = this.createTD(columnId);
    cell.className = 'numeric-column';
    let textDiv;
    if (!isSize) {
      cell.setAttribute('title', i18n.TimeUtilities.preciseMillisToString(value, 4));
      textDiv = cell.createChild('div');
      textDiv.createChild('span').textContent = i18n.TimeUtilities.preciseMillisToString(value, 1);
    } else {
      cell.setAttribute('title', i18n.ByteUtilities.formatBytesToKb(value));
      textDiv = cell.createChild('div');
      textDiv.createChild('span').textContent = i18n.ByteUtilities.formatBytesToKb(value);
    }

    if (showPercents && this.treeView.exposePercentages()) {
      textDiv.createChild('span', 'percent-column').textContent =
          i18nString(UIStrings.percentPlaceholder, {PH1: (value / this.grandTotalTime * 100).toFixed(1)});
    }
    if (maxTime) {
      textDiv.classList.add('background-bar-text');
      cell.createChild('div', 'background-bar-container').createChild('div', 'background-bar').style.width =
          (value * 100 / maxTime).toFixed(1) + '%';
    }
    // Generate button on hover for 3P self time cell.
    if (showBottomUpButton) {
      this.generateBottomUpButton(textDiv);
    }
    return cell;
  }

  // Generates bottom up tree hover button and appends it to the provided cell element.
  private generateBottomUpButton(textDiv: HTMLElement): void {
    const button = new Buttons.Button.Button();
    button.data = {
      variant: Buttons.Button.Variant.ICON,
      iconName: 'account-tree',
      size: Buttons.Button.Size.SMALL,
      toggledIconName: i18nString(UIStrings.bottomUp),
    };
    UI.ARIAUtils.setLabel(button, i18nString(UIStrings.viewBottomUp));
    button.addEventListener('click', () => this.#bottomUpButtonClicked());
    UI.Tooltip.Tooltip.install(button, i18nString(UIStrings.bottomUp));

    // Append the button to the last column
    textDiv.appendChild(button);
  }

  #bottomUpButtonClicked(): void {
    // We should also trigger an event to "unhover" the 3P tree row. Since this isn't
    // triggered when clicking the bottom up button.
    this.treeView.dispatchEventToListeners(TimelineTreeView.Events.TREE_ROW_HOVERED, {node: null});
    this.treeView.dispatchEventToListeners(TimelineTreeView.Events.BOTTOM_UP_BUTTON_CLICKED, this.profileNode);
  }
}

/**
 * `TreeGridNode` lets a `GridNode` (row) populate based on its tree children.
 */
export class TreeGridNode extends GridNode {
  constructor(
      profileNode: Trace.Extras.TraceTree.Node, grandTotalTime: number, maxSelfTime: number, maxTotalTime: number,
      treeView: TimelineTreeView) {
    super(profileNode, grandTotalTime, maxSelfTime, maxTotalTime, treeView);
    this.setHasChildren(this.profileNode.hasChildren());
    treeNodeToGridNode.set(profileNode, this);
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
      for (const e of node.events) {
        this.treeView.eventToTreeNode.set(e, node);
      }
      this.insertChildOrdered(gridNode);
    }
  }
}

const treeNodeToGridNode = new WeakMap<Trace.Extras.TraceTree.Node, TreeGridNode>();

export class AggregatedTimelineTreeView extends TimelineTreeView {
  protected readonly groupBySetting: Common.Settings.Setting<AggregatedTimelineTreeView.GroupBy>;
  readonly stackView: TimelineStackView;

  constructor() {
    super();
    this.groupBySetting = Common.Settings.Settings.instance().createSetting(
        'timeline-tree-group-by', AggregatedTimelineTreeView.GroupBy.None);
    this.groupBySetting.addChangeListener(this.refreshTree.bind(this));
    this.init();
    this.stackView = new TimelineStackView(this);
    this.stackView.addEventListener(TimelineStackView.Events.SELECTION_CHANGED, this.onStackViewSelectionChanged, this);
  }

  setGroupBySetting(groupBy: AggregatedTimelineTreeView.GroupBy): void {
    this.groupBySetting.set(groupBy);
  }

  override updateContents(selection: TimelineSelection): void {
    super.updateContents(selection);
    const rootNode = this.dataGrid.rootNode();
    if (rootNode.children.length) {
      rootNode.children[0].select(/* suppressSelectedEvent */ true);
    }
    this.updateDetailsForSelection();
  }

  private beautifyDomainName(this: AggregatedTimelineTreeView, name: string, node: Trace.Extras.TraceTree.Node):
      string {
    if (AggregatedTimelineTreeView.isExtensionInternalURL(name as Platform.DevToolsPath.UrlString)) {
      name = i18nString(UIStrings.chromeExtensionsOverhead);
    } else if (AggregatedTimelineTreeView.isV8NativeURL(name as Platform.DevToolsPath.UrlString)) {
      name = i18nString(UIStrings.vRuntime);
    } else if (name.startsWith('chrome-extension')) {
      name = this.entityMapper()?.entityForEvent(node.event)?.name || name;
    }
    return name;
  }

  displayInfoForGroupNode(node: Trace.Extras.TraceTree.Node): {
    name: string,
    color: string,
    icon: (Element|undefined),
  } {
    const categories = Utils.EntryStyles.getCategoryStyles();
    const color = TimelineUIUtils.eventColor(node.event);
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
        // This `undefined` is [unattributed]
        // TODO(paulirish,aixba): Improve attribution to reduce amount of items in [unattributed].
        const domainName = id ? this.beautifyDomainName(id, node) : undefined;
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
    for (let node: Trace.Extras.TraceTree.Node = treeNode; node?.parent; node = node.parent) {
      result.push(node);
    }
    result = result.reverse();
    for (let node: Trace.Extras.TraceTree.Node = treeNode; node?.children()?.size;) {
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
          return parsedTrace ? Trace.Handlers.Helpers.getNonResolvedURL(event, parsedTrace) ?? '' : '';
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

  // This is our groupingFunction that returns the eventId in Domain, Subdomain, and ThirdParty groupBy scenarios.
  // The eventid == the identity of a node that we expect in a bottomUp tree (either without grouping or with the groupBy grouping)
  // A "top node" (in `ungroupedTopNodes`) is aggregated by this. (But so are all the other nodes, except the `GroupNode`s)
  private domainByEvent(groupBy: AggregatedTimelineTreeView.GroupBy, event: Trace.Types.Events.Event): string {
    const parsedTrace = this.parsedTrace();
    if (!parsedTrace) {
      return '';
    }
    const url = Trace.Handlers.Helpers.getNonResolvedURL(event, parsedTrace);
    if (!url) {
      // We could have receiveDataEvents (that don't have a url), but that have been
      // attributed to an entity, let's check for these. This is used for ThirdParty grouping.
      const entity = this.entityMapper()?.entityForEvent(event);
      if (groupBy === AggregatedTimelineTreeView.GroupBy.ThirdParties && entity) {
        if (!entity) {
          return '';
        }
        const firstDomain = entity.domains[0];
        const parsedURL = Common.ParsedURL.ParsedURL.fromString(firstDomain);
        // chrome-extension check must come before entity.name.
        if (parsedURL?.scheme === 'chrome-extension') {
          return `${parsedURL.scheme}://${parsedURL.host}`;
        }
        return entity.name;
      }
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
    // This must follow after the extension checks.
    if (groupBy === AggregatedTimelineTreeView.GroupBy.ThirdParties) {
      const entity = this.entityMapper()?.entityForEvent(event);
      if (!entity) {
        return '';
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
    return domainMatch?.[0] || '';
  }

  private static isExtensionInternalURL(url: Platform.DevToolsPath.UrlString): boolean {
    return url.startsWith(AggregatedTimelineTreeView.extensionInternalPrefix);
  }

  private static isV8NativeURL(url: Platform.DevToolsPath.UrlString): boolean {
    return url.startsWith(AggregatedTimelineTreeView.v8NativePrefix);
  }

  private static readonly extensionInternalPrefix = 'extensions::';
  private static readonly v8NativePrefix = 'native ';

  override onHover(node: Trace.Extras.TraceTree.Node|null): void {
    if (node !== null && this.groupBySetting.get() === AggregatedTimelineTreeView.GroupBy.ThirdParties) {
      const events = this.#getThirdPartyEventsForNode(node);
      this.dispatchEventToListeners(TimelineTreeView.Events.TREE_ROW_HOVERED, {node, events});
      return;
    }
    this.dispatchEventToListeners(TimelineTreeView.Events.TREE_ROW_HOVERED, {node});
  }

  override onClick(node: Trace.Extras.TraceTree.Node|null): void {
    if (node !== null && this.groupBySetting.get() === AggregatedTimelineTreeView.GroupBy.ThirdParties) {
      const events = this.#getThirdPartyEventsForNode(node);
      this.dispatchEventToListeners(TimelineTreeView.Events.TREE_ROW_CLICKED, {node, events});
      return;
    }
    this.dispatchEventToListeners(TimelineTreeView.Events.TREE_ROW_CLICKED, {node});
  }

  #getThirdPartyEventsForNode(node: Trace.Extras.TraceTree.Node): Trace.Types.Events.Event[]|undefined {
    if (!node.event) {
      return;
    }
    const entity = this.entityMapper()?.entityForEvent(node.event);
    // Should be [unattributed]. Just use the node's events.
    if (!entity) {
      return node.events;
    }
    const events = this.entityMapper()?.eventsForEntity(entity);
    return events;
  }
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
    return new Trace.Extras.TraceTree.BottomUpRootNode(this.selectedEvents(), {
      textFilter: this.textFilter(),
      filters: this.filtersWithoutTextFilter(),
      startTime: this.startTime,
      endTime: this.endTime,
      eventGroupIdCallback: this.groupingFunction(this.groupBySetting.get()),
      // To include instant events. When this is set to true, instant events are
      // considered (to calculate transfer size). This then includes these events in tree nodes.
      calculateTransferSize: true,
      // We should forceGroupIdCallback if filtering by 3P for correct 3P grouping.
      forceGroupIdCallback: this.groupBySetting.get() === AggregatedTimelineTreeView.GroupBy.ThirdParties,
    });
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
      refreshCallback: undefined,
    });

    this.dataGrid.setResizeMethod(DataGrid.DataGrid.ResizeMethod.LAST);
    this.dataGrid.addEventListener(DataGrid.DataGrid.Events.SELECTED_NODE, this.onSelectionChanged, this);

    // Hover dim behavior within stackview sidebar
    this.dataGrid.element.addEventListener('mouseenter', this.onMouseMove.bind(this), true);
    this.dataGrid.element.addEventListener(
        'mouseleave', () => this.dispatchEventToListeners(TimelineStackView.Events.TREE_ROW_HOVERED, null));

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

  onMouseMove(event: Event): void {
    const gridNode = event.target && (event.target instanceof Node) ?
        (this.dataGrid.dataGridNodeFromNode((event.target as Node))) :
        null;
    const profileNode = (gridNode as TreeGridNode)?.profileNode;
    this.dispatchEventToListeners(TimelineStackView.Events.TREE_ROW_HOVERED, profileNode);
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
    TREE_ROW_HOVERED = 'TreeRowHovered',
  }

  export interface EventTypes {
    [Events.TREE_ROW_HOVERED]: Trace.Extras.TraceTree.Node|null;
    [Events.SELECTION_CHANGED]: void;
  }
}

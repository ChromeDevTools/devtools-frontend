/*
 * Copyright (C) 2012 Google Inc. All rights reserved.
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
import * as i18n from '../../core/i18n/i18n.js';
import type * as SDK from '../../core/sdk/sdk.js';
import * as HeapSnapshotModel from '../../models/heap_snapshot_model/heap_snapshot_model.js';
import * as DataGrid from '../../ui/legacy/components/data_grid/data_grid.js';
import * as Components from '../../ui/legacy/components/utils/utils.js';
import * as UI from '../../ui/legacy/legacy.js';

import {
  AllocationGridNode,
  HeapSnapshotConstructorNode,
  HeapSnapshotDiffNode,
  HeapSnapshotGenericObjectNode,
  type HeapSnapshotGridNode,
  HeapSnapshotObjectNode,
  HeapSnapshotRetainingObjectNode,
} from './HeapSnapshotGridNodes.js';
import {type HeapSnapshotProxy} from './HeapSnapshotProxy.js';
import {type HeapProfileHeader} from './HeapSnapshotView.js';
import {type DataDisplayDelegate} from './ProfileHeader.js';

const UIStrings = {
  /**
   *@description Text in Heap Snapshot Data Grids of a profiler tool
   */
  distanceFromWindowObject: 'Distance from window object',
  /**
   *@description Text in Heap Snapshot Data Grids of a profiler tool
   */
  sizeOfTheObjectItselfInBytes: 'Size of the object itself in bytes',
  /**
   *@description Text in Heap Snapshot Data Grids of a profiler tool
   */
  sizeOfTheObjectPlusTheGraphIt: 'Size of the object plus the graph it retains in bytes',
  /**
   *@description Text in Heap Snapshot Data Grids of a profiler tool
   */
  object: 'Object',
  /**
   *@description Text in Heap Snapshot Data Grids of a profiler tool
   */
  distance: 'Distance',
  /**
   *@description Text in Heap Snapshot Data Grids of a profiler tool. Shallow size is the size of just this node, not including children/retained size.
   */
  shallowSize: 'Shallow Size',
  /**
   *@description Text in Heap Snapshot Data Grids of a profiler tool
   */
  retainedSize: 'Retained Size',
  /**
   * @description Title for a section in the Heap Snapshot view. This title is for a table which
   * shows retaining relationships between JavaScript objects. One object retains another if it holds
   * a reference to it, keeping it alive.
   */
  heapSnapshotRetainment: 'Heap Snapshot Retainment',
  /**
   *@description Text in Heap Snapshot Data Grids of a profiler tool
   */
  constructorString: 'Constructor',
  /**
   *@description Data grid name for Heap Snapshot Constructors data grids
   */
  heapSnapshotConstructors: 'Heap Snapshot Constructors',
  /**
   *@description Column header in a table displaying the diff between two Heap Snapshots. This
   * column is number of new objects in snapshot #2 compared to snapshot #1.
   */
  New: '# New',
  /**
   *@description Column header in a table displaying the diff between two Heap Snapshots. This
   * column is number of deleted objects in snapshot #2 compared to snapshot #1.
   */
  Deleted: '# Deleted',
  /**
   * @description Column header in a table displaying the diff between two Heap Snapshots. This
   * column is the difference (delta) between the # New and # Deleted objects in the snapshot.
   */
  Delta: '# Delta',
  /**
   *@description Text in Heap Snapshot Data Grids of a profiler tool
   */
  allocSize: 'Alloc. Size',
  /**
   *@description Text in Heap Snapshot Data Grids of a profiler tool
   */
  freedSize: 'Freed Size',
  /**
   * @description Title of a column in a table in the Heap Snapshot tool. 'Delta' here means
   * difference, so the whole string means 'difference in size'.
   */
  sizeDelta: 'Size Delta',
  /**
   *@description Data grid name for Heap Snapshot Diff data grids
   */
  heapSnapshotDiff: 'Heap Snapshot Diff',
  /**
   *@description Text in Heap Snapshot Data Grids of a profiler tool
   */
  liveCount: 'Live Count',
  /**
   *@description Text in Heap Snapshot Data Grids of a profiler tool
   */
  count: 'Count',
  /**
   *@description Text in Heap Snapshot Data Grids of a profiler tool
   */
  liveSize: 'Live Size',
  /**
   *@description Text for the size of something
   */
  size: 'Size',
  /**
   *@description Text for a programming function
   */
  function: 'Function',
  /**
   *@description Text in Heap Snapshot View of a profiler tool
   */
  allocation: 'Allocation',
};
const str_ = i18n.i18n.registerUIStrings('panels/profiler/HeapSnapshotDataGrids.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
const adjacencyMap = new WeakMap<DataGrid.DataGrid.DataGridNode<HeapSnapshotGridNode>, HeapSnapshotGridNode[]>();

class HeapSnapshotSortableDataGridBase extends DataGrid.DataGrid.DataGridImpl<HeapSnapshotGridNode> {}

export class HeapSnapshotSortableDataGrid extends
    Common.ObjectWrapper.eventMixin<EventTypes, typeof HeapSnapshotSortableDataGridBase>(
        HeapSnapshotSortableDataGridBase) {
  snapshot: HeapSnapshotProxy|null;
  override selectedNode: HeapSnapshotGridNode|null;
  readonly heapProfilerModelInternal: SDK.HeapProfilerModel.HeapProfilerModel|null;
  readonly dataDisplayDelegateInternal: DataDisplayDelegate;
  recursiveSortingDepth: number;
  populatedAndSorted: boolean;
  nameFilter: UI.Toolbar.ToolbarInput|null;
  nodeFilterInternal: HeapSnapshotModel.HeapSnapshotModel.NodeFilter|undefined;
  lastSortColumnId?: string|null;
  lastSortAscending?: boolean;
  constructor(
      heapProfilerModel: SDK.HeapProfilerModel.HeapProfilerModel|null, dataDisplayDelegate: DataDisplayDelegate,
      dataGridParameters: DataGrid.DataGrid.Parameters) {
    // TODO(allada) This entire class needs to be converted to use the templates in DataGridNode.
    super(dataGridParameters);
    this.snapshot = null;
    this.selectedNode = null;
    this.heapProfilerModelInternal = heapProfilerModel;
    this.dataDisplayDelegateInternal = dataDisplayDelegate;
    const tooltips = [
      ['distance', i18nString(UIStrings.distanceFromWindowObject)],
      ['shallowSize', i18nString(UIStrings.sizeOfTheObjectItselfInBytes)],
      ['retainedSize', i18nString(UIStrings.sizeOfTheObjectPlusTheGraphIt)],
    ];
    for (const info of tooltips) {
      const headerCell = this.headerTableHeader(info[0]);
      if (headerCell) {
        headerCell.setAttribute('title', info[1]);
      }
    }

    this.recursiveSortingDepth = 0;
    this.populatedAndSorted = false;
    this.nameFilter = null;
    this.nodeFilterInternal = new HeapSnapshotModel.HeapSnapshotModel.NodeFilter();
    this.addEventListener(HeapSnapshotSortableDataGridEvents.SortingComplete, this.sortingComplete, this);
    this.addEventListener(DataGrid.DataGrid.Events.SORTING_CHANGED, this.sortingChanged, this);
    this.setRowContextMenuCallback(this.populateContextMenu.bind(this));
  }

  async setDataSource(_snapshot: HeapSnapshotProxy, _nodeIndex: number): Promise<void> {
  }

  isFilteredOut(node: HeapSnapshotGridNode): boolean {
    const nameFilterValue = this.nameFilter ? this.nameFilter.value().toLowerCase() : '';
    if (nameFilterValue && (node instanceof HeapSnapshotDiffNode || node instanceof HeapSnapshotConstructorNode) &&
        node.filteredOut(nameFilterValue)) {
      return true;
    }
    return false;
  }

  heapProfilerModel(): SDK.HeapProfilerModel.HeapProfilerModel|null {
    return this.heapProfilerModelInternal;
  }

  dataDisplayDelegate(): DataDisplayDelegate {
    return this.dataDisplayDelegateInternal;
  }

  nodeFilter(): HeapSnapshotModel.HeapSnapshotModel.NodeFilter|undefined {
    return this.nodeFilterInternal;
  }

  setNameFilter(nameFilter: UI.Toolbar.ToolbarInput): void {
    this.nameFilter = nameFilter;
  }

  defaultPopulateCount(): number {
    return 100;
  }

  disposeAllNodes(): void {
    const children = this.topLevelNodes();
    for (let i = 0, l = children.length; i < l; ++i) {
      children[i].dispose();
    }
  }

  override wasShown(): void {
    if (this.nameFilter) {
      this.nameFilter.addEventListener(UI.Toolbar.ToolbarInput.Event.TEXT_CHANGED, this.onNameFilterChanged, this);
      this.updateVisibleNodes(true);
    }
    if (this.populatedAndSorted) {
      this.dispatchEventToListeners(HeapSnapshotSortableDataGridEvents.ContentShown, this);
    }
  }

  sortingComplete(): void {
    this.removeEventListener(HeapSnapshotSortableDataGridEvents.SortingComplete, this.sortingComplete, this);
    this.populatedAndSorted = true;
    this.dispatchEventToListeners(HeapSnapshotSortableDataGridEvents.ContentShown, this);
  }

  override willHide(): void {
    if (this.nameFilter) {
      this.nameFilter.removeEventListener(UI.Toolbar.ToolbarInput.Event.TEXT_CHANGED, this.onNameFilterChanged, this);
    }
  }

  populateContextMenu(
      contextMenu: UI.ContextMenu.ContextMenu, gridNode: DataGrid.DataGrid.DataGridNode<HeapSnapshotGridNode>): void {
    const node = (gridNode as HeapSnapshotGridNode);
    node.populateContextMenu(contextMenu, this.dataDisplayDelegateInternal, this.heapProfilerModel());

    if (node instanceof HeapSnapshotGenericObjectNode && node.linkElement) {
      contextMenu.appendApplicableItems(node.linkElement);
    }
  }

  resetSortingCache(): void {
    delete this.lastSortColumnId;
    delete this.lastSortAscending;
  }

  topLevelNodes(): HeapSnapshotGridNode[] {
    return this.rootNode().children as HeapSnapshotGridNode[];
  }

  revealObjectByHeapSnapshotId(_heapSnapshotObjectId: string): Promise<HeapSnapshotGridNode|null> {
    return Promise.resolve((null as HeapSnapshotGridNode | null));
  }

  resetNameFilter(): void {
    if (this.nameFilter) {
      this.nameFilter.setValue('');
    }
  }

  onNameFilterChanged(): void {
    this.updateVisibleNodes(true);
    this.deselectFilteredNodes();
  }

  deselectFilteredNodes(): void {
    let currentNode: (HeapSnapshotGridNode|null) = this.selectedNode;
    while (currentNode) {
      if (this.selectedNode && this.isFilteredOut((currentNode as HeapSnapshotGridNode))) {
        this.selectedNode.deselect();
        this.selectedNode = null;
        return;
      }
      currentNode = (currentNode.parent as HeapSnapshotGridNode | null);
    }
  }

  sortFields(_sortColumnId: string, _ascending: boolean): HeapSnapshotModel.HeapSnapshotModel.ComparatorConfig {
    throw new Error('Not implemented');
  }

  sortingChanged(): void {
    const sortAscending = this.isSortOrderAscending();
    const sortColumnId = this.sortColumnId();
    if (this.lastSortColumnId === sortColumnId && this.lastSortAscending === sortAscending) {
      return;
    }
    this.lastSortColumnId = sortColumnId;
    this.lastSortAscending = sortAscending;
    const sortFields = this.sortFields(sortColumnId || '', sortAscending);

    function sortByTwoFields(
        nodeA: DataGrid.DataGrid.DataGridNode<HeapSnapshotGridNode>,
        nodeB: DataGrid.DataGrid.DataGridNode<HeapSnapshotGridNode>): number {
      // @ts-ignore
      let field1 = nodeA[sortFields.fieldName1];
      // @ts-ignore
      let field2 = nodeB[sortFields.fieldName1];
      let result: number|(0 | 1 | -1) = field1 < field2 ? -1 : (field1 > field2 ? 1 : 0);
      if (!sortFields.ascending1) {
        result = -result;
      }
      if (result !== 0) {
        return result;
      }
      // @ts-ignore
      field1 = nodeA[sortFields.fieldName2];
      // @ts-ignore
      field2 = nodeB[sortFields.fieldName2];
      result = field1 < field2 ? -1 : (field1 > field2 ? 1 : 0);
      if (!sortFields.ascending2) {
        result = -result;
      }
      return result;
    }
    this.performSorting(sortByTwoFields);
  }

  performSorting(
      sortFunction:
          (arg0: DataGrid.DataGrid.DataGridNode<HeapSnapshotGridNode>,
           arg1: DataGrid.DataGrid.DataGridNode<HeapSnapshotGridNode>) => number): void {
    this.recursiveSortingEnter();
    const children = this.allChildren(this.rootNode());
    this.rootNode().removeChildren();
    children.sort(sortFunction);
    for (let i = 0, l = children.length; i < l; ++i) {
      const child = (children[i] as HeapSnapshotGridNode);
      this.appendChildAfterSorting(child);
      if (child.populated) {
        void child.sort();
      }
    }
    this.recursiveSortingLeave();
  }

  appendChildAfterSorting(child: HeapSnapshotGridNode): void {
    const revealed = child.revealed;
    this.rootNode().appendChild(child);
    child.revealed = revealed;
  }

  recursiveSortingEnter(): void {
    ++this.recursiveSortingDepth;
  }

  recursiveSortingLeave(): void {
    if (!this.recursiveSortingDepth) {
      return;
    }
    if (--this.recursiveSortingDepth) {
      return;
    }
    this.updateVisibleNodes(true);
    this.dispatchEventToListeners(HeapSnapshotSortableDataGridEvents.SortingComplete);
  }

  updateVisibleNodes(_force: boolean): void {
  }

  allChildren(parent: DataGrid.DataGrid.DataGridNode<HeapSnapshotGridNode>):
      DataGrid.DataGrid.DataGridNode<HeapSnapshotGridNode>[] {
    return parent.children;
  }

  insertChild(parent: HeapSnapshotGridNode, node: HeapSnapshotGridNode, index: number): void {
    parent.insertChild(node, index);
  }

  removeChildByIndex(parent: HeapSnapshotGridNode, index: number): void {
    parent.removeChild(parent.children[index]);
  }

  removeAllChildren(parent: HeapSnapshotGridNode): void {
    parent.removeChildren();
  }

  async dataSourceChanged(): Promise<void> {
    throw new Error('Not implemented');
  }
}

export enum HeapSnapshotSortableDataGridEvents {
  /* eslint-disable @typescript-eslint/naming-convention -- Used by web_tests. */
  ContentShown = 'ContentShown',
  SortingComplete = 'SortingComplete',
  ExpandRetainersComplete = 'ExpandRetainersComplete',
  /* eslint-enable @typescript-eslint/naming-convention */
}

export type EventTypes = {
  [HeapSnapshotSortableDataGridEvents.ContentShown]: HeapSnapshotSortableDataGrid,
  [HeapSnapshotSortableDataGridEvents.SortingComplete]: void,
  [HeapSnapshotSortableDataGridEvents.ExpandRetainersComplete]: void,
};

export class HeapSnapshotViewportDataGrid extends HeapSnapshotSortableDataGrid {
  topPaddingHeight: number;
  bottomPaddingHeight: number;
  override selectedNode: HeapSnapshotGridNode|null;
  scrollToResolveCallback?: (() => void)|null;

  constructor(
      heapProfilerModel: SDK.HeapProfilerModel.HeapProfilerModel|null, dataDisplayDelegate: DataDisplayDelegate,
      dataGridParameters: DataGrid.DataGrid.Parameters) {
    super(heapProfilerModel, dataDisplayDelegate, dataGridParameters);
    this.scrollContainer.addEventListener('scroll', this.onScroll.bind(this), true);
    this.topPaddingHeight = 0;
    this.bottomPaddingHeight = 0;
    this.selectedNode = null;
  }

  override topLevelNodes(): HeapSnapshotGridNode[] {
    return this.allChildren(this.rootNode());
  }

  override appendChildAfterSorting(_child: HeapSnapshotGridNode): void {
    // Do nothing here, it will be added in updateVisibleNodes.
  }

  override updateVisibleNodes(force: boolean): void {
    // Guard zone is used to ensure there are always some extra items
    // above and below the viewport to support keyboard navigation.
    const guardZoneHeight = 40;
    const scrollHeight = this.scrollContainer.scrollHeight;
    let scrollTop: number = this.scrollContainer.scrollTop;
    let scrollBottom: number = scrollHeight - scrollTop - this.scrollContainer.offsetHeight;
    scrollTop = Math.max(0, scrollTop - guardZoneHeight);
    scrollBottom = Math.max(0, scrollBottom - guardZoneHeight);
    let viewPortHeight = scrollHeight - scrollTop - scrollBottom;
    // Do nothing if populated nodes still fit the viewport.
    if (!force && scrollTop >= this.topPaddingHeight && scrollBottom >= this.bottomPaddingHeight) {
      return;
    }
    const hysteresisHeight = 500;
    scrollTop -= hysteresisHeight;
    viewPortHeight += 2 * hysteresisHeight;
    const selectedNode = this.selectedNode;
    this.rootNode().removeChildren();

    this.topPaddingHeight = 0;
    this.bottomPaddingHeight = 0;

    this.addVisibleNodes(this.rootNode(), scrollTop, scrollTop + viewPortHeight);

    this.setVerticalPadding(this.topPaddingHeight, this.bottomPaddingHeight);

    if (selectedNode) {
      // Keep selection even if the node is not in the current viewport.
      if (selectedNode.parent) {
        selectedNode.select(true);
      } else {
        this.selectedNode = selectedNode;
      }
    }
  }

  addVisibleNodes(
      parentNode: DataGrid.DataGrid.DataGridNode<HeapSnapshotGridNode>, topBound: number, bottomBound: number): number {
    if (!parentNode.expanded) {
      return 0;
    }

    const children = this.allChildren((parentNode as HeapSnapshotGridNode));
    let topPadding = 0;
    // Iterate over invisible nodes beyond the upper bound of viewport.
    // Do not insert them into the grid, but count their total height.
    let i = 0;
    for (; i < children.length; ++i) {
      const child = children[i];
      if (this.isFilteredOut(child)) {
        continue;
      }
      const newTop = topPadding + this.nodeHeight(child);
      if (newTop > topBound) {
        break;
      }
      topPadding = newTop;
    }

    // Put visible nodes into the data grid.
    let position = topPadding;
    for (; i < children.length && position < bottomBound; ++i) {
      const child = children[i];
      if (this.isFilteredOut(child)) {
        continue;
      }
      const hasChildren = child.hasChildren();
      child.removeChildren();
      child.setHasChildren(hasChildren);
      parentNode.appendChild(child);
      position += child.nodeSelfHeight();
      position += this.addVisibleNodes(child, topBound - position, bottomBound - position);
    }

    // Count the invisible nodes beyond the bottom bound of the viewport.
    let bottomPadding = 0;
    for (; i < children.length; ++i) {
      const child = children[i];
      if (this.isFilteredOut(child)) {
        continue;
      }
      bottomPadding += this.nodeHeight(child);
    }

    this.topPaddingHeight += topPadding;
    this.bottomPaddingHeight += bottomPadding;
    return position + bottomPadding;
  }

  nodeHeight(node: HeapSnapshotGridNode): number {
    let result = node.nodeSelfHeight();
    if (!node.expanded) {
      return result;
    }
    const children = this.allChildren(node);
    for (let i = 0; i < children.length; i++) {
      result += this.nodeHeight(children[i]);
    }
    return result;
  }

  revealTreeNode(pathToReveal: HeapSnapshotGridNode[]): Promise<HeapSnapshotGridNode> {
    const height = this.calculateOffset(pathToReveal);
    const node = (pathToReveal[pathToReveal.length - 1] as HeapSnapshotGridNode);
    const scrollTop = this.scrollContainer.scrollTop;
    const scrollBottom = scrollTop + this.scrollContainer.offsetHeight;
    if (height >= scrollTop && height < scrollBottom) {
      return Promise.resolve(node);
    }

    const scrollGap = 40;
    this.scrollContainer.scrollTop = Math.max(0, height - scrollGap);
    return new Promise(resolve => {
      console.assert(!this.scrollToResolveCallback);
      this.scrollToResolveCallback = resolve.bind(null, node);
      // Still resolve the promise if it does not scroll for some reason.
      this.scrollContainer.window().requestAnimationFrame(() => {
        if (!this.scrollToResolveCallback) {
          return;
        }
        this.scrollToResolveCallback();
        this.scrollToResolveCallback = null;
      });
    });
  }

  calculateOffset(pathToReveal: HeapSnapshotGridNode[]): number {
    let parentNode = this.rootNode();
    let height = 0;
    if (pathToReveal.length === 0) {
      return 0;
    }
    for (let i = 0; i < pathToReveal.length; ++i) {
      const node = pathToReveal[i];
      const children = this.allChildren(parentNode);
      for (let j = 0; j < children.length; ++j) {
        const child = children[j];
        if (node === child) {
          height += node.nodeSelfHeight();
          break;
        }
        height += this.nodeHeight(child);
      }
      parentNode = node;
    }
    return height - (pathToReveal[pathToReveal.length - 1] as HeapSnapshotGridNode).nodeSelfHeight();
  }

  override allChildren(parent: DataGrid.DataGrid.DataGridNode<HeapSnapshotGridNode>): HeapSnapshotGridNode[] {
    const children = adjacencyMap.get(parent) || [];
    if (!adjacencyMap.has(parent)) {
      adjacencyMap.set(parent, children);
    }
    return children;
  }

  appendNode(parent: DataGrid.DataGrid.DataGridNode<HeapSnapshotGridNode>, node: HeapSnapshotGridNode): void {
    this.allChildren(parent).push(node);
  }

  override insertChild(parent: HeapSnapshotGridNode, node: HeapSnapshotGridNode, index: number): void {
    this.allChildren(parent).splice(index, 0, (node as HeapSnapshotGridNode));
  }

  override removeChildByIndex(parent: HeapSnapshotGridNode, index: number): void {
    this.allChildren(parent).splice(index, 1);
  }

  override removeAllChildren(parent: HeapSnapshotGridNode): void {
    adjacencyMap.delete(parent);
  }

  removeTopLevelNodes(): void {
    this.disposeAllNodes();
    this.rootNode().removeChildren();
    this.removeAllChildren((this.rootNode() as HeapSnapshotGridNode));
  }

  isScrolledIntoView(element: HTMLElement): boolean {
    const viewportTop = this.scrollContainer.scrollTop;
    const viewportBottom = viewportTop + this.scrollContainer.clientHeight;
    const elemTop = element.offsetTop;
    const elemBottom = elemTop + element.offsetHeight;
    return elemBottom <= viewportBottom && elemTop >= viewportTop;
  }

  override onResize(): void {
    super.onResize();
    this.updateVisibleNodes(false);
  }

  onScroll(_event: Event): void {
    this.updateVisibleNodes(false);

    if (this.scrollToResolveCallback) {
      this.scrollToResolveCallback();
      this.scrollToResolveCallback = null;
    }
  }
}

export class HeapSnapshotContainmentDataGrid extends HeapSnapshotSortableDataGrid {
  constructor(
      heapProfilerModel: SDK.HeapProfilerModel.HeapProfilerModel|null, dataDisplayDelegate: DataDisplayDelegate,
      displayName: string, columns?: DataGrid.DataGrid.ColumnDescriptor[]) {
    columns =
        columns || ([
          {id: 'object', title: i18nString(UIStrings.object), disclosure: true, sortable: true},
          {id: 'distance', title: i18nString(UIStrings.distance), width: '70px', sortable: true, fixedWidth: true},
          {
            id: 'shallowSize',
            title: i18nString(UIStrings.shallowSize),
            width: '110px',
            sortable: true,
            fixedWidth: true,
          },
          {
            id: 'retainedSize',
            title: i18nString(UIStrings.retainedSize),
            width: '110px',
            sortable: true,
            fixedWidth: true,
            sort: DataGrid.DataGrid.Order.Descending,
          },
        ] as DataGrid.DataGrid.ColumnDescriptor[]);
    const dataGridParameters = ({displayName, columns} as DataGrid.DataGrid.Parameters);
    super(heapProfilerModel, dataDisplayDelegate, dataGridParameters);
  }

  override async setDataSource(snapshot: HeapSnapshotProxy, nodeIndex: number, nodeId?: number): Promise<void> {
    this.snapshot = snapshot;
    const node = new HeapSnapshotModel.HeapSnapshotModel.Node(
        nodeId ?? -1, 'root', 0, nodeIndex || snapshot.rootNodeIndex, 0, 0, '');
    this.setRootNode(this.createRootNode(snapshot, node));
    void (this.rootNode() as HeapSnapshotGridNode).sort();
  }

  createRootNode(snapshot: HeapSnapshotProxy, node: HeapSnapshotModel.HeapSnapshotModel.Node): HeapSnapshotObjectNode {
    const fakeEdge = new HeapSnapshotModel.HeapSnapshotModel.Edge('', node, '', -1);
    return new HeapSnapshotObjectNode(this, snapshot, fakeEdge, null);
  }

  override sortingChanged(): void {
    const rootNode = this.rootNode();
    if (rootNode.hasChildren()) {
      void (rootNode as HeapSnapshotGridNode).sort();
    }
  }
}

export class HeapSnapshotRetainmentDataGrid extends HeapSnapshotContainmentDataGrid {
  resetRetainersButton: UI.Toolbar.ToolbarButton|undefined;
  constructor(
      heapProfilerModel: SDK.HeapProfilerModel.HeapProfilerModel|null, dataDisplayDelegate: DataDisplayDelegate) {
    const columns = ([
      {id: 'object', title: i18nString(UIStrings.object), disclosure: true, sortable: true},
      {
        id: 'distance',
        title: i18nString(UIStrings.distance),
        width: '70px',
        sortable: true,
        fixedWidth: true,
        sort: DataGrid.DataGrid.Order.Ascending,
      },
      {id: 'shallowSize', title: i18nString(UIStrings.shallowSize), width: '110px', sortable: true, fixedWidth: true},
      {id: 'retainedSize', title: i18nString(UIStrings.retainedSize), width: '110px', sortable: true, fixedWidth: true},
    ] as DataGrid.DataGrid.ColumnDescriptor[]);
    super(heapProfilerModel, dataDisplayDelegate, i18nString(UIStrings.heapSnapshotRetainment), columns);
  }

  override createRootNode(snapshot: HeapSnapshotProxy, node: HeapSnapshotModel.HeapSnapshotModel.Node):
      HeapSnapshotRetainingObjectNode {
    const fakeEdge = new HeapSnapshotModel.HeapSnapshotModel.Edge('', node, '', -1);
    return new HeapSnapshotRetainingObjectNode(this, snapshot, fakeEdge, null);
  }

  override sortFields(sortColumn: string, sortAscending: boolean):
      HeapSnapshotModel.HeapSnapshotModel.ComparatorConfig {
    switch (sortColumn) {
      case 'object':
        return new HeapSnapshotModel.HeapSnapshotModel.ComparatorConfig('name', sortAscending, 'count', false);
      case 'count':
        return new HeapSnapshotModel.HeapSnapshotModel.ComparatorConfig('count', sortAscending, 'name', true);
      case 'shallowSize':
        return new HeapSnapshotModel.HeapSnapshotModel.ComparatorConfig('shallowSize', sortAscending, 'name', true);
      case 'retainedSize':
        return new HeapSnapshotModel.HeapSnapshotModel.ComparatorConfig('retainedSize', sortAscending, 'name', true);
      case 'distance':
        return new HeapSnapshotModel.HeapSnapshotModel.ComparatorConfig('distance', sortAscending, 'name', true);
      default:
        throw new Error(`Unknown column ${sortColumn}`);
    }
  }

  reset(): void {
    this.rootNode().removeChildren();
    this.resetSortingCache();
  }

  updateResetButtonVisibility(): void {
    void this.snapshot?.areNodesIgnoredInRetainersView().then(value => {
      this.resetRetainersButton?.setVisible(value);
    });
  }

  override async setDataSource(snapshot: HeapSnapshotProxy, nodeIndex: number, nodeId?: number): Promise<void> {
    await super.setDataSource(snapshot, nodeIndex, nodeId);
    this.rootNode().expand();
    this.updateResetButtonVisibility();
  }

  override async dataSourceChanged(): Promise<void> {
    this.reset();
    await (this.rootNode() as HeapSnapshotGridNode).sort();
    this.rootNode().expand();
    this.updateResetButtonVisibility();
  }
}

// TODO(crbug.com/1228674): Remove this enum, it is only used in web tests.
export enum HeapSnapshotRetainmentDataGridEvents {
  /* eslint-disable @typescript-eslint/naming-convention -- Used by web_tests. */
  ExpandRetainersComplete = 'ExpandRetainersComplete',
  /* eslint-enable @typescript-eslint/naming-convention */
}

export class HeapSnapshotConstructorsDataGrid extends HeapSnapshotViewportDataGrid {
  profileIndex: number;
  objectIdToSelect: string|null;
  nextRequestedFilter: HeapSnapshotModel.HeapSnapshotModel.NodeFilter|null;
  lastFilter?: HeapSnapshotModel.HeapSnapshotModel.NodeFilter|null;
  filterInProgress?: HeapSnapshotModel.HeapSnapshotModel.NodeFilter|null;

  constructor(
      heapProfilerModel: SDK.HeapProfilerModel.HeapProfilerModel|null, dataDisplayDelegate: DataDisplayDelegate) {
    const columns = ([
      {id: 'object', title: i18nString(UIStrings.constructorString), disclosure: true, sortable: true},
      {id: 'distance', title: i18nString(UIStrings.distance), width: '70px', sortable: true, fixedWidth: true},
      {id: 'shallowSize', title: i18nString(UIStrings.shallowSize), width: '110px', sortable: true, fixedWidth: true},
      {
        id: 'retainedSize',
        title: i18nString(UIStrings.retainedSize),
        width: '110px',
        sort: DataGrid.DataGrid.Order.Descending,
        sortable: true,
        fixedWidth: true,
      },
    ] as DataGrid.DataGrid.ColumnDescriptor[]);
    super(
        heapProfilerModel, dataDisplayDelegate,
        ({displayName: i18nString(UIStrings.heapSnapshotConstructors).toString(), columns} as
         DataGrid.DataGrid.Parameters));
    // clang-format on
    this.profileIndex = -1;
    this.objectIdToSelect = null;

    this.nextRequestedFilter = null;
  }

  override sortFields(sortColumn: string, sortAscending: boolean):
      HeapSnapshotModel.HeapSnapshotModel.ComparatorConfig {
    switch (sortColumn) {
      case 'object':
        return new HeapSnapshotModel.HeapSnapshotModel.ComparatorConfig('name', sortAscending, 'retainedSize', false);
      case 'distance':
        return new HeapSnapshotModel.HeapSnapshotModel.ComparatorConfig(
            'distance', sortAscending, 'retainedSize', false);
      case 'shallowSize':
        return new HeapSnapshotModel.HeapSnapshotModel.ComparatorConfig('shallowSize', sortAscending, 'name', true);
      case 'retainedSize':
        return new HeapSnapshotModel.HeapSnapshotModel.ComparatorConfig('retainedSize', sortAscending, 'name', true);
      default:
        throw new Error(`Unknown column ${sortColumn}`);
    }
  }

  override async revealObjectByHeapSnapshotId(id: string): Promise<HeapSnapshotGridNode|null> {
    if (!this.snapshot) {
      this.objectIdToSelect = id;
      return null;
    }

    const className = await this.snapshot.nodeClassName(parseInt(id, 10));
    if (!className) {
      return null;
    }

    const parent = this.topLevelNodes().find(classNode => classNode.name === className);
    if (!parent) {
      return null;
    }

    const nodes = await (parent as HeapSnapshotConstructorNode).populateNodeBySnapshotObjectId(parseInt(id, 10));
    return nodes.length ? this.revealTreeNode(nodes) : null;
  }

  clear(): void {
    this.nextRequestedFilter = null;
    this.lastFilter = null;
    this.removeTopLevelNodes();
  }

  override async setDataSource(snapshot: HeapSnapshotProxy, _nodeIndex: number): Promise<void> {
    this.snapshot = snapshot;
    if (this.profileIndex === -1) {
      void this.populateChildren();
    }

    if (this.objectIdToSelect) {
      void this.revealObjectByHeapSnapshotId(this.objectIdToSelect);
      this.objectIdToSelect = null;
    }
  }

  setSelectionRange(minNodeId: number, maxNodeId: number): void {
    this.nodeFilterInternal = new HeapSnapshotModel.HeapSnapshotModel.NodeFilter(minNodeId, maxNodeId);
    void this.populateChildren(this.nodeFilterInternal);
  }

  setAllocationNodeId(allocationNodeId: number): void {
    this.nodeFilterInternal = new HeapSnapshotModel.HeapSnapshotModel.NodeFilter();
    this.nodeFilterInternal.allocationNodeId = allocationNodeId;
    void this.populateChildren(this.nodeFilterInternal);
  }

  aggregatesReceived(nodeFilter: HeapSnapshotModel.HeapSnapshotModel.NodeFilter, aggregates: {
    [x: string]: HeapSnapshotModel.HeapSnapshotModel.Aggregate,
  }): void {
    this.filterInProgress = null;
    if (this.nextRequestedFilter && this.snapshot) {
      void this.snapshot.aggregatesWithFilter(this.nextRequestedFilter)
          .then(this.aggregatesReceived.bind(this, this.nextRequestedFilter));
      this.filterInProgress = this.nextRequestedFilter;
      this.nextRequestedFilter = null;
    }
    this.removeTopLevelNodes();
    this.resetSortingCache();
    for (const constructor in aggregates) {
      this.appendNode(
          (this.rootNode() as HeapSnapshotGridNode),
          new HeapSnapshotConstructorNode(this, constructor, aggregates[constructor], nodeFilter));
    }
    this.sortingChanged();
    this.lastFilter = nodeFilter;
  }

  async populateChildren(maybeNodeFilter?: HeapSnapshotModel.HeapSnapshotModel.NodeFilter): Promise<void> {
    const nodeFilter = maybeNodeFilter || new HeapSnapshotModel.HeapSnapshotModel.NodeFilter();

    if (this.filterInProgress) {
      this.nextRequestedFilter = this.filterInProgress.equals(nodeFilter) ? null : nodeFilter;
      return;
    }
    if (this.lastFilter && this.lastFilter.equals(nodeFilter)) {
      return;
    }
    this.filterInProgress = nodeFilter;

    if (this.snapshot) {
      const aggregates = await this.snapshot.aggregatesWithFilter(nodeFilter);
      this.aggregatesReceived(nodeFilter, aggregates);
    }
  }

  filterSelectIndexChanged(profiles: HeapProfileHeader[], profileIndex: number, filterName: string|undefined): void {
    this.profileIndex = profileIndex;
    this.nodeFilterInternal = undefined;
    if (profileIndex !== -1) {
      const minNodeId = profileIndex > 0 ? profiles[profileIndex - 1].maxJSObjectId : 0;
      const maxNodeId = profiles[profileIndex].maxJSObjectId;
      this.nodeFilterInternal = new HeapSnapshotModel.HeapSnapshotModel.NodeFilter(minNodeId, maxNodeId);
    } else if (filterName !== undefined) {
      this.nodeFilterInternal = new HeapSnapshotModel.HeapSnapshotModel.NodeFilter();
      this.nodeFilterInternal.filterName = filterName;
    }

    void this.populateChildren(this.nodeFilterInternal);
  }
}

export class HeapSnapshotDiffDataGrid extends HeapSnapshotViewportDataGrid {
  baseSnapshot?: HeapSnapshotProxy;

  constructor(
      heapProfilerModel: SDK.HeapProfilerModel.HeapProfilerModel|null, dataDisplayDelegate: DataDisplayDelegate) {
    const columns = ([
      {id: 'object', title: i18nString(UIStrings.constructorString), disclosure: true, sortable: true},
      {id: 'addedCount', title: i18nString(UIStrings.New), width: '75px', sortable: true, fixedWidth: true},
      {id: 'removedCount', title: i18nString(UIStrings.Deleted), width: '75px', sortable: true, fixedWidth: true},
      {id: 'countDelta', title: i18nString(UIStrings.Delta), width: '65px', sortable: true, fixedWidth: true},
      {
        id: 'addedSize',
        title: i18nString(UIStrings.allocSize),
        width: '75px',
        sortable: true,
        fixedWidth: true,
        sort: DataGrid.DataGrid.Order.Descending,
      },
      {id: 'removedSize', title: i18nString(UIStrings.freedSize), width: '75px', sortable: true, fixedWidth: true},
      {id: 'sizeDelta', title: i18nString(UIStrings.sizeDelta), width: '75px', sortable: true, fixedWidth: true},
    ] as DataGrid.DataGrid.ColumnDescriptor[]);
    super(
        heapProfilerModel, dataDisplayDelegate,
        ({displayName: i18nString(UIStrings.heapSnapshotDiff).toString(), columns} as DataGrid.DataGrid.Parameters));
  }

  override defaultPopulateCount(): number {
    return 50;
  }

  override sortFields(sortColumn: string, sortAscending: boolean):
      HeapSnapshotModel.HeapSnapshotModel.ComparatorConfig {
    switch (sortColumn) {
      case 'object':
        return new HeapSnapshotModel.HeapSnapshotModel.ComparatorConfig('name', sortAscending, 'count', false);
      case 'addedCount':
        return new HeapSnapshotModel.HeapSnapshotModel.ComparatorConfig('addedCount', sortAscending, 'name', true);
      case 'removedCount':
        return new HeapSnapshotModel.HeapSnapshotModel.ComparatorConfig('removedCount', sortAscending, 'name', true);
      case 'countDelta':
        return new HeapSnapshotModel.HeapSnapshotModel.ComparatorConfig('countDelta', sortAscending, 'name', true);
      case 'addedSize':
        return new HeapSnapshotModel.HeapSnapshotModel.ComparatorConfig('addedSize', sortAscending, 'name', true);
      case 'removedSize':
        return new HeapSnapshotModel.HeapSnapshotModel.ComparatorConfig('removedSize', sortAscending, 'name', true);
      case 'sizeDelta':
        return new HeapSnapshotModel.HeapSnapshotModel.ComparatorConfig('sizeDelta', sortAscending, 'name', true);
      default:
        throw new Error(`Unknown column ${sortColumn}`);
    }
  }

  override async setDataSource(snapshot: HeapSnapshotProxy, _nodeIndex: number): Promise<void> {
    this.snapshot = snapshot;
  }

  setBaseDataSource(baseSnapshot: HeapSnapshotProxy): void {
    this.baseSnapshot = baseSnapshot;
    this.removeTopLevelNodes();
    this.resetSortingCache();
    if (this.baseSnapshot === this.snapshot) {
      this.dispatchEventToListeners(HeapSnapshotSortableDataGridEvents.SortingComplete);
      return;
    }
    void this.populateChildren();
  }

  async populateChildren(): Promise<void> {
    if (this.snapshot === null || this.baseSnapshot === undefined || this.baseSnapshot.uid === undefined) {
      throw new Error('Data sources have not been set correctly');
    }
    // Two snapshots live in different workers isolated from each other. That is why
    // we first need to collect information about the nodes in the first snapshot and
    // then pass it to the second snapshot to calclulate the diff.
    const interfaceDefinitions = await this.snapshot.interfaceDefinitions();
    const aggregatesForDiff = await this.baseSnapshot.aggregatesForDiff(interfaceDefinitions);
    const diffByClassName = await this.snapshot.calculateSnapshotDiff(this.baseSnapshot.uid, aggregatesForDiff);

    for (const className in diffByClassName) {
      const diff = diffByClassName[className];
      this.appendNode(this.rootNode(), new HeapSnapshotDiffNode(this, className, diff));
    }
    this.sortingChanged();
  }
}

export class AllocationDataGrid extends HeapSnapshotViewportDataGrid {
  readonly linkifierInternal: Components.Linkifier.Linkifier;
  topNodes?: HeapSnapshotModel.HeapSnapshotModel.SerializedAllocationNode[];

  constructor(
      heapProfilerModel: SDK.HeapProfilerModel.HeapProfilerModel|null, dataDisplayDelegate: DataDisplayDelegate) {
    const columns = ([
      {id: 'liveCount', title: i18nString(UIStrings.liveCount), width: '75px', sortable: true, fixedWidth: true},
      {id: 'count', title: i18nString(UIStrings.count), width: '65px', sortable: true, fixedWidth: true},
      {id: 'liveSize', title: i18nString(UIStrings.liveSize), width: '75px', sortable: true, fixedWidth: true},
      {
        id: 'size',
        title: i18nString(UIStrings.size),
        width: '75px',
        sortable: true,
        fixedWidth: true,
        sort: DataGrid.DataGrid.Order.Descending,
      },
      {id: 'name', title: i18nString(UIStrings.function), disclosure: true, sortable: true},
    ] as DataGrid.DataGrid.ColumnDescriptor[]);
    super(
        heapProfilerModel, dataDisplayDelegate,
        ({displayName: i18nString(UIStrings.allocation).toString(), columns} as DataGrid.DataGrid.Parameters));
    // clang-format on
    this.linkifierInternal = new Components.Linkifier.Linkifier();
  }

  get linkifier(): Components.Linkifier.Linkifier {
    return this.linkifierInternal;
  }

  dispose(): void {
    this.linkifierInternal.reset();
  }

  override async setDataSource(snapshot: HeapSnapshotProxy, _nodeIndex: number): Promise<void> {
    this.snapshot = snapshot;
    this.topNodes = await this.snapshot.allocationTracesTops();
    this.populateChildren();
  }

  populateChildren(): void {
    this.removeTopLevelNodes();
    const root = this.rootNode();
    const tops = this.topNodes || [];
    for (const top of tops) {
      this.appendNode(root, new AllocationGridNode(this, top));
    }
    this.updateVisibleNodes(true);
  }

  override sortingChanged(): void {
    if (this.topNodes !== undefined) {
      this.topNodes.sort(this.createComparator());
      this.rootNode().removeChildren();
      this.populateChildren();
    }
  }

  createComparator(): (arg0: Object, arg1: Object) => number {
    const fieldName = this.sortColumnId();
    const compareResult = (this.sortOrder() === DataGrid.DataGrid.Order.Ascending) ? +1 : -1;
    function compare(a: Object, b: Object): number {
      // @ts-ignore
      if (a[fieldName] > b[fieldName]) {
        return compareResult;
      }
      // @ts-ignore
      if (a[fieldName] < b[fieldName]) {
        return -compareResult;
      }
      return 0;
    }
    return compare;
  }
}

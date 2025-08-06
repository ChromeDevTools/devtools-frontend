// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../../core/common/common.js';
import * as Platform from '../../../../core/platform/platform.js';
import type * as TextUtils from '../../../../models/text_utils/text_utils.js';
import * as RenderCoordinator from '../../../components/render_coordinator/render_coordinator.js';

import {type DataGridData, DataGridImpl, DataGridNode, type Parameters} from './DataGrid.js';

let nextId = 0;

export class ViewportDataGrid<T> extends Common.ObjectWrapper.eventMixin<EventTypes, typeof DataGridImpl>(
    DataGridImpl)<ViewportDataGridNode<T>> {
  private readonly onScrollBound: (event: Event|null) => void;
  private visibleNodes: Array<ViewportDataGridNode<T>>;
  /**
   * A datagrid preference to express that the grid represents an updating log of rows (eg Network panel request log, websocket messages).
   * If `true`, the datagrid will mostly keep the scroll at the bottom, so new items are visible.
   * If the data is sorted descending (eg Performance Call Tree, heap snapshot), keep the default of `false`.
   */
  enableAutoScrollToBottom = false;
  /**
   * When true, the datagrid will manipulate the scrollTop to focus on the bottom, mostly so new additions are visible.
   * Some actions will unset this, like revealing or expanding a particular node.
   * Only matters if enableAutoScrollToBottom is true.
   */
  keepScrollingToBottom = false;
  private updateIsFromUser: boolean;
  private lastScrollTop: number;
  private firstVisibleIsStriped: boolean;
  private isStriped: boolean;
  private filters: readonly TextUtils.TextUtils.ParsedFilter[] = [];
  private id = nextId++;

  constructor(dataGridParameters: Parameters) {
    super(dataGridParameters);

    this.onScrollBound = this.onScroll.bind(this);
    this.scrollContainer.addEventListener('scroll', this.onScrollBound, true);

    this.visibleNodes = [];
    this.inline = false;

    this.updateIsFromUser = false;
    this.lastScrollTop = 0;
    this.firstVisibleIsStriped = false;
    this.isStriped = false;

    this.setRootNode(new ViewportDataGridNode());
  }

  override setStriped(striped: boolean): void {
    this.isStriped = striped;
    let startsWithOdd = true;
    if (this.visibleNodes.length) {
      const allChildren = this.filteredNodes();
      startsWithOdd = Boolean(allChildren.indexOf(this.visibleNodes[0]));
    }
    this.updateStripesClass(startsWithOdd);
  }

  setFilters(filters: readonly TextUtils.TextUtils.ParsedFilter[]): void {
    if (this.filters === filters) {
      return;
    }
    this.filters = filters;
    this.scheduleUpdate();
  }

  private updateStripesClass(startsWithOdd: boolean): void {
    this.element.classList.toggle('striped-data-grid', !startsWithOdd && this.isStriped);
    this.element.classList.toggle('striped-data-grid-starts-with-odd', startsWithOdd && this.isStriped);
  }

  setScrollContainer(scrollContainer: HTMLElement): void {
    this.scrollContainer.removeEventListener('scroll', this.onScrollBound, true);
    this.scrollContainerInternal = scrollContainer;
    this.scrollContainer.addEventListener('scroll', this.onScrollBound, true);
  }

  override onResize(): void {
    if (this.keepScrollingToBottom) {
      this.scrollContainer.scrollTop = this.scrollContainer.scrollHeight - this.scrollContainer.clientHeight;
    }
    this.scheduleUpdate();
    super.onResize();
  }

  setEnableAutoScrollToBottom(stick: boolean): void {
    this.keepScrollingToBottom = this.enableAutoScrollToBottom = stick;
  }

  private onScroll(_event: Event|null): void {
    if (this.lastScrollTop !== this.scrollContainer.scrollTop) {
      this.scheduleUpdate(true);
    }
  }

  scheduleUpdateStructure(): void {
    this.scheduleUpdate();
  }

  scheduleUpdate(isFromUser?: boolean): void {
    this.updateIsFromUser = this.updateIsFromUser || Boolean(isFromUser);
    void RenderCoordinator.write(`ViewportDataGrid.render ${this.id}`, this.update.bind(this));
  }

  // TODO(allada) This should be fixed to never be needed. It is needed right now for network because removing
  // elements happens followed by a scheduleRefresh() which causes white space to be visible, but the waterfall
  // updates instantly.
  updateInstantly(): void {
    this.update();
  }

  override renderInline(): void {
    this.inline = true;
    super.renderInline();
    this.update();
  }

  private getStringifiedCellValues(data: DataGridData, columns: Set<string>): string {
    return JSON
        .stringify(Object.entries(data).filter(([key]) => columns.has(key)).map(([, value]) => {
          if (value instanceof Node) {
            return value.textContent;
          }
          return String(value);
        }))
        .toLowerCase();
  }

  private testNodeWithFilter(node: ViewportDataGridNode<T>, filter: TextUtils.TextUtils.ParsedFilter): boolean {
    let rowMatchesFilter = false;

    const {key, text, negative, regex} = filter;

    const dataToTest = this.getStringifiedCellValues(
        node.data, key ? new Set(key.split(',')) : new Set(this.visibleColumnsArray.map(column => column.id)));

    if (regex) {
      rowMatchesFilter = regex.test(dataToTest);
    } else if (text) {
      rowMatchesFilter = dataToTest.includes(text.toLowerCase());
    }

    // If `negative` is set to `true`, that means we have to flip the final
    // result, because the filter is matching anything that doesn't match. e.g.
    // {text: 'foo', negative: false} matches rows that contain the text `foo`
    // but {text: 'foo', negative: true} matches rows that do NOT contain the
    // text `foo` so if a filter is marked as negative, we first match against
    // that filter, and then we flip it here.
    return negative ? !rowMatchesFilter : rowMatchesFilter;
  }

  testNodeWithFilters(node: ViewportDataGridNode<T>): boolean {
    for (const filter of this.filters) {
      const nodeMatchesFilter = this.testNodeWithFilter(node, filter);
      if (!nodeMatchesFilter) {
        return false;
      }
    }
    return true;
  }

  private calculateVisibleNodes(clientHeight: number, scrollTop: number): {
    topPadding: number,
    bottomPadding: number,
    contentHeight: number,
    visibleNodes: Array<ViewportDataGridNode<T>>,
    offset: number,
  } {
    const nodes = this.filteredNodes();

    if (this.inline) {
      return {topPadding: 0, bottomPadding: 0, contentHeight: 0, visibleNodes: nodes, offset: 0};
    }

    const size = nodes.length;
    let i = 0;
    let y = 0;

    for (; i < size && y + nodes[i].nodeSelfHeight() < scrollTop; ++i) {
      y += nodes[i].nodeSelfHeight();
    }
    const start = i;
    const topPadding = y;

    for (; i < size && y < scrollTop + clientHeight; ++i) {
      y += nodes[i].nodeSelfHeight();
    }
    const end = i;

    let bottomPadding = 0;
    for (; i < size; ++i) {
      bottomPadding += nodes[i].nodeSelfHeight();
    }

    if (this.enableAutoScrollToBottom) {
      // If we're scrolled to the very end, keep the scroll viewport focused to the end (as new items arrive)
      this.keepScrollingToBottom = end === nodes.length;
    }

    return {
      topPadding,
      bottomPadding,
      contentHeight: y - topPadding,
      visibleNodes: nodes.slice(start, end),
      offset: start,
    };
  }

  override getNumberOfRows(): number {
    return this.filteredNodes().length;
  }

  private contentHeight(): number {
    const nodes = this.filteredNodes();
    let result = 0;
    for (let i = 0, size = nodes.length; i < size; ++i) {
      result += nodes[i].nodeSelfHeight();
    }
    return result;
  }

  // The datagrids assume a fixed height of rows, typically 20px. see nodeSelfHeight() and calculateVisibleNodes().
  private update(): void {
    // Visual height of visible data rows
    const clientHeight = this.scrollContainer.clientHeight - this.headerHeightInScroller();
    // The hypothetical height of all data rows summed.
    const contentHeight = this.contentHeight();
    const currentScrollTop = this.scrollContainer.scrollTop;
    // Scrolltop if scrolled to the very bottom
    const maxScrollTop = Math.max(0, contentHeight - clientHeight);
    let nextScrollTop = currentScrollTop;
    if (!this.updateIsFromUser && this.keepScrollingToBottom) {
      nextScrollTop = maxScrollTop;
    }
    this.updateIsFromUser = false;
    nextScrollTop = Math.min(maxScrollTop, nextScrollTop);

    const viewportState = this.calculateVisibleNodes(clientHeight, nextScrollTop);
    const visibleNodes = viewportState.visibleNodes;
    const visibleNodesSet = new Set<ViewportDataGridNode<T>>(visibleNodes);

    for (let i = 0; i < this.visibleNodes.length; ++i) {
      const oldNode = this.visibleNodes[i];
      if (!visibleNodesSet.has(oldNode) && oldNode.attached()) {
        const element = oldNode.existingElement();
        if (element) {
          element.remove();
        }
      }
    }

    let previousElement = this.topFillerRowElement();
    const tBody = this.dataTableBody;
    let offset = viewportState.offset;

    if (visibleNodes.length) {
      const nodes = this.filteredNodes();
      const index = nodes.indexOf(visibleNodes[0]);
      this.updateStripesClass(Boolean(index % 2));
      if (this.keepScrollingToBottom && index !== -1 && Boolean(index % 2) !== this.firstVisibleIsStriped) {
        offset += 1;
      }
    }

    this.firstVisibleIsStriped = Boolean(offset % 2);

    for (let i = 0; i < visibleNodes.length; ++i) {
      const node = visibleNodes[i];
      const element = (node.element());
      node.setStriped((offset + i) % 2 === 0);
      if (element !== previousElement.nextSibling) {
        tBody.insertBefore(element, previousElement.nextSibling);
      }
      node.revealed = true;
      previousElement = element;
    }

    this.setVerticalPadding(viewportState.topPadding, viewportState.bottomPadding);
    this.lastScrollTop = nextScrollTop;
    if (nextScrollTop !== currentScrollTop) {
      this.scrollContainer.scrollTop = nextScrollTop;
    }
    const contentFits =
        viewportState.contentHeight <= clientHeight && viewportState.topPadding + viewportState.bottomPadding === 0;
    if (contentFits !== this.element.classList.contains('data-grid-fits-viewport')) {
      this.element.classList.toggle('data-grid-fits-viewport', contentFits);
      this.updateWidths();
    }
    this.visibleNodes = visibleNodes;
    this.dispatchEventToListeners(Events.VIEWPORT_CALCULATED);
  }

  revealViewportNode(node: ViewportDataGridNode<T>): void {
    const nodes = this.filteredNodes();
    const index = nodes.indexOf(node);
    if (index === -1) {
      return;
    }
    let fromY = 0;
    for (let i = 0; i < index; ++i) {
      fromY += nodes[i].nodeSelfHeight();
    }
    const toY = fromY + node.nodeSelfHeight();
    let scrollTop: number = this.scrollContainer.scrollTop;
    const visibleHeight = this.scrollContainer.offsetHeight - this.headerHeightInScroller();
    if (scrollTop > fromY) {
      scrollTop = fromY;
      this.keepScrollingToBottom = false;
    } else if (scrollTop + visibleHeight < toY) {
      scrollTop = toY - visibleHeight;
    }
    this.scrollContainer.scrollTop = scrollTop;
  }

  private filteredNodes(): Array<ViewportDataGridNode<T>> {
    return (this.rootNode() as ViewportDataGridNode<T>).flatChildren().filter(this.testNodeWithFilters.bind(this));
  }
}

export const enum Events {
  VIEWPORT_CALCULATED = 'ViewportCalculated',
}

export interface EventTypes {
  [Events.VIEWPORT_CALCULATED]: void;
}

export class ViewportDataGridNode<T> extends DataGridNode<ViewportDataGridNode<T>> {
  private stale: boolean;
  private flatNodes: Array<ViewportDataGridNode<T>>|null;
  private isStripedInternal: boolean;

  constructor(data?: DataGridData|null, hasChildren?: boolean) {
    super(data, hasChildren);
    this.stale = false;
    this.flatNodes = null;
    this.isStripedInternal = false;
  }

  override element(): HTMLElement {
    const existingElement = this.existingElement();
    const element = existingElement || this.createElement();
    if (!existingElement || this.stale) {
      this.createCells(element);
      this.stale = false;
    }
    return element;
  }

  override nodeSelfHeight(): number {
    // Use the height of the first non-filler row.
    const firstVisibleRow = this.dataGrid?.topFillerRow?.nextElementSibling;
    const height = firstVisibleRow?.classList.contains('data-grid-data-grid-node') && firstVisibleRow.clientHeight;
    return height || super.nodeSelfHeight();
  }

  setStriped(isStriped: boolean): void {
    this.isStripedInternal = isStriped;
    this.element().classList.toggle('odd', isStriped);
  }

  isStriped(): boolean {
    return this.isStripedInternal;
  }

  clearFlatNodes(): void {
    this.flatNodes = null;
    const parent = (this.parent as ViewportDataGridNode<T>);
    if (parent) {
      parent.clearFlatNodes();
    }
  }

  flatChildren(): Array<ViewportDataGridNode<T>> {
    if (this.flatNodes) {
      return this.flatNodes;
    }
    const flatNodes: Array<ViewportDataGridNode<T>> = [];
    const children = ([this.children] as Array<Array<ViewportDataGridNode<T>>>);
    const counters: number[] = [0];
    let depth = 0;
    while (depth >= 0) {
      if (children[depth].length <= counters[depth]) {
        depth--;
        continue;
      }
      const node = children[depth][counters[depth]++];
      flatNodes.push(node);
      if (node.expanded && node.children.length) {
        depth++;
        children[depth] = (node.children as Array<ViewportDataGridNode<T>>);
        counters[depth] = 0;
      }
    }

    this.flatNodes = flatNodes;
    return flatNodes;
  }

  override insertChild(child: DataGridNode<ViewportDataGridNode<T>>, index: number): void {
    this.clearFlatNodes();
    if (child.parent === this) {
      const currentIndex = this.children.indexOf(child);
      if (currentIndex < 0) {
        console.assert(false, 'Inconsistent DataGrid state');
      }
      if (currentIndex === index) {
        return;
      }
      if (currentIndex < index) {
        --index;
      }
    }
    child.remove();
    child.parent = this;
    child.dataGrid = this.dataGrid;
    if (!this.children.length) {
      this.setHasChildren(true);
    }
    this.children.splice(index, 0, child);
    child.recalculateSiblings(index);
    if (this.expanded && this.dataGrid) {
      (this.dataGrid as ViewportDataGrid<T>).scheduleUpdateStructure();
    }
  }

  override removeChild(child: DataGridNode<ViewportDataGridNode<T>>): void {
    if (this.dataGrid) {
      this.dataGrid.updateSelectionBeforeRemoval(child, false);
    }
    this.clearFlatNodes();
    if (child.previousSibling) {
      child.previousSibling.nextSibling = child.nextSibling;
    }
    if (child.nextSibling) {
      child.nextSibling.previousSibling = child.previousSibling;
    }
    if (child.parent !== this) {
      throw new Error('removeChild: Node is not a child of this node.');
    }

    Platform.ArrayUtilities.removeElement(this.children, child, true);
    (child as ViewportDataGridNode<T>).unlink();

    if (!this.children.length) {
      this.setHasChildren(false);
    }
    if (this.expanded && this.dataGrid) {
      (this.dataGrid as ViewportDataGrid<T>).scheduleUpdateStructure();
    }
  }

  override removeChildren(): void {
    if (this.dataGrid) {
      this.dataGrid.updateSelectionBeforeRemoval(this, true);
    }
    this.clearFlatNodes();
    for (let i = 0; i < this.children.length; ++i) {
      (this.children[i] as ViewportDataGridNode<T>).unlink();
    }
    this.children = ([] as Array<ViewportDataGridNode<T>>);

    if (this.expanded && this.dataGrid) {
      (this.dataGrid as ViewportDataGrid<T>).scheduleUpdateStructure();
    }
  }

  private unlink(): void {
    const existingElement = this.existingElement();
    if (this.attached() && existingElement) {
      existingElement.remove();
    }
    this.resetNode();
  }

  override collapse(): void {
    if (!this.expanded) {
      return;
    }
    this.clearFlatNodes();
    this.expandedInternal = false;
    const existingElement = this.existingElement();
    if (existingElement) {
      existingElement.classList.remove('expanded');
    }
    if (this.selected) {
      (this.dataGrid as ViewportDataGrid<T>).announceSelectedGridNode();
    }
    (this.dataGrid as ViewportDataGrid<T>).scheduleUpdateStructure();
  }

  override expand(): void {
    if (this.expanded) {
      return;
    }
    (this.dataGrid as ViewportDataGrid<T>).keepScrollingToBottom = false;
    this.clearFlatNodes();
    super.expand();
    (this.dataGrid as ViewportDataGrid<T>).scheduleUpdateStructure();
  }

  override traverseNextNode(skipHidden: boolean, stayWithin?: DataGridNode<T>|null, dontPopulate?: boolean, info?: {
    depthChange: number,
  }): DataGridNode<T>|null {
    const result = super.traverseNextNode(skipHidden, stayWithin, dontPopulate, info);
    if (result && skipHidden &&
        !(this.dataGrid as ViewportDataGrid<T>).testNodeWithFilters(result as ViewportDataGridNode<T>)) {
      return result.traverseNextNode(skipHidden, stayWithin, dontPopulate, info);
    }
    return result;
  }

  override traversePreviousNode(skipHidden: boolean, dontPopulate?: boolean): DataGridNode<T>|null {
    const result = super.traversePreviousNode(skipHidden, dontPopulate);
    if (result && skipHidden &&
        !(this.dataGrid as ViewportDataGrid<T>).testNodeWithFilters(result as ViewportDataGridNode<T>)) {
      return result.traversePreviousNode(skipHidden, dontPopulate);
    }
    return result;
  }

  attached(): boolean {
    const existingElement = this.existingElement();
    return Boolean(this.dataGrid && existingElement?.parentElement);
  }

  override refresh(): void {
    if (this.attached()) {
      this.stale = true;
      (this.dataGrid as ViewportDataGrid<T>).scheduleUpdate();
    } else {
      this.resetElement();
    }
  }

  override reveal(): void {
    (this.dataGrid as ViewportDataGrid<T>).revealViewportNode(this);
  }

  override recalculateSiblings(index: number): void {
    this.clearFlatNodes();
    super.recalculateSiblings(index);
  }
}

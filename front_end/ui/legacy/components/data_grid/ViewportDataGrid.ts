// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../../core/common/common.js';
import * as i18n from '../../../../core/i18n/i18n.js';
import * as Platform from '../../../../core/platform/platform.js';
import * as UI from '../../legacy.js';

import {DataGridImpl, DataGridNode, type DataGridData, type Parameters} from './DataGrid.js';

const UIStrings = {
  /**
   *@description accessible name for expandible nodes in datagrids
   */
  collapsed: 'collapsed',
};
const str_ = i18n.i18n.registerUIStrings('ui/legacy/components/data_grid/ViewportDataGrid.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class ViewportDataGrid<T> extends Common.ObjectWrapper.eventMixin<EventTypes, typeof DataGridImpl>(
    DataGridImpl)<ViewportDataGridNode<T>> {
  private readonly onScrollBound: (event: Event|null) => void;
  private visibleNodes: ViewportDataGridNode<T>[];
  stickToBottom: boolean;
  private updateIsFromUser: boolean;
  private lastScrollTop: number;
  private firstVisibleIsStriped: boolean;
  private isStriped: boolean;
  private updateAnimationFrameId?: number;

  constructor(dataGridParameters: Parameters) {
    super(dataGridParameters);

    this.onScrollBound = this.onScroll.bind(this);
    this.scrollContainer.addEventListener('scroll', this.onScrollBound, true);

    this.visibleNodes = [];
    this.inline = false;

    this.stickToBottom = false;
    this.updateIsFromUser = false;
    this.lastScrollTop = 0;
    this.firstVisibleIsStriped = false;
    this.isStriped = false;

    this.setRootNode(new ViewportDataGridNode());
  }

  setStriped(striped: boolean): void {
    this.isStriped = striped;
    let startsWithOdd = true;
    if (this.visibleNodes.length) {
      const allChildren = (this.rootNode() as ViewportDataGridNode<T>).flatChildren();
      startsWithOdd = Boolean(allChildren.indexOf(this.visibleNodes[0]));
    }
    this.updateStripesClass(startsWithOdd);
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

  onResize(): void {
    if (this.stickToBottom) {
      this.scrollContainer.scrollTop = this.scrollContainer.scrollHeight - this.scrollContainer.clientHeight;
    }
    this.scheduleUpdate();
    super.onResize();
  }

  setStickToBottom(stick: boolean): void {
    this.stickToBottom = stick;
  }

  private onScroll(_event: Event|null): void {
    this.stickToBottom = UI.UIUtils.isScrolledToBottom(this.scrollContainer);
    if (this.lastScrollTop !== this.scrollContainer.scrollTop) {
      this.scheduleUpdate(true);
    }
  }

  scheduleUpdateStructure(): void {
    this.scheduleUpdate();
  }

  scheduleUpdate(isFromUser?: boolean): void {
    if (this.stickToBottom && isFromUser) {
      this.stickToBottom = UI.UIUtils.isScrolledToBottom(this.scrollContainer);
    }
    this.updateIsFromUser = this.updateIsFromUser || Boolean(isFromUser);
    if (this.updateAnimationFrameId) {
      return;
    }
    this.updateAnimationFrameId = this.element.window().requestAnimationFrame(this.update.bind(this));
  }

  // TODO(allada) This should be fixed to never be needed. It is needed right now for network because removing
  // elements happens followed by a scheduleRefresh() which causes white space to be visible, but the waterfall
  // updates instantly.
  updateInstantly(): void {
    this.update();
  }

  renderInline(): void {
    this.inline = true;
    super.renderInline();
    this.update();
  }

  private calculateVisibleNodes(clientHeight: number, scrollTop: number): {
    topPadding: number,
    bottomPadding: number,
    contentHeight: number,
    visibleNodes: Array<ViewportDataGridNode<T>>,
    offset: number,
  } {
    const nodes = (this.rootNode() as ViewportDataGridNode<T>).flatChildren();
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

    return {
      topPadding: topPadding,
      bottomPadding: bottomPadding,
      contentHeight: y - topPadding,
      visibleNodes: nodes.slice(start, end),
      offset: start,
    };
  }

  private contentHeight(): number {
    const nodes = (this.rootNode() as ViewportDataGridNode<T>).flatChildren();
    let result = 0;
    for (let i = 0, size = nodes.length; i < size; ++i) {
      result += nodes[i].nodeSelfHeight();
    }
    return result;
  }

  private update(): void {
    if (this.updateAnimationFrameId) {
      this.element.window().cancelAnimationFrame(this.updateAnimationFrameId);
      delete this.updateAnimationFrameId;
    }

    const clientHeight = this.scrollContainer.clientHeight - this.headerHeightInScroller();
    let scrollTop: number = this.scrollContainer.scrollTop;
    const currentScrollTop = scrollTop;
    const maxScrollTop = Math.max(0, this.contentHeight() - clientHeight);
    if (!this.updateIsFromUser && this.stickToBottom) {
      scrollTop = maxScrollTop;
    }
    this.updateIsFromUser = false;
    scrollTop = Math.min(maxScrollTop, scrollTop);

    const viewportState = this.calculateVisibleNodes(clientHeight, scrollTop);
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
      const nodes = (this.rootNode() as ViewportDataGridNode<T>).flatChildren();
      const index = nodes.indexOf(visibleNodes[0]);
      this.updateStripesClass(Boolean(index % 2));
      if (this.stickToBottom && index !== -1 && Boolean(index % 2) !== this.firstVisibleIsStriped) {
        offset += 1;
      }
    }

    this.firstVisibleIsStriped = Boolean(offset % 2);

    for (let i = 0; i < visibleNodes.length; ++i) {
      const node = visibleNodes[i];
      const element = (node.element() as HTMLElement);
      node.setStriped((offset + i) % 2 === 0);
      if (element !== previousElement.nextSibling) {
        tBody.insertBefore(element, previousElement.nextSibling);
      }
      node.revealed = true;
      previousElement = element;
    }

    this.setVerticalPadding(viewportState.topPadding, viewportState.bottomPadding);
    this.lastScrollTop = scrollTop;
    if (scrollTop !== currentScrollTop) {
      this.scrollContainer.scrollTop = scrollTop;
    }
    const contentFits =
        viewportState.contentHeight <= clientHeight && viewportState.topPadding + viewportState.bottomPadding === 0;
    if (contentFits !== this.element.classList.contains('data-grid-fits-viewport')) {
      this.element.classList.toggle('data-grid-fits-viewport', contentFits);
      this.updateWidths();
    }
    this.visibleNodes = visibleNodes;
    this.dispatchEventToListeners(Events.ViewportCalculated);
  }

  revealViewportNode(node: ViewportDataGridNode<T>): void {
    const nodes = (this.rootNode() as ViewportDataGridNode<T>).flatChildren();
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
      this.stickToBottom = false;
    } else if (scrollTop + visibleHeight < toY) {
      scrollTop = toY - visibleHeight;
    }
    this.scrollContainer.scrollTop = scrollTop;
  }
}

// TODO(crbug.com/1167717): Make this a const enum again
// eslint-disable-next-line rulesdir/const_enum
export enum Events {
  ViewportCalculated = 'ViewportCalculated',
}

export type EventTypes = {
  [Events.ViewportCalculated]: void,
};

export class ViewportDataGridNode<T> extends DataGridNode<ViewportDataGridNode<T>> {
  private stale: boolean;
  private flatNodes: ViewportDataGridNode<T>[]|null;
  private isStripedInternal: boolean;

  constructor(data?: DataGridData|null, hasChildren?: boolean) {
    super(data, hasChildren);
    this.stale = false;
    this.flatNodes = null;
    this.isStripedInternal = false;
  }

  element(): Element {
    const existingElement = this.existingElement();
    const element = existingElement || this.createElement();
    if (!existingElement || this.stale) {
      this.createCells(element);
      this.stale = false;
    }
    return element;
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

  flatChildren(): ViewportDataGridNode<T>[] {
    if (this.flatNodes) {
      return this.flatNodes;
    }
    const flatNodes: ViewportDataGridNode<T>[] = [];
    const children = ([this.children] as ViewportDataGridNode<T>[][]);
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
        children[depth] = (node.children as ViewportDataGridNode<T>[]);
        counters[depth] = 0;
      }
    }

    this.flatNodes = flatNodes;
    return flatNodes;
  }

  insertChild(child: DataGridNode<ViewportDataGridNode<T>>, index: number): void {
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

  removeChild(child: DataGridNode<ViewportDataGridNode<T>>): void {
    this.clearFlatNodes();
    if (this.dataGrid) {
      this.dataGrid.updateSelectionBeforeRemoval(child, false);
    }
    if (child.previousSibling) {
      child.previousSibling.nextSibling = child.nextSibling;
    }
    if (child.nextSibling) {
      child.nextSibling.previousSibling = child.previousSibling;
    }
    if (child.parent !== this) {
      throw 'removeChild: Node is not a child of this node.';
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

  removeChildren(): void {
    this.clearFlatNodes();
    if (this.dataGrid) {
      this.dataGrid.updateSelectionBeforeRemoval(this, true);
    }
    for (let i = 0; i < this.children.length; ++i) {
      (this.children[i] as ViewportDataGridNode<T>).unlink();
    }
    this.children = ([] as ViewportDataGridNode<T>[]);

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

  collapse(): void {
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
      (this.dataGrid as ViewportDataGrid<T>).updateGridAccessibleName(i18nString(UIStrings.collapsed));
    }
    (this.dataGrid as ViewportDataGrid<T>).scheduleUpdateStructure();
  }

  expand(): void {
    if (this.expanded) {
      return;
    }
    (this.dataGrid as ViewportDataGrid<T>).stickToBottom = false;
    this.clearFlatNodes();
    super.expand();
    (this.dataGrid as ViewportDataGrid<T>).scheduleUpdateStructure();
  }

  attached(): boolean {
    const existingElement = this.existingElement();
    return Boolean(this.dataGrid && existingElement && existingElement.parentElement);
  }

  refresh(): void {
    if (this.attached()) {
      this.stale = true;
      (this.dataGrid as ViewportDataGrid<T>).scheduleUpdate();
    } else {
      this.resetElement();
    }
  }

  reveal(): void {
    (this.dataGrid as ViewportDataGrid<T>).revealViewportNode(this);
  }

  recalculateSiblings(index: number): void {
    this.clearFlatNodes();
    super.recalculateSiblings(index);
  }
}

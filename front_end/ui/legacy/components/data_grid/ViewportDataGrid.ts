// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable rulesdir/no_underscored_properties */

import * as i18n from '../../../../core/i18n/i18n.js';
import * as Platform from '../../../../core/platform/platform.js';
import * as UI from '../../legacy.js';

import type {DataGridData, Parameters} from './DataGrid.js';
import {DataGridImpl, DataGridNode} from './DataGrid.js';

const UIStrings = {
  /**
  *@description accessible name for expandible nodes in datagrids
  */
  collapsed: 'collapsed',
};
const str_ = i18n.i18n.registerUIStrings('ui/legacy/components/data_grid/ViewportDataGrid.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class ViewportDataGrid<T> extends DataGridImpl<ViewportDataGridNode<T>> {
  _onScrollBound: (event: Event|null) => void;
  _visibleNodes: ViewportDataGridNode<T>[];
  _inline: boolean;
  _stickToBottom: boolean;
  _updateIsFromUser: boolean;
  _lastScrollTop: number;
  _firstVisibleIsStriped: boolean;
  _isStriped: boolean;
  _updateAnimationFrameId?: number;

  constructor(dataGridParameters: Parameters) {
    super(dataGridParameters);

    this._onScrollBound = this._onScroll.bind(this);
    this.scrollContainer.addEventListener('scroll', this._onScrollBound, true);

    this._visibleNodes = [];
    this._inline = false;

    this._stickToBottom = false;
    this._updateIsFromUser = false;
    this._lastScrollTop = 0;
    this._firstVisibleIsStriped = false;
    this._isStriped = false;

    this.setRootNode(new ViewportDataGridNode());
  }

  setStriped(striped: boolean): void {
    this._isStriped = striped;
    let startsWithOdd = true;
    if (this._visibleNodes.length) {
      const allChildren = (this.rootNode() as ViewportDataGridNode<T>).flatChildren();
      startsWithOdd = Boolean(allChildren.indexOf(this._visibleNodes[0]));
    }
    this._updateStripesClass(startsWithOdd);
  }

  _updateStripesClass(startsWithOdd: boolean): void {
    this.element.classList.toggle('striped-data-grid', !startsWithOdd && this._isStriped);
    this.element.classList.toggle('striped-data-grid-starts-with-odd', startsWithOdd && this._isStriped);
  }

  setScrollContainer(scrollContainer: HTMLElement): void {
    this.scrollContainer.removeEventListener('scroll', this._onScrollBound, true);
    this._scrollContainer = scrollContainer;
    this.scrollContainer.addEventListener('scroll', this._onScrollBound, true);
  }

  onResize(): void {
    if (this._stickToBottom) {
      this.scrollContainer.scrollTop = this.scrollContainer.scrollHeight - this.scrollContainer.clientHeight;
    }
    this.scheduleUpdate();
    super.onResize();
  }

  setStickToBottom(stick: boolean): void {
    this._stickToBottom = stick;
  }

  _onScroll(_event: Event|null): void {
    this._stickToBottom = UI.UIUtils.isScrolledToBottom(this.scrollContainer);
    if (this._lastScrollTop !== this.scrollContainer.scrollTop) {
      this.scheduleUpdate(true);
    }
  }

  scheduleUpdateStructure(): void {
    this.scheduleUpdate();
  }

  scheduleUpdate(isFromUser?: boolean): void {
    if (this._stickToBottom && isFromUser) {
      this._stickToBottom = UI.UIUtils.isScrolledToBottom(this.scrollContainer);
    }
    this._updateIsFromUser = this._updateIsFromUser || Boolean(isFromUser);
    if (this._updateAnimationFrameId) {
      return;
    }
    this._updateAnimationFrameId = this.element.window().requestAnimationFrame(this._update.bind(this));
  }

  // TODO(allada) This should be fixed to never be needed. It is needed right now for network because removing
  // elements happens followed by a scheduleRefresh() which causes white space to be visible, but the waterfall
  // updates instantly.
  updateInstantly(): void {
    this._update();
  }

  renderInline(): void {
    this._inline = true;
    super.renderInline();
    this._update();
  }

  _calculateVisibleNodes(clientHeight: number, scrollTop: number): {
    topPadding: number,
    bottomPadding: number,
    contentHeight: number,
    visibleNodes: Array<ViewportDataGridNode<T>>,
    offset: number,
  } {
    const nodes = (this.rootNode() as ViewportDataGridNode<T>).flatChildren();
    if (this._inline) {
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

  _contentHeight(): number {
    const nodes = (this.rootNode() as ViewportDataGridNode<T>).flatChildren();
    let result = 0;
    for (let i = 0, size = nodes.length; i < size; ++i) {
      result += nodes[i].nodeSelfHeight();
    }
    return result;
  }

  _update(): void {
    if (this._updateAnimationFrameId) {
      this.element.window().cancelAnimationFrame(this._updateAnimationFrameId);
      delete this._updateAnimationFrameId;
    }

    const clientHeight = this.scrollContainer.clientHeight;
    let scrollTop: number = this.scrollContainer.scrollTop;
    const currentScrollTop = scrollTop;
    const maxScrollTop = Math.max(0, this._contentHeight() - clientHeight);
    if (!this._updateIsFromUser && this._stickToBottom) {
      scrollTop = maxScrollTop;
    }
    this._updateIsFromUser = false;
    scrollTop = Math.min(maxScrollTop, scrollTop);

    const viewportState = this._calculateVisibleNodes(clientHeight, scrollTop);
    const visibleNodes = viewportState.visibleNodes;
    const visibleNodesSet = new Set<ViewportDataGridNode<T>>(visibleNodes);

    for (let i = 0; i < this._visibleNodes.length; ++i) {
      const oldNode = this._visibleNodes[i];
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
      this._updateStripesClass(Boolean(index % 2));
      if (this._stickToBottom && index !== -1 && Boolean(index % 2) !== this._firstVisibleIsStriped) {
        offset += 1;
      }
    }

    this._firstVisibleIsStriped = Boolean(offset % 2);

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
    this._lastScrollTop = scrollTop;
    if (scrollTop !== currentScrollTop) {
      this.scrollContainer.scrollTop = scrollTop;
    }
    const contentFits =
        viewportState.contentHeight <= clientHeight && viewportState.topPadding + viewportState.bottomPadding === 0;
    if (contentFits !== this.element.classList.contains('data-grid-fits-viewport')) {
      this.element.classList.toggle('data-grid-fits-viewport', contentFits);
      this.updateWidths();
    }
    this._visibleNodes = visibleNodes;
    this.dispatchEventToListeners(Events.ViewportCalculated);
  }

  _revealViewportNode(node: ViewportDataGridNode<T>): void {
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
    if (scrollTop > fromY) {
      scrollTop = fromY;
      this._stickToBottom = false;
    } else if (scrollTop + (this.scrollContainer as HTMLElement).offsetHeight < toY) {
      scrollTop = toY - (this.scrollContainer as HTMLElement).offsetHeight;
    }
    this.scrollContainer.scrollTop = scrollTop;
  }
}

// TODO(crbug.com/1167717): Make this a const enum again
// eslint-disable-next-line rulesdir/const_enum
export enum Events {
  ViewportCalculated = 'ViewportCalculated',
}

export class ViewportDataGridNode<T> extends DataGridNode<ViewportDataGridNode<T>> {
  _stale: boolean;
  _flatNodes: ViewportDataGridNode<T>[]|null;
  _isStriped: boolean;

  constructor(data?: DataGridData|null, hasChildren?: boolean) {
    super(data, hasChildren);
    this._stale = false;
    this._flatNodes = null;
    this._isStriped = false;
  }

  element(): Element {
    const existingElement = this.existingElement();
    const element = existingElement || this.createElement();
    if (!existingElement || this._stale) {
      this.createCells(element);
      this._stale = false;
    }
    return element;
  }

  setStriped(isStriped: boolean): void {
    this._isStriped = isStriped;
    this.element().classList.toggle('odd', isStriped);
  }

  isStriped(): boolean {
    return this._isStriped;
  }

  clearFlatNodes(): void {
    this._flatNodes = null;
    const parent = (this.parent as ViewportDataGridNode<T>);
    if (parent) {
      parent.clearFlatNodes();
    }
  }

  flatChildren(): ViewportDataGridNode<T>[] {
    if (this._flatNodes) {
      return this._flatNodes;
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

    this._flatNodes = flatNodes;
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
    (child as ViewportDataGridNode<T>)._unlink();

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
      (this.children[i] as ViewportDataGridNode<T>)._unlink();
    }
    this.children = ([] as ViewportDataGridNode<T>[]);

    if (this.expanded && this.dataGrid) {
      (this.dataGrid as ViewportDataGrid<T>).scheduleUpdateStructure();
    }
  }

  _unlink(): void {
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
    this._expanded = false;
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
    (this.dataGrid as ViewportDataGrid<T>)._stickToBottom = false;
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
      this._stale = true;
      (this.dataGrid as ViewportDataGrid<T>).scheduleUpdate();
    } else {
      this.resetElement();
    }
  }

  reveal(): void {
    (this.dataGrid as ViewportDataGrid<T>)._revealViewportNode(this);
  }

  recalculateSiblings(index: number): void {
    this.clearFlatNodes();
    super.recalculateSiblings(index);
  }
}

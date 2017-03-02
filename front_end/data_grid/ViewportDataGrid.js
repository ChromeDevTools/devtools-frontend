// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @unrestricted
 * @extends {DataGrid.DataGrid<!NODE_TYPE>}
 * @template NODE_TYPE
 */
DataGrid.ViewportDataGrid = class extends DataGrid.DataGrid {
  /**
   * @param {!Array.<!DataGrid.DataGrid.ColumnDescriptor>} columnsArray
   * @param {function(!NODE_TYPE, string, string, string)=} editCallback
   * @param {function(!NODE_TYPE)=} deleteCallback
   * @param {function()=} refreshCallback
   */
  constructor(columnsArray, editCallback, deleteCallback, refreshCallback) {
    super(columnsArray, editCallback, deleteCallback, refreshCallback);

    this._onScrollBound = this._onScroll.bind(this);
    this._scrollContainer.addEventListener('scroll', this._onScrollBound, true);

    // This is not in setScrollContainer because mouse wheel needs to detect events on the content not the scrollbar itself.
    this._scrollContainer.addEventListener('mousewheel', this._onWheel.bind(this), true);
    /** @type {!Array.<!DataGrid.ViewportDataGridNode>} */
    this._visibleNodes = [];
    this._inline = false;

    // Wheel target shouldn't be removed from DOM to preserve native kinetic scrolling.
    /** @type {?Node} */
    this._wheelTarget = null;

    // Element that was hidden earlier, but hasn't been removed yet.
    /** @type {?Node} */
    this._hiddenWheelTarget = null;

    this._stickToBottom = false;
    this._updateIsFromUser = false;
    this._atBottom = true;
    this._lastScrollTop = 0;
    this._firstVisibleIsStriped = false;

    this.setRootNode(new DataGrid.ViewportDataGridNode());
  }

  /**
   * @param {!Element} scrollContainer
   */
  setScrollContainer(scrollContainer) {
    this._scrollContainer.removeEventListener('scroll', this._onScrollBound, true);
    this._scrollContainer = scrollContainer;
    this._scrollContainer.addEventListener('scroll', this._onScrollBound, true);
  }

  /**
   * @override
   */
  onResize() {
    if (this._stickToBottom && this._atBottom)
      this._scrollContainer.scrollTop = this._scrollContainer.scrollHeight - this._scrollContainer.clientHeight;
    this.scheduleUpdate();
    super.onResize();
  }

  /**
   * @param {boolean} stick
   */
  setStickToBottom(stick) {
    this._stickToBottom = stick;
  }

  /**
   * @param {?Event} event
   */
  _onWheel(event) {
    this._wheelTarget = event.target ? event.target.enclosingNodeOrSelfWithNodeName('tr') : null;
  }

  /**
   * @param {?Event} event
   */
  _onScroll(event) {
    this._atBottom = this._scrollContainer.isScrolledToBottom();
    if (this._lastScrollTop !== this._scrollContainer.scrollTop)
      this.scheduleUpdate(true);
  }

  /**
   * @protected
   */
  scheduleUpdateStructure() {
    this.scheduleUpdate();
  }

  /**
   * @param {boolean=} isFromUser
   */
  scheduleUpdate(isFromUser) {
    this._updateIsFromUser = this._updateIsFromUser || isFromUser;
    if (this._updateAnimationFrameId)
      return;
    this._updateAnimationFrameId = this.element.window().requestAnimationFrame(this._update.bind(this));
  }

  // TODO(allada) This should be fixed to never be needed. It is needed right now for network because removing
  // elements happens followed by a scheduleRefresh() which causes white space to be visible, but the waterfall
  // updates instantly.
  updateInstantly() {
    this._update();
  }

  /**
   * @override
   */
  renderInline() {
    this._inline = true;
    super.renderInline();
    this._update();
  }

  /**
   * @param {number} clientHeight
   * @param {number} scrollTop
   * @return {{topPadding: number, bottomPadding: number, contentHeight: number, visibleNodes: !Array.<!DataGrid.ViewportDataGridNode>, offset: number}}
   */
  _calculateVisibleNodes(clientHeight, scrollTop) {
    var nodes = this.rootNode().flatChildren();
    if (this._inline)
      return {topPadding: 0, bottomPadding: 0, contentHeight: 0, visibleNodes: nodes, offset: 0};

    var size = nodes.length;
    var i = 0;
    var y = 0;

    for (; i < size && y + nodes[i].nodeSelfHeight() < scrollTop; ++i)
      y += nodes[i].nodeSelfHeight();
    var start = i;
    var topPadding = y;

    for (; i < size && y < scrollTop + clientHeight; ++i)
      y += nodes[i].nodeSelfHeight();
    var end = i;

    var bottomPadding = 0;
    for (; i < size; ++i)
      bottomPadding += nodes[i].nodeSelfHeight();

    return {
      topPadding: topPadding,
      bottomPadding: bottomPadding,
      contentHeight: y - topPadding,
      visibleNodes: nodes.slice(start, end),
      offset: start
    };
  }

  /**
   * @return {number}
   */
  _contentHeight() {
    var nodes = this.rootNode().flatChildren();
    var result = 0;
    for (var i = 0, size = nodes.length; i < size; ++i)
      result += nodes[i].nodeSelfHeight();
    return result;
  }

  _update() {
    if (this._updateAnimationFrameId) {
      this.element.window().cancelAnimationFrame(this._updateAnimationFrameId);
      delete this._updateAnimationFrameId;
    }

    var clientHeight = this._scrollContainer.clientHeight;
    var scrollTop = this._scrollContainer.scrollTop;
    var currentScrollTop = scrollTop;
    var maxScrollTop = Math.max(0, this._contentHeight() - clientHeight);
    if (!this._updateIsFromUser && this._stickToBottom && this._atBottom)
      scrollTop = maxScrollTop;
    this._updateIsFromUser = false;
    scrollTop = Math.min(maxScrollTop, scrollTop);
    this._atBottom = scrollTop === maxScrollTop;

    var viewportState = this._calculateVisibleNodes(clientHeight, scrollTop);
    var visibleNodes = viewportState.visibleNodes;
    var visibleNodesSet = new Set(visibleNodes);

    if (this._hiddenWheelTarget && this._hiddenWheelTarget !== this._wheelTarget) {
      this._hiddenWheelTarget.remove();
      this._hiddenWheelTarget = null;
    }

    for (var i = 0; i < this._visibleNodes.length; ++i) {
      var oldNode = this._visibleNodes[i];
      if (!visibleNodesSet.has(oldNode) && oldNode.attached()) {
        var element = oldNode.existingElement();
        if (element === this._wheelTarget)
          this._hiddenWheelTarget = oldNode.abandonElement();
        else
          element.remove();
        oldNode.wasDetached();
      }
    }

    var previousElement = this.topFillerRowElement();
    if (previousElement.nextSibling === this._hiddenWheelTarget)
      previousElement = this._hiddenWheelTarget;
    var tBody = this.dataTableBody;
    var offset = viewportState.offset;

    if (visibleNodes.length) {
      var nodes = this.rootNode().flatChildren();
      var index = nodes.indexOf(visibleNodes[0]);
      if (index !== -1 && !!(index % 2) !== this._firstVisibleIsStriped)
        offset += 1;
    }

    this._firstVisibleIsStriped = !!(offset % 2);

    for (var i = 0; i < visibleNodes.length; ++i) {
      var node = visibleNodes[i];
      var element = node.element();
      node.willAttach();
      node.setStriped((offset + i) % 2 === 0);
      tBody.insertBefore(element, previousElement.nextSibling);
      node.revealed = true;
      previousElement = element;
    }

    this.setVerticalPadding(viewportState.topPadding, viewportState.bottomPadding);
    this._lastScrollTop = scrollTop;
    if (scrollTop !== currentScrollTop)
      this._scrollContainer.scrollTop = scrollTop;
    var contentFits =
        viewportState.contentHeight <= clientHeight && viewportState.topPadding + viewportState.bottomPadding === 0;
    if (contentFits !== this.element.classList.contains('data-grid-fits-viewport')) {
      this.element.classList.toggle('data-grid-fits-viewport', contentFits);
      this.updateWidths();
    }
    this._visibleNodes = visibleNodes;
    this.dispatchEventToListeners(DataGrid.ViewportDataGrid.Events.ViewportCalculated);
  }

  /**
   * @param {!DataGrid.ViewportDataGridNode} node
   */
  _revealViewportNode(node) {
    var nodes = this.rootNode().flatChildren();
    var index = nodes.indexOf(node);
    if (index === -1)
      return;
    var fromY = 0;
    for (var i = 0; i < index; ++i)
      fromY += nodes[i].nodeSelfHeight();
    var toY = fromY + node.nodeSelfHeight();

    var scrollTop = this._scrollContainer.scrollTop;
    if (scrollTop > fromY) {
      scrollTop = fromY;
      this._atBottom = false;
    } else if (scrollTop + this._scrollContainer.offsetHeight < toY) {
      scrollTop = toY - this._scrollContainer.offsetHeight;
    }
    this._scrollContainer.scrollTop = scrollTop;
  }
};

DataGrid.ViewportDataGrid.Events = {
  ViewportCalculated: Symbol('ViewportCalculated')
};

/**
 * @unrestricted
 * @this {NODE_TYPE}
 * @extends {DataGrid.DataGridNode<!NODE_TYPE>}
 * @template NODE_TYPE
 */
DataGrid.ViewportDataGridNode = class extends DataGrid.DataGridNode {
  /**
   * @param {?Object.<string, *>=} data
   * @param {boolean=} hasChildren
   */
  constructor(data, hasChildren) {
    super(data, hasChildren);
    /** @type {boolean} */
    this._stale = false;
    /** @type {?Array<!DataGrid.ViewportDataGridNode>} */
    this._flatNodes = null;
    this._isStriped = false;
  }

  /**
   * @override
   * @return {!Element}
   */
  element() {
    var existingElement = this.existingElement();
    var element = existingElement || this.createElement();
    if (!existingElement || this._stale) {
      this.createCells(element);
      this._stale = false;
    }
    return element;
  }

  /**
   * @param {boolean} isStriped
   */
  setStriped(isStriped) {
    this._isStriped = isStriped;
    this.element().classList.toggle('odd', isStriped);
  }

  /**
   * @return {boolean}
   */
  isStriped() {
    return this._isStriped;
  }

  /**
   * @protected
   */
  clearFlatNodes() {
    this._flatNodes = null;
    var parent = /** @type {!DataGrid.ViewportDataGridNode} */ (this.parent);
    if (parent)
      parent.clearFlatNodes();
  }

  /**
   * @return {!Array<!DataGrid.ViewportDataGridNode>}
   */
  flatChildren() {
    if (this._flatNodes)
      return this._flatNodes;
    /** @type {!Array<!DataGrid.ViewportDataGridNode>} */
    var flatNodes = [];
    /** @type {!Array<!Array<!DataGrid.ViewportDataGridNode>>} */
    var children = [this.children];
    /** @type {!Array<number>} */
    var counters = [0];
    var depth = 0;
    while (depth >= 0) {
      if (children[depth].length <= counters[depth]) {
        depth--;
        continue;
      }
      var node = children[depth][counters[depth]++];
      flatNodes.push(node);
      if (node._expanded && node.children.length) {
        depth++;
        children[depth] = node.children;
        counters[depth] = 0;
      }
    }

    this._flatNodes = flatNodes;
    return flatNodes;
  }

  /**
   * @override
   * @param {!NODE_TYPE} child
   * @param {number} index
   */
  insertChild(child, index) {
    this.clearFlatNodes();
    if (child.parent === this) {
      var currentIndex = this.children.indexOf(child);
      if (currentIndex < 0)
        console.assert(false, 'Inconsistent DataGrid state');
      if (currentIndex === index)
        return;
      if (currentIndex < index)
        --index;
    }
    child.remove();
    child.parent = this;
    child.dataGrid = this.dataGrid;
    if (!this.children.length)
      this.setHasChildren(true);
    this.children.splice(index, 0, child);
    child.recalculateSiblings(index);
    if (this._expanded)
      this.dataGrid.scheduleUpdateStructure();
  }

  /**
   * @override
   * @param {!NODE_TYPE} child
   */
  removeChild(child) {
    this.clearFlatNodes();
    if (this.dataGrid)
      this.dataGrid.updateSelectionBeforeRemoval(child, false);
    if (child.previousSibling)
      child.previousSibling.nextSibling = child.nextSibling;
    if (child.nextSibling)
      child.nextSibling.previousSibling = child.previousSibling;
    if (child.parent !== this)
      throw 'removeChild: Node is not a child of this node.';

    child._unlink();
    this.children.remove(child, true);
    if (!this.children.length)
      this.setHasChildren(false);
    if (this._expanded)
      this.dataGrid.scheduleUpdateStructure();
  }

  /**
   * @override
   */
  removeChildren() {
    this.clearFlatNodes();
    if (this.dataGrid)
      this.dataGrid.updateSelectionBeforeRemoval(this, true);
    for (var i = 0; i < this.children.length; ++i)
      this.children[i]._unlink();
    this.children = [];

    if (this._expanded)
      this.dataGrid.scheduleUpdateStructure();
  }

  _unlink() {
    if (this.attached()) {
      this.existingElement().remove();
      this.wasDetached();
    }
    this.dataGrid = null;
    this.parent = null;
    this.nextSibling = null;
    this.previousSibling = null;
  }

  /**
   * @override
   */
  collapse() {
    if (!this._expanded)
      return;
    this.clearFlatNodes();
    this._expanded = false;
    if (this.existingElement())
      this.existingElement().classList.remove('expanded');
    this.dataGrid.scheduleUpdateStructure();
  }

  /**
   * @override
   */
  expand() {
    if (this._expanded)
      return;
    this.clearFlatNodes();
    super.expand();
    this.dataGrid.scheduleUpdateStructure();
  }

  /**
   * @protected
   */
  willAttach() {
  }

  /**
   * @protected
   * @return {boolean}
   */
  attached() {
    return !!(this.dataGrid && this.existingElement() && this.existingElement().parentElement);
  }

  /**
   * @override
   */
  refresh() {
    if (this.attached()) {
      this._stale = true;
      this.dataGrid.scheduleUpdate();
    } else {
      this.resetElement();
    }
  }

  /**
   * @return {?Element}
   */
  abandonElement() {
    var result = this.existingElement();
    if (result)
      result.style.display = 'none';
    this.resetElement();
    return result;
  }

  /**
   * @override
   */
  reveal() {
    this.dataGrid._revealViewportNode(this);
  }

  /**
   * @override
   * @param {number} index
   */
  recalculateSiblings(index) {
    this.clearFlatNodes();
    super.recalculateSiblings(index);
  }
};

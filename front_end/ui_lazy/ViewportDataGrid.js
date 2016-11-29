// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @unrestricted
 */
UI.ViewportDataGrid = class extends UI.DataGrid {
  /**
   * @param {!Array.<!UI.DataGrid.ColumnDescriptor>} columnsArray
   * @param {function(!UI.DataGridNode, string, string, string)=} editCallback
   * @param {function(!UI.DataGridNode)=} deleteCallback
   * @param {function()=} refreshCallback
   */
  constructor(columnsArray, editCallback, deleteCallback, refreshCallback) {
    super(columnsArray, editCallback, deleteCallback, refreshCallback);

    this._onScrollBound = this._onScroll.bind(this);
    this._scrollContainer.addEventListener('scroll', this._onScrollBound, true);

    // This is not in setScrollContainer because mouse wheel needs to detect events on the content not the scrollbar itself.
    this._scrollContainer.addEventListener('mousewheel', this._onWheel.bind(this), true);
    /** @type {!Array.<!UI.ViewportDataGridNode>} */
    this._visibleNodes = [];
    /** @type {?Array.<!UI.ViewportDataGridNode>} */
    this._flatNodes = null;
    /** @type {boolean} */
    this._inline = false;

    // Wheel target shouldn't be removed from DOM to preserve native kinetic scrolling.
    /** @type {?Node} */
    this._wheelTarget = null;

    // Element that was hidden earlier, but hasn't been removed yet.
    /** @type {?Node} */
    this._hiddenWheelTarget = null;

    /** @type {boolean} */
    this._stickToBottom = false;
    /** @type {boolean} */
    this._atBottom = true;
    /** @type {number} */
    this._lastScrollTop = 0;

    this.setRootNode(new UI.ViewportDataGridNode());
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
      this.scheduleUpdate();
  }

  /**
   * @protected
   */
  scheduleUpdateStructure() {
    this._flatNodes = null;
    this.scheduleUpdate();
  }

  /**
   * @protected
   */
  scheduleUpdate() {
    if (this._updateAnimationFrameId)
      return;
    this._updateAnimationFrameId = this.element.window().requestAnimationFrame(this._update.bind(this));
  }

  updateInstantlyForTests() {
    if (!this._updateAnimationFrameId)
      return;
    this.element.window().cancelAnimationFrame(this._updateAnimationFrameId);
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
   * @return {!Array.<!UI.ViewportDataGridNode>}
   */
  flatNodesList() {
    if (this._flatNodes)
      return this._flatNodes;
    var flatNodes = [];
    var children = [this._rootNode.children];
    var counters = [0];
    var depth = 0;
    while (depth >= 0) {
      var node = children[depth][counters[depth]++];
      if (!node) {
        depth--;
        continue;
      }
      flatNodes.push(node);
      node.setDepth(depth);
      if (node._expanded && node.children.length) {
        depth++;
        children[depth] = node.children;
        counters[depth] = 0;
      }
    }
    this._flatNodes = flatNodes;
    return this._flatNodes;
  }

  /**
   * @param {number} clientHeight
   * @param {number} scrollTop
   * @return {{topPadding: number, bottomPadding: number, contentHeight: number, visibleNodes: !Array.<!UI.ViewportDataGridNode>, offset: number}}
   */
  _calculateVisibleNodes(clientHeight, scrollTop) {
    var nodes = this.flatNodesList();
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
    var nodes = this.flatNodesList();
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
    if (this._stickToBottom && this._atBottom)
      scrollTop = maxScrollTop;
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
        var element = oldNode._element;
        if (element === this._wheelTarget)
          this._hiddenWheelTarget = oldNode.abandonElement();
        else
          element.remove();
        oldNode.wasDetached();
      }
    }

    var previousElement = this._topFillerRow;
    if (previousElement.nextSibling === this._hiddenWheelTarget)
      previousElement = this._hiddenWheelTarget;
    var tBody = this.dataTableBody;
    var offset = viewportState.offset;
    for (var i = 0; i < visibleNodes.length; ++i) {
      var node = visibleNodes[i];
      var element = node.element();
      node.willAttach();
      element.classList.toggle('odd', (offset + i) % 2 === 0);
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
    this.dispatchEventToListeners(UI.ViewportDataGrid.Events.ViewportCalculated);
  }

  /**
   * @param {!UI.ViewportDataGridNode} node
   */
  _revealViewportNode(node) {
    var nodes = this.flatNodesList();
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

UI.ViewportDataGrid.Events = {
  ViewportCalculated: Symbol('ViewportCalculated')
};

/**
 * @unrestricted
 */
UI.ViewportDataGridNode = class extends UI.DataGridNode {
  /**
   * @param {?Object.<string, *>=} data
   * @param {boolean=} hasChildren
   */
  constructor(data, hasChildren) {
    super(data, hasChildren);
    /** @type {boolean} */
    this._stale = false;
  }

  /**
   * @override
   * @return {!Element}
   */
  element() {
    if (!this._element) {
      this.createElement();
      this.createCells();
      this._stale = false;
    }

    if (this._stale) {
      this.createCells();
      this._stale = false;
    }

    return /** @type {!Element} */ (this._element);
  }

  /**
   * @param {number} depth
   */
  setDepth(depth) {
    this._depth = depth;
  }

  /**
   * @override
   * @param {!UI.DataGridNode} child
   * @param {number} index
   */
  insertChild(child, index) {
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
   * @param {!UI.DataGridNode} child
   */
  removeChild(child) {
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
      this._element.remove();
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
    this._expanded = false;
    if (this._element)
      this._element.classList.remove('expanded');
    this.dataGrid.scheduleUpdateStructure();
  }

  /**
   * @override
   */
  expand() {
    if (this._expanded)
      return;
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
    return !!(this.dataGrid && this._element && this._element.parentElement);
  }

  /**
   * @override
   */
  refresh() {
    if (this.attached()) {
      this._stale = true;
      this.dataGrid.scheduleUpdate();
    } else {
      this._element = null;
    }
  }

  /**
   * @return {?Element}
   */
  abandonElement() {
    var result = this._element;
    if (result)
      result.style.display = 'none';
    this._element = null;
    return result;
  }

  /**
   * @override
   */
  reveal() {
    this.dataGrid._revealViewportNode(this);
  }
};

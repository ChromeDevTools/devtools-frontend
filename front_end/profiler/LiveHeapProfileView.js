// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @extends {UI.VBox}
 */
Profiler.LiveHeapProfileView = class extends UI.VBox {
  constructor() {
    super(true);
    /** @type {!Map<string, !Profiler.LiveHeapProfileView.GridNode>} */
    this._gridNodeByUrl = new Map();
    this.registerRequiredCSS('profiler/liveHeapProfile.css');
    const columns = [
      {
        id: 'size',
        title: ls`JS Heap`,
        width: '72px',
        fixedWidth: true,
        sortable: true,
        align: DataGrid.DataGrid.Align.Right,
        sort: DataGrid.DataGrid.Order.Descending
      },
      {id: 'url', title: ls`Script URL`, fixedWidth: false, sortable: true}
    ];
    this._dataGrid = new DataGrid.SortableDataGrid(columns);
    this._dataGrid.setResizeMethod(DataGrid.DataGrid.ResizeMethod.Last);
    this._dataGrid.element.classList.add('flex-auto');
    this._dataGrid.element.addEventListener('keydown', this._onKeyDown.bind(this), false);
    this._dataGrid.addEventListener(DataGrid.DataGrid.Events.OpenedNode, this._revealSourceForSelectedNode, this);
    this._dataGrid.addEventListener(DataGrid.DataGrid.Events.SortingChanged, this._sortingChanged, this);
    this._dataGrid.asWidget().show(this.contentElement);
    this._currentPollId = 0;
  }

  /**
   * @override
   */
  wasShown() {
    this._poll();
  }

  /**
   * @override
   */
  willHide() {
    ++this._currentPollId;
  }

  async _poll() {
    const pollId = this._currentPollId;
    do {
      const models = SDK.targetManager.models(SDK.HeapProfilerModel);
      const profiles = await Promise.all(models.map(model => model.getSamplingProfile()));
      if (this._currentPollId !== pollId)
        return;
      profiles.remove(null);
      this._update(profiles);
      await new Promise(r => setTimeout(r, 3000));
    } while (this._currentPollId === pollId);
  }

  /**
   * @param {!Array<!Protocol.HeapProfiler.SamplingHeapProfile>} profiles
   */
  _update(profiles) {
    /** @type {!Map<string, number>} */
    const sizeByUrl = new Map();
    for (const profile of profiles)
      processNode('', profile.head);

    const rootNode = this._dataGrid.rootNode();
    const exisitingNodes = new Set();
    for (const pair of sizeByUrl) {
      const url = /** @type {string} */ (pair[0]);
      const size = /** @type {number} */ (pair[1]);
      if (!url) {
        console.info(`Node with empty URL: ${size} bytes`);  // eslint-disable-line no-console
        continue;
      }
      let node = this._gridNodeByUrl.get(url);
      if (node) {
        node.updateSize(size);
      } else {
        node = new Profiler.LiveHeapProfileView.GridNode(url, size);
        this._gridNodeByUrl.set(url, node);
        rootNode.appendChild(node);
      }
      exisitingNodes.add(node);
    }

    for (const node of rootNode.children.slice()) {
      if (!exisitingNodes.has(node))
        node.remove();
      this._gridNodeByUrl.delete(node);
    }

    this._sortingChanged();

    /**
     * @param {string} parentUrl
     * @param {!Protocol.HeapProfiler.SamplingHeapProfileNode} node
     */
    function processNode(parentUrl, node) {
      const url = node.callFrame.url || parentUrl || systemNodeName(node) || anonymousScriptName(node);
      if (node.selfSize)
        sizeByUrl.set(url, (sizeByUrl.get(url) || 0) + node.selfSize);
      node.children.forEach(child => processNode(url, child));
    }

    /**
     * @param {!Protocol.HeapProfiler.SamplingHeapProfileNode} node
     * @return {string}
     */
    function systemNodeName(node) {
      const name = node.callFrame.functionName;
      return name.startsWith('(') && name !== '(root)' ? name : '';
    }

    /**
     * @param {!Protocol.HeapProfiler.SamplingHeapProfileNode} node
     * @return {string}
     */
    function anonymousScriptName(node) {
      return Number(node.callFrame.scriptId) ? Common.UIString('(Anonymous Script %s)', node.callFrame.scriptId) : '';
    }
  }

  /**
   * @param {!Event} event
   */
  _onKeyDown(event) {
    if (!isEnterKey(event))
      return;
    event.consume(true);
    this._revealSourceForSelectedNode();
  }

  _revealSourceForSelectedNode() {
    const node = this._dataGrid.selectedNode;
    if (!node || !node._url)
      return;
    const sourceCode = Workspace.workspace.uiSourceCodeForURL(node._url);
    if (sourceCode)
      Common.Revealer.reveal(sourceCode);
  }

  _sortingChanged() {
    const columnId = this._dataGrid.sortColumnId();
    if (!columnId)
      return;
    const sortByUrl = (a, b) => b._url.localeCompare(a._url);
    const sortBySize = (a, b) => b._size - a._size;
    const sortFunction = columnId === 'url' ? sortByUrl : sortBySize;
    this._dataGrid.sortNodes(sortFunction, this._dataGrid.isSortOrderAscending());
  }
};

Profiler.LiveHeapProfileView.GridNode = class extends DataGrid.SortableDataGridNode {
  /**
   * @param {string} url
   * @param {number} size
   */
  constructor(url, size) {
    super();
    this._url = url;
    this._size = size;
  }

  /**
   * @param {number} size
   */
  updateSize(size) {
    if (this._size === size)
      return;
    this._size = size;
    this.refresh();
  }

  /**
   * @override
   * @param {string} columnId
   * @return {!Element}
   */
  createCell(columnId) {
    const cell = this.createTD(columnId);
    switch (columnId) {
      case 'url':
        cell.title = this._url;
        cell.textContent = this._url;
        break;
      case 'size':
        cell.textContent = Number.withThousandsSeparator(Math.round(this._size / 1e3));
        cell.createChild('span', 'size-units').textContent = ls`KB`;
        break;
    }
    return cell;
  }
};

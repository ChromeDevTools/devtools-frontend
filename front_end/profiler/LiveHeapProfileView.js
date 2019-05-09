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
      {id: 'isolates', title: ls`VMs`, width: '40px', fixedWidth: true, align: DataGrid.DataGrid.Align.Right},
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
      const isolates = Array.from(SDK.isolateManager.isolates());
      const profiles = await Promise.all(
          isolates.map(isolate => isolate.heapProfilerModel() && isolate.heapProfilerModel().getSamplingProfile()));
      if (this._currentPollId !== pollId)
        return;
      this._update(isolates, profiles);
      await new Promise(r => setTimeout(r, 3000));
    } while (this._currentPollId === pollId);
  }

  /**
   * @param {!Array<!SDK.IsolateManager.Isolate>} isolates
   * @param {!Array<?Protocol.HeapProfiler.SamplingHeapProfile>} profiles
   */
  _update(isolates, profiles) {
    /** @type {!Map<string, !{size: number, isolates: !Set<!SDK.IsolateManager.Isolate>}>} */
    const dataByUrl = new Map();
    profiles.forEach((profile, index) => {
      if (profile)
        processNodeTree(isolates[index], '', profile.head);
    });

    const rootNode = this._dataGrid.rootNode();
    const exisitingNodes = new Set();
    for (const pair of dataByUrl) {
      const url = /** @type {string} */ (pair[0]);
      const size = /** @type {number} */ (pair[1].size);
      const isolateCount = /** @type {number} */ (pair[1].isolates.size);
      if (!url) {
        console.info(`Node with empty URL: ${size} bytes`);  // eslint-disable-line no-console
        continue;
      }
      let node = this._gridNodeByUrl.get(url);
      if (node) {
        node.updateNode(size, isolateCount);
      } else {
        node = new Profiler.LiveHeapProfileView.GridNode(url, size, isolateCount);
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
     * @param {!SDK.IsolateManager.Isolate} isolate
     * @param {string} parentUrl
     * @param {!Protocol.HeapProfiler.SamplingHeapProfileNode} node
     */
    function processNodeTree(isolate, parentUrl, node) {
      const url = node.callFrame.url || parentUrl || systemNodeName(node) || anonymousScriptName(node);
      node.children.forEach(processNodeTree.bind(null, isolate, url));
      if (!node.selfSize)
        return;
      let data = dataByUrl.get(url);
      if (!data) {
        data = {size: 0, isolates: new Set()};
        dataByUrl.set(url, data);
      }
      data.size += node.selfSize;
      data.isolates.add(isolate);
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
   * @param {number} isolateCount
   */
  constructor(url, size, isolateCount) {
    super();
    this._url = url;
    this._size = size;
    this._isolateCount = isolateCount;
  }

  /**
   * @param {number} size
   * @param {number} isolateCount
   */
  updateNode(size, isolateCount) {
    if (this._size === size && this._isolateCount === isolateCount)
      return;
    this._size = size;
    this._isolateCount = isolateCount;
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
        cell.textContent = this._url;
        break;
      case 'size':
        cell.textContent = Number.withThousandsSeparator(Math.round(this._size / 1e3));
        cell.createChild('span', 'size-units').textContent = ls`KB`;
        break;
      case 'isolates':
        cell.textContent = this._isolateCount;
        break;
    }
    return cell;
  }
};

// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';
import * as DataGrid from '../data_grid/data_grid.js';
import * as SDK from '../sdk/sdk.js';
import * as UI from '../ui/ui.js';
import * as Workspace from '../workspace/workspace.js';

import {SamplingHeapProfileNode} from './HeapProfileView.js';  // eslint-disable-line no-unused-vars

/**
 * @extends {UI.Widget.VBox}
 */
export class LiveHeapProfileView extends UI.Widget.VBox {
  constructor() {
    super(true);
    /** @type {!Map<string, !GridNode>} */
    this._gridNodeByUrl = new Map();
    this.registerRequiredCSS('profiler/liveHeapProfile.css');

    this._setting = Common.Settings.Settings.instance().moduleSetting('memoryLiveHeapProfile');
    const toolbar = new UI.Toolbar.Toolbar('live-heap-profile-toolbar', this.contentElement);

    this._toggleRecordAction =
        /** @type {!UI.Action.Action }*/ (self.UI.actionRegistry.action('live-heap-profile.toggle-recording'));
    this._toggleRecordButton = UI.Toolbar.Toolbar.createActionButton(this._toggleRecordAction);
    this._toggleRecordButton.setToggled(this._setting.get());
    toolbar.appendToolbarItem(this._toggleRecordButton);

    const mainTarget = SDK.SDKModel.TargetManager.instance().mainTarget();
    if (mainTarget && mainTarget.model(SDK.ResourceTreeModel.ResourceTreeModel)) {
      const startWithReloadAction =
          /** @type {!UI.Action.Action }*/ (self.UI.actionRegistry.action('live-heap-profile.start-with-reload'));
      this._startWithReloadButton = UI.Toolbar.Toolbar.createActionButton(startWithReloadAction);
      toolbar.appendToolbarItem(this._startWithReloadButton);
    }

    this._dataGrid = this._createDataGrid();
    this._dataGrid.asWidget().show(this.contentElement);

    this._currentPollId = 0;
  }

  /**
   * @return {!DataGrid.SortableDataGrid.SortableDataGrid}
   */
  _createDataGrid() {
    const columns = [
      {
        id: 'size',
        title: ls`JS Heap`,
        width: '72px',
        fixedWidth: true,
        sortable: true,
        align: DataGrid.DataGrid.Align.Right,
        sort: DataGrid.DataGrid.Order.Descending,
        tooltip: ls`Allocated JS heap size currently in use`,
      },
      {
        id: 'isolates',
        title: ls`VMs`,
        width: '40px',
        fixedWidth: true,
        align: DataGrid.DataGrid.Align.Right,
        tooltip: ls`Number of VMs sharing the same script source`
      },
      {id: 'url', title: ls`Script URL`, fixedWidth: false, sortable: true, tooltip: ls`URL of the script source`}
    ];
    const dataGrid = new DataGrid.SortableDataGrid.SortableDataGrid({displayName: ls`Heap Profile`, columns});
    dataGrid.setResizeMethod(DataGrid.DataGrid.ResizeMethod.Last);
    dataGrid.element.classList.add('flex-auto');
    dataGrid.element.addEventListener('keydown', this._onKeyDown.bind(this), false);
    dataGrid.addEventListener(DataGrid.DataGrid.Events.OpenedNode, this._revealSourceForSelectedNode, this);
    dataGrid.addEventListener(DataGrid.DataGrid.Events.SortingChanged, this._sortingChanged, this);
    for (const info of columns) {
      const headerCell = dataGrid.headerTableHeader(info.id);
      if (headerCell) {
        headerCell.setAttribute('title', info.tooltip);
      }
    }
    return dataGrid;
  }

  /**
   * @override
   */
  wasShown() {
    this._poll();
    this._setting.addChangeListener(this._settingChanged, this);
  }

  /**
   * @override
   */
  willHide() {
    ++this._currentPollId;
    this._setting.removeChangeListener(this._settingChanged, this);
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} value
   */
  _settingChanged(value) {
    this._toggleRecordButton.setToggled(/** @type {boolean} */ (value.data));
  }

  async _poll() {
    const pollId = this._currentPollId;
    do {
      const isolates = Array.from(self.SDK.isolateManager.isolates());
      const profiles = await Promise.all(
          isolates.map(isolate => isolate.heapProfilerModel() && isolate.heapProfilerModel().getSamplingProfile()));
      if (this._currentPollId !== pollId) {
        return;
      }
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
      if (profile) {
        processNodeTree(isolates[index], '', profile.head);
      }
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
        node = new GridNode(url, size, isolateCount);
        this._gridNodeByUrl.set(url, node);
        rootNode.appendChild(node);
      }
      exisitingNodes.add(node);
    }

    for (const node of rootNode.children.slice()) {
      if (!exisitingNodes.has(node)) {
        node.remove();
      }
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
      if (!node.selfSize) {
        return;
      }
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
      return Number(node.callFrame.scriptId) ?
          Common.UIString.UIString('(Anonymous Script %s)', node.callFrame.scriptId) :
          '';
    }
  }

  /**
   * @param {!Event} event
   */
  _onKeyDown(event) {
    if (!isEnterKey(event)) {
      return;
    }
    event.consume(true);
    this._revealSourceForSelectedNode();
  }

  _revealSourceForSelectedNode() {
    const node = this._dataGrid.selectedNode;
    if (!node || !node._url) {
      return;
    }
    const sourceCode = Workspace.Workspace.WorkspaceImpl.instance().uiSourceCodeForURL(node._url);
    if (sourceCode) {
      Common.Revealer.reveal(sourceCode);
    }
  }

  _sortingChanged() {
    const columnId = this._dataGrid.sortColumnId();
    if (!columnId) {
      return;
    }
    const sortByUrl = (a, b) => b._url.localeCompare(a._url);
    const sortBySize = (a, b) => b._size - a._size;
    const sortFunction = columnId === 'url' ? sortByUrl : sortBySize;
    this._dataGrid.sortNodes(sortFunction, this._dataGrid.isSortOrderAscending());
  }

  _toggleRecording() {
    const enable = !this._setting.get();
    if (enable) {
      this._startRecording(false);
    } else {
      this._stopRecording();
    }
  }

  /**
   * @param {boolean=} reload
   */
  _startRecording(reload) {
    this._setting.set(true);
    if (!reload) {
      return;
    }
    const mainTarget = SDK.SDKModel.TargetManager.instance().mainTarget();
    if (!mainTarget) {
      return;
    }
    const resourceTreeModel = /** @type {?SDK.ResourceTreeModel.ResourceTreeModel} */ (
        mainTarget.model(SDK.ResourceTreeModel.ResourceTreeModel));
    if (resourceTreeModel) {
      resourceTreeModel.reloadPage();
    }
  }

  async _stopRecording() {
    this._setting.set(false);
  }
}

export class GridNode extends DataGrid.SortableDataGrid.SortableDataGridNode {
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
    if (this._size === size && this._isolateCount === isolateCount) {
      return;
    }
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
}

/**
 * @implements {UI.ActionDelegate.ActionDelegate}
 */
export class ActionDelegate {
  /**
   * @override
   * @param {!UI.Context.Context} context
   * @param {string} actionId
   * @return {boolean}
   */
  handleAction(context, actionId) {
    (async () => {
      const profileViewId = 'live_heap_profile';
      await UI.ViewManager.ViewManager.instance().showView(profileViewId);
      const widget = await UI.ViewManager.ViewManager.instance().view(profileViewId).widget();
      this._innerHandleAction(/** @type {!LiveHeapProfileView} */ (widget), actionId);
    })();
    return true;
  }

  /**
   * @param {!LiveHeapProfileView} profilerView
   * @param {string} actionId
   */
  _innerHandleAction(profilerView, actionId) {
    switch (actionId) {
      case 'live-heap-profile.toggle-recording':
        profilerView._toggleRecording();
        break;
      case 'live-heap-profile.start-with-reload':
        profilerView._startRecording(true);
        break;
      default:
        console.assert(false, `Unknown action: ${actionId}`);
    }
  }
}

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
    this.registerRequiredCSS('profiler/liveHeapProfile.css', {enableLegacyPatching: true});

    this._setting = Common.Settings.Settings.instance().moduleSetting('memoryLiveHeapProfile');
    const toolbar = new UI.Toolbar.Toolbar('live-heap-profile-toolbar', this.contentElement);

    /** @type {!UI.ActionRegistration.Action }*/
    this._toggleRecordAction =
        /** @type {!UI.ActionRegistration.Action }*/ (
            UI.ActionRegistry.ActionRegistry.instance().action('live-heap-profile.toggle-recording'));
    /** @type {!UI.Toolbar.ToolbarToggle} */
    this._toggleRecordButton =
        /** @type {!UI.Toolbar.ToolbarToggle} */ (UI.Toolbar.Toolbar.createActionButton(this._toggleRecordAction));
    this._toggleRecordButton.setToggled(this._setting.get());
    toolbar.appendToolbarItem(this._toggleRecordButton);

    const mainTarget = SDK.SDKModel.TargetManager.instance().mainTarget();
    if (mainTarget && mainTarget.model(SDK.ResourceTreeModel.ResourceTreeModel)) {
      const startWithReloadAction =
          /** @type {!UI.ActionRegistration.Action }*/ (
              UI.ActionRegistry.ActionRegistry.instance().action('live-heap-profile.start-with-reload'));
      this._startWithReloadButton = UI.Toolbar.Toolbar.createActionButton(startWithReloadAction);
      toolbar.appendToolbarItem(this._startWithReloadButton);
    }

    this._dataGrid = this._createDataGrid();
    this._dataGrid.asWidget().show(this.contentElement);

    this._currentPollId = 0;
  }

  /**
   * @return {!DataGrid.SortableDataGrid.SortableDataGrid<!GridNode>}
   */
  _createDataGrid() {
    /**
     * @type {!DataGrid.DataGrid.ColumnDescriptor}
     */
    const defaultColumnConfig = {
      id: '',
      title: undefined,
      width: undefined,
      fixedWidth: true,
      sortable: true,
      align: DataGrid.DataGrid.Align.Right,
      sort: DataGrid.DataGrid.Order.Descending,
      titleDOMFragment: undefined,
      editable: undefined,
      nonSelectable: undefined,
      longText: undefined,
      disclosure: undefined,
      weight: undefined,
      allowInSortByEvenWhenHidden: undefined,
      dataType: undefined,
      defaultWeight: undefined,
    };
    const columns = [
      {
        ...defaultColumnConfig,
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
        ...defaultColumnConfig,
        id: 'isolates',
        title: ls`VMs`,
        width: '40px',
        fixedWidth: true,
        align: DataGrid.DataGrid.Align.Right,
        tooltip: ls`Number of VMs sharing the same script source`
      },
      {
        ...defaultColumnConfig,
        id: 'url',
        title: ls`Script URL`,
        fixedWidth: false,
        sortable: true,
        tooltip: ls`URL of the script source`
      },
    ];
    const dataGrid = new DataGrid.SortableDataGrid.SortableDataGrid({
      displayName: ls`Heap Profile`,
      columns,
      editCallback: undefined,
      deleteCallback: undefined,
      refreshCallback: undefined
    });
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
      const isolates = Array.from(SDK.IsolateManager.IsolateManager.instance().isolates());
      const profiles = await Promise.all(isolates.map(isolate => {
        const heapProfilerModel = isolate.heapProfilerModel();
        if (!heapProfilerModel) {
          return null;
        }

        return heapProfilerModel.getSamplingProfile();
      }));
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
      const gridNode = /** @type {!GridNode} */ (node);
      this._gridNodeByUrl.delete(gridNode._url);
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
    const node = /** @type {!GridNode} */ (this._dataGrid.selectedNode);
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

    /**
     * @param {!DataGrid.SortableDataGrid.SortableDataGridNode<!GridNode>} a
     * @param {!DataGrid.SortableDataGrid.SortableDataGridNode<!GridNode>} b
     */
    function sortByUrl(a, b) {
      return /** @type {!GridNode} */ (b)._url.localeCompare(/** @type {!GridNode} */ (a)._url);
    }

    /**
     * @param {!DataGrid.SortableDataGrid.SortableDataGridNode<!GridNode>} a
     * @param {!DataGrid.SortableDataGrid.SortableDataGridNode<!GridNode>} b
     */
    function sortBySize(a, b) {
      return /** @type {!GridNode} */ (b)._size - /** @type {!GridNode} */ (a)._size;
    }

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

/**
 * @extends {DataGrid.SortableDataGrid.SortableDataGridNode<*>}
 */
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
   * @return {!HTMLElement}
   */
  createCell(columnId) {
    const cell = this.createTD(columnId);
    switch (columnId) {
      case 'url':
        cell.textContent = this._url;
        break;
      case 'size':
        cell.textContent = Number.withThousandsSeparator(Math.round(this._size / 1e3));
        cell.createChild('span', 'size-units').textContent = ls`kB`;
        break;
      case 'isolates':
        cell.textContent = `${this._isolateCount}`;
        break;
    }
    return cell;
  }
}

/**
 * @implements {UI.ActionRegistration.ActionDelegate}
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
      const view = UI.ViewManager.ViewManager.instance().view(profileViewId);
      if (view) {
        const widget = await view.widget();
        this._innerHandleAction(/** @type {!LiveHeapProfileView} */ (widget), actionId);
      }
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

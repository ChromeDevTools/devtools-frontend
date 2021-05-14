// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable rulesdir/no_underscored_properties */

import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Workspace from '../../models/workspace/workspace.js';
import * as DataGrid from '../../ui/legacy/components/data_grid/data_grid.js';
import * as UI from '../../ui/legacy/legacy.js';
import type * as Protocol from '../../generated/protocol.js';

const UIStrings = {
  /**
  *@description Text for a heap profile type
  */
  jsHeap: 'JS Heap',
  /**
  *@description Text in Live Heap Profile View of a profiler tool
  */
  allocatedJsHeapSizeCurrentlyIn: 'Allocated JS heap size currently in use',
  /**
  *@description Text in Live Heap Profile View of a profiler tool
  */
  vms: 'VMs',
  /**
  *@description Text in Live Heap Profile View of a profiler tool
  */
  numberOfVmsSharingTheSameScript: 'Number of VMs sharing the same script source',
  /**
  *@description Text in Live Heap Profile View of a profiler tool
  */
  scriptUrl: 'Script URL',
  /**
  *@description Text in Live Heap Profile View of a profiler tool
  */
  urlOfTheScriptSource: 'URL of the script source',
  /**
  *@description Data grid name for Heap Profile data grids
  */
  heapProfile: 'Heap Profile',
  /**
  *@description Text in Live Heap Profile View of a profiler tool
  *@example {1} PH1
  */
  anonymousScriptS: '(Anonymous Script {PH1})',
  /**
  *@description A unit
  */
  kb: 'kB',
};
const str_ = i18n.i18n.registerUIStrings('panels/profiler/LiveHeapProfileView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
let liveHeapProfileViewInstance: LiveHeapProfileView;
export class LiveHeapProfileView extends UI.Widget.VBox {
  _gridNodeByUrl: Map<string, GridNode>;
  _setting: Common.Settings.Setting<boolean>;
  _toggleRecordAction: UI.ActionRegistration.Action;
  _toggleRecordButton: UI.Toolbar.ToolbarToggle;
  _startWithReloadButton: UI.Toolbar.ToolbarButton|undefined;
  _dataGrid: DataGrid.SortableDataGrid.SortableDataGrid<GridNode>;
  _currentPollId: number;

  private constructor() {
    super(true);
    this._gridNodeByUrl = new Map();
    this.registerRequiredCSS('panels/profiler/liveHeapProfile.css', {enableLegacyPatching: false});

    this._setting = Common.Settings.Settings.instance().moduleSetting('memoryLiveHeapProfile');
    const toolbar = new UI.Toolbar.Toolbar('live-heap-profile-toolbar', this.contentElement);
    this._toggleRecordAction =
        (UI.ActionRegistry.ActionRegistry.instance().action('live-heap-profile.toggle-recording') as
         UI.ActionRegistration.Action);
    this._toggleRecordButton =
        (UI.Toolbar.Toolbar.createActionButton(this._toggleRecordAction) as UI.Toolbar.ToolbarToggle);
    this._toggleRecordButton.setToggled(this._setting.get());
    toolbar.appendToolbarItem(this._toggleRecordButton);

    const mainTarget = SDK.SDKModel.TargetManager.instance().mainTarget();
    if (mainTarget && mainTarget.model(SDK.ResourceTreeModel.ResourceTreeModel)) {
      const startWithReloadAction =
          (UI.ActionRegistry.ActionRegistry.instance().action('live-heap-profile.start-with-reload') as
           UI.ActionRegistration.Action);
      this._startWithReloadButton = UI.Toolbar.Toolbar.createActionButton(startWithReloadAction);
      toolbar.appendToolbarItem(this._startWithReloadButton);
    }

    this._dataGrid = this._createDataGrid();
    this._dataGrid.asWidget().show(this.contentElement);

    this._currentPollId = 0;
  }

  static instance(): LiveHeapProfileView {
    if (!liveHeapProfileViewInstance) {
      liveHeapProfileViewInstance = new LiveHeapProfileView();
    }
    return liveHeapProfileViewInstance;
  }

  _createDataGrid(): DataGrid.SortableDataGrid.SortableDataGrid<GridNode> {
    const defaultColumnConfig: DataGrid.DataGrid.ColumnDescriptor = {
      id: '',
      title: Common.UIString.LocalizedEmptyString,
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
        title: i18nString(UIStrings.jsHeap),
        width: '72px',
        fixedWidth: true,
        sortable: true,
        align: DataGrid.DataGrid.Align.Right,
        sort: DataGrid.DataGrid.Order.Descending,
        tooltip: i18nString(UIStrings.allocatedJsHeapSizeCurrentlyIn),
      },
      {
        ...defaultColumnConfig,
        id: 'isolates',
        title: i18nString(UIStrings.vms),
        width: '40px',
        fixedWidth: true,
        align: DataGrid.DataGrid.Align.Right,
        tooltip: i18nString(UIStrings.numberOfVmsSharingTheSameScript),
      },
      {
        ...defaultColumnConfig,
        id: 'url',
        title: i18nString(UIStrings.scriptUrl),
        fixedWidth: false,
        sortable: true,
        tooltip: i18nString(UIStrings.urlOfTheScriptSource),
      },
    ];
    const dataGrid = new DataGrid.SortableDataGrid.SortableDataGrid({
      displayName: i18nString(UIStrings.heapProfile),
      columns,
      editCallback: undefined,
      deleteCallback: undefined,
      refreshCallback: undefined,
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

  wasShown(): void {
    this._poll();
    this._setting.addChangeListener(this._settingChanged, this);
  }

  willHide(): void {
    ++this._currentPollId;
    this._setting.removeChangeListener(this._settingChanged, this);
  }

  _settingChanged(value: Common.EventTarget.EventTargetEvent): void {
    this._toggleRecordButton.setToggled((value.data as boolean));
  }

  async _poll(): Promise<void> {
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

  _update(isolates: SDK.IsolateManager.Isolate[], profiles: (Protocol.HeapProfiler.SamplingHeapProfile|null)[]): void {
    const dataByUrl = new Map<string, {
      size: number,
      isolates: Set<SDK.IsolateManager.Isolate>,
    }>();
    profiles.forEach((profile, index) => {
      if (profile) {
        processNodeTree(isolates[index], '', profile.head);
      }
    });

    const rootNode = this._dataGrid.rootNode();
    const exisitingNodes = new Set<GridNode>();
    for (const pair of dataByUrl) {
      const url = (pair[0] as string);
      const size = (pair[1].size as number);
      const isolateCount = (pair[1].isolates.size as number);
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
      // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration)
      // @ts-expect-error
      if (!exisitingNodes.has(node)) {
        node.remove();
      }
      const gridNode = (node as GridNode);
      this._gridNodeByUrl.delete(gridNode._url);
    }

    this._sortingChanged();

    function processNodeTree(
        isolate: SDK.IsolateManager.Isolate, parentUrl: string,
        node: Protocol.HeapProfiler.SamplingHeapProfileNode): void {
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

    function systemNodeName(node: Protocol.HeapProfiler.SamplingHeapProfileNode): string {
      const name = node.callFrame.functionName;
      return name.startsWith('(') && name !== '(root)' ? name : '';
    }

    function anonymousScriptName(node: Protocol.HeapProfiler.SamplingHeapProfileNode): string {
      return Number(node.callFrame.scriptId) ? i18nString(UIStrings.anonymousScriptS, {PH1: node.callFrame.scriptId}) :
                                               '';
    }
  }

  _onKeyDown(event: KeyboardEvent): void {
    if (!(event.key === 'Enter')) {
      return;
    }
    event.consume(true);
    this._revealSourceForSelectedNode();
  }

  _revealSourceForSelectedNode(): void {
    const node = (this._dataGrid.selectedNode as GridNode);
    if (!node || !node._url) {
      return;
    }
    const sourceCode = Workspace.Workspace.WorkspaceImpl.instance().uiSourceCodeForURL(node._url);
    if (sourceCode) {
      Common.Revealer.reveal(sourceCode);
    }
  }

  _sortingChanged(): void {
    const columnId = this._dataGrid.sortColumnId();
    if (!columnId) {
      return;
    }

    function sortByUrl(
        a: DataGrid.SortableDataGrid.SortableDataGridNode<GridNode>,
        b: DataGrid.SortableDataGrid.SortableDataGridNode<GridNode>): number {
      return (b as GridNode)._url.localeCompare((a as GridNode)._url);
    }

    function sortBySize(
        a: DataGrid.SortableDataGrid.SortableDataGridNode<GridNode>,
        b: DataGrid.SortableDataGrid.SortableDataGridNode<GridNode>): number {
      return (b as GridNode)._size - (a as GridNode)._size;
    }

    const sortFunction = columnId === 'url' ? sortByUrl : sortBySize;
    this._dataGrid.sortNodes(sortFunction, this._dataGrid.isSortOrderAscending());
  }

  _toggleRecording(): void {
    const enable = !this._setting.get();
    if (enable) {
      this._startRecording(false);
    } else {
      this._stopRecording();
    }
  }

  _startRecording(reload?: boolean): void {
    this._setting.set(true);
    if (!reload) {
      return;
    }
    const mainTarget = SDK.SDKModel.TargetManager.instance().mainTarget();
    if (!mainTarget) {
      return;
    }
    const resourceTreeModel =
        (mainTarget.model(SDK.ResourceTreeModel.ResourceTreeModel) as SDK.ResourceTreeModel.ResourceTreeModel | null);
    if (resourceTreeModel) {
      resourceTreeModel.reloadPage();
    }
  }

  async _stopRecording(): Promise<void> {
    this._setting.set(false);
  }
}

export class GridNode extends DataGrid.SortableDataGrid.SortableDataGridNode<unknown> {
  _url: string;
  _size: number;
  _isolateCount: number;

  constructor(url: string, size: number, isolateCount: number) {
    super();
    this._url = url;
    this._size = size;
    this._isolateCount = isolateCount;
  }

  updateNode(size: number, isolateCount: number): void {
    if (this._size === size && this._isolateCount === isolateCount) {
      return;
    }
    this._size = size;
    this._isolateCount = isolateCount;
    this.refresh();
  }

  createCell(columnId: string): HTMLElement {
    const cell = this.createTD(columnId);
    switch (columnId) {
      case 'url':
        cell.textContent = this._url;
        break;
      case 'size':
        cell.textContent = Platform.NumberUtilities.withThousandsSeparator(Math.round(this._size / 1e3));
        cell.createChild('span', 'size-units').textContent = i18nString(UIStrings.kb);
        break;
      case 'isolates':
        cell.textContent = `${this._isolateCount}`;
        break;
    }
    return cell;
  }
}

let profilerActionDelegateInstance: ActionDelegate;

export class ActionDelegate implements UI.ActionRegistration.ActionDelegate {
  static instance(opts: {
    forceNew: boolean|null,
  } = {forceNew: null}): ActionDelegate {
    const {forceNew} = opts;
    if (!profilerActionDelegateInstance || forceNew) {
      profilerActionDelegateInstance = new ActionDelegate();
    }
    return profilerActionDelegateInstance;
  }

  handleAction(_context: UI.Context.Context, actionId: string): boolean {
    (async(): Promise<void> => {
      const profileViewId = 'live_heap_profile';
      await UI.ViewManager.ViewManager.instance().showView(profileViewId);
      const view = UI.ViewManager.ViewManager.instance().view(profileViewId);
      if (view) {
        const widget = await view.widget();
        this._innerHandleAction((widget as LiveHeapProfileView), actionId);
      }
    })();
    return true;
  }

  _innerHandleAction(profilerView: LiveHeapProfileView, actionId: string): void {
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

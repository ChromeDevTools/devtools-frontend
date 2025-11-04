// Copyright 2019 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-imperative-dom-api */
import '../../ui/legacy/legacy.js';
import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Workspace from '../../models/workspace/workspace.js';
import * as DataGrid from '../../ui/legacy/components/data_grid/data_grid.js';
import * as UI from '../../ui/legacy/legacy.js';
import liveHeapProfileStyles from './liveHeapProfile.css.js';
const UIStrings = {
    /**
     * @description Text for a heap profile type
     */
    jsHeap: 'JS Heap',
    /**
     * @description Text in Live Heap Profile View of a profiler tool
     */
    allocatedJsHeapSizeCurrentlyIn: 'Allocated JS heap size currently in use',
    /**
     * @description Text in Live Heap Profile View of a profiler tool
     */
    vms: 'VMs',
    /**
     * @description Text in Live Heap Profile View of a profiler tool
     */
    numberOfVmsSharingTheSameScript: 'Number of VMs sharing the same script source',
    /**
     * @description Text in Live Heap Profile View of a profiler tool
     */
    scriptUrl: 'Script URL',
    /**
     * @description Text in Live Heap Profile View of a profiler tool
     */
    urlOfTheScriptSource: 'URL of the script source',
    /**
     * @description Data grid name for Heap Profile data grids
     */
    heapProfile: 'Heap Profile',
    /**
     * @description Text in Live Heap Profile View of a profiler tool
     * @example {1} PH1
     */
    anonymousScriptS: '(Anonymous Script {PH1})',
    /**
     * @description A unit
     */
    kb: 'kB',
};
const str_ = i18n.i18n.registerUIStrings('panels/profiler/LiveHeapProfileView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
let liveHeapProfileViewInstance;
export class LiveHeapProfileView extends UI.Widget.VBox {
    gridNodeByUrl;
    setting;
    toggleRecordAction;
    toggleRecordButton;
    startWithReloadButton;
    dataGrid;
    currentPollId;
    constructor() {
        super({ useShadowDom: true });
        this.gridNodeByUrl = new Map();
        this.registerRequiredCSS(liveHeapProfileStyles);
        this.setting = Common.Settings.Settings.instance().moduleSetting('memory-live-heap-profile');
        const toolbar = this.contentElement.createChild('devtools-toolbar', 'live-heap-profile-toolbar');
        this.toggleRecordAction =
            UI.ActionRegistry.ActionRegistry.instance().getAction('live-heap-profile.toggle-recording');
        this.toggleRecordButton =
            UI.Toolbar.Toolbar.createActionButton(this.toggleRecordAction);
        this.toggleRecordButton.setToggled(this.setting.get());
        toolbar.appendToolbarItem(this.toggleRecordButton);
        const mainTarget = SDK.TargetManager.TargetManager.instance().primaryPageTarget();
        if (mainTarget?.model(SDK.ResourceTreeModel.ResourceTreeModel)) {
            const startWithReloadAction = UI.ActionRegistry.ActionRegistry.instance().getAction('live-heap-profile.start-with-reload');
            this.startWithReloadButton = UI.Toolbar.Toolbar.createActionButton(startWithReloadAction);
            toolbar.appendToolbarItem(this.startWithReloadButton);
        }
        this.dataGrid = this.createDataGrid();
        this.dataGrid.asWidget().show(this.contentElement);
        this.currentPollId = 0;
    }
    static instance() {
        if (!liveHeapProfileViewInstance) {
            liveHeapProfileViewInstance = new LiveHeapProfileView();
        }
        return liveHeapProfileViewInstance;
    }
    createDataGrid() {
        const defaultColumnConfig = {
            id: '',
            title: Common.UIString.LocalizedEmptyString,
            width: undefined,
            fixedWidth: true,
            sortable: true,
            align: "right" /* DataGrid.DataGrid.Align.RIGHT */,
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
                align: "right" /* DataGrid.DataGrid.Align.RIGHT */,
                sort: DataGrid.DataGrid.Order.Descending,
                tooltip: i18nString(UIStrings.allocatedJsHeapSizeCurrentlyIn),
            },
            {
                ...defaultColumnConfig,
                id: 'isolates',
                title: i18nString(UIStrings.vms),
                width: '40px',
                fixedWidth: true,
                align: "right" /* DataGrid.DataGrid.Align.RIGHT */,
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
            deleteCallback: undefined,
            refreshCallback: undefined,
        });
        dataGrid.setResizeMethod("last" /* DataGrid.DataGrid.ResizeMethod.LAST */);
        dataGrid.element.classList.add('flex-auto');
        dataGrid.element.addEventListener('keydown', this.onKeyDown.bind(this), false);
        dataGrid.addEventListener("OpenedNode" /* DataGrid.DataGrid.Events.OPENED_NODE */, this.revealSourceForSelectedNode, this);
        dataGrid.addEventListener("SortingChanged" /* DataGrid.DataGrid.Events.SORTING_CHANGED */, this.sortingChanged, this);
        for (const info of columns) {
            const headerCell = dataGrid.headerTableHeader(info.id);
            if (headerCell) {
                headerCell.setAttribute('title', info.tooltip);
            }
        }
        return dataGrid;
    }
    wasShown() {
        super.wasShown();
        void this.poll();
        this.setting.addChangeListener(this.settingChanged, this);
    }
    willHide() {
        super.willHide();
        ++this.currentPollId;
        this.setting.removeChangeListener(this.settingChanged, this);
    }
    settingChanged(value) {
        this.toggleRecordButton.setToggled(value.data);
    }
    async poll() {
        const pollId = this.currentPollId;
        do {
            const isolates = Array.from(SDK.IsolateManager.IsolateManager.instance().isolates());
            const profiles = await Promise.all(isolates.map(isolate => {
                const heapProfilerModel = isolate.heapProfilerModel();
                if (!heapProfilerModel) {
                    return null;
                }
                return heapProfilerModel.getSamplingProfile();
            }));
            if (this.currentPollId !== pollId) {
                return;
            }
            this.update(isolates, profiles);
            await new Promise(r => window.setTimeout(r, 3000));
        } while (this.currentPollId === pollId);
    }
    update(isolates = [], profiles = []) {
        const dataByUrl = new Map();
        profiles.forEach((profile, index) => {
            if (profile) {
                processNodeTree(isolates[index], '', profile.head);
            }
        });
        const rootNode = this.dataGrid.rootNode();
        const existingNodes = new Set();
        for (const pair of dataByUrl) {
            const url = (pair[0]);
            const size = (pair[1].size);
            const isolateCount = (pair[1].isolates.size);
            if (!url) {
                console.info(`Node with empty URL: ${size} bytes`); // eslint-disable-line no-console
                continue;
            }
            let node = this.gridNodeByUrl.get(url);
            if (node) {
                node.updateNode(size, isolateCount);
            }
            else {
                node = new GridNode(url, size, isolateCount);
                this.gridNodeByUrl.set(url, node);
                rootNode.appendChild(node);
            }
            existingNodes.add(node);
        }
        for (const node of rootNode.children.slice()) {
            const gridNode = node;
            if (!existingNodes.has(gridNode)) {
                gridNode.remove();
            }
            this.gridNodeByUrl.delete(gridNode.url);
        }
        this.sortingChanged();
        function processNodeTree(isolate, parentUrl, node) {
            const url = node.callFrame.url || parentUrl || systemNodeName(node) || anonymousScriptName(node);
            node.children.forEach(processNodeTree.bind(null, isolate, url));
            if (!node.selfSize) {
                return;
            }
            let data = dataByUrl.get(url);
            if (!data) {
                data = { size: 0, isolates: new Set() };
                dataByUrl.set(url, data);
            }
            data.size += node.selfSize;
            data.isolates.add(isolate);
        }
        function systemNodeName(node) {
            const name = node.callFrame.functionName;
            return name.startsWith('(') && name !== '(root)' ? name : '';
        }
        function anonymousScriptName(node) {
            return Number(node.callFrame.scriptId) ? i18nString(UIStrings.anonymousScriptS, { PH1: node.callFrame.scriptId }) :
                '';
        }
    }
    onKeyDown(event) {
        if (!(event.key === 'Enter')) {
            return;
        }
        event.consume(true);
        this.revealSourceForSelectedNode();
    }
    revealSourceForSelectedNode() {
        const node = this.dataGrid.selectedNode;
        if (!node?.url) {
            return;
        }
        const sourceCode = Workspace.Workspace.WorkspaceImpl.instance().uiSourceCodeForURL(node.url);
        if (sourceCode) {
            void Common.Revealer.reveal(sourceCode);
        }
    }
    sortingChanged() {
        const columnId = this.dataGrid.sortColumnId();
        if (!columnId) {
            return;
        }
        function sortByUrl(a, b) {
            return b.url.localeCompare(a.url);
        }
        function sortBySize(a, b) {
            return b.size - a.size;
        }
        const sortFunction = columnId === 'url' ? sortByUrl : sortBySize;
        this.dataGrid.sortNodes(sortFunction, this.dataGrid.isSortOrderAscending());
    }
    toggleRecording() {
        const enable = !this.setting.get();
        if (enable) {
            this.startRecording(false);
        }
        else {
            void this.stopRecording();
        }
    }
    startRecording(reload) {
        this.setting.set(true);
        if (!reload) {
            return;
        }
        const mainTarget = SDK.TargetManager.TargetManager.instance().primaryPageTarget();
        if (!mainTarget) {
            return;
        }
        const resourceTreeModel = (mainTarget.model(SDK.ResourceTreeModel.ResourceTreeModel));
        if (resourceTreeModel) {
            resourceTreeModel.reloadPage();
        }
    }
    async stopRecording() {
        this.setting.set(false);
    }
}
export class GridNode extends DataGrid.SortableDataGrid.SortableDataGridNode {
    url;
    size;
    isolateCount;
    constructor(url, size, isolateCount) {
        super();
        this.url = url;
        this.size = size;
        this.isolateCount = isolateCount;
    }
    updateNode(size, isolateCount) {
        if (this.size === size && this.isolateCount === isolateCount) {
            return;
        }
        this.size = size;
        this.isolateCount = isolateCount;
        this.refresh();
    }
    createCell(columnId) {
        const cell = this.createTD(columnId);
        switch (columnId) {
            case 'url':
                cell.textContent = this.url;
                break;
            case 'size':
                cell.textContent = Platform.NumberUtilities.withThousandsSeparator(Math.round(this.size / 1e3));
                cell.createChild('span', 'size-units').textContent = i18nString(UIStrings.kb);
                break;
            case 'isolates':
                cell.textContent = `${this.isolateCount}`;
                break;
        }
        return cell;
    }
}
export class ActionDelegate {
    handleAction(_context, actionId) {
        void (async () => {
            const profileViewId = 'live-heap-profile';
            await UI.ViewManager.ViewManager.instance().showView(profileViewId);
            const view = UI.ViewManager.ViewManager.instance().view(profileViewId);
            if (view) {
                const widget = await view.widget();
                this.innerHandleAction(widget, actionId);
            }
        })();
        return true;
    }
    innerHandleAction(profilerView, actionId) {
        switch (actionId) {
            case 'live-heap-profile.toggle-recording':
                profilerView.toggleRecording();
                break;
            case 'live-heap-profile.start-with-reload':
                profilerView.startRecording(true);
                break;
            default:
                console.assert(false, `Unknown action: ${actionId}`);
        }
    }
}
//# sourceMappingURL=LiveHeapProfileView.js.map
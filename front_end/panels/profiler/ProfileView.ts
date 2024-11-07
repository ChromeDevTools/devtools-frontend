// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import type * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import * as Bindings from '../../models/bindings/bindings.js';
import type * as CPUProfile from '../../models/cpu_profile/cpu_profile.js';
import * as DataGrid from '../../ui/legacy/components/data_grid/data_grid.js';
import * as PerfUI from '../../ui/legacy/components/perf_ui/perf_ui.js';
import * as Components from '../../ui/legacy/components/utils/utils.js';
import * as UI from '../../ui/legacy/legacy.js';

import {BottomUpProfileDataGridTree} from './BottomUpProfileDataGrid.js';
import {type Formatter, type ProfileDataGridNode, ProfileDataGridTree} from './ProfileDataGrid.js';
import {ProfileFlameChart, type ProfileFlameChartDataProvider} from './ProfileFlameChartDataProvider.js';
import {type DataDisplayDelegate, ProfileHeader, type ProfileType} from './ProfileHeader.js';
import {ProfileSidebarTreeElement} from './ProfileSidebarTreeElement.js';
import {TopDownProfileDataGridTree} from './TopDownProfileDataGrid.js';

const UIStrings = {
  /**
   *@description Text in Profile View of a profiler tool
   */
  profile: 'Profile',
  /**
   *@description Placeholder text in the search box of the JavaScript profiler tool. Users can search
   *the results by the cost in milliseconds, the name of the function, or the file name.
   */
  findByCostMsNameOrFile: 'Find by cost (>50ms), name or file',
  /**
   *@description Text for a programming function
   */
  function: 'Function',
  /**
   *@description Title of the Profiler tool
   */
  profiler: 'Profiler',
  /**
   *@description Aria-label for profiles view combobox in memory tool
   */
  profileViewMode: 'Profile view mode',
  /**
   *@description Tooltip text that appears when hovering over the largeicon visibility button in the Profile View of a profiler tool
   */
  focusSelectedFunction: 'Focus selected function',
  /**
   *@description Tooltip text that appears when hovering over the largeicon delete button in the Profile View of a profiler tool
   */
  excludeSelectedFunction: 'Exclude selected function',
  /**
   *@description Tooltip text that appears when hovering over the largeicon refresh button in the Profile View of a profiler tool
   */
  restoreAllFunctions: 'Restore all functions',
  /**
   *@description Text in Profile View of a profiler tool
   */
  chart: 'Chart',
  /**
   *@description Text in Profile View of a profiler tool
   */
  heavyBottomUp: 'Heavy (Bottom Up)',
  /**
   *@description Text for selecting different profile views in the JS profiler tool. This option is a tree view.
   */
  treeTopDown: 'Tree (Top Down)',
  /**
   * @description Name of a profile
   * @example {2} PH1
   */
  profileD: 'Profile {PH1}',
  /**
   *@description Text in Profile View of a profiler tool
   *@example {4 MB} PH1
   */
  loadingD: 'Loading… {PH1}%',
  /**
   *@description Text in Profile View of a profiler tool
   *@example {example.file} PH1
   *@example {cannot open file} PH2
   */
  fileSReadErrorS: 'File \'\'{PH1}\'\' read error: {PH2}',
  /**
   *@description Text when something is loading
   */
  loading: 'Loading…',
  /**
   *@description Text in Profile View of a profiler tool
   */
  failedToReadFile: 'Failed to read file',
  /**
   *@description Text in Profile View of a profiler tool
   */
  parsing: 'Parsing…',
  /**
   * @description Status indicator in the JS Profiler to show that a file has been successfully loaded
   * from file, as opposed to a profile that has been captured locally.
   */
  loaded: 'Loaded',
};
const str_ = i18n.i18n.registerUIStrings('panels/profiler/ProfileView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class ProfileView extends UI.View.SimpleView implements UI.SearchableView.Searchable {
  profileInternal: CPUProfile.ProfileTreeModel.ProfileTreeModel|null;
  searchableViewInternal: UI.SearchableView.SearchableView;
  dataGrid: DataGrid.DataGrid.DataGridImpl<unknown>;
  viewSelectComboBox: UI.Toolbar.ToolbarComboBox;
  focusButton: UI.Toolbar.ToolbarButton;
  excludeButton: UI.Toolbar.ToolbarButton;
  resetButton: UI.Toolbar.ToolbarButton;
  readonly linkifierInternal: Components.Linkifier.Linkifier;
  nodeFormatter!: Formatter;
  viewType!: Common.Settings.Setting<ViewTypes>;
  adjustedTotal!: number;
  profileHeader!: WritableProfileHeader;
  bottomUpProfileDataGridTree?: BottomUpProfileDataGridTree|null;
  topDownProfileDataGridTree?: TopDownProfileDataGridTree|null;
  currentSearchResultIndex?: number;
  dataProvider?: ProfileFlameChartDataProvider;
  flameChart?: ProfileFlameChart;
  visibleView?: ProfileFlameChart|DataGrid.DataGrid.DataGridWidget<unknown>;
  searchableElement?: ProfileDataGridTree|ProfileFlameChart;
  profileDataGridTree?: ProfileDataGridTree;
  constructor() {
    super(i18nString(UIStrings.profile));

    this.profileInternal = null;

    this.searchableViewInternal = new UI.SearchableView.SearchableView(this, null);
    this.searchableViewInternal.setPlaceholder(i18nString(UIStrings.findByCostMsNameOrFile));
    this.searchableViewInternal.show(this.element);

    const columns = ([] as DataGrid.DataGrid.ColumnDescriptor[]);
    columns.push({
      id: 'self',
      title: this.columnHeader('self'),
      width: '120px',
      fixedWidth: true,
      sortable: true,
      sort: DataGrid.DataGrid.Order.Descending,
      titleDOMFragment: undefined,
      align: undefined,
      editable: undefined,
      nonSelectable: undefined,
      longText: undefined,
      disclosure: undefined,
      weight: undefined,
      allowInSortByEvenWhenHidden: undefined,
      dataType: undefined,
      defaultWeight: undefined,
    });
    columns.push({
      id: 'total',
      title: this.columnHeader('total'),
      width: '120px',
      fixedWidth: true,
      sortable: true,
      sort: undefined,
      titleDOMFragment: undefined,
      align: undefined,
      editable: undefined,
      nonSelectable: undefined,
      longText: undefined,
      disclosure: undefined,
      weight: undefined,
      allowInSortByEvenWhenHidden: undefined,
      dataType: undefined,
      defaultWeight: undefined,
    });
    columns.push({
      id: 'function',
      title: i18nString(UIStrings.function),
      disclosure: true,
      sortable: true,
      sort: undefined,
      titleDOMFragment: undefined,
      align: undefined,
      editable: undefined,
      nonSelectable: undefined,
      longText: undefined,
      weight: undefined,
      allowInSortByEvenWhenHidden: undefined,
      dataType: undefined,
      defaultWeight: undefined,
      width: undefined,
      fixedWidth: undefined,
    });

    this.dataGrid = new DataGrid.DataGrid.DataGridImpl({
      displayName: i18nString(UIStrings.profiler),
      columns,
      editCallback: undefined,
      deleteCallback: undefined,
      refreshCallback: undefined,
    });
    this.dataGrid.addEventListener(DataGrid.DataGrid.Events.SORTING_CHANGED, this.sortProfile, this);
    this.dataGrid.addEventListener(DataGrid.DataGrid.Events.SELECTED_NODE, this.nodeSelected.bind(this, true));
    this.dataGrid.addEventListener(DataGrid.DataGrid.Events.DESELECTED_NODE, this.nodeSelected.bind(this, false));
    this.dataGrid.setRowContextMenuCallback(this.populateContextMenu.bind(this));

    this.viewSelectComboBox = new UI.Toolbar.ToolbarComboBox(
        this.changeView.bind(this), i18nString(UIStrings.profileViewMode), undefined, 'profile-view.selected-view');

    this.focusButton = new UI.Toolbar.ToolbarButton(
        i18nString(UIStrings.focusSelectedFunction), 'eye', undefined, 'profile-view.focus-selected-function');
    this.focusButton.setEnabled(false);
    this.focusButton.addEventListener(UI.Toolbar.ToolbarButton.Events.CLICK, this.focusClicked, this);

    this.excludeButton = new UI.Toolbar.ToolbarButton(
        i18nString(UIStrings.excludeSelectedFunction), 'cross', undefined, 'profile-view.exclude-selected-function');
    this.excludeButton.setEnabled(false);
    this.excludeButton.addEventListener(UI.Toolbar.ToolbarButton.Events.CLICK, this.excludeClicked, this);

    this.resetButton = new UI.Toolbar.ToolbarButton(
        i18nString(UIStrings.restoreAllFunctions), 'refresh', undefined, 'profile-view.restore-all-functions');
    this.resetButton.setEnabled(false);
    this.resetButton.addEventListener(UI.Toolbar.ToolbarButton.Events.CLICK, this.resetClicked, this);

    this.linkifierInternal = new Components.Linkifier.Linkifier(maxLinkLength);
  }

  static buildPopoverTable(entryInfo: {
    title: string,
    value: string,
  }[]): Element {
    const table = document.createElement('table');
    for (const entry of entryInfo) {
      const row = table.createChild('tr');
      row.createChild('td').textContent = entry.title;
      row.createChild('td').textContent = entry.value;
    }
    return table;
  }

  setProfile(profile: CPUProfile.ProfileTreeModel.ProfileTreeModel): void {
    this.profileInternal = profile;
    this.bottomUpProfileDataGridTree = null;
    this.topDownProfileDataGridTree = null;
    this.changeView();
    this.refresh();
  }

  profile(): CPUProfile.ProfileTreeModel.ProfileTreeModel|null {
    return this.profileInternal;
  }

  initialize(nodeFormatter: Formatter): void {
    this.nodeFormatter = nodeFormatter;

    this.viewType = Common.Settings.Settings.instance().createSetting('profile-view', ViewTypes.HEAVY);
    const viewTypes = [ViewTypes.FLAME, ViewTypes.HEAVY, ViewTypes.TREE];

    const optionNames = new Map([
      [ViewTypes.FLAME, i18nString(UIStrings.chart)],
      [ViewTypes.HEAVY, i18nString(UIStrings.heavyBottomUp)],
      [ViewTypes.TREE, i18nString(UIStrings.treeTopDown)],
    ]);

    const options = new Map(
        viewTypes.map(type => [type, this.viewSelectComboBox.createOption((optionNames.get(type) as string), type)]));
    const optionName = this.viewType.get() || viewTypes[0];
    const option = options.get(optionName) || options.get(viewTypes[0]);
    this.viewSelectComboBox.select((option as Element));

    this.changeView();
    if (this.flameChart) {
      this.flameChart.update();
    }
  }

  override focus(): void {
    if (this.flameChart) {
      this.flameChart.focus();
    } else {
      super.focus();
    }
  }

  columnHeader(_columnId: string): Common.UIString.LocalizedString {
    throw 'Not implemented';
  }

  selectRange(timeLeft: number, timeRight: number): void {
    if (!this.flameChart) {
      return;
    }
    this.flameChart.selectRange(timeLeft, timeRight);
  }

  override async toolbarItems(): Promise<UI.Toolbar.ToolbarItem[]> {
    return [this.viewSelectComboBox, this.focusButton, this.excludeButton, this.resetButton];
  }

  getBottomUpProfileDataGridTree(): ProfileDataGridTree {
    if (!this.bottomUpProfileDataGridTree) {
      this.bottomUpProfileDataGridTree = new BottomUpProfileDataGridTree(
          this.nodeFormatter, this.searchableViewInternal,
          (this.profileInternal as CPUProfile.ProfileTreeModel.ProfileTreeModel).root, this.adjustedTotal);
    }
    return this.bottomUpProfileDataGridTree;
  }

  getTopDownProfileDataGridTree(): ProfileDataGridTree {
    if (!this.topDownProfileDataGridTree) {
      this.topDownProfileDataGridTree = new TopDownProfileDataGridTree(
          this.nodeFormatter, this.searchableViewInternal,
          (this.profileInternal as CPUProfile.ProfileTreeModel.ProfileTreeModel).root, this.adjustedTotal);
    }
    return this.topDownProfileDataGridTree;
  }

  populateContextMenu(contextMenu: UI.ContextMenu.ContextMenu, gridNode: DataGrid.DataGrid.DataGridNode<unknown>):
      void {
    const node = (gridNode as ProfileDataGridNode);
    if (node.linkElement) {
      contextMenu.appendApplicableItems(node.linkElement);
    }
  }

  override willHide(): void {
    this.currentSearchResultIndex = -1;
  }

  refresh(): void {
    if (!this.profileDataGridTree) {
      return;
    }
    const selectedProfileNode =
        this.dataGrid.selectedNode ? (this.dataGrid.selectedNode as ProfileDataGridNode).profileNode : null;

    this.dataGrid.rootNode().removeChildren();

    const children = this.profileDataGridTree.children;
    const count = children.length;

    for (let index = 0; index < count; ++index) {
      this.dataGrid.rootNode().appendChild(children[index]);
    }

    if (selectedProfileNode) {
      // TODO(crbug.com/1011811): Cleanup the added `selected` property to this SDK class.
      // @ts-ignore
      selectedProfileNode.selected = true;
    }
  }

  refreshVisibleData(): void {
    let child: (DataGrid.DataGrid.DataGridNode<unknown>|null) = this.dataGrid.rootNode().children[0];
    while (child) {
      child.refresh();
      child = child.traverseNextNode(false, null, true);
    }
  }

  searchableView(): UI.SearchableView.SearchableView {
    return this.searchableViewInternal;
  }

  supportsCaseSensitiveSearch(): boolean {
    return true;
  }

  supportsRegexSearch(): boolean {
    return false;
  }

  onSearchCanceled(): void {
    if (this.searchableElement) {
      this.searchableElement.onSearchCanceled();
    }
  }

  performSearch(searchConfig: UI.SearchableView.SearchConfig, shouldJump: boolean, jumpBackwards?: boolean): void {
    if (this.searchableElement) {
      this.searchableElement.performSearch(searchConfig, shouldJump, jumpBackwards);
    }
  }

  jumpToNextSearchResult(): void {
    if (this.searchableElement) {
      this.searchableElement.jumpToNextSearchResult();
    }
  }

  jumpToPreviousSearchResult(): void {
    if (this.searchableElement) {
      this.searchableElement.jumpToPreviousSearchResult();
    }
  }

  linkifier(): Components.Linkifier.Linkifier {
    return this.linkifierInternal;
  }

  createFlameChartDataProvider(): ProfileFlameChartDataProvider {
    throw 'Not implemented';
  }

  ensureFlameChartCreated(): void {
    if (this.flameChart) {
      return;
    }
    this.dataProvider = this.createFlameChartDataProvider();
    this.flameChart = new ProfileFlameChart(this.searchableViewInternal, this.dataProvider);
    this.flameChart.addEventListener(PerfUI.FlameChart.Events.ENTRY_INVOKED, event => {
      void this.onEntryInvoked(event);
    });
  }

  async onEntryInvoked(event: Common.EventTarget.EventTargetEvent<number>): Promise<void> {
    if (!this.dataProvider) {
      return;
    }
    const entryIndex = event.data;
    const node = this.dataProvider.entryNodes[entryIndex];
    const debuggerModel = this.profileHeader.debuggerModel;
    if (!node || !node.scriptId || !debuggerModel) {
      return;
    }
    const script = debuggerModel.scriptForId(node.scriptId);
    if (!script) {
      return;
    }
    const location =
        (debuggerModel.createRawLocation(script, node.lineNumber, node.columnNumber) as SDK.DebuggerModel.Location);
    const uiLocation =
        await Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance().rawLocationToUILocation(location);
    void Common.Revealer.reveal(uiLocation);
  }

  changeView(): void {
    if (!this.profileInternal) {
      return;
    }

    this.searchableViewInternal.closeSearch();

    if (this.visibleView) {
      this.visibleView.detach();
    }
    this.viewType.set((this.viewSelectComboBox.selectedOption() as HTMLOptionElement).value as ViewTypes);
    switch (this.viewType.get()) {
      case ViewTypes.FLAME:
        this.ensureFlameChartCreated();
        this.visibleView = this.flameChart;
        this.searchableElement = this.flameChart;
        break;
      case ViewTypes.TREE:
        this.profileDataGridTree = this.getTopDownProfileDataGridTree();
        this.sortProfile();
        this.visibleView = this.dataGrid.asWidget();
        this.searchableElement = this.profileDataGridTree;
        break;
      case ViewTypes.HEAVY:
        this.profileDataGridTree = this.getBottomUpProfileDataGridTree();
        this.sortProfile();
        this.visibleView = this.dataGrid.asWidget();
        this.searchableElement = this.profileDataGridTree;
        break;
    }

    const isFlame = this.viewType.get() === ViewTypes.FLAME;
    this.focusButton.setVisible(!isFlame);
    this.excludeButton.setVisible(!isFlame);
    this.resetButton.setVisible(!isFlame);

    if (this.visibleView) {
      this.visibleView.show(this.searchableViewInternal.element);
    }
  }

  nodeSelected(selected: boolean): void {
    this.focusButton.setEnabled(selected);
    this.excludeButton.setEnabled(selected);
  }

  focusClicked(): void {
    if (!this.dataGrid.selectedNode) {
      return;
    }

    this.resetButton.setEnabled(true);
    (this.resetButton.element as HTMLElement).focus();
    if (this.profileDataGridTree) {
      this.profileDataGridTree.focus((this.dataGrid.selectedNode as ProfileDataGridNode));
    }
    this.refresh();
    this.refreshVisibleData();
    Host.userMetrics.actionTaken(Host.UserMetrics.Action.CpuProfileNodeFocused);
  }

  excludeClicked(): void {
    const selectedNode = this.dataGrid.selectedNode;

    if (!selectedNode) {
      return;
    }

    this.resetButton.setEnabled(true);
    (this.resetButton.element as HTMLElement).focus();

    selectedNode.deselect();

    if (this.profileDataGridTree) {
      this.profileDataGridTree.exclude((selectedNode as ProfileDataGridNode));
    }
    this.refresh();
    this.refreshVisibleData();
    Host.userMetrics.actionTaken(Host.UserMetrics.Action.CpuProfileNodeExcluded);
  }

  resetClicked(): void {
    this.viewSelectComboBox.selectElement().focus();
    this.resetButton.setEnabled(false);
    if (this.profileDataGridTree) {
      this.profileDataGridTree.restore();
    }
    this.linkifierInternal.reset();
    this.refresh();
    this.refreshVisibleData();
  }

  sortProfile(): void {
    if (!this.profileDataGridTree) {
      return;
    }
    const sortAscending = this.dataGrid.isSortOrderAscending();
    const sortColumnId = this.dataGrid.sortColumnId();
    const sortProperty = sortColumnId === 'function' ? 'functionName' : sortColumnId || '';
    this.profileDataGridTree.sort(ProfileDataGridTree.propertyComparator(sortProperty, sortAscending), false);

    this.refresh();
  }
}

export const maxLinkLength = 30;

export const enum ViewTypes {
  FLAME = 'Flame',
  TREE = 'Tree',
  HEAVY = 'Heavy',
}

export class WritableProfileHeader extends ProfileHeader implements Common.StringOutputStream.OutputStream {
  readonly debuggerModel: SDK.DebuggerModel.DebuggerModel|null;
  fileName?: Platform.DevToolsPath.RawPathString;
  jsonifiedProfile?: string|null;
  profile?: Protocol.Profiler.Profile;
  protocolProfileInternal?: Protocol.Profiler.Profile;
  #profileReceivedPromise: Promise<void>;
  #profileReceivedFulfill = (): void => {};

  constructor(debuggerModel: SDK.DebuggerModel.DebuggerModel|null, type: ProfileType, title?: string) {
    super(type, title || i18nString(UIStrings.profileD, {PH1: type.nextProfileUid()}));
    this.debuggerModel = debuggerModel;
    this.#profileReceivedPromise = new Promise(resolve => {
      this.#profileReceivedFulfill = resolve;
    });
  }

  onChunkTransferred(_reader: Bindings.FileUtils.ChunkedReader): void {
    if (this.jsonifiedProfile) {
      // TODO(l10n): Is the '%' at the end of this string correct? 4MB% looks wrong
      this.updateStatus(
          i18nString(UIStrings.loadingD, {PH1: i18n.ByteUtilities.bytesToString(this.jsonifiedProfile.length)}));
    }
  }

  onError(reader: Bindings.FileUtils.ChunkedReader): void {
    const error = (reader.error() as Error);
    if (error) {
      this.updateStatus(i18nString(UIStrings.fileSReadErrorS, {PH1: reader.fileName(), PH2: error.message}));
    }
  }

  async write(text: string): Promise<void> {
    this.jsonifiedProfile += text;
  }

  async close(): Promise<void> {
  }

  override dispose(): void {
    this.removeTempFile();
  }

  override createSidebarTreeElement(panel: DataDisplayDelegate): ProfileSidebarTreeElement {
    return new ProfileSidebarTreeElement(panel, this, 'profile-sidebar-tree-item');
  }

  override canSaveToFile(): boolean {
    return !this.fromFile();
  }

  override async saveToFile(): Promise<void> {
    await this.#profileReceivedPromise;
    const fileOutputStream = new Bindings.FileUtils.FileOutputStream();
    if (!this.fileName) {
      const now = Platform.DateUtilities.toISO8601Compact(new Date());
      const fileExtension = this.profileType().fileExtension();

      this.fileName = `${this.profileType().typeName()}-${now}${fileExtension}` as Platform.DevToolsPath.RawPathString;
    }

    const accepted = await fileOutputStream.open(this.fileName);
    if (!accepted || !this.tempFile) {
      return;
    }
    const data = await this.tempFile.read();
    if (data) {
      await fileOutputStream.write(data);
    }
    void fileOutputStream.close();
  }

  override async loadFromFile(file: File): Promise<Error|null> {
    this.updateStatus(i18nString(UIStrings.loading), true);
    const fileReader = new Bindings.FileUtils.ChunkedFileReader(file, 10000000, this.onChunkTransferred.bind(this));
    this.jsonifiedProfile = '';

    const success = await fileReader.read(this);
    if (!success) {
      this.onError(fileReader);
      return new Error(i18nString(UIStrings.failedToReadFile));
    }

    this.updateStatus(i18nString(UIStrings.parsing), true);
    let error: null = null;
    try {
      this.profile = (JSON.parse(this.jsonifiedProfile) as Protocol.Profiler.Profile);
      this.setProfile((this.profile as Protocol.Profiler.Profile));
      this.updateStatus(i18nString(UIStrings.loaded), false);
    } catch (e) {
      error = e;
      this.profileType().removeProfile(this);
    }
    this.jsonifiedProfile = null;

    if (this.profileType().profileBeingRecorded() === this) {
      this.profileType().setProfileBeingRecorded(null);
    }
    return error;
  }

  setProtocolProfile(profile: Protocol.Profiler.Profile): void {
    this.setProfile(profile);
    this.protocolProfileInternal = profile;
    this.tempFile = new Bindings.TempFile.TempFile();
    this.tempFile.write([JSON.stringify(profile)]);
    this.#profileReceivedFulfill();
  }
}

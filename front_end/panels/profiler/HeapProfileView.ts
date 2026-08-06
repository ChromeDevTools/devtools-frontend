// Copyright 2016 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import '../../ui/components/icon_button/icon_button.js';
import '../../ui/legacy/components/data_grid/data_grid.js';

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import * as Bindings from '../../models/bindings/bindings.js';
import * as CPUProfile from '../../models/cpu_profile/cpu_profile.js';
import * as Buttons from '../../ui/components/buttons/buttons.js';
import * as PerfUI from '../../ui/legacy/components/perf_ui/perf_ui.js';
import * as SettingsUI from '../../ui/legacy/components/settings_ui/settings_ui.js';
import * as Components from '../../ui/legacy/components/utils/utils.js';
import * as UI from '../../ui/legacy/legacy.js';
import {Directives, html, type LitTemplate, nothing, render, type TemplateResult} from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import {BottomUpProfileDataGridTree} from './BottomUpProfileDataGrid.js';
import {Events, HeapTimelineOverview, type IdsRangeChangedEvent, type Samples} from './HeapTimelineOverview.js';
import {type Formatter, ProfileDataGridTree, type ProfileEntry} from './ProfileDataGrid.js';
import {ProfileFlameChart, ProfileFlameChartDataProvider} from './ProfileFlameChartDataProvider.js';
import {ProfileEvents, type ProfileHeader, ProfileType} from './ProfileHeader.js';
import profilesPanelStyles from './profilesPanel.css.js';
import {TopDownProfileDataGridTree} from './TopDownProfileDataGrid.js';
import {WritableProfileHeader} from './WritableProfileHeader.js';

const {repeat, ref} = Directives;
const {widget, widgetRef} = UI.Widget;

const UIStrings = {
  /**
   * @description The reported total size used in the selected time frame of the allocation sampling profile.
   * @example {3 MB} PH1
   */
  selectedSizeS: 'Selected size: {PH1}',
  /**
   * @description Column header that reports the size (in bytes) used for a particular part of the heap, excluding the size of child nodes.
   */
  selfSizeBytes: 'Self size',
  /**
   * @description Column header that reports the total size (in bytes) used for a particular part of the heap.
   */
  totalSizeBytes: 'Total size',
  /**
   * @description Button text to stop profiling the heap.
   */
  stopHeapProfiling: 'Stop heap profiling',
  /**
   * @description Button text to start profiling the heap.
   */
  startHeapProfiling: 'Start heap profiling',
  /**
   * @description Progress update that the profiler is recording the contents of the heap.
   */
  recording: 'Recording…',
  /**
   * @description Tooltip and status text for the recording icon when the heap profiler is actively recording.
   */
  heapProfilerIsRecording: 'Heap profiler is recording',
  /**
   * @description Progress update that the profiler is in the process of stopping its recording of the heap.
   */
  stopping: 'Stopping…',
  /**
   * @description Sampling category to only profile allocations happening on the heap.
   */
  allocationSampling: 'Allocation sampling',
  /**
   * @description The title for the collection of profiles that are gathered from various snapshots of the heap, using a sampling (e.g. every 1/100) technique.
   */
  samplingProfiles: 'Sampling profiles',
  /**
   * @description Description for the allocation sampling profiling option in the Memory panel.
   */
  recordMemoryAllocations:
      'Approximate memory allocations by sampling long operations with minimal overhead and get a breakdown by JavaScript execution stack',
  /**
   * @description Name of a profile.
   * @example {2} PH1
   */
  profileD: 'Profile {PH1}',
  /**
   * @description Accessible text for the value in bytes in the allocation view or coverage view.
   * @example {12345} PH1
   */
  sBytes: '{PH1} bytes',
  /**
   * @description Formatting template for displaying a percentage value in heap and CPU profile views.
   * @example {21.33} PH1
   */
  formatPercent: '{PH1} %',
  /**
   * @description The formatted size in kilobytes, abbreviated to kB.
   * @example {1,021} PH1
   */
  skb: '{PH1} kB',
  /**
   * @description Text for the name of something.
   */
  name: 'Name',
  /**
   * @description Tooltip for a cell reporting the size used for a particular part of the heap, excluding the size of child nodes.
   */
  selfSize: 'Self size',
  /**
   * @description Tooltip for a cell reporting the total size used for a particular part of the heap.
   */
  totalSize: 'Total size',
  /**
   * @description Text for web URLs.
   */
  url: 'URL',
  /**
   * @description Label for a checkbox in the Memory panel to enable sampling heap profiler timeline.
   */
  samplingHeapProfilerTimeline: 'Sampling heap profiler timeline',
  /**
   * @description Tab title for an individual heap profile view in the Memory panel.
   */
  profile: 'Profile',
  /**
   * @description Placeholder text in the search box of the JavaScript profiler tool. Users can search
   * the results by the cost in milliseconds, the name of the function, or the file name.
   */
  findByCostMsNameOrFile: 'Find by cost (>50ms), name or file',
  /**
   * @description Text for a programming function.
   */
  function: 'Function',
  /**
   * @description Title of the Profiler tool.
   */
  profiler: 'Profiler',
  /**
   * @description Aria-label for profiles view combobox in Memory panel.
   */
  profileViewMode: 'Profile view mode',
  /**
   * @description Tooltip text that appears when hovering over the focus button in the heap profile view toolbar.
   */
  focusSelectedFunction: 'Focus selected function',
  /**
   * @description Tooltip text that appears when hovering over the exclude button in the heap profile view toolbar.
   */
  excludeSelectedFunction: 'Exclude selected function',
  /**
   * @description Tooltip text that appears when hovering over the restore button in the heap profile view toolbar.
   */
  restoreAllFunctions: 'Restore all functions',
  /**
   * @description Option in the view mode dropdown to display the heap profile as a flame chart.
   */
  chart: 'Chart',
  /**
   * @description Option in the view mode dropdown to display the heap profile as a bottom-up call tree.
   */
  heavyBottomUp: 'Heavy (bottom up)',
  /**
   * @description Option in the view mode dropdown to display the heap profile as a top-down call tree.
   */
  treeTopDown: 'Tree (top down)',

  /**
   * @description Tooltip to alert developers that some parts of code in execution were not optimized.
   * @example {Optimized too many times} PH1
   */
  notOptimizedS: 'Not optimized: {PH1}',
} as const;
const str_ = i18n.i18n.registerUIStrings('panels/profiler/HeapProfileView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
function convertToSamplingHeapProfile(profileHeader: SamplingHeapProfileHeader):
    Protocol.HeapProfiler.SamplingHeapProfile {
  return (profileHeader.profile || profileHeader.protocolProfile()) as Protocol.HeapProfiler.SamplingHeapProfile;
}

export const maxLinkLength = 30;

export const enum ViewTypes {
  FLAME = 'Flame',
  TREE = 'Tree',
  HEAVY = 'Heavy',
}

export interface ViewInput {
  timelineOverview: HeapTimelineOverview;
  searchable: UI.SearchableView.Searchable;
  hasTemporaryView: boolean;
  viewType: ViewTypes|null;
  profileDataGridTree: ProfileDataGridTree|undefined;
  selectedNode: ProfileEntry|null;
  nodeFormatter: Formatter;
  columnHeader: (columnId: string) => Common.UIString.LocalizedString;
  searchableView: UI.SearchableView.SearchableView|undefined;
  dataProvider: ProfileFlameChartDataProvider|undefined;
  target: SDK.Target.Target|null;
  onExpand: (node: ProfileEntry) => void;
  onCollapse: (node: ProfileEntry) => void;
  onSelect: (node: ProfileEntry) => void;
  onDeselect: () => void;
  onContextMenu: (event: CustomEvent<UI.ContextMenu.ContextMenu>, node: ProfileEntry) => void;
  onSearchableViewMount: (widget: UI.SearchableView.SearchableView) => void;
  onFlameChartEntryInvoked: (entryIndex: number) => void;
  range?: {left: number, right: number};
}

export interface ViewOutput {
  performSearch?: (searchConfig: UI.SearchableView.SearchConfig, shouldJump: boolean, jumpBackwards?: boolean) => void;
  jumpToNextSearchResult?: () => void;
  jumpToPreviousSearchResult?: () => void;
  onSearchCanceled?: () => void;
}

export type View = (input: ViewInput, output: ViewOutput, target: HTMLElement|DocumentFragment) => void;

export const DEFAULT_VIEW: View = (input, output, target) => {
  const {searchableView, dataProvider} = input;
  // clang-format off
  render(html`
    ${input.hasTemporaryView ? html`
      <devtools-widget ${widget(() => input.timelineOverview)}></devtools-widget>` : nothing}
    <devtools-widget ${widget(element => {
        const searchableViewWidget = new UI.SearchableView.SearchableView(input.searchable, null, undefined, element);
        searchableViewWidget.setPlaceholder(i18nString(UIStrings.findByCostMsNameOrFile));
        return searchableViewWidget;
      })}
      ${widgetRef(UI.SearchableView.SearchableView, input.onSearchableViewMount)}>
      ${input.viewType === ViewTypes.FLAME && searchableView && dataProvider ?  html`
          <devtools-widget
            autofocus
            ${widget((e: HTMLElement) => new ProfileFlameChart(searchableView, dataProvider, e), {range: input.range})}
            @EntryInvoked=${(e: CustomEvent<number>) => input.onFlameChartEntryInvoked(e.detail)}
            ${widgetRef(ProfileFlameChart, widget => {
              output.performSearch = widget.performSearch.bind(widget);
              output.jumpToNextSearchResult = widget.jumpToNextSearchResult.bind(widget);
              output.jumpToPreviousSearchResult = widget.jumpToPreviousSearchResult.bind(widget);
              output.onSearchCanceled = widget.onSearchCanceled.bind(widget);
            })}>
          </devtools-widget>`
        : input.profileDataGridTree ?  html`
          <div class="data-grid-target vbox flex-auto">${renderDataGrid(input)}</div>`
        : nothing}
    </devtools-widget>`, target);
  // clang-format on
};

function renderDataGrid(input: ViewInput): LitTemplate {
  if (!input.profileDataGridTree) {
    return nothing;
  }

  let highlightIndex = -1;
  if (input.profileDataGridTree && input.profileDataGridTree.searchResults) {
    highlightIndex = input.profileDataGridTree.searchResultIndex + 1;
  }
  // clang-format off
  return html`
    <style>${profilesPanelStyles}</style>
    <devtools-data-grid class="flex-auto" name=${i18nString(UIStrings.profiler)} striped autofocus resize="last"
                        highlight=${highlightIndex >= 1 ? highlightIndex : nothing}
                        @deselect=${input.onDeselect} .template=${html`
      <style>${profilesPanelStyles}</style>
      <table>
        <tr>
          <th id="self" width="120px" fixed weight="1" sortable sort="descending">
            ${input.columnHeader('self')}
          </th>
          <th id="total" width="120px" fixed weight="1" sortable>
            ${input.columnHeader('total')}
          </th>
          <th id="function" weight="3" sortable disclosure>
            ${i18nString(UIStrings.function)}
          </th>
        </tr>
        ${repeat(input.profileDataGridTree.children,
                (node: ProfileEntry) => node.callUID,
                (node: ProfileEntry) => renderNode(node, input))}
      </table>`}>
    </devtools-data-grid>`;
  // clang-format on
}

function renderNode(node: ProfileEntry, input: ViewInput): LitTemplate {
  const onSelect = (): void => {
    input.onSelect(node);
  };
  const onContextMenu = (event: CustomEvent<UI.ContextMenu.ContextMenu>): void => {
    input.onContextMenu(event, node);
  };
  const onExpand = (): void => {
    input.onExpand(node);
  };
  const onCollapse = (): void => {
    input.onCollapse(node);
  };

  // clang-format off
  return html`
  <tr data-uid=${node.callUID} ?selected=${input.selectedNode === node} ?expanded=${node.expanded}
      ?highlighted=${node.searchMatchedSelfColumn || node.searchMatchedTotalColumn || node.searchMatchedFunctionColumn}
      @select=${onSelect}
      @contextmenu=${onContextMenu}
      @expand=${onExpand} @collapse=${onCollapse}>
    <td data-value=${node.self} class="numeric-column ${node.searchMatchedSelfColumn ? 'highlight' : ''}"
        aria-label=${`${input.nodeFormatter.formatValueAccessibleText(node.self, node)}, ${input.nodeFormatter.formatPercent(node.selfPercent, node)}`}>
      <div class="profile-multiple-values">
        <span>${input.nodeFormatter.formatValue(node.self, node)}</span>
        <span class="percent-column">${input.nodeFormatter.formatPercent(node.selfPercent, node)}</span>
      </div>
    </td>
    <td data-value=${node.total} class="numeric-column ${node.searchMatchedTotalColumn ? 'highlight' : ''}"
        aria-label=${`${input.nodeFormatter.formatValueAccessibleText(node.total, node)}, ${input.nodeFormatter.formatPercent(node.totalPercent, node)}`}>
      <div class="profile-multiple-values">
        <span>${input.nodeFormatter.formatValue(node.total, node)}</span>
        <span class="percent-column">${input.nodeFormatter.formatPercent(node.totalPercent, node)}</span>
      </div>
    </td>
    <td data-value=${node.functionName} class="${node.searchMatchedFunctionColumn ? 'highlight' : ''} ${node.deoptReason ? 'not-optimized' : ''}">
      ${node.deoptReason ? html`
        <devtools-icon name="warning-filled" class="profile-warn-marker small"
                        title=${i18nString(UIStrings.notOptimizedS, {PH1: node.deoptReason})}>
        </devtools-icon>` : nothing}
      ${node.functionName}
      ${node.profileNode.scriptId !== '0' && node.profileNode.callFrame ? widget(Components.Linkifier.ScriptLocationLink, {
        target: input.target ?? undefined,
        scriptId: node.profileNode.callFrame.scriptId,
        sourceURL: node.profileNode.callFrame.url as Platform.DevToolsPath.UrlString,
        lineNumber: node.profileNode.callFrame.lineNumber,
        options: {
          columnNumber: node.profileNode.callFrame.columnNumber,
          maxLength: maxLinkLength,
          className: 'profile-node-file',
        },
      }) : nothing}
    </td>
    ${node.hasChildren() ? html`
      <td><table>
        ${node.expanded ? html`${repeat(
            node.children,
            child => child.callUID,
            child => renderNode(child, input))}` : nothing}
      </table></td>` : nothing}
  </tr>`;
  // clang-format on
}

export class HeapProfileView extends UI.View.SimpleView implements UI.SearchableView.Searchable {
  profileHeader: SamplingHeapProfileHeader;
  readonly profileType: SamplingHeapProfileTypeBase;
  adjustedTotal: number;
  selectedSizeText: HTMLElement|undefined;
  timestamps: number[] = [];
  sizes: number[] = [];
  max: number[] = [];
  ordinals: number[] = [];
  totalTime = 0;
  lastOrdinal = 0;
  readonly timelineOverview: HeapTimelineOverview = new HeapTimelineOverview();
  profileInternal: CPUProfile.ProfileTreeModel.ProfileTreeModel|null = null;
  searchableViewInternal!: UI.SearchableView.SearchableView;
  viewSelectComboBox: HTMLSelectElement|undefined;
  focusButton: Buttons.Button.Button|undefined;
  excludeButton: Buttons.Button.Button|undefined;
  resetButton: Buttons.Button.Button|undefined;

  #selectedNode: ProfileEntry|null = null;

  readonly linkifierInternal: Components.Linkifier.Linkifier = new Components.Linkifier.Linkifier(maxLinkLength);

  viewType!: Common.Settings.Setting<ViewTypes>;
  bottomUpProfileDataGridTree?: BottomUpProfileDataGridTree|null;
  topDownProfileDataGridTree?: TopDownProfileDataGridTree|null;
  currentSearchResultIndex?: number;
  dataProvider?: ProfileFlameChartDataProvider;
  profileDataGridTree?: ProfileDataGridTree;

  #isNodeSelected = false;
  #view: View;
  #viewOutput: ViewOutput = {};

  #isResetEnabled = false;
  #selectedSize: number|null = null;
  #minId: number|null = null;
  #maxId: number|null = null;
  #range?: {left: number, right: number};
  #lastAppliedRange: {minId: number, maxId: number}|null = null;
  #lastAppliedViewType: ViewTypes|null = null;

  constructor(profileHeader: SamplingHeapProfileHeader, view: View = DEFAULT_VIEW) {
    super({
      title: i18nString(UIStrings.profile),
      viewId: 'profile',
    });
    this.#view = view;

    this.profileHeader = profileHeader;
    this.profileType = profileHeader.profileType();
    this.initialize();
    const profile = new SamplingHeapProfileModel(convertToSamplingHeapProfile(profileHeader));
    this.adjustedTotal = profile.total;
    this.setProfile(profile);

    this.#setupTimelineOverview();
  }

  #setupTimelineOverview(): void {
    if (this.profileType.hasTemporaryView()) {
      this.timelineOverview.addEventListener(Events.IDS_RANGE_CHANGED, this.onIdsRangeChanged.bind(this));
      this.timelineOverview.start();

      this.profileType.addEventListener(SamplingHeapProfileType.Events.STATS_UPDATE, this.onStatsUpdate, this);
      void this.profileType.once(ProfileEvents.PROFILE_COMPLETE).then(() => {
        this.profileType.removeEventListener(SamplingHeapProfileType.Events.STATS_UPDATE, this.onStatsUpdate, this);
        this.timelineOverview.stop();
        this.timelineOverview.updateGrid();
      });
    }
  }

  override async toolbarItems(): Promise<TemplateResult> {
    const currentViewType = this.viewType.get();
    const isFlame = currentViewType === ViewTypes.FLAME;

    // clang-format off
    return html`
      <select title=${i18nString(UIStrings.profileViewMode)} aria-label=${i18nString(UIStrings.profileViewMode)}
              @change=${this.changeView.bind(this)}
              jslog=${VisualLogging.dropDown('profile-view.selected-view').track({change: true})}
              ${ref(e => { this.viewSelectComboBox = e as HTMLSelectElement; })}>
        <option value=${ViewTypes.FLAME} ?selected=${currentViewType === ViewTypes.FLAME}>
          ${i18nString(UIStrings.chart)}
        </option>
        <option value=${ViewTypes.HEAVY} ?selected=${currentViewType === ViewTypes.HEAVY}>
          ${i18nString(UIStrings.heavyBottomUp)}
        </option>
        <option value=${ViewTypes.TREE} ?selected=${currentViewType === ViewTypes.TREE}>
          ${i18nString(UIStrings.treeTopDown)}
        </option>
      </select>
      <devtools-button .data=${{
                         iconName: 'eye',
                         variant: Buttons.Button.Variant.TOOLBAR,
                         title: i18nString(UIStrings.focusSelectedFunction),
                         jslogContext: 'profile-view.focus-selected-function',
                         disabled: !this.#isNodeSelected,
                       } as Buttons.Button.ButtonData}
                       @click=${this.focusClicked.bind(this)}
                       ?hidden=${isFlame}
                       ${ref(e => { this.focusButton = e as Buttons.Button.Button; })}>
      </devtools-button>
      <devtools-button .data=${{
                         iconName: 'cross',
                         variant: Buttons.Button.Variant.TOOLBAR,
                         title: i18nString(UIStrings.excludeSelectedFunction),
                         jslogContext: 'profile-view.exclude-selected-function',
                         disabled: !this.#isNodeSelected,
                       } as Buttons.Button.ButtonData}
                       @click=${this.excludeClicked.bind(this)}
                       ?hidden=${isFlame}
                       ${ref(e => { this.excludeButton = e as Buttons.Button.Button; })}>
      </devtools-button>
      <devtools-button .data=${{
                         iconName: 'refresh',
                         variant: Buttons.Button.Variant.TOOLBAR,
                         title: i18nString(UIStrings.restoreAllFunctions),
                         jslogContext: 'profile-view.restore-all-functions',
                         disabled: !this.#isResetEnabled,
                       } as Buttons.Button.ButtonData}
                       @click=${this.resetClicked.bind(this)}
                       ?hidden=${isFlame}
                       ${ref(e => {this.resetButton = e as Buttons.Button.Button; })}>
        </devtools-button>
      <span ${ref(e => { this.selectedSizeText = e as HTMLElement; })}>
        ${this.#selectedSize !== null ?
          i18nString(UIStrings.selectedSizeS, {PH1: i18n.ByteUtilities.bytesToString(this.#selectedSize)})
          : nothing}
      </span>`;
    // clang-format on
  }

  onIdsRangeChanged(event: Common.EventTarget.EventTargetEvent<IdsRangeChangedEvent>): void {
    const {minId, maxId} = event.data;
    this.#selectedSize = event.data.size;
    this.#minId = minId;
    this.#maxId = maxId;
    this.performUpdate();
  }

  setSelectionRange(minId: number, maxId: number): void {
    const profileData = convertToSamplingHeapProfile((this.profileHeader));
    const profile = new SamplingHeapProfileModel(profileData, minId, maxId);
    this.adjustedTotal = profile.total;
    this.setProfile(profile);
  }

  onStatsUpdate(event: Common.EventTarget.EventTargetEvent<Protocol.HeapProfiler.SamplingHeapProfile|null>): void {
    const profile = event.data;

    if (!this.totalTime) {
      this.timestamps = [];
      this.sizes = [];
      this.max = [];
      this.ordinals = [];
      this.totalTime = 30000;
      this.lastOrdinal = 0;
    }

    this.sizes.fill(0);
    this.sizes.push(0);
    this.timestamps.push(Date.now());
    this.ordinals.push(this.lastOrdinal + 1);
    for (const sample of profile?.samples ?? []) {
      this.lastOrdinal = Math.max(this.lastOrdinal, sample.ordinal);
      const bucket = Platform.ArrayUtilities.upperBound(this.ordinals, sample.ordinal,
                                                        Platform.ArrayUtilities.DEFAULT_COMPARATOR) -
          1;
      this.sizes[bucket] += sample.size;
    }
    this.max.push(this.sizes[this.sizes.length - 1]);

    const lastTimestamp = this.timestamps[this.timestamps.length - 1];
    if (lastTimestamp - this.timestamps[0] > this.totalTime) {
      this.totalTime *= 2;
    }

    this.performUpdate();
  }

  columnHeader(columnId: string): Common.UIString.LocalizedString {
    switch (columnId) {
      case 'self':
        return i18nString(UIStrings.selfSizeBytes);
      case 'total':
        return i18nString(UIStrings.totalSizeBytes);
    }
    return Common.UIString.LocalizedEmptyString;
  }

  createFlameChartDataProvider(): ProfileFlameChartDataProvider {
    return new HeapFlameChartDataProvider((this.profile() as SamplingHeapProfileModel),
                                          this.profileHeader.heapProfilerModel());
  }

  static buildPopoverTable(popoverInfo: Array<{
    title: string,
    value: string,
  }>): TemplateResult {
    return html`<table>
      ${popoverInfo.map(entry => html`
        <tr>
          <td>${entry.title}</td>
          <td>${entry.value}</td>
        </tr>
      `)}
    </table>`;
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

  initialize(): void {
    this.viewType = Common.Settings.Settings.instance().createSetting('profile-view', ViewTypes.HEAVY);

    this.changeView();
  }

  selectRange(timeLeft: number, timeRight: number): void {
    this.#range = {left: timeLeft, right: timeRight};
    this.performUpdate();
  }

  getBottomUpProfileDataGridTree(): ProfileDataGridTree|undefined {
    if (!this.searchableViewInternal) {
      return undefined;
    }
    if (!this.bottomUpProfileDataGridTree) {
      this.bottomUpProfileDataGridTree = new BottomUpProfileDataGridTree(
          nodeFormatter, this.searchableViewInternal,
          (this.profileInternal as CPUProfile.ProfileTreeModel.ProfileTreeModel).root, this.adjustedTotal);
    }
    return this.bottomUpProfileDataGridTree;
  }

  getTopDownProfileDataGridTree(): ProfileDataGridTree|undefined {
    if (!this.searchableViewInternal) {
      return undefined;
    }
    if (!this.topDownProfileDataGridTree) {
      this.topDownProfileDataGridTree = new TopDownProfileDataGridTree(
          nodeFormatter, this.searchableViewInternal,
          (this.profileInternal as CPUProfile.ProfileTreeModel.ProfileTreeModel).root, this.adjustedTotal);
    }
    return this.topDownProfileDataGridTree;
  }

  populateContextMenu(contextMenu: UI.ContextMenu.ContextMenu, node: ProfileEntry): void {
    const heapProfilerModel = this.profileHeader.heapProfilerModel();
    const target = heapProfilerModel ? heapProfilerModel.target() : null;
    const tempLinkifier = new Components.Linkifier.Linkifier();
    const linkElement = tempLinkifier.maybeLinkifyConsoleCallFrame(target, node.profileNode.callFrame);
    if (linkElement) {
      contextMenu.appendApplicableItems(linkElement);
    }
    tempLinkifier.dispose();
  }

  override willHide(): void {
    super.willHide();
    this.currentSearchResultIndex = -1;
  }

  refresh(): void {
    if (!this.profileDataGridTree) {
      return;
    }
    this.performUpdate();
  }

  refreshVisibleData(): void {
    this.performUpdate();
  }

  searchableView(): UI.SearchableView.SearchableView|null {
    return this.searchableViewInternal || null;
  }

  supportsCaseSensitiveSearch(): boolean {
    return true;
  }

  supportsWholeWordSearch(): boolean {
    return false;
  }

  supportsRegexSearch(): boolean {
    return false;
  }

  onSearchCanceled(): void {
    if (this.viewType.get() === ViewTypes.FLAME) {
      this.#viewOutput.onSearchCanceled?.();
    } else if (this.profileDataGridTree) {
      this.profileDataGridTree.onSearchCanceled();
    }
    this.refresh();
  }

  performSearch(searchConfig: UI.SearchableView.SearchConfig, shouldJump: boolean, jumpBackwards?: boolean): void {
    if (this.viewType.get() !== ViewTypes.FLAME && this.profileDataGridTree) {
      // 1. Delegate to model to find ALL matches (including virtualized ones) using complex query logic
      this.profileDataGridTree.performSearch(searchConfig, shouldJump, jumpBackwards);

      // 2. Guarantee Deep Matches: Expand ancestors of matching nodes if deep search is on
      if (this.profileDataGridTree.deepSearch) {
        for (const match of this.profileDataGridTree.searchResults) {
          let parent = match.profileNode.parent;
          while (parent && !(parent instanceof ProfileDataGridTree)) {
            parent.expanded = true;
            parent = parent.parent;
          }
        }
      }
      this.refresh();
    } else if (this.viewType.get() === ViewTypes.FLAME) {
      this.#viewOutput.performSearch?.(searchConfig, shouldJump, jumpBackwards);
      this.refresh();
    }
  }

  jumpToNextSearchResult(): void {
    if (this.viewType.get() !== ViewTypes.FLAME && this.profileDataGridTree) {
      if (!this.profileDataGridTree.searchResults?.length) {
        return;
      }
      this.profileDataGridTree.searchResultIndex =
          (this.profileDataGridTree.searchResultIndex + 1) % this.profileDataGridTree.searchResults.length;
      this.searchableViewInternal.updateCurrentMatchIndex(this.profileDataGridTree.searchResultIndex);
      this.refresh();
    } else if (this.viewType.get() === ViewTypes.FLAME) {
      this.#viewOutput.jumpToNextSearchResult?.();
    }
  }

  jumpToPreviousSearchResult(): void {
    if (this.viewType.get() !== ViewTypes.FLAME && this.profileDataGridTree) {
      if (!this.profileDataGridTree.searchResults?.length) {
        return;
      }
      this.profileDataGridTree.searchResultIndex =
          (this.profileDataGridTree.searchResultIndex - 1 + this.profileDataGridTree.searchResults.length) %
          this.profileDataGridTree.searchResults.length;
      this.searchableViewInternal.updateCurrentMatchIndex(this.profileDataGridTree.searchResultIndex);
      this.refresh();
    } else if (this.viewType.get() === ViewTypes.FLAME) {
      this.#viewOutput.jumpToPreviousSearchResult?.();
    }
  }

  linkifier(): Components.Linkifier.Linkifier {
    return this.linkifierInternal;
  }

  ensureFlameChartCreated(): void {
    if (this.dataProvider || !this.searchableViewInternal) {
      return;
    }
    this.dataProvider = this.createFlameChartDataProvider();
  }

  async onEntryInvoked(entryIndex: number): Promise<void> {
    if (!this.dataProvider) {
      return;
    }
    const node = this.dataProvider.entryNodes[entryIndex];
    const debuggerModel = this.profileHeader.debuggerModel;
    if (!node || !node.scriptId || !debuggerModel) {
      return;
    }
    const script = debuggerModel.scriptForId(node.scriptId);
    if (!script) {
      return;
    }
    const location = (debuggerModel.createRawLocation(script, node.lineNumber, node.columnNumber));
    const uiLocation =
        await Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance().rawLocationToUILocation(location);
    void Common.Revealer.reveal(uiLocation);
  }

  changeView(e?: Event): void {
    if (!this.profileInternal) {
      return;
    }

    if (e) {
      const select = e.target as HTMLSelectElement;
      this.viewType.set(select.value as ViewTypes);
    }
    this.#selectedNode = null;
    this.#isNodeSelected = false;
    this.performUpdate();
  }

  nodeSelected(selected: boolean): void {
    this.#isNodeSelected = selected;
    this.performUpdate();
  }

  focusClicked(): void {
    if (!this.#selectedNode) {
      return;
    }

    this.#isResetEnabled = true;
    this.performUpdate();
    this.resetButton?.focus();
    if (this.profileDataGridTree) {
      this.profileDataGridTree.focus(this.#selectedNode);
    }
    this.refresh();
    this.refreshVisibleData();
    Host.userMetrics.actionTaken(Host.UserMetrics.Action.CpuProfileNodeFocused);
  }

  excludeClicked(): void {
    const selectedNode = this.#selectedNode;

    if (!selectedNode) {
      return;
    }

    this.#isResetEnabled = true;
    this.performUpdate();
    this.resetButton?.focus();

    this.#selectedNode = null;
    this.nodeSelected(false);

    if (this.profileDataGridTree) {
      this.profileDataGridTree.exclude(selectedNode);
    }
    this.refresh();
    this.refreshVisibleData();
    Host.userMetrics.actionTaken(Host.UserMetrics.Action.CpuProfileNodeExcluded);
  }

  resetClicked(): void {
    this.viewSelectComboBox?.focus();
    this.#isResetEnabled = false;
    this.#selectedNode = null;
    this.#isNodeSelected = false;
    this.performUpdate();
    if (this.profileDataGridTree) {
      this.profileDataGridTree.restore();
    }
    this.linkifierInternal.reset();
    this.refresh();
    this.refreshVisibleData();
  }

  override performUpdate(): void {
    const currentViewType = this.viewType ? this.viewType.get() : null;
    if (currentViewType && currentViewType !== this.#lastAppliedViewType) {
      this.searchableViewInternal?.closeSearch();

      switch (currentViewType) {
        case ViewTypes.FLAME:
          this.ensureFlameChartCreated();
          break;
        case ViewTypes.TREE:
          this.profileDataGridTree = this.getTopDownProfileDataGridTree();
          break;
        case ViewTypes.HEAVY:
          this.profileDataGridTree = this.getBottomUpProfileDataGridTree();
          break;
      }

      const initialized = currentViewType === ViewTypes.FLAME ? !!this.dataProvider : !!this.profileDataGridTree;
      if (initialized) {
        this.#lastAppliedViewType = currentViewType;
      }
    }

    const isFlame = currentViewType === ViewTypes.FLAME;

    if (this.focusButton) {
      this.focusButton.hidden = isFlame;
      this.focusButton.disabled = !this.#isNodeSelected;
    }
    if (this.excludeButton) {
      this.excludeButton.hidden = isFlame;
      this.excludeButton.disabled = !this.#isNodeSelected;
    }
    if (this.resetButton) {
      this.resetButton.hidden = isFlame;
      this.resetButton.disabled = !this.#isResetEnabled;
    }

    if (this.#selectedSize !== null && this.selectedSizeText) {
      this.selectedSizeText.textContent =
          i18nString(UIStrings.selectedSizeS, {PH1: i18n.ByteUtilities.bytesToString(this.#selectedSize)});
    }

    if (this.#minId !== null && this.#maxId !== null) {
      const rangeChanged = !this.#lastAppliedRange || this.#lastAppliedRange.minId !== this.#minId ||
          this.#lastAppliedRange.maxId !== this.#maxId;

      if (rangeChanged) {
        this.setSelectionRange(this.#minId, this.#maxId);
        this.#lastAppliedRange = {minId: this.#minId, maxId: this.#maxId};
      }
    }

    if (this.sizes.length > 0) {
      const samples = ({
        sizes: this.sizes,
        max: this.max,
        ids: this.ordinals,
        timestamps: this.timestamps,
        totalTime: this.totalTime,
      } as Samples);

      this.timelineOverview.setSamples(samples);
    }

    const input: ViewInput = {
      timelineOverview: this.timelineOverview,
      searchable: this,
      hasTemporaryView: this.profileType.hasTemporaryView(),
      viewType: currentViewType,
      range: this.#range,
      profileDataGridTree: this.profileDataGridTree,
      selectedNode: this.#selectedNode,
      nodeFormatter,
      columnHeader: this.columnHeader.bind(this),
      searchableView: this.searchableViewInternal,
      dataProvider: this.dataProvider,
      target: this.profileHeader.heapProfilerModel()?.target() ?? null,
      onExpand: (node: ProfileEntry) => {
        node.expanded = true;
        node.populate();
        this.refresh();
      },
      onCollapse: (node: ProfileEntry) => {
        node.expanded = false;
        this.refresh();
      },
      onSelect: (node: ProfileEntry) => {
        this.#selectedNode = node;
        this.nodeSelected(true);
      },
      onDeselect: () => {
        this.#selectedNode = null;
        this.nodeSelected(false);
      },
      onContextMenu: (event: CustomEvent<UI.ContextMenu.ContextMenu>, node: ProfileEntry) => {
        this.populateContextMenu(event.detail, node);
      },
      onSearchableViewMount: (widget: UI.SearchableView.SearchableView) => {
        if (this.searchableViewInternal !== widget) {
          this.searchableViewInternal = widget;
          this.requestUpdate();
        }
      },
      onFlameChartEntryInvoked: (entryIndex: number) => {
        void this.onEntryInvoked(entryIndex);
      },
    };

    this.#view(input, this.#viewOutput, this.contentElement);
  }
}

export class SamplingHeapProfileTypeBase extends
    Common.ObjectWrapper.eventMixin<SamplingHeapProfileType.EventTypes, typeof ProfileType>(ProfileType) {
  recording: boolean;
  clearedDuringRecording: boolean;

  constructor(typeId: string, description: string) {
    super(typeId, description);
    this.recording = false;
    this.clearedDuringRecording = false;
  }

  override profileBeingRecorded(): SamplingHeapProfileHeader|null {
    return super.profileBeingRecorded() as SamplingHeapProfileHeader | null;
  }

  override typeName(): string {
    return 'Heap';
  }

  override fileExtension(): string {
    return '.heapprofile';
  }

  override get buttonTooltip(): Common.UIString.LocalizedString {
    return this.recording ? i18nString(UIStrings.stopHeapProfiling) : i18nString(UIStrings.startHeapProfiling);
  }

  override buttonClicked(): boolean {
    if (this.recording) {
      void this.stopRecordingProfile();
    } else {
      void this.startRecordingProfile();
    }
    return this.recording;
  }

  async startRecordingProfile(): Promise<void> {
    const heapProfilerModel = UI.Context.Context.instance().flavor(SDK.HeapProfilerModel.HeapProfilerModel);
    if (this.profileBeingRecorded() || !heapProfilerModel) {
      return;
    }
    const profileHeader = new SamplingHeapProfileHeader(heapProfilerModel, this);
    this.setProfileBeingRecorded(profileHeader);
    this.addProfile(profileHeader);
    profileHeader.updateStatus(i18nString(UIStrings.recording));

    const warnings = [i18nString(UIStrings.heapProfilerIsRecording)];
    UI.InspectorView.InspectorView.instance().setPanelWarnings('heap-profiler', warnings);

    this.recording = true;
    this.startSampling();
  }

  async stopRecordingProfile(): Promise<void> {
    this.recording = false;
    const recordedProfile = this.profileBeingRecorded();
    if (!recordedProfile?.heapProfilerModel()) {
      return;
    }

    recordedProfile.updateStatus(i18nString(UIStrings.stopping));
    const profile = await this.stopSampling();
    if (recordedProfile) {
      console.assert(profile !== undefined);
      recordedProfile.setProtocolProfile(profile as unknown as Protocol.Profiler.Profile);
      recordedProfile.updateStatus('');
      this.setProfileBeingRecorded(null);
    }
    UI.InspectorView.InspectorView.instance().setPanelWarnings('heap-profiler', []);

    // If the data was cleared during the middle of the recording we no
    // longer treat the profile as being completed. This means we avoid
    // a change of view to the profile list.
    const wasClearedDuringRecording = this.clearedDuringRecording;
    this.clearedDuringRecording = false;
    if (wasClearedDuringRecording) {
      return;
    }
    this.dispatchEventToListeners(ProfileEvents.PROFILE_COMPLETE, recordedProfile);
  }

  override createProfileLoadedFromFile(title: string): ProfileHeader {
    return new SamplingHeapProfileHeader(null, this, title);
  }

  override profileBeingRecordedRemoved(): void {
    this.clearedDuringRecording = true;
    void this.stopRecordingProfile();
  }

  startSampling(): void {
    throw new Error('Not implemented');
  }

  stopSampling(): Promise<Protocol.HeapProfiler.SamplingHeapProfile> {
    throw new Error('Not implemented');
  }
}

let samplingHeapProfileTypeInstance: SamplingHeapProfileType;

export class SamplingHeapProfileType extends SamplingHeapProfileTypeBase {
  updateTimer: number;
  updateIntervalMs: number;
  readonly #recordTimelineSetting: Common.Settings.Setting<boolean>;
  customContentInternal: UI.UIUtils.CheckboxLabel|null = null;

  constructor() {
    super(SamplingHeapProfileType.TypeId, i18nString(UIStrings.allocationSampling));
    if (!samplingHeapProfileTypeInstance) {
      samplingHeapProfileTypeInstance = this;
    }

    this.updateTimer = 0;
    this.updateIntervalMs = 200;
    this.#recordTimelineSetting =
        Common.Settings.Settings.instance().createSetting('record-sampling-heap-profiler-timeline', false);
  }

  static get instance(): SamplingHeapProfileType {
    return samplingHeapProfileTypeInstance;
  }

  override get treeItemTitle(): Common.UIString.LocalizedString {
    return i18nString(UIStrings.samplingProfiles);
  }

  override get description(): string {
    // TODO(l10n): Do not concatenate localized strings.
    const formattedDescription = [i18nString(UIStrings.recordMemoryAllocations)];
    return formattedDescription.join('\n');
  }

  override hasTemporaryView(): boolean {
    return this.#recordTimelineSetting.get();
  }

  override customContent(): Element|null {
    const checkboxSetting = SettingsUI.SettingsUI.createSettingCheckbox(
        i18nString(UIStrings.samplingHeapProfilerTimeline), this.#recordTimelineSetting);
    this.customContentInternal = checkboxSetting;
    checkboxSetting.setAttribute(
        'jslog', `${VisualLogging.toggle('record-sampling-heap-profiler-timeline').track({click: true})}`);
    return checkboxSetting;
  }

  override setCustomContentEnabled(enable: boolean): void {
    if (this.customContentInternal) {
      this.customContentInternal.disabled = !enable;
    }
  }

  override startSampling(): void {
    const heapProfilerModel = this.obtainRecordingProfile();
    if (!heapProfilerModel) {
      return;
    }

    void heapProfilerModel.startSampling();
    if (this.#recordTimelineSetting.get()) {
      this.updateTimer = window.setTimeout(() => {
        void this.updateStats();
      }, this.updateIntervalMs);
    }
  }

  obtainRecordingProfile(): SDK.HeapProfilerModel.HeapProfilerModel|null {
    const recordingProfile = this.profileBeingRecorded();
    if (recordingProfile) {
      const heapProfilerModel = recordingProfile.heapProfilerModel();
      return heapProfilerModel;
    }
    return null;
  }

  override async stopSampling(): Promise<Protocol.HeapProfiler.SamplingHeapProfile> {
    window.clearTimeout(this.updateTimer);
    this.updateTimer = 0;
    this.dispatchEventToListeners(SamplingHeapProfileType.Events.RECORDING_STOPPED);
    const heapProfilerModel = this.obtainRecordingProfile();
    if (!heapProfilerModel) {
      throw new Error('No heap profiler model');
    }

    const samplingProfile = await heapProfilerModel.stopSampling();
    if (!samplingProfile) {
      throw new Error('No sampling profile found');
    }
    return samplingProfile;
  }

  async updateStats(): Promise<void> {
    const heapProfilerModel = this.obtainRecordingProfile();
    if (!heapProfilerModel) {
      return;
    }

    const profile = await heapProfilerModel.getSamplingProfile();
    if (!this.updateTimer) {
      return;
    }
    this.dispatchEventToListeners(SamplingHeapProfileType.Events.STATS_UPDATE, profile);
    this.updateTimer = window.setTimeout(() => {
      void this.updateStats();
    }, this.updateIntervalMs);
  }

  // eslint-disable-next-line @typescript-eslint/naming-convention
  static readonly TypeId = 'SamplingHeap';
}

export namespace SamplingHeapProfileType {
  export const enum Events {
    RECORDING_STOPPED = 'RecordingStopped',
    STATS_UPDATE = 'StatsUpdate',
  }

  export interface EventTypes {
    [Events.RECORDING_STOPPED]: void;
    [Events.STATS_UPDATE]: Protocol.HeapProfiler.SamplingHeapProfile|null;
  }
}

export class SamplingHeapProfileHeader extends WritableProfileHeader {
  readonly heapProfilerModelInternal: SDK.HeapProfilerModel.HeapProfilerModel|null;
  override protocolProfileInternal: {
    head: {
      callFrame: {
        functionName: string,
        scriptId: Protocol.Runtime.ScriptId,
        url: string,
        lineNumber: number,
        columnNumber: number,
      },
      children: never[],
      selfSize: number,
      id: number,
    },
    samples: never[],
    startTime: number,
    endTime: number,
    nodes: never[],
  };
  constructor(
      heapProfilerModel: SDK.HeapProfilerModel.HeapProfilerModel|null,
      type: SamplingHeapProfileTypeBase,
      title?: string,
  ) {
    super(
        heapProfilerModel?.debuggerModel() ?? null,
        type,
        title || i18nString(UIStrings.profileD, {PH1: type.nextProfileUid()}),
    );
    this.heapProfilerModelInternal = heapProfilerModel;
    this.protocolProfileInternal = {
      head: {
        callFrame: {
          functionName: '',
          scriptId: '' as Protocol.Runtime.ScriptId,
          url: '',
          lineNumber: 0,
          columnNumber: 0,
        },
        children: [],
        selfSize: 0,
        id: 0,
      },
      samples: [],
      startTime: 0,
      endTime: 0,
      nodes: [],
    };
  }

  protocolProfile(): Protocol.HeapProfiler.SamplingHeapProfile {
    return this.protocolProfileInternal;
  }

  heapProfilerModel(): SDK.HeapProfilerModel.HeapProfilerModel|null {
    return this.heapProfilerModelInternal;
  }

  override profileType(): SamplingHeapProfileTypeBase {
    return super.profileType() as SamplingHeapProfileTypeBase;
  }
}

export class SamplingHeapProfileNode extends CPUProfile.ProfileTreeModel.ProfileNode {
  override self: number;
  constructor(node: Protocol.HeapProfiler.SamplingHeapProfileNode) {
    const callFrame = node.callFrame || ({
                        // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration)
                        // @ts-expect-error
                        functionName: node['functionName'],
                        // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration)
                        // @ts-expect-error
                        scriptId: node['scriptId'],
                        // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration)
                        // @ts-expect-error
                        url: node['url'],
                        // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration)
                        // @ts-expect-error
                        lineNumber: node['lineNumber'] - 1,
                        // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration)
                        // @ts-expect-error
                        columnNumber: node['columnNumber'] - 1,
                      } as Protocol.Runtime.CallFrame);
    super(callFrame);
    this.self = node.selfSize;
  }
}

export class SamplingHeapProfileModel extends CPUProfile.ProfileTreeModel.ProfileTreeModel {
  // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  modules: any;

  constructor(profile: Protocol.HeapProfiler.SamplingHeapProfile, minOrdinal?: number, maxOrdinal?: number) {
    super();
    // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.modules = (profile as any).modules || [];

    let nodeIdToSizeMap: Map<number, number>|null = null;
    if (minOrdinal || maxOrdinal) {
      nodeIdToSizeMap = new Map<number, number>();
      minOrdinal = minOrdinal || 0;
      maxOrdinal = maxOrdinal || Infinity;
      for (const sample of profile.samples) {
        if (sample.ordinal < minOrdinal || sample.ordinal > maxOrdinal) {
          continue;
        }
        const size = nodeIdToSizeMap.get(sample.nodeId) || 0;
        nodeIdToSizeMap.set(sample.nodeId, size + sample.size);
      }
    }

    this.initialize(translateProfileTree(profile.head));

    function translateProfileTree(root: Protocol.HeapProfiler.SamplingHeapProfileNode): SamplingHeapProfileNode {
      const resultRoot = new SamplingHeapProfileNode(root);
      const sourceNodeStack = [root];
      const targetNodeStack = [resultRoot];
      while (sourceNodeStack.length) {
        const sourceNode = (sourceNodeStack.pop() as Protocol.HeapProfiler.SamplingHeapProfileNode);
        const targetNode = (targetNodeStack.pop() as SamplingHeapProfileNode);
        targetNode.children = sourceNode.children.map(child => {
          const targetChild = new SamplingHeapProfileNode(child);
          if (nodeIdToSizeMap) {
            targetChild.self = nodeIdToSizeMap.get(child.id) || 0;
          }
          return targetChild;
        });
        sourceNodeStack.push(...sourceNode.children);
        targetNodeStack.push(...targetNode.children);
      }
      pruneEmptyBranches(resultRoot);
      return resultRoot;
    }

    function pruneEmptyBranches(node: CPUProfile.ProfileTreeModel.ProfileNode): boolean {
      node.children = node.children.filter(pruneEmptyBranches);
      return Boolean(node.children.length || node.self);
    }
  }
}

export class NodeFormatter implements Formatter {
  readonly #formattedValueCache = new Map<number, string>();
  readonly #formattedValueAccessibleTextCache = new Map<number, string>();
  readonly #formattedPercentCache = new Map<number, string>();

  formatValue(value: number): string {
    let result = this.#formattedValueCache.get(value);
    if (!result) {
      result = i18n.ByteUtilities.bytesToString(value);
      this.#formattedValueCache.set(value, result);
    }
    return result;
  }

  formatValueAccessibleText(value: number): string {
    let result = this.#formattedValueAccessibleTextCache.get(value);
    if (!result) {
      result = i18nString(UIStrings.sBytes, {PH1: value});
      this.#formattedValueAccessibleTextCache.set(value, result);
    }
    return result;
  }

  formatPercent(value: number, _node: ProfileEntry): string {
    let result = this.#formattedPercentCache.get(value);
    if (!result) {
      result = i18nString(UIStrings.formatPercent, {PH1: value.toFixed(2)});
      this.#formattedPercentCache.set(value, result);
    }
    return result;
  }
}

export const nodeFormatter = new NodeFormatter();

export class HeapFlameChartDataProvider extends ProfileFlameChartDataProvider {
  readonly profile: CPUProfile.ProfileTreeModel.ProfileTreeModel;
  readonly heapProfilerModel: SDK.HeapProfilerModel.HeapProfilerModel|null;

  constructor(profile: CPUProfile.ProfileTreeModel.ProfileTreeModel,
              heapProfilerModel: SDK.HeapProfilerModel.HeapProfilerModel|null) {
    super();
    this.profile = profile;
    this.heapProfilerModel = heapProfilerModel;
  }

  override minimumBoundary(): number {
    return 0;
  }

  override totalTime(): number {
    return this.profile.root.total;
  }

  override entryHasDeoptReason(_entryIndex: number): boolean {
    return false;
  }

  override formatValue(value: number, _precision?: number): string {
    return i18nString(UIStrings.skb, {PH1: Platform.NumberUtilities.withThousandsSeparator(value / 1e3)});
  }

  override calculateTimelineData(): PerfUI.FlameChart.FlameChartTimelineData {
    function nodesCount(node: CPUProfile.ProfileTreeModel.ProfileNode): number {
      return node.children.reduce((count, node) => count + nodesCount(node), 1);
    }
    const count = nodesCount(this.profile.root);
    const entryNodes: CPUProfile.ProfileTreeModel.ProfileNode[] = new Array(count);
    const entryLevels = new Uint16Array(count);
    const entryTotalTimes = new Float32Array(count);
    const entryStartTimes = new Float64Array(count);
    let depth = 0;
    let maxDepth = 0;
    let position = 0;
    let index = 0;

    function addNode(node: CPUProfile.ProfileTreeModel.ProfileNode): void {
      const start = position;
      entryNodes[index] = node;
      entryLevels[index] = depth;
      entryTotalTimes[index] = node.total;
      entryStartTimes[index] = position;
      ++index;
      ++depth;
      node.children.forEach(addNode);
      --depth;
      maxDepth = Math.max(maxDepth, depth);
      position = start + node.total;
    }
    addNode(this.profile.root);

    this.maxStackDepthInternal = maxDepth + 1;
    this.entryNodes = entryNodes;
    this.timelineDataInternal =
        PerfUI.FlameChart.FlameChartTimelineData.create({entryLevels, entryTotalTimes, entryStartTimes, groups: null});

    return this.timelineDataInternal;
  }

  override preparePopoverElement(entryIndex: number): TemplateResult|null {
    const node = this.entryNodes[entryIndex];
    if (!node) {
      return null;
    }
    const popoverInfo: Array<{
      title: string,
      value: string,
    }> = [];
    function pushRow(title: string, value: string): void {
      popoverInfo.push({title, value});
    }
    pushRow(i18nString(UIStrings.name), UI.UIUtils.beautifyFunctionName(node.functionName));
    pushRow(i18nString(UIStrings.selfSize), i18n.ByteUtilities.bytesToString(node.self));
    pushRow(i18nString(UIStrings.totalSize), i18n.ByteUtilities.bytesToString(node.total));
    const linkifier = new Components.Linkifier.Linkifier();
    const link = linkifier.maybeLinkifyConsoleCallFrame(this.heapProfilerModel ? this.heapProfilerModel.target() : null,
                                                        node.callFrame);
    if (link) {
      pushRow(i18nString(UIStrings.url), link.textContent);
    }
    linkifier.dispose();
    return HeapProfileView.buildPopoverTable(popoverInfo);
  }
}

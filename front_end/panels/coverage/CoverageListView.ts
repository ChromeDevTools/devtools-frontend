// Copyright (c) 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import type * as Platform from '../../core/platform/platform.js';
import * as TextUtils from '../../models/text_utils/text_utils.js';
import * as Workspace from '../../models/workspace/workspace.js';
import * as DataGrid from '../../ui/legacy/components/data_grid/data_grid.js';
import * as UI from '../../ui/legacy/legacy.js';

import coverageListViewStyles from './coverageListView.css.js';
import {
  CoverageType,
  SourceURLCoverageInfo,
  type URLCoverageInfo,
} from './CoverageModel.js';

const UIStrings = {
  /**
   *@description Text that appears on a button for the css resource type filter.
   */
  css: 'CSS',
  /**
   *@description Text in Coverage List View of the Coverage tab
   */
  jsPerFunction: 'JS (per function)',
  /**
   *@description Text in Coverage List View of the Coverage tab
   */
  jsPerBlock: 'JS (per block)',
  /**
   *@description Text for web URLs
   */
  url: 'URL',
  /**
   *@description Text that refers to some types
   */
  type: 'Type',
  /**
   *@description Text in Coverage List View of the Coverage tab
   */
  totalBytes: 'Total Bytes',
  /**
   *@description Text in Coverage List View of the Coverage tab
   */
  unusedBytes: 'Unused Bytes',
  /**
   *@description Text in the Coverage List View of the Coverage Tab
   */
  usageVisualization: 'Usage Visualization',
  /**
   *@description Data grid name for Coverage data grids
   */
  codeCoverage: 'Code Coverage',
  /**
   *@description Cell title in Coverage List View of the Coverage tab. The coverage tool tells
   *developers which functions (logical groups of lines of code) were actually run/executed. If a
   *function does get run, then it is marked in the UI to indicate that it was covered.
   */
  jsCoverageWithPerFunction:
      'JS coverage with per function granularity: Once a function was executed, the whole function is marked as covered.',
  /**
   *@description Cell title in Coverage List View of the Coverage tab. The coverage tool tells
   *developers which blocks (logical groups of lines of code, smaller than a function) were actually
   *run/executed. If a block does get run, then it is marked in the UI to indicate that it was
   *covered.
   */
  jsCoverageWithPerBlock:
      'JS coverage with per block granularity: Once a block of JavaScript was executed, that block is marked as covered.',
  /**
   *@description Accessible text for the value in bytes in memory allocation or coverage view.
   */
  sBytes: '{n, plural, =1 {# byte} other {# bytes}}',
  /**
   *@description Accessible text for the unused bytes column in the coverage tool that describes the total unused bytes and percentage of the file unused.
   *@example {88%} percentage
   */
  sBytesS: '{n, plural, =1 {# byte, {percentage}} other {# bytes, {percentage}}}',
  /**
   *@description Tooltip text for the bar in the coverage list view of the coverage tool that illustrates the relation between used and unused bytes.
   *@example {1000} PH1
   *@example {12.34} PH2
   */
  sBytesSBelongToFunctionsThatHave: '{PH1} bytes ({PH2}) belong to functions that have not (yet) been executed.',
  /**
   *@description Tooltip text for the bar in the coverage list view of the coverage tool that illustrates the relation between used and unused bytes.
   *@example {1000} PH1
   *@example {12.34} PH2
   */
  sBytesSBelongToBlocksOf: '{PH1} bytes ({PH2}) belong to blocks of JavaScript that have not (yet) been executed.',
  /**
   *@description Message in Coverage View of the Coverage tab
   *@example {1000} PH1
   *@example {12.34} PH2
   */
  sBytesSBelongToFunctionsThatHaveExecuted: '{PH1} bytes ({PH2}) belong to functions that have executed at least once.',
  /**
   *@description Message in Coverage View of the Coverage tab
   *@example {1000} PH1
   *@example {12.34} PH2
   */
  sBytesSBelongToBlocksOfJavascript:
      '{PH1} bytes ({PH2}) belong to blocks of JavaScript that have executed at least once.',
  /**
   *@description Accessible text for the visualization column of coverage tool. Contains percentage of unused bytes to used bytes.
   *@example {12.3} PH1
   *@example {12.3} PH2
   */
  sOfFileUnusedSOfFileUsed: '{PH1} % of file unused, {PH2} % of file used',
};
const str_ = i18n.i18n.registerUIStrings('panels/coverage/CoverageListView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export function coverageTypeToString(type: CoverageType): string {
  const types = [];
  if (type & CoverageType.CSS) {
    types.push(i18nString(UIStrings.css));
  }
  if (type & CoverageType.JAVA_SCRIPT_PER_FUNCTION) {
    types.push(i18nString(UIStrings.jsPerFunction));
  } else if (type & CoverageType.JAVA_SCRIPT) {
    types.push(i18nString(UIStrings.jsPerBlock));
  }
  return types.join('+');
}

export class CoverageListView extends UI.Widget.VBox {
  private readonly nodeForCoverageInfo: Map<URLCoverageInfo, GridNode>;
  private readonly isVisibleFilter: (arg0: URLCoverageInfo) => boolean;
  private highlightRegExp: RegExp|null;
  private dataGrid: DataGrid.SortableDataGrid.SortableDataGrid<GridNode>;

  constructor(isVisibleFilter: (arg0: URLCoverageInfo) => boolean) {
    super(true);
    this.nodeForCoverageInfo = new Map();
    this.isVisibleFilter = isVisibleFilter;
    this.highlightRegExp = null;

    const columns = [
      {
        id: 'url',
        title: i18nString(UIStrings.url),
        width: '250px',
        weight: 3,
        fixedWidth: false,
        sortable: true,
        disclosure: true,
      },
      {id: 'type', title: i18nString(UIStrings.type), width: '45px', weight: 1, fixedWidth: true, sortable: true},
      {
        id: 'size',
        title: i18nString(UIStrings.totalBytes),
        width: '60px',
        fixedWidth: true,
        sortable: true,
        align: DataGrid.DataGrid.Align.RIGHT,
        weight: 1,
      },
      {
        id: 'unused-size',
        title: i18nString(UIStrings.unusedBytes),
        width: '100px',
        fixedWidth: true,
        sortable: true,
        align: DataGrid.DataGrid.Align.RIGHT,
        sort: DataGrid.DataGrid.Order.Descending,
        weight: 1,
      },
      {
        id: 'bars',
        title: i18nString(UIStrings.usageVisualization),
        width: '250px',
        fixedWidth: false,
        sortable: true,
        weight: 1,
      },
    ] as DataGrid.DataGrid.ColumnDescriptor[];
    this.dataGrid = new DataGrid.SortableDataGrid.SortableDataGrid<GridNode>({
      displayName: i18nString(UIStrings.codeCoverage),
      columns,
      editCallback: undefined,
      refreshCallback: undefined,
      deleteCallback: undefined,
    });
    this.dataGrid.setResizeMethod(DataGrid.DataGrid.ResizeMethod.LAST);
    this.dataGrid.setStriped(true);
    this.dataGrid.element.classList.add('flex-auto');
    this.dataGrid.addEventListener(DataGrid.DataGrid.Events.OPENED_NODE, this.onOpenedNode, this);
    this.dataGrid.addEventListener(DataGrid.DataGrid.Events.SORTING_CHANGED, this.sortingChanged, this);

    const dataGridWidget = this.dataGrid.asWidget();
    dataGridWidget.show(this.contentElement);
    this.setDefaultFocusedChild(dataGridWidget);
  }

  update(coverageInfo: URLCoverageInfo[]): void {
    let hadUpdates = false;
    const maxSize = coverageInfo.reduce((acc, entry) => Math.max(acc, entry.size()), 0);
    const rootNode = this.dataGrid.rootNode();
    for (const entry of coverageInfo) {
      let node = this.nodeForCoverageInfo.get(entry);
      if (node) {
        if (this.isVisibleFilter(node.coverageInfo)) {
          hadUpdates = node.refreshIfNeeded(maxSize) || hadUpdates;
          if (entry.sourcesURLCoverageInfo.size > 0) {
            this.updateSourceNodes(entry.sourcesURLCoverageInfo, maxSize, node);
          }
        }
        continue;
      }
      node = new GridNode(entry, maxSize);
      this.nodeForCoverageInfo.set(entry, node);
      if (this.isVisibleFilter(node.coverageInfo)) {
        rootNode.appendChild(node);
        if (entry.sourcesURLCoverageInfo.size > 0) {
          void this.createSourceNodes(entry.sourcesURLCoverageInfo, maxSize, node);
        }
        hadUpdates = true;
      }
    }
    if (hadUpdates) {
      this.sortingChanged();
    }
  }

  updateSourceNodes(
      sourcesURLCoverageInfo: Map<Platform.DevToolsPath.UrlString, SourceURLCoverageInfo>, maxSize: number,
      node: GridNode): void {
    let shouldCreateSourceNodes = false;
    for (const coverageInfo of sourcesURLCoverageInfo.values()) {
      const sourceNode = this.nodeForCoverageInfo.get(coverageInfo);
      if (sourceNode) {
        sourceNode.refreshIfNeeded(maxSize);
      } else {
        shouldCreateSourceNodes = true;
        break;
      }
    }
    if (shouldCreateSourceNodes) {
      void this.createSourceNodes(sourcesURLCoverageInfo, maxSize, node);
    }
  }

  async createSourceNodes(
      sourcesURLCoverageInfo: Map<Platform.DevToolsPath.UrlString, SourceURLCoverageInfo>, maxSize: number,
      node: GridNode): Promise<void> {
    for (const coverageInfo of sourcesURLCoverageInfo.values()) {
      const sourceNode = new GridNode(coverageInfo, maxSize);
      node.appendChild(sourceNode);
      this.nodeForCoverageInfo.set(coverageInfo, sourceNode);
    }
  }

  reset(): void {
    this.nodeForCoverageInfo.clear();
    this.dataGrid.rootNode().removeChildren();
  }

  updateFilterAndHighlight(highlightRegExp: RegExp|null): void {
    this.highlightRegExp = highlightRegExp;
    let hadTreeUpdates = false;
    for (const node of this.nodeForCoverageInfo.values()) {
      const shouldBeVisible = this.isVisibleFilter(node.coverageInfo);
      const isVisible = Boolean(node.parent);
      if (shouldBeVisible) {
        node.setHighlight(this.highlightRegExp);
      }
      if (shouldBeVisible === isVisible) {
        continue;
      }
      hadTreeUpdates = true;
      if (!shouldBeVisible) {
        node.remove();
      } else {
        this.appendNodeByType(node);
      }
    }
    if (hadTreeUpdates) {
      this.sortingChanged();
    }
  }

  private appendNodeByType(node: GridNode): void {
    if (node.coverageInfo instanceof SourceURLCoverageInfo) {
      const parentNode = this.nodeForCoverageInfo.get(node.coverageInfo.generatedURLCoverageInfo);
      parentNode?.appendChild(node);
    } else {
      this.dataGrid.rootNode().appendChild(node);
    }
  }

  selectByUrl(url: string): void {
    for (const [info, node] of this.nodeForCoverageInfo.entries()) {
      if (info.url() === url) {
        node.revealAndSelect();
        break;
      }
    }
  }

  private onOpenedNode(): void {
    void this.revealSourceForSelectedNode();
  }

  private async revealSourceForSelectedNode(): Promise<void> {
    const node = this.dataGrid.selectedNode;
    if (!node) {
      return;
    }
    const coverageInfo = (node as GridNode).coverageInfo;
    const sourceCode = Workspace.Workspace.WorkspaceImpl.instance().uiSourceCodeForURL(coverageInfo.url());
    if (!sourceCode) {
      return;
    }

    if (this.dataGrid.selectedNode !== node) {
      return;
    }
    void Common.Revealer.reveal(sourceCode);
  }

  private sortingChanged(): void {
    const columnId = this.dataGrid.sortColumnId();
    if (!columnId) {
      return;
    }
    const sortFunction = GridNode.sortFunctionForColumn(columnId) as (
                             (arg0: DataGrid.SortableDataGrid.SortableDataGridNode<GridNode>,
                              arg1: DataGrid.SortableDataGrid.SortableDataGridNode<GridNode>) => number) |
        null;
    if (!sortFunction) {
      return;
    }
    this.dataGrid.sortNodes(sortFunction, !this.dataGrid.isSortOrderAscending());
  }
  override wasShown(): void {
    super.wasShown();
    this.registerCSSFiles([coverageListViewStyles]);
  }
}

let percentageFormatter: Intl.NumberFormat|null = null;

function getPercentageFormatter(): Intl.NumberFormat {
  if (!percentageFormatter) {
    percentageFormatter = new Intl.NumberFormat(i18n.DevToolsLocale.DevToolsLocale.instance().locale, {
      style: 'percent',
      maximumFractionDigits: 1,
    });
  }
  return percentageFormatter;
}

let bytesFormatter: Intl.NumberFormat|null = null;

function getBytesFormatter(): Intl.NumberFormat {
  if (!bytesFormatter) {
    bytesFormatter = new Intl.NumberFormat(i18n.DevToolsLocale.DevToolsLocale.instance().locale);
  }
  return bytesFormatter;
}

export class GridNode extends DataGrid.SortableDataGrid.SortableDataGridNode<GridNode> {
  coverageInfo: URLCoverageInfo;
  private lastUsedSize!: number|undefined;
  private url: Platform.DevToolsPath.UrlString;
  private maxSize: number;
  private highlightRegExp: RegExp|null;

  constructor(coverageInfo: URLCoverageInfo, maxSize: number) {
    super();
    this.coverageInfo = coverageInfo;
    this.url = coverageInfo.url();
    this.maxSize = maxSize;
    this.highlightRegExp = null;
  }

  setHighlight(highlightRegExp: RegExp|null): void {
    if (this.highlightRegExp === highlightRegExp) {
      return;
    }
    this.highlightRegExp = highlightRegExp;
    this.refresh();
  }

  refreshIfNeeded(maxSize: number): boolean {
    if (this.lastUsedSize === this.coverageInfo.usedSize() && maxSize === this.maxSize) {
      return false;
    }
    this.lastUsedSize = this.coverageInfo.usedSize();
    this.maxSize = maxSize;
    this.refresh();
    return true;
  }

  override createCell(columnId: string): HTMLElement {
    const cell = this.createTD(columnId);
    switch (columnId) {
      case 'url': {
        UI.Tooltip.Tooltip.install(cell, this.url);
        const outer = cell.createChild('div', 'url-outer');
        const prefix = outer.createChild('div', 'url-prefix');
        const suffix = outer.createChild('div', 'url-suffix');
        const splitURL = /^(.*)(\/[^/]*)$/.exec(this.url);
        prefix.textContent = splitURL ? splitURL[1] : this.url;
        suffix.textContent = splitURL ? splitURL[2] : '';
        if (this.highlightRegExp) {
          this.highlight(outer, this.url);
        }
        this.setCellAccessibleName(this.url, cell, columnId);
        break;
      }
      case 'type': {
        cell.textContent = coverageTypeToString(this.coverageInfo.type());
        if (this.coverageInfo.type() & CoverageType.JAVA_SCRIPT_PER_FUNCTION) {
          UI.Tooltip.Tooltip.install(cell, i18nString(UIStrings.jsCoverageWithPerFunction));
        } else if (this.coverageInfo.type() & CoverageType.JAVA_SCRIPT) {
          UI.Tooltip.Tooltip.install(cell, i18nString(UIStrings.jsCoverageWithPerBlock));
        }
        break;
      }
      case 'size': {
        const size = this.coverageInfo.size() || 0;
        const sizeSpan = cell.createChild('span');
        const sizeFormatted = getBytesFormatter().format(size);
        sizeSpan.textContent = sizeFormatted;
        const sizeAccessibleName = i18nString(UIStrings.sBytes, {n: size});
        this.setCellAccessibleName(sizeAccessibleName, cell, columnId);
        break;
      }
      case 'unused-size': {
        const unusedSize = this.coverageInfo.unusedSize() || 0;
        const unusedSizeSpan = cell.createChild('span');
        const unusedPercentsSpan = cell.createChild('span', 'percent-value');
        const unusedSizeFormatted = getBytesFormatter().format(unusedSize);
        unusedSizeSpan.textContent = unusedSizeFormatted;
        const unusedPercentFormatted = getPercentageFormatter().format(this.coverageInfo.unusedPercentage());
        unusedPercentsSpan.textContent = unusedPercentFormatted;
        const unusedAccessibleName = i18nString(UIStrings.sBytesS, {n: unusedSize, percentage: unusedPercentFormatted});
        this.setCellAccessibleName(unusedAccessibleName, cell, columnId);
        break;
      }
      case 'bars': {
        const barContainer = cell.createChild('div', 'bar-container');
        const unusedPercent = getPercentageFormatter().format(this.coverageInfo.unusedPercentage());
        const usedPercent = getPercentageFormatter().format(this.coverageInfo.usedPercentage());
        if (this.coverageInfo.unusedSize() > 0) {
          const unusedSizeBar = barContainer.createChild('div', 'bar bar-unused-size');
          unusedSizeBar.style.width = ((this.coverageInfo.unusedSize() / this.maxSize) * 100 || 0) + '%';
          if (this.coverageInfo.type() & CoverageType.JAVA_SCRIPT_PER_FUNCTION) {
            UI.Tooltip.Tooltip.install(
                unusedSizeBar,
                i18nString(
                    UIStrings.sBytesSBelongToFunctionsThatHave,
                    {PH1: this.coverageInfo.unusedSize(), PH2: unusedPercent}));
          } else if (this.coverageInfo.type() & CoverageType.JAVA_SCRIPT) {
            UI.Tooltip.Tooltip.install(
                unusedSizeBar,
                i18nString(
                    UIStrings.sBytesSBelongToBlocksOf, {PH1: this.coverageInfo.unusedSize(), PH2: unusedPercent}));
          }
        }
        if (this.coverageInfo.usedSize() > 0) {
          const usedSizeBar = barContainer.createChild('div', 'bar bar-used-size');
          usedSizeBar.style.width = ((this.coverageInfo.usedSize() / this.maxSize) * 100 || 0) + '%';
          if (this.coverageInfo.type() & CoverageType.JAVA_SCRIPT_PER_FUNCTION) {
            UI.Tooltip.Tooltip.install(
                usedSizeBar,
                i18nString(
                    UIStrings.sBytesSBelongToFunctionsThatHaveExecuted,
                    {PH1: this.coverageInfo.usedSize(), PH2: usedPercent}));
          } else if (this.coverageInfo.type() & CoverageType.JAVA_SCRIPT) {
            UI.Tooltip.Tooltip.install(
                usedSizeBar,
                i18nString(
                    UIStrings.sBytesSBelongToBlocksOfJavascript,
                    {PH1: this.coverageInfo.usedSize(), PH2: usedPercent}));
          }
        }
        this.setCellAccessibleName(
            i18nString(UIStrings.sOfFileUnusedSOfFileUsed, {PH1: unusedPercent, PH2: usedPercent}), cell, columnId);
      }
    }
    return cell;
  }

  private highlight(element: Element, textContent: string): void {
    if (!this.highlightRegExp) {
      return;
    }
    const matches = this.highlightRegExp.exec(textContent);
    if (!matches || !matches.length) {
      return;
    }
    const range = new TextUtils.TextRange.SourceRange(matches.index, matches[0].length);
    UI.UIUtils.highlightRangesWithStyleClass(element, [range], 'filter-highlight');
  }

  static sortFunctionForColumn(columnId: string): ((arg0: GridNode, arg1: GridNode) => number)|null {
    const compareURL = (a: GridNode, b: GridNode): number => a.url.localeCompare(b.url);
    switch (columnId) {
      case 'url':
        return compareURL;
      case 'type':
        return (a: GridNode, b: GridNode) => {
          const typeA = coverageTypeToString(a.coverageInfo.type());
          const typeB = coverageTypeToString(b.coverageInfo.type());
          return typeA.localeCompare(typeB) || compareURL(a, b);
        };
      case 'size':
        return (a: GridNode, b: GridNode) => a.coverageInfo.size() - b.coverageInfo.size() || compareURL(a, b);
      case 'bars':
      case 'unused-size':
        return (a: GridNode, b: GridNode) =>
                   a.coverageInfo.unusedSize() - b.coverageInfo.unusedSize() || compareURL(a, b);
      default:
        console.assert(false, 'Unknown sort field: ' + columnId);
        return null;
    }
  }
}

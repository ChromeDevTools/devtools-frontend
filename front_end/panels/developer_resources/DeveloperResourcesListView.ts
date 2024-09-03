// Copyright (c) 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as TextUtils from '../../models/text_utils/text_utils.js';
import * as DataGrid from '../../ui/legacy/components/data_grid/data_grid.js';
import * as UI from '../../ui/legacy/legacy.js';

import developerResourcesListViewStyles from './developerResourcesListView.css.js';

const UIStrings = {
  /**
   *@description Text for the status of something
   */
  status: 'Status',
  /**
   *@description Text for web URLs
   */
  url: 'URL',
  /**
   *@description Text for the initiator of something
   */
  initiator: 'Initiator',
  /**
   *@description Text in Coverage List View of the Coverage tab
   */
  totalBytes: 'Total Bytes',
  /**
   *@description Text for errors
   */
  error: 'Error',
  /**
   *@description Title for the Developer resources tab
   */
  developerResources: 'Developer resources',
  /**
   *@description Text for a context menu entry
   */
  copyUrl: 'Copy URL',
  /**
   * @description Text for a context menu entry. Command to copy a URL to the clipboard. The initiator
   * of a request is the entity that caused this request to be sent.
   */
  copyInitiatorUrl: 'Copy initiator URL',
  /**
   *@description Text for the status column of a list view
   */
  pending: 'pending',
  /**
   *@description Text for the status column of a list view
   */
  success: 'success',
  /**
   *@description Text for the status column of a list view
   */
  failure: 'failure',
  /**
   *@description Accessible text for the value in bytes in memory allocation.
   */
  sBytes: '{n, plural, =1 {# byte} other {# bytes}}',
};
const str_ = i18n.i18n.registerUIStrings('panels/developer_resources/DeveloperResourcesListView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class DeveloperResourcesListView extends UI.Widget.VBox {
  private readonly nodeForItem: Map<SDK.PageResourceLoader.PageResource, GridNode>;
  private readonly isVisibleFilter: (arg0: SDK.PageResourceLoader.PageResource) => boolean;
  private highlightRegExp: RegExp|null;
  private dataGrid: DataGrid.SortableDataGrid.SortableDataGrid<GridNode>;
  constructor(isVisibleFilter: (arg0: SDK.PageResourceLoader.PageResource) => boolean) {
    super(true);
    this.nodeForItem = new Map();
    this.isVisibleFilter = isVisibleFilter;
    this.highlightRegExp = null;

    const columns = [
      {id: 'status', title: i18nString(UIStrings.status), width: '60px', fixedWidth: true, sortable: true},
      {id: 'url', title: i18nString(UIStrings.url), width: '250px', fixedWidth: false, sortable: true},
      {id: 'initiator', title: i18nString(UIStrings.initiator), width: '80px', fixedWidth: false, sortable: true},
      {
        id: 'size',
        title: i18nString(UIStrings.totalBytes),
        width: '80px',
        fixedWidth: true,
        sortable: true,
        align: DataGrid.DataGrid.Align.RIGHT,
      },
      {
        id: 'error-message',
        title: i18nString(UIStrings.error),
        width: '200px',
        fixedWidth: false,
        sortable: true,
      },
    ] as DataGrid.DataGrid.ColumnDescriptor[];
    this.dataGrid = new DataGrid.SortableDataGrid.SortableDataGrid({
      displayName: i18nString(UIStrings.developerResources),
      columns,
      editCallback: undefined,
      refreshCallback: undefined,
      deleteCallback: undefined,
    });
    this.dataGrid.setResizeMethod(DataGrid.DataGrid.ResizeMethod.LAST);
    this.dataGrid.setStriped(true);
    this.dataGrid.element.classList.add('flex-auto');
    this.dataGrid.addEventListener(DataGrid.DataGrid.Events.SORTING_CHANGED, this.sortingChanged, this);
    this.dataGrid.setRowContextMenuCallback(this.populateContextMenu.bind(this));

    const dataGridWidget = this.dataGrid.asWidget();
    dataGridWidget.show(this.contentElement);
    this.setDefaultFocusedChild(dataGridWidget);
  }

  select(item: SDK.PageResourceLoader.PageResource): void {
    const node = this.nodeForItem.get(item);
    if (node) {
      node.select();
    }
  }

  selectedItem(): SDK.PageResourceLoader.PageResource|null {
    if (!this.dataGrid.selectedNode) {
      return null;
    }
    return (this.dataGrid.selectedNode as GridNode).item;
  }

  private populateContextMenu(
      contextMenu: UI.ContextMenu.ContextMenu,
      gridNode: DataGrid.DataGrid.DataGridNode<
          DataGrid.ViewportDataGrid.ViewportDataGridNode<DataGrid.SortableDataGrid.SortableDataGridNode<GridNode>>>):
      void {
    const item = (gridNode as GridNode).item;
    contextMenu.clipboardSection().appendItem(i18nString(UIStrings.copyUrl), () => {
      Host.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(item.url);
    }, {jslogContext: 'copy-url'});
    if (item.initiator.initiatorUrl) {
      contextMenu.clipboardSection().appendItem(i18nString(UIStrings.copyInitiatorUrl), () => {
        Host.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(item.initiator.initiatorUrl);
      }, {jslogContext: 'copy-initiator-url'});
    }
  }

  update(items: Iterable<SDK.PageResourceLoader.PageResource>): void {
    let hadUpdates = false;
    const rootNode = this.dataGrid.rootNode();
    for (const item of items) {
      let node = this.nodeForItem.get(item);
      if (node) {
        if (this.isVisibleFilter(node.item)) {
          hadUpdates = node.refreshIfNeeded() || hadUpdates;
        }
        continue;
      }
      node = new GridNode(item);
      this.nodeForItem.set(item, node);
      if (this.isVisibleFilter(node.item)) {
        rootNode.appendChild(node);
        hadUpdates = true;
      }
    }
    if (hadUpdates) {
      this.sortingChanged();
    }
  }

  reset(): void {
    this.nodeForItem.clear();
    this.dataGrid.rootNode().removeChildren();
  }

  updateFilterAndHighlight(highlightRegExp: RegExp|null): void {
    this.highlightRegExp = highlightRegExp;
    let hadTreeUpdates = false;
    for (const node of this.nodeForItem.values()) {
      const shouldBeVisible = this.isVisibleFilter(node.item);
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
        this.dataGrid.rootNode().appendChild(node);
      }
    }
    if (hadTreeUpdates) {
      this.sortingChanged();
    }
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
    if (sortFunction) {
      this.dataGrid.sortNodes(sortFunction, !this.dataGrid.isSortOrderAscending());
    }
  }
  override wasShown(): void {
    super.wasShown();
    this.registerCSSFiles([developerResourcesListViewStyles]);
  }
}

class GridNode extends DataGrid.SortableDataGrid.SortableDataGridNode<GridNode> {
  item: SDK.PageResourceLoader.PageResource;
  private highlightRegExp: RegExp|null;
  constructor(item: SDK.PageResourceLoader.PageResource) {
    super();
    this.item = item;
    this.highlightRegExp = null;
  }

  setHighlight(highlightRegExp: RegExp|null): void {
    if (this.highlightRegExp === highlightRegExp) {
      return;
    }
    this.highlightRegExp = highlightRegExp;
    this.refresh();
  }

  refreshIfNeeded(): boolean {
    this.refresh();
    return true;
  }

  override createCell(columnId: string): HTMLElement {
    const cell = this.createTD(columnId) as HTMLElement;
    switch (columnId) {
      case 'url': {
        UI.Tooltip.Tooltip.install(cell, this.item.url);
        const outer = cell.createChild('div', 'url-outer');
        const prefix = outer.createChild('div', 'url-prefix');
        const suffix = outer.createChild('div', 'url-suffix');
        const splitURL = /^(.*)(\/[^/]*)$/.exec(this.item.url);
        prefix.textContent = splitURL ? splitURL[1] : this.item.url;
        suffix.textContent = splitURL ? splitURL[2] : '';
        if (this.highlightRegExp) {
          this.highlight(outer, this.item.url);
        }
        this.setCellAccessibleName(this.item.url, cell, columnId);
        break;
      }
      case 'initiator': {
        const url = this.item.initiator.initiatorUrl || '';
        cell.textContent = url;
        UI.Tooltip.Tooltip.install(cell, url);
        this.setCellAccessibleName(url, cell, columnId);
        cell.onmouseenter = () => {
          const frameId = this.item.initiator.frameId;
          const frame = frameId ? SDK.FrameManager.FrameManager.instance().getFrame(frameId) : null;
          if (frame) {
            void frame.highlight();
          }
        };
        cell.onmouseleave = () => SDK.OverlayModel.OverlayModel.hideDOMNodeHighlight();
        break;
      }
      case 'status': {
        if (this.item.success === null) {
          cell.textContent = i18nString(UIStrings.pending);
        } else {
          cell.textContent = this.item.success ? i18nString(UIStrings.success) : i18nString(UIStrings.failure);
        }
        break;
      }
      case 'size': {
        const size = this.item.size;
        if (size !== null) {
          const sizeSpan = cell.createChild('span');
          sizeSpan.textContent = Platform.NumberUtilities.withThousandsSeparator(size);
          const sizeAccessibleName = i18nString(UIStrings.sBytes, {n: size});
          this.setCellAccessibleName(sizeAccessibleName, cell, columnId);
        }
        break;
      }
      case 'error-message': {
        cell.classList.add('error-message');
        if (this.item.errorMessage) {
          cell.textContent = this.item.errorMessage;
          if (this.highlightRegExp) {
            this.highlight(cell, this.item.errorMessage);
          }
        }
        break;
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
    const nullToNegative = (x: boolean|number|null): number => x === null ? -1 : Number(x);
    switch (columnId) {
      case 'url':
        return (a: GridNode, b: GridNode) => a.item.url.localeCompare(b.item.url);
      case 'status':
        return (a: GridNode, b: GridNode) => {
          return nullToNegative(a.item.success) - nullToNegative(b.item.success);
        };
      case 'size':
        return (a: GridNode, b: GridNode) => nullToNegative(a.item.size) - nullToNegative(b.item.size);
      case 'initiator':
        return (a: GridNode, b: GridNode) =>
                   (a.item.initiator.initiatorUrl || '').localeCompare(b.item.initiator.initiatorUrl || '');
      case 'error-message':
        return (a: GridNode, b: GridNode) => (a.item.errorMessage || '').localeCompare(b.item.errorMessage || '');
      default:
        console.assert(false, 'Unknown sort field: ' + columnId);
        return null;
    }
  }
}

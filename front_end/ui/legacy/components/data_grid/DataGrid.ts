/*
 * Copyright (C) 2008 Apple Inc. All Rights Reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 * 1. Redistributions of source code must retain the above copyright
 *        notice, this list of conditions and the following disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright
 *        notice, this list of conditions and the following disclaimer in the
 *        documentation and/or other materials provided with the distribution.
 *
 * THIS SOFTWARE IS PROVIDED BY APPLE INC. ``AS IS'' AND ANY
 * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
 * PURPOSE ARE DISCLAIMED.         IN NO EVENT SHALL APPLE INC. OR
 * CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
 * EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
 * PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 * PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY
 * OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

/* eslint-disable rulesdir/no_underscored_properties */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable rulesdir/check_license_header */

import * as Common from '../../../../core/common/common.js';
import * as i18n from '../../../../core/i18n/i18n.js';
import * as Platform from '../../../../core/platform/platform.js';
import * as UI from '../../legacy.js';

const UIStrings = {
  /**
  *@description Accessible text label for expandible nodes in datagrids
  */
  expanded: 'expanded',
  /**
  *@description accessible name for expandible nodes in datagrids
  */
  collapsed: 'collapsed',
  /**
  *@description Accessible text for datagrid
  *@example {Coverage grid} PH1
  *@example {expanded} PH2
  */
  sRowS: '{PH1} Row {PH2}',
  /**
  *@description Number of rows in a grid
  *@example {1} PH1
  */
  rowsS: 'Rows: {PH1}',
  /**
  * @description Default Accessible Text for a Datagrid. This text is read to the user by a
  * screenreader when they navigate to a table structure. The placeholders tell the user something
  * brief about the table contents i.e. the topic and how much data is in it.
  * @example {Network} PH1
  * @example {Rows: 27} PH2
  */
  sSUseTheUpAndDownArrowKeysTo:
      '{PH1} {PH2}, use the up and down arrow keys to navigate and interact with the rows of the table; Use browse mode to read cell by cell.',
  /**
  *@description A context menu item in the Data Grid of a data grid
  */
  sortByString: 'Sort By',
  /**
  *@description A context menu item in data grids to reset the columns to their default weight
  */
  resetColumns: 'Reset Columns',
  /**
  *@description A context menu item in data grids to list header options.
  */
  headerOptions: 'Header Options',
  /**
  *@description Text to refresh the page
  */
  refresh: 'Refresh',
  /**
  *@description A context menu item in the Data Grid of a data grid
  */
  addNew: 'Add new',
  /**
  *@description A context menu item in the Data Grid of a data grid
  *@example {pattern} PH1
  */
  editS: 'Edit "{PH1}"',
  /**
  *@description Text to delete something
  */
  delete: 'Delete',
  /**
  *@description Depth of a node in the datagrid
  *@example {1} PH1
  */
  levelS: 'level {PH1}',
  /**
  *@description Text exposed to screen readers on checked items.
  */
  checked: 'checked',
};
const str_ = i18n.i18n.registerUIStrings('ui/legacy/components/data_grid/DataGrid.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

const elementToLongTextMap = new WeakMap<Element, string>();

const nodeToColumnIdMap = new WeakMap<Node, string>();

const elementToSortIconMap = new WeakMap<Element, UI.Icon.Icon>();

const elementToPreferedWidthMap = new WeakMap<Element, number>();

const elementToPositionMap = new WeakMap<Element, number>();

const elementToIndexMap = new WeakMap<Element, number>();

export class DataGridImpl<T> extends Common.ObjectWrapper.ObjectWrapper {
  element: HTMLDivElement;
  _displayName: string;
  _editCallback: ((arg0: any, arg1: string, arg2: any, arg3: any) => any)|undefined;
  _deleteCallback: ((arg0: any) => any)|undefined;
  _refreshCallback: (() => any)|undefined;
  _headerTable: Element;
  _headerTableHeaders: {
    [x: string]: Element,
  };
  _scrollContainer: Element;
  _dataTable: Element;
  _inline: boolean;
  _columnsArray: ColumnDescriptor[];
  _columns: {
    [x: string]: ColumnDescriptor,
  };
  visibleColumnsArray: ColumnDescriptor[];
  _cellClass: string|null;
  _headerTableColumnGroup: Element;
  _headerTableBody: HTMLTableSectionElement;
  _headerRow: Element;
  _dataTableColumnGroup: Element;
  dataTableBody: Element;
  _topFillerRow: HTMLElement;
  _bottomFillerRow: HTMLElement;
  _editing: boolean;
  selectedNode: DataGridNode<T>|null;
  expandNodesWhenArrowing: boolean;
  indentWidth: number;
  _resizers: HTMLElement[];
  _columnWidthsInitialized: boolean;
  _cornerWidth: number;
  _resizeMethod: ResizeMethod;
  _headerContextMenuCallback: ((arg0: UI.ContextMenu.SubMenu) => void)|null;
  _rowContextMenuCallback: ((arg0: UI.ContextMenu.ContextMenu, arg1: DataGridNode<T>) => void)|null;
  elementToDataGridNode: WeakMap<Node, DataGridNode<T>>;
  disclosureColumnId?: string;
  _sortColumnCell?: Element;
  _rootNode?: DataGridNode<T>;
  _editingNode?: DataGridNode<T>|null;
  _columnWeightsSetting?: Common.Settings.Setting<any>;
  creationNode?: CreationDataGridNode<any>;
  _currentResizer?: EventTarget|null;
  _dataGridWidget?: any;

  constructor(dataGridParameters: Parameters) {
    super();
    const {displayName, columns: columnsArray, editCallback, deleteCallback, refreshCallback} = dataGridParameters;
    this.element = document.createElement('div');
    this.element.classList.add('data-grid');
    UI.Utils.appendStyle(this.element, 'ui/legacy/components/data_grid/dataGrid.css', {enableLegacyPatching: false});
    this.element.tabIndex = 0;
    this.element.addEventListener('keydown', this._keyDown.bind(this), false);
    this.element.addEventListener('contextmenu', this._contextMenu.bind(this), true);
    this.element.addEventListener('focusin', event => {
      this.updateGridAccessibleNameOnFocus();
      event.consume(true);
    });
    this.element.addEventListener('focusout', event => {
      this.updateGridAccessibleName(/* text */ '');
      event.consume(true);
    });

    UI.ARIAUtils.markAsApplication(this.element);
    this._displayName = displayName;

    this._editCallback = editCallback;
    this._deleteCallback = deleteCallback;
    this._refreshCallback = refreshCallback;

    const headerContainer = this.element.createChild('div', 'header-container');
    this._headerTable = headerContainer.createChild('table', 'header');
    // Hide the header table from screen readers since titles are also added to data table.
    UI.ARIAUtils.markAsHidden(this._headerTable);
    this._headerTableHeaders = {};
    this._scrollContainer = this.element.createChild('div', 'data-container');
    this._dataTable = this._scrollContainer.createChild('table', 'data');

    // FIXME: Add a createCallback which is different from editCallback and has different
    // behavior when creating a new node.
    if (editCallback) {
      this._dataTable.addEventListener('dblclick', this._ondblclick.bind(this), false);
    }
    this._dataTable.addEventListener('mousedown', this._mouseDownInDataTable.bind(this));
    this._dataTable.addEventListener('click', this._clickInDataTable.bind(this), true);

    this._inline = false;

    this._columnsArray = [];
    this._columns = {};
    this.visibleColumnsArray = columnsArray;

    columnsArray.forEach(column => this._innerAddColumn(column));

    this._cellClass = null;

    this._headerTableColumnGroup = this._headerTable.createChild('colgroup');
    this._headerTableBody = (this._headerTable.createChild('tbody') as HTMLTableSectionElement);
    this._headerRow = this._headerTableBody.createChild('tr');

    this._dataTableColumnGroup = this._dataTable.createChild('colgroup');
    this.dataTableBody = this._dataTable.createChild('tbody');
    this._topFillerRow = (this.dataTableBody.createChild('tr', 'data-grid-filler-row revealed') as HTMLElement);
    this._bottomFillerRow = (this.dataTableBody.createChild('tr', 'data-grid-filler-row revealed') as HTMLElement);

    this.setVerticalPadding(0, 0);
    this._refreshHeader();

    this._editing = false;
    this.selectedNode = null;
    this.expandNodesWhenArrowing = false;
    this.setRootNode((new DataGridNode() as DataGridNode<T>));

    this.setHasSelection(false);

    this.indentWidth = 15;
    this._resizers = [];
    this._columnWidthsInitialized = false;
    this._cornerWidth = CornerWidth;
    this._resizeMethod = ResizeMethod.Nearest;

    this._headerContextMenuCallback = null;
    this._rowContextMenuCallback = null;

    this.elementToDataGridNode = new WeakMap();
  }

  _firstSelectableNode(): DataGridNode<T>|null|undefined {
    let firstSelectableNode: (DataGridNode<T>|undefined) = this._rootNode;
    while (firstSelectableNode && !firstSelectableNode.selectable) {
      firstSelectableNode = firstSelectableNode.traverseNextNode(true) || undefined;
    }
    return firstSelectableNode;
  }

  _lastSelectableNode(): DataGridNode<T>|undefined {
    let lastSelectableNode: DataGridNode<T>|(DataGridNode<T>| undefined) = this._rootNode;
    let iterator: (DataGridNode<T>|undefined) = this._rootNode;
    while (iterator) {
      if (iterator.selectable) {
        lastSelectableNode = iterator;
      }
      iterator = iterator.traverseNextNode(true) || undefined;
    }
    return lastSelectableNode;
  }

  setElementContent(element: Element, value: any): void {
    const columnId = this.columnIdFromNode(element);
    if (!columnId) {
      return;
    }
    const column = this._columns[columnId];
    if (column.dataType === DataType.Boolean) {
      DataGridImpl.setElementBoolean(element, (Boolean(value) as boolean));
    } else if (value !== null) {
      DataGridImpl.setElementText(element, (value as string), Boolean(column.longText));
    }
  }

  static setElementText(element: Element, newText: string, longText: boolean): void {
    if (longText && newText.length > 1000) {
      element.textContent = Platform.StringUtilities.trimEndWithMaxLength(newText, 1000);
      UI.Tooltip.Tooltip.install(element, newText);
      elementToLongTextMap.set(element, newText);
    } else {
      element.textContent = newText;
      UI.Tooltip.Tooltip.install(element, '');
      elementToLongTextMap.delete(element);
    }
  }

  static setElementBoolean(element: Element, value: boolean): void {
    element.textContent = value ? '\u2713' : '';
    UI.Tooltip.Tooltip.install(element, '');
  }

  setStriped(isStriped: boolean): void {
    this.element.classList.toggle('striped-data-grid', isStriped);
  }

  setFocusable(focusable: boolean): void {
    this.element.tabIndex = focusable ? 0 : -1;
    if (focusable === false) {
      UI.ARIAUtils.removeRole(this.element);
    }
  }

  setHasSelection(hasSelected: boolean): void {
    // 'no-selection' class causes datagrid to have a focus-indicator border
    this.element.classList.toggle('no-selection', !hasSelected);
  }

  updateGridAccessibleName(text?: string): void {
    // Update the label with the provided text or the current selected node
    const accessibleText =
        (this.selectedNode && this.selectedNode.existingElement()) ? this.selectedNode.nodeAccessibleText : '';
    if (this.element === this.element.ownerDocument.deepActiveElement()) {
      // Only alert if the datagrid has focus
      UI.ARIAUtils.alert(text ? text : accessibleText);
    }
  }

  updateGridAccessibleNameOnFocus(): void {
    // When a grid gets focus
    // 1) If an item is selected - Read the content of the row
    let accessibleText;
    if (this.selectedNode && this.selectedNode.existingElement()) {
      // TODO(l10n): Don't concatenate strings.
      let expandText = '';
      if (this.selectedNode.hasChildren()) {
        expandText = this.selectedNode.expanded ? i18nString(UIStrings.expanded) : i18nString(UIStrings.collapsed);
      }
      const rowHeader = i18nString(UIStrings.sRowS, {PH1: this._displayName, PH2: expandText});
      accessibleText = `${rowHeader} ${this.selectedNode.nodeAccessibleText}`;
    } else {
      // 2) If there is no selected item - Read the name of the grid and give instructions
      if (!this._rootNode) {
        return;
      }
      const children = this._enumerateChildren(this._rootNode, [], 1);
      const items = i18nString(UIStrings.rowsS, {PH1: children.length});
      accessibleText = i18nString(UIStrings.sSUseTheUpAndDownArrowKeysTo, {PH1: this._displayName, PH2: items});
    }
    UI.ARIAUtils.alert(accessibleText);
  }

  headerTableBody(): Element {
    return this._headerTableBody;
  }

  _innerAddColumn(column: ColumnDescriptor, position?: number): void {
    column.defaultWeight = column.weight;

    const columnId = column.id;
    if (columnId in this._columns) {
      this._innerRemoveColumn(columnId);
    }

    if (position === undefined) {
      position = this._columnsArray.length;
    }

    this._columnsArray.splice(position, 0, column);
    this._columns[columnId] = column;
    if (column.disclosure) {
      this.disclosureColumnId = columnId;
    }

    const cell = document.createElement('th');
    cell.className = columnId + '-column';
    nodeToColumnIdMap.set(cell, columnId);
    this._headerTableHeaders[columnId] = cell;

    const div = document.createElement('div');
    if (column.titleDOMFragment) {
      div.appendChild(column.titleDOMFragment);
    } else {
      div.textContent = column.title || null;
    }
    cell.appendChild(div);

    if (column.sort) {
      cell.classList.add(column.sort);
      this._sortColumnCell = cell;
    }

    if (column.sortable) {
      cell.addEventListener('click', this._clickInHeaderCell.bind(this), false);
      cell.classList.add('sortable');
      const icon = UI.Icon.Icon.create('', 'sort-order-icon');
      cell.createChild('div', 'sort-order-icon-container').appendChild(icon);
      elementToSortIconMap.set(cell, icon);
    }
  }

  addColumn(column: ColumnDescriptor, position?: number): void {
    this._innerAddColumn(column, position);
  }

  _innerRemoveColumn(columnId: string): void {
    const column = this._columns[columnId];
    if (!column) {
      return;
    }
    delete this._columns[columnId];
    const index = this._columnsArray.findIndex(columnConfig => columnConfig.id === columnId);
    this._columnsArray.splice(index, 1);
    const cell = this._headerTableHeaders[columnId];
    if (cell.parentElement) {
      cell.parentElement.removeChild(cell);
    }
    delete this._headerTableHeaders[columnId];
  }

  removeColumn(columnId: string): void {
    this._innerRemoveColumn(columnId);
  }

  setCellClass(cellClass: string): void {
    this._cellClass = cellClass;
  }

  _refreshHeader(): void {
    this._headerTableColumnGroup.removeChildren();
    this._dataTableColumnGroup.removeChildren();
    this._headerRow.removeChildren();
    this._topFillerRow.removeChildren();
    this._bottomFillerRow.removeChildren();

    for (let i = 0; i < this.visibleColumnsArray.length; ++i) {
      const column = this.visibleColumnsArray[i];
      const columnId = column.id;
      const headerColumn = (this._headerTableColumnGroup.createChild('col') as HTMLElement);
      const dataColumn = (this._dataTableColumnGroup.createChild('col') as HTMLElement);
      if (column.width) {
        headerColumn.style.width = column.width;
        dataColumn.style.width = column.width;
      }
      this._headerRow.appendChild(this._headerTableHeaders[columnId]);
      const topFillerRowCell = (this._topFillerRow.createChild('th', 'top-filler-td') as HTMLTableCellElement);
      topFillerRowCell.textContent = column.title || null;
      topFillerRowCell.scope = 'col';
      const bottomFillerRowChild = this._bottomFillerRow.createChild('td', 'bottom-filler-td');
      nodeToColumnIdMap.set(bottomFillerRowChild, columnId);
    }

    this._headerRow.createChild('th', 'corner');
    const topFillerRowCornerCell = (this._topFillerRow.createChild('th', 'corner') as HTMLTableCellElement);
    topFillerRowCornerCell.classList.add('top-filler-td');
    topFillerRowCornerCell.scope = 'col';
    this._bottomFillerRow.createChild('td', 'corner').classList.add('bottom-filler-td');
    this._headerTableColumnGroup.createChild('col', 'corner');
    this._dataTableColumnGroup.createChild('col', 'corner');
  }

  protected setVerticalPadding(top: number, bottom: number): void {
    const topPx = top + 'px';
    const bottomPx = (top || bottom) ? bottom + 'px' : 'auto';
    if (this._topFillerRow.style.height === topPx && this._bottomFillerRow.style.height === bottomPx) {
      return;
    }
    this._topFillerRow.style.height = topPx;
    this._bottomFillerRow.style.height = bottomPx;
    this.dispatchEventToListeners(Events.PaddingChanged);
  }

  protected setRootNode(rootNode: DataGridNode<T>): void {
    if (this._rootNode) {
      this._rootNode.removeChildren();
      this._rootNode.dataGrid = null;
      this._rootNode._isRoot = false;
    }
    this._rootNode = rootNode;
    rootNode._isRoot = true;
    rootNode.setHasChildren(false);
    rootNode._expanded = true;
    rootNode._revealed = true;
    rootNode.selectable = false;
    rootNode.dataGrid = this;
  }

  rootNode(): DataGridNode<T> {
    let rootNode: DataGridNode<T>|(DataGridNode<T>| undefined) = this._rootNode;
    if (!rootNode) {
      rootNode = new DataGridNode();
      this.setRootNode(rootNode);
    }
    return rootNode;
  }

  _ondblclick(event: Event): void {
    if (this._editing || this._editingNode) {
      return;
    }

    const columnId = this.columnIdFromNode((event.target as Node));
    if (!columnId || !this._columns[columnId].editable) {
      return;
    }
    this._startEditing((event.target as Node));
  }

  _startEditingColumnOfDataGridNode(node: DataGridNode<T>, cellIndex: number): void {
    this._editing = true;
    this._editingNode = node;
    this._editingNode.select();

    const editingNodeElement = this._editingNode._element;
    if (!editingNodeElement) {
      return;
    }
    const element = editingNodeElement.children[cellIndex];
    const elementLongText = elementToLongTextMap.get(element);
    if (elementLongText) {
      element.textContent = elementLongText;
    }
    const column = this.visibleColumnsArray[cellIndex];
    if (column.dataType === DataType.Boolean) {
      const checkboxLabel = UI.UIUtils.CheckboxLabel.create(undefined, (node.data[column.id] as boolean));
      UI.ARIAUtils.setAccessibleName(checkboxLabel, column.title || '');

      let hasChanged = false;
      checkboxLabel.style.height = '100%';
      const checkboxElement = checkboxLabel.checkboxElement;
      checkboxElement.classList.add('inside-datagrid');
      const initialValue = checkboxElement.checked;

      checkboxElement.addEventListener('change', () => {
        hasChanged = true;
        this._editingCommitted(element, checkboxElement.checked, initialValue, undefined, 'forward');
      }, false);

      checkboxElement.addEventListener('keydown', event => {
        if (event.key === 'Tab') {
          event.consume(true);
          hasChanged = true;
          return this._editingCommitted(
              element, checkboxElement.checked, initialValue, undefined, event.shiftKey ? 'backward' : 'forward');
        }
        if (event.key === ' ') {
          event.consume(true);
          checkboxElement.checked = !checkboxElement.checked;
        } else if (event.key === 'Enter') {
          event.consume(true);
          hasChanged = true;
          this._editingCommitted(element, checkboxElement.checked, initialValue, undefined, 'forward');
        }
      }, false);

      checkboxElement.addEventListener('blur', () => {
        if (hasChanged) {
          return;
        }
        this._editingCommitted(element, checkboxElement.checked, checkboxElement.checked, undefined, 'next');
      }, false);

      element.innerHTML = '';
      element.appendChild(checkboxLabel);
      checkboxElement.focus();
    } else {
      UI.InplaceEditor.InplaceEditor.startEditing(element, this._startEditingConfig(element));
      const componentSelection = element.getComponentSelection();
      if (componentSelection) {
        componentSelection.selectAllChildren(element);
      }
    }
  }

  startEditingNextEditableColumnOfDataGridNode(node: DataGridNode<T>, columnIdentifier: string): void {
    const column = this._columns[columnIdentifier];
    const cellIndex = this.visibleColumnsArray.indexOf(column);
    const nextEditableColumn = this._nextEditableColumn(cellIndex);
    if (nextEditableColumn !== -1) {
      this._startEditingColumnOfDataGridNode(node, nextEditableColumn);
    }
  }

  _startEditing(target: Node): void {
    const element = (UI.UIUtils.enclosingNodeOrSelfWithNodeName(target, 'td') as Element | null);
    if (!element) {
      return;
    }

    this._editingNode = this.dataGridNodeFromNode(target);
    if (!this._editingNode) {
      if (!this.creationNode) {
        return;
      }
      this._editingNode = this.creationNode;
    }

    // Force editing the 1st column when editing the creation node
    if (this._editingNode instanceof CreationDataGridNode && this._editingNode.isCreationNode) {
      this._startEditingColumnOfDataGridNode(this._editingNode, this._nextEditableColumn(-1));
      return;
    }

    const columnId = this.columnIdFromNode(target);
    if (!columnId) {
      return;
    }
    const column = this._columns[columnId];
    const cellIndex = this.visibleColumnsArray.indexOf(column);
    if (this._editingNode) {
      this._startEditingColumnOfDataGridNode(this._editingNode, cellIndex);
    }
  }

  renderInline(): void {
    this.element.classList.add('inline');
    this._cornerWidth = 0;
    this._inline = true;
    this.updateWidths();
  }

  _startEditingConfig(_element: Element): UI.InplaceEditor.Config<any> {
    return new UI.InplaceEditor.Config(this._editingCommitted.bind(this), this._editingCancelled.bind(this));
  }

  _editingCommitted(element: Element, newText: any, oldText: any, context: string|undefined, moveDirection: string):
      void {
    const columnId = this.columnIdFromNode(element);
    if (!columnId) {
      this._editingCancelled(element);
      return;
    }
    const column = this._columns[columnId];
    const cellIndex = this.visibleColumnsArray.indexOf(column);
    if (!this._editingNode) {
      return;
    }
    const valueBeforeEditing =
        (this._editingNode.data[columnId] === null ? '' : this._editingNode.data[columnId] as string | boolean);
    const currentEditingNode = this._editingNode;

    function moveToNextIfNeeded(this: DataGridImpl<T>, wasChange: boolean): void {
      if (!moveDirection) {
        return;
      }

      if (moveDirection === 'forward') {
        const firstEditableColumn = this._nextEditableColumn(-1);
        const isCreationNode = currentEditingNode instanceof CreationDataGridNode && currentEditingNode.isCreationNode;
        if (isCreationNode && cellIndex === firstEditableColumn && !wasChange) {
          return;
        }

        const nextEditableColumn = this._nextEditableColumn(cellIndex);
        if (nextEditableColumn !== -1) {
          this._startEditingColumnOfDataGridNode(currentEditingNode, nextEditableColumn);
          return;
        }

        const nextDataGridNode = currentEditingNode.traverseNextNode(true, null, true);
        if (nextDataGridNode) {
          this._startEditingColumnOfDataGridNode(nextDataGridNode, firstEditableColumn);
          return;
        }
        if (isCreationNode && wasChange && this.creationNode) {
          this.addCreationNode(false);
          this._startEditingColumnOfDataGridNode(this.creationNode, firstEditableColumn);
          return;
        }
        return;
      }

      if (moveDirection === 'backward') {
        const prevEditableColumn = this._nextEditableColumn(cellIndex, true);
        if (prevEditableColumn !== -1) {
          this._startEditingColumnOfDataGridNode(currentEditingNode, prevEditableColumn);
          return;
        }

        const lastEditableColumn = this._nextEditableColumn(this.visibleColumnsArray.length, true);
        const nextDataGridNode = currentEditingNode.traversePreviousNode(true, true);
        if (nextDataGridNode) {
          this._startEditingColumnOfDataGridNode(nextDataGridNode, lastEditableColumn);
        }
        return;
      }
    }

    // Show trimmed text after editing.
    this.setElementContent(element, newText);

    if (valueBeforeEditing === newText) {
      this._editingCancelled(element);
      moveToNextIfNeeded.call(this, false);
      return;
    }

    // Update the text in the datagrid that we typed
    this._editingNode.data[columnId] = newText;
    if (!this._editCallback) {
      return;
    }
    // Make the callback - expects an editing node (table row), the column number that is being edited,
    // the text that used to be there, and the new text.
    this._editCallback(this._editingNode, columnId, valueBeforeEditing, newText);

    if (this._editingNode instanceof CreationDataGridNode && this._editingNode.isCreationNode) {
      this.addCreationNode(false);
    }

    this._editingCancelled(element);
    moveToNextIfNeeded.call(this, true);
  }

  _editingCancelled(_element: Element): void {
    this._editing = false;
    this._editingNode = null;
  }

  _nextEditableColumn(cellIndex: number, moveBackward?: boolean): number {
    const increment = moveBackward ? -1 : 1;
    const columns = this.visibleColumnsArray;
    for (let i = cellIndex + increment; (i >= 0) && (i < columns.length); i += increment) {
      if (columns[i].editable) {
        return i;
      }
    }
    return -1;
  }

  sortColumnId(): string|null {
    if (!this._sortColumnCell) {
      return null;
    }
    return nodeToColumnIdMap.get(this._sortColumnCell) || null;
  }

  sortOrder(): string|null {
    if (!this._sortColumnCell || this._sortColumnCell.classList.contains(Order.Ascending)) {
      return Order.Ascending;
    }
    if (this._sortColumnCell.classList.contains(Order.Descending)) {
      return Order.Descending;
    }
    return null;
  }

  isSortOrderAscending(): boolean {
    return !this._sortColumnCell || this._sortColumnCell.classList.contains(Order.Ascending);
  }

  _autoSizeWidths(widths: number[], minPercent: number, maxPercent?: number): number[] {
    if (minPercent) {
      minPercent = Math.min(minPercent, Math.floor(100 / widths.length));
    }
    let totalWidth = 0;
    for (let i = 0; i < widths.length; ++i) {
      totalWidth += widths[i];
    }
    let totalPercentWidth = 0;
    for (let i = 0; i < widths.length; ++i) {
      let width = Math.round(100 * widths[i] / totalWidth);
      if (minPercent && width < minPercent) {
        width = minPercent;
      } else if (maxPercent && width > maxPercent) {
        width = maxPercent;
      }
      totalPercentWidth += width;
      widths[i] = width;
    }
    let recoupPercent = totalPercentWidth - 100;

    while (minPercent && recoupPercent > 0) {
      for (let i = 0; i < widths.length; ++i) {
        if (widths[i] > minPercent) {
          --widths[i];
          --recoupPercent;
          if (!recoupPercent) {
            break;
          }
        }
      }
    }

    while (maxPercent && recoupPercent < 0) {
      for (let i = 0; i < widths.length; ++i) {
        if (widths[i] < maxPercent) {
          ++widths[i];
          ++recoupPercent;
          if (!recoupPercent) {
            break;
          }
        }
      }
    }

    return widths;
  }

  /**
   * The range of |minPercent| and |maxPercent| is [0, 100].
   */
  autoSizeColumns(minPercent: number, maxPercent?: number, maxDescentLevel?: number): void {
    let widths: number[] = [];
    for (let i = 0; i < this._columnsArray.length; ++i) {
      widths.push((this._columnsArray[i].title || '').length);
    }

    maxDescentLevel = maxDescentLevel || 0;
    if (!this._rootNode) {
      return;
    }
    const children = this._enumerateChildren(this._rootNode, [], maxDescentLevel + 1);
    for (let i = 0; i < children.length; ++i) {
      const node = children[i];
      for (let j = 0; j < this._columnsArray.length; ++j) {
        const text = String(node.data[this._columnsArray[j].id]);
        if (text.length > widths[j]) {
          widths[j] = text.length;
        }
      }
    }

    widths = this._autoSizeWidths(widths, minPercent, maxPercent);

    for (let i = 0; i < this._columnsArray.length; ++i) {
      this._columnsArray[i].weight = widths[i];
    }
    this._columnWidthsInitialized = false;
    this.updateWidths();
  }

  _enumerateChildren(rootNode: DataGridNode<T>, result: DataGridNode<T>[], maxLevel: number): DataGridNode<T>[] {
    if (!rootNode._isRoot) {
      result.push(rootNode);
    }
    if (!maxLevel) {
      return [];
    }
    for (let i = 0; i < rootNode.children.length; ++i) {
      this._enumerateChildren(rootNode.children[i], result, maxLevel - 1);
    }
    return result;
  }

  onResize(): void {
    this.updateWidths();
  }

  // Updates the widths of the table, including the positions of the column
  // resizers.
  //
  // IMPORTANT: This function MUST be called once after the element of the
  // DataGrid is attached to its parent element and every subsequent time the
  // width of the parent element is changed in order to make it possible to
  // resize the columns.
  //
  // If this function is not called after the DataGrid is attached to its
  // parent element, then the DataGrid's columns will not be resizable.
  updateWidths(): void {
    // Do not attempt to use offsetes if we're not attached to the document tree yet.
    if (!this._columnWidthsInitialized && this.element.offsetWidth) {
      // Give all the columns initial widths now so that during a resize,
      // when the two columns that get resized get a percent value for
      // their widths, all the other columns already have percent values
      // for their widths.

      // Use container size to avoid changes of table width caused by change of column widths.
      const tableWidth = this.element.offsetWidth - this._cornerWidth;
      const cells = this._headerTableBody.rows[0].cells;
      const numColumns = cells.length - 1;  // Do not process corner column.
      for (let i = 0; i < numColumns; i++) {
        const column = this.visibleColumnsArray[i];
        if (!column.weight) {
          column.weight = 100 * cells[i].offsetWidth / tableWidth || 10;
        }
      }
      this._columnWidthsInitialized = true;
    }
    this._applyColumnWeights();
  }

  indexOfVisibleColumn(columnId: string): number {
    return this.visibleColumnsArray.findIndex(column => column.id === columnId);
  }

  setName(name: string): void {
    this._columnWeightsSetting =
        Common.Settings.Settings.instance().createSetting('dataGrid-' + name + '-columnWeights', {});
    this._loadColumnWeights();
  }

  _resetColumnWeights(): void {
    for (const column of this._columnsArray) {
      if (!column.defaultWeight) {
        continue;
      }
      column.weight = column.defaultWeight;
    }
    this._applyColumnWeights();
    this._saveColumnWeights();
  }

  _loadColumnWeights(): void {
    if (!this._columnWeightsSetting) {
      return;
    }
    const weights = this._columnWeightsSetting.get();
    for (let i = 0; i < this._columnsArray.length; ++i) {
      const column = this._columnsArray[i];
      const weight = weights[column.id];
      if (weight) {
        column.weight = weight;
      }
    }
    this._applyColumnWeights();
  }

  _saveColumnWeights(): void {
    if (!this._columnWeightsSetting) {
      return;
    }
    const weights: {
      [x: string]: any,
    } = {};
    for (let i = 0; i < this._columnsArray.length; ++i) {
      const column = this._columnsArray[i];
      weights[column.id] = column.weight;
    }
    this._columnWeightsSetting.set(weights);
  }

  wasShown(): void {
    this._loadColumnWeights();
  }

  willHide(): void {
  }

  _applyColumnWeights(): void {
    let tableWidth = this.element.offsetWidth - this._cornerWidth;
    if (tableWidth <= 0) {
      return;
    }

    let sumOfWeights = 0.0;
    const fixedColumnWidths = [];
    for (let i = 0; i < this.visibleColumnsArray.length; ++i) {
      const column = this.visibleColumnsArray[i];
      if (column.fixedWidth) {
        const currentChild = this._headerTableColumnGroup.children[i];
        const width = elementToPreferedWidthMap.get(currentChild) || this._headerTableBody.rows[0].cells[i].offsetWidth;
        fixedColumnWidths[i] = width;
        tableWidth -= width;
      } else {
        sumOfWeights += (this.visibleColumnsArray[i].weight || 0);
      }
    }
    let sum = 0;
    let lastOffset = 0;
    const minColumnWidth = 14;  // px

    for (let i = 0; i < this.visibleColumnsArray.length; ++i) {
      const column = this.visibleColumnsArray[i];
      let width;
      if (column.fixedWidth) {
        width = fixedColumnWidths[i];
      } else {
        sum += (column.weight || 0);
        const offset = (sum * tableWidth / sumOfWeights) | 0;
        width = Math.max(offset - lastOffset, minColumnWidth);
        lastOffset = offset;
      }
      this._setPreferredWidth(i, width);
    }

    this._positionResizers();
  }

  setColumnsVisiblity(columnsVisibility: Set<string>): void {
    this.visibleColumnsArray = [];
    for (const column of this._columnsArray) {
      if (columnsVisibility.has(column.id)) {
        this.visibleColumnsArray.push(column);
      }
    }
    this._refreshHeader();
    this._applyColumnWeights();
    const nodes = this._enumerateChildren(this.rootNode(), [], -1);
    for (const node of nodes) {
      node.refresh();
    }
  }

  get scrollContainer(): HTMLElement {
    return this._scrollContainer as HTMLElement;
  }

  _positionResizers(): void {
    const headerTableColumns = this._headerTableColumnGroup.children;
    const numColumns = headerTableColumns.length - 1;  // Do not process corner column.
    const left: number[] = [];
    const resizers = this._resizers;

    while (resizers.length > numColumns - 1) {
      const resizer = resizers.pop();
      if (resizer) {
        resizer.remove();
      }
    }

    for (let i = 0; i < numColumns - 1; i++) {
      // Get the width of the cell in the first (and only) row of the
      // header table in order to determine the width of the column, since
      // it is not possible to query a column for its width.
      left[i] = (left[i - 1] || 0) + this._headerTableBody.rows[0].cells[i].offsetWidth;
    }

    // Make n - 1 resizers for n columns.
    for (let i = 0; i < numColumns - 1; i++) {
      let resizer: HTMLDivElement|HTMLElement = resizers[i];
      if (!resizer) {
        // This is the first call to updateWidth, so the resizers need
        // to be created.
        resizer = document.createElement('div');
        elementToIndexMap.set(resizer, i);
        resizer.classList.add('data-grid-resizer');
        // This resizer is associated with the column to its right.
        UI.UIUtils.installDragHandle(
            resizer, this._startResizerDragging.bind(this), this._resizerDragging.bind(this),
            this._endResizerDragging.bind(this), 'col-resize');
        this.element.appendChild(resizer);
        resizers.push((resizer as HTMLElement));
      }
      if (elementToPositionMap.get(resizer) !== left[i]) {
        elementToPositionMap.set(resizer, left[i]);
        resizer.style.left = left[i] + 'px';
      }
    }
  }

  addCreationNode(hasChildren?: boolean): void {
    if (this.creationNode) {
      this.creationNode.makeNormal();
    }
    const emptyData: {
      [x: string]: any,
    } = {};
    for (const column in this._columns) {
      emptyData[column] = null;
    }
    this.creationNode = new CreationDataGridNode(emptyData, hasChildren);
    this.rootNode().appendChild(this.creationNode);
  }

  _keyDown(event: Event): void {
    if (!(event instanceof KeyboardEvent)) {
      return;
    }
    if (event.shiftKey || event.metaKey || event.ctrlKey || this._editing || UI.UIUtils.isEditing()) {
      return;
    }

    let handled = false;
    let nextSelectedNode;
    if (!this.selectedNode) {
      // Select the first or last node based on the arrow key direction
      if (event.key === 'ArrowUp' && !event.altKey) {
        nextSelectedNode = this._lastSelectableNode();
      } else if (event.key === 'ArrowDown' && !event.altKey) {
        nextSelectedNode = this._firstSelectableNode();
      }
      handled = nextSelectedNode ? true : false;
    } else if (event.key === 'ArrowUp' && !event.altKey) {
      nextSelectedNode = this.selectedNode.traversePreviousNode(true);
      while (nextSelectedNode && !nextSelectedNode.selectable) {
        nextSelectedNode = nextSelectedNode.traversePreviousNode(true);
      }
      handled = nextSelectedNode ? true : false;
    } else if (event.key === 'ArrowDown' && !event.altKey) {
      nextSelectedNode = this.selectedNode.traverseNextNode(true);
      while (nextSelectedNode && !nextSelectedNode.selectable) {
        nextSelectedNode = nextSelectedNode.traverseNextNode(true);
      }
      handled = nextSelectedNode ? true : false;
    } else if (event.key === 'ArrowLeft') {
      if (this.selectedNode.expanded) {
        if (event.altKey) {
          this.selectedNode.collapseRecursively();
        } else {
          this.selectedNode.collapse();
        }
        handled = true;
      } else if (this.selectedNode.parent && !this.selectedNode.parent._isRoot) {
        handled = true;
        if (this.selectedNode.parent.selectable) {
          nextSelectedNode = this.selectedNode.parent;
          handled = nextSelectedNode ? true : false;
        } else if (this.selectedNode.parent) {
          this.selectedNode.parent.collapse();
        }
      }
    } else if (event.key === 'ArrowRight') {
      if (!this.selectedNode.revealed) {
        this.selectedNode.reveal();
        handled = true;
      } else if (this.selectedNode.hasChildren()) {
        handled = true;
        if (this.selectedNode.expanded) {
          nextSelectedNode = this.selectedNode.children[0];
          handled = nextSelectedNode ? true : false;
        } else {
          if (event.altKey) {
            this.selectedNode.expandRecursively();
          } else {
            this.selectedNode.expand();
          }
        }
      }
    } else if (event.keyCode === 8 || event.keyCode === 46) {
      if (this._deleteCallback) {
        handled = true;
        this._deleteCallback(this.selectedNode);
      }
    } else if (event.key === 'Enter') {
      if (this._editCallback) {
        handled = true;
        const selectedNodeElement = this.selectedNode._element;
        if (!selectedNodeElement) {
          return;
        }
        this._startEditing(selectedNodeElement.children[this._nextEditableColumn(-1)]);
      } else {
        this.dispatchEventToListeners(Events.OpenedNode, this.selectedNode);
      }
    }

    if (nextSelectedNode) {
      nextSelectedNode.reveal();
      nextSelectedNode.select();
    }

    if ((event.key === 'ArrowUp' || event.key === 'ArrowDown' || event.key === 'ArrowLeft' ||
         event.key === 'ArrowRight') &&
        document.activeElement !== this.element) {
      // crbug.com/1005449
      // navigational keys pressed but current DataGrid panel has lost focus;
      // re-focus to ensure subsequent keydowns can be registered within this DataGrid
      this.element.focus();
    }

    if (handled) {
      event.consume(true);
    }
  }

  updateSelectionBeforeRemoval(root: DataGridNode<T>|null, _onlyAffectsSubtree: boolean): void {
    let ancestor: (DataGridNode<T>|null) = this.selectedNode;
    while (ancestor && ancestor !== root) {
      ancestor = ancestor.parent;
    }
    // Selection is not in the subtree being deleted.
    if (!ancestor) {
      return;
    }

    let nextSelectedNode;
    // Skip subtree being deleted when looking for the next selectable node.
    for (ancestor = root; ancestor && !ancestor.nextSibling; ancestor = ancestor.parent) {
    }
    if (ancestor) {
      nextSelectedNode = ancestor.nextSibling;
    }
    while (nextSelectedNode && !nextSelectedNode.selectable) {
      nextSelectedNode = nextSelectedNode.traverseNextNode(true);
    }
    const isCreationNode = nextSelectedNode instanceof CreationDataGridNode && nextSelectedNode.isCreationNode;
    if (!nextSelectedNode || isCreationNode) {
      if (!root) {
        return;
      }
      nextSelectedNode = root.traversePreviousNode(true);
      while (nextSelectedNode && !nextSelectedNode.selectable) {
        nextSelectedNode = nextSelectedNode.traversePreviousNode(true);
      }
    }
    if (nextSelectedNode) {
      nextSelectedNode.reveal();
      nextSelectedNode.select();
    } else if (this.selectedNode) {
      this.selectedNode.deselect();
    }
  }

  dataGridNodeFromNode(target: Node): DataGridNode<T>|null {
    const rowElement = UI.UIUtils.enclosingNodeOrSelfWithNodeName(target, 'tr');
    return (rowElement && this.elementToDataGridNode.get(rowElement)) || null;
  }

  columnIdFromNode(target: Node): string|null {
    const cellElement = UI.UIUtils.enclosingNodeOrSelfWithNodeName(target, 'td');
    return (cellElement && nodeToColumnIdMap.get(cellElement)) || null;
  }

  _clickInHeaderCell(event: Event): void {
    const cell = UI.UIUtils.enclosingNodeOrSelfWithNodeName((event.target as Node), 'th');
    if (!cell) {
      return;
    }
    this._sortByColumnHeaderCell((cell as HTMLElement));
  }

  _sortByColumnHeaderCell(cell: Element): void {
    if (!nodeToColumnIdMap.has(cell) || !cell.classList.contains('sortable')) {
      return;
    }

    let sortOrder = Order.Ascending;
    if ((cell === this._sortColumnCell) && this.isSortOrderAscending()) {
      sortOrder = Order.Descending;
    }

    if (this._sortColumnCell) {
      this._sortColumnCell.classList.remove(Order.Ascending, Order.Descending);
    }
    this._sortColumnCell = cell;

    cell.classList.add(sortOrder);
    const icon = elementToSortIconMap.get(cell);
    if (!icon) {
      return;
    }
    icon.setIconType(sortOrder === Order.Ascending ? 'smallicon-triangle-up' : 'smallicon-triangle-down');

    this.dispatchEventToListeners(Events.SortingChanged);
  }

  markColumnAsSortedBy(columnId: string, sortOrder: Order): void {
    if (this._sortColumnCell) {
      this._sortColumnCell.classList.remove(Order.Ascending, Order.Descending);
    }
    this._sortColumnCell = this._headerTableHeaders[columnId];
    this._sortColumnCell.classList.add(sortOrder);
  }

  headerTableHeader(columnId: string): Element {
    return this._headerTableHeaders[columnId];
  }

  _mouseDownInDataTable(event: Event): void {
    const target = (event.target as Node);
    const gridNode = this.dataGridNodeFromNode(target);
    if (!gridNode || !gridNode.selectable || gridNode.isEventWithinDisclosureTriangle((event as MouseEvent))) {
      return;
    }

    const columnId = this.columnIdFromNode(target);
    if (columnId && this._columns[columnId].nonSelectable) {
      return;
    }

    if (/** @type {!MouseEvent} */ (event as MouseEvent).metaKey) {
      if (gridNode.selected) {
        gridNode.deselect();
      } else {
        gridNode.select();
      }
    } else {
      gridNode.select();
      this.dispatchEventToListeners(Events.OpenedNode, gridNode);
    }
  }

  setHeaderContextMenuCallback(callback: ((arg0: UI.ContextMenu.SubMenu) => void)|null): void {
    this._headerContextMenuCallback = callback;
  }

  setRowContextMenuCallback(callback: ((arg0: UI.ContextMenu.ContextMenu, arg1: DataGridNode<T>) => void)|null): void {
    this._rowContextMenuCallback = callback;
  }

  _contextMenu(event: Event): void {
    if (!(event instanceof MouseEvent)) {
      return;
    }
    const contextMenu = new UI.ContextMenu.ContextMenu(event);
    const target = (event.target as Node);

    const sortableVisibleColumns = this.visibleColumnsArray.filter(column => {
      return (column.sortable && column.title);
    });

    const sortableHiddenColumns = this._columnsArray.filter(
        column => sortableVisibleColumns.indexOf(column) === -1 && column.allowInSortByEvenWhenHidden);

    const sortableColumns = [...sortableVisibleColumns, ...sortableHiddenColumns];
    if (sortableColumns.length > 0) {
      const sortMenu = contextMenu.defaultSection().appendSubMenuItem(i18nString(UIStrings.sortByString));
      for (const column of sortableColumns) {
        const headerCell = this._headerTableHeaders[column.id];
        sortMenu.defaultSection().appendItem(
            (column.title as string), this._sortByColumnHeaderCell.bind(this, headerCell));
      }
    }

    if (target.isSelfOrDescendant(this._headerTableBody)) {
      if (this._headerContextMenuCallback) {
        this._headerContextMenuCallback(contextMenu);
      }
      contextMenu.defaultSection().appendItem(i18nString(UIStrings.resetColumns), this._resetColumnWeights.bind(this));
      contextMenu.show();
      return;
    }

    // Add header context menu to a subsection available from the body
    const headerSubMenu = contextMenu.defaultSection().appendSubMenuItem(i18nString(UIStrings.headerOptions));
    if (this._headerContextMenuCallback) {
      this._headerContextMenuCallback(headerSubMenu);
    }
    headerSubMenu.defaultSection().appendItem(i18nString(UIStrings.resetColumns), this._resetColumnWeights.bind(this));

    const isContextMenuKey = (event.button === 0);
    const gridNode = isContextMenuKey ? this.selectedNode : this.dataGridNodeFromNode(target);
    const selectedNodeElement = this.selectedNode && this.selectedNode.existingElement();
    if (isContextMenuKey && selectedNodeElement) {
      const boundingRowRect = selectedNodeElement.getBoundingClientRect();
      if (boundingRowRect) {
        const x = (boundingRowRect.right + boundingRowRect.left) / 2;
        const y = (boundingRowRect.bottom + boundingRowRect.top) / 2;
        contextMenu.setX(x);
        contextMenu.setY(y);
      }
    }
    if (this._refreshCallback && (!gridNode || gridNode !== this.creationNode)) {
      contextMenu.defaultSection().appendItem(i18nString(UIStrings.refresh), this._refreshCallback.bind(this));
    }

    if (gridNode && gridNode.selectable && !gridNode.isEventWithinDisclosureTriangle(event)) {
      if (this._editCallback) {
        if (gridNode === this.creationNode) {
          const firstEditColumnIndex = this._nextEditableColumn(-1);
          const tableCellElement = gridNode.element().children[firstEditColumnIndex];
          contextMenu.defaultSection().appendItem(
              i18nString(UIStrings.addNew), this._startEditing.bind(this, tableCellElement));
        } else if (isContextMenuKey) {
          const firstEditColumnIndex = this._nextEditableColumn(-1);
          if (firstEditColumnIndex > -1) {
            const firstColumn = this.visibleColumnsArray[firstEditColumnIndex];
            if (firstColumn && firstColumn.editable) {
              contextMenu.defaultSection().appendItem(
                  i18nString(UIStrings.editS, {PH1: firstColumn.title}),
                  this._startEditingColumnOfDataGridNode.bind(this, gridNode, firstEditColumnIndex));
            }
          }
        } else {
          const columnId = this.columnIdFromNode(target);
          if (columnId && this._columns[columnId].editable) {
            contextMenu.defaultSection().appendItem(
                i18nString(UIStrings.editS, {PH1: this._columns[columnId].title}),
                this._startEditing.bind(this, target));
          }
        }
      }
      if (this._deleteCallback && gridNode !== this.creationNode) {
        contextMenu.defaultSection().appendItem(
            i18nString(UIStrings.delete), this._deleteCallback.bind(this, gridNode));
      }
      if (this._rowContextMenuCallback) {
        this._rowContextMenuCallback(contextMenu, gridNode);
      }
    }

    contextMenu.show();
  }

  _clickInDataTable(event: Event): void {
    const gridNode = this.dataGridNodeFromNode((event.target as Node));
    if (!gridNode || !gridNode.hasChildren() || !gridNode.isEventWithinDisclosureTriangle((event as MouseEvent))) {
      return;
    }

    if (gridNode.expanded) {
      if (/** @type {!MouseEvent}*/ (event as MouseEvent).altKey) {
        gridNode.collapseRecursively();
      } else {
        gridNode.collapse();
      }
    } else {
      if (/** @type {!MouseEvent}*/ (event as MouseEvent).altKey) {
        gridNode.expandRecursively();
      } else {
        gridNode.expand();
      }
    }
  }

  setResizeMethod(method: ResizeMethod): void {
    this._resizeMethod = method;
  }

  _startResizerDragging(event: Event): boolean {
    this._currentResizer = event.target;
    return true;
  }

  _endResizerDragging(): void {
    this._currentResizer = null;
    this._saveColumnWeights();
  }

  _resizerDragging(event: MouseEvent): void {
    const resizer = (this._currentResizer as HTMLElement);
    if (!resizer) {
      return;
    }

    // Constrain the dragpoint to be within the containing div of the
    // datagrid.
    let dragPoint: number = event.clientX - this.element.totalOffsetLeft();
    const firstRowCells = this._headerTableBody.rows[0].cells;
    let leftEdgeOfPreviousColumn = 0;
    // Constrain the dragpoint to be within the space made up by the
    // column directly to the left and the column directly to the right.
    let leftCellIndex = elementToIndexMap.get(resizer);
    if (leftCellIndex === undefined) {
      return;
    }
    let rightCellIndex: number = leftCellIndex + 1;
    for (let i = 0; i < leftCellIndex; i++) {
      leftEdgeOfPreviousColumn += firstRowCells[i].offsetWidth;
    }

    // Differences for other resize methods
    if (this._resizeMethod === ResizeMethod.Last) {
      rightCellIndex = this._resizers.length;
    } else if (this._resizeMethod === ResizeMethod.First) {
      leftEdgeOfPreviousColumn += firstRowCells[leftCellIndex].offsetWidth - firstRowCells[0].offsetWidth;
      leftCellIndex = 0;
    }

    const rightEdgeOfNextColumn =
        leftEdgeOfPreviousColumn + firstRowCells[leftCellIndex].offsetWidth + firstRowCells[rightCellIndex].offsetWidth;

    // Give each column some padding so that they don't disappear.
    const leftMinimum = leftEdgeOfPreviousColumn + ColumnResizePadding;
    const rightMaximum = rightEdgeOfNextColumn - ColumnResizePadding;
    if (leftMinimum > rightMaximum) {
      return;
    }

    dragPoint = Platform.NumberUtilities.clamp(dragPoint, leftMinimum, rightMaximum);

    const position = (dragPoint - CenterResizerOverBorderAdjustment);
    elementToPositionMap.set(resizer, position);
    resizer.style.left = position + 'px';

    this._setPreferredWidth(leftCellIndex, dragPoint - leftEdgeOfPreviousColumn);
    this._setPreferredWidth(rightCellIndex, rightEdgeOfNextColumn - dragPoint);

    const leftColumn = this.visibleColumnsArray[leftCellIndex];
    const rightColumn = this.visibleColumnsArray[rightCellIndex];
    if (leftColumn.weight && rightColumn.weight) {
      const sumOfWeights = leftColumn.weight + rightColumn.weight;
      const delta = rightEdgeOfNextColumn - leftEdgeOfPreviousColumn;
      leftColumn.weight = (dragPoint - leftEdgeOfPreviousColumn) * sumOfWeights / delta;
      rightColumn.weight = (rightEdgeOfNextColumn - dragPoint) * sumOfWeights / delta;
    }

    this._positionResizers();
    event.preventDefault();
  }

  _setPreferredWidth(columnIndex: number, width: number): void {
    const pxWidth = width + 'px';
    const headerTableChildElement = (this._headerTableColumnGroup.children[columnIndex] as HTMLElement);
    elementToPreferedWidthMap.set(headerTableChildElement, width);
    headerTableChildElement.style.width = pxWidth;

    const dataTableChildElement = (this._dataTableColumnGroup.children[columnIndex] as HTMLElement);
    dataTableChildElement.style.width = pxWidth;
  }

  columnOffset(columnId: string): number {
    if (!this.element.offsetWidth) {
      return 0;
    }
    for (let i = 1; i < this.visibleColumnsArray.length; ++i) {
      if (columnId === this.visibleColumnsArray[i].id) {
        if (this._resizers[i - 1]) {
          return elementToPositionMap.get(this._resizers[i - 1]) || 0;
        }
      }
    }
    return 0;
  }

  asWidget(): DataGridWidget<T> {
    if (!this._dataGridWidget) {
      this._dataGridWidget = new DataGridWidget(this);
    }
    return this._dataGridWidget;
  }

  topFillerRowElement(): HTMLElement {
    return this._topFillerRow;
  }
}

// Keep in sync with .data-grid col.corner style rule.
export const CornerWidth = 14;

// TODO(crbug.com/1167717): Make this a const enum again
// eslint-disable-next-line rulesdir/const_enum
export enum Events {
  SelectedNode = 'SelectedNode',
  DeselectedNode = 'DeselectedNode',
  OpenedNode = 'OpenedNode',
  SortingChanged = 'SortingChanged',
  PaddingChanged = 'PaddingChanged',
}

// TODO(crbug.com/1167717): Make this a const enum again
// eslint-disable-next-line rulesdir/const_enum
export enum Order {
  Ascending = 'sort-ascending',
  Descending = 'sort-descending',
}

// TODO(crbug.com/1167717): Make this a const enum again
// eslint-disable-next-line rulesdir/const_enum
export enum Align {
  Center = 'center',
  Right = 'right',
}

// TODO(crbug.com/1167717): Make this a const enum again
// eslint-disable-next-line rulesdir/const_enum
export enum DataType {
  String = 'String',
  Boolean = 'Boolean',
}

export const ColumnResizePadding = 24;
export const CenterResizerOverBorderAdjustment = 3;

// TODO(crbug.com/1167717): Make this a const enum again
// eslint-disable-next-line rulesdir/const_enum
export enum ResizeMethod {
  Nearest = 'nearest',
  First = 'first',
  Last = 'last',
}

export type DataGridData = {
  [key: string]: any,
};

export class DataGridNode<T> extends Common.ObjectWrapper.ObjectWrapper {
  _element: Element|null;
  _expanded: boolean;
  _selected: boolean;
  _dirty: boolean;
  _inactive: boolean;
  key!: string;
  _depth!: number|undefined;
  _revealed!: boolean|undefined;
  _attached: boolean;
  _savedPosition: {
    parent: DataGridNode<T>,
    index: number,
  }|null;
  _shouldRefreshChildren: boolean;
  _data: DataGridData;
  _hasChildren: boolean;
  children: DataGridNode<T>[];
  dataGrid: DataGridImpl<T>|null;
  parent: DataGridNode<T>|null;
  previousSibling: DataGridNode<T>|null;
  nextSibling: DataGridNode<T>|null;
  disclosureToggleWidth: number;
  selectable: boolean;
  _isRoot: boolean;
  nodeAccessibleText: string;
  cellAccessibleTextMap: Map<string, string>;
  isCreationNode: boolean;

  constructor(data?: DataGridData|null, hasChildren?: boolean) {
    super();
    this._element = null;
    this._expanded = false;
    this._selected = false;
    this._dirty = false;
    this._inactive = false;
    this._attached = false;
    this._savedPosition = null;
    this._shouldRefreshChildren = true;
    this._data = data || {};
    this._hasChildren = hasChildren || false;
    this.children = [];
    this.dataGrid = null;
    this.parent = null;
    this.previousSibling = null;
    this.nextSibling = null;
    this.disclosureToggleWidth = 10;

    this.selectable = true;

    this._isRoot = false;

    this.nodeAccessibleText = '';
    this.cellAccessibleTextMap = new Map();
    this.isCreationNode = false;
  }

  element(): Element {
    if (!this._element) {
      const element = this.createElement();
      this.createCells(element);
    }
    return this._element as Element;
  }

  protected createElement(): Element {
    this._element = document.createElement('tr');
    this._element.classList.add('data-grid-data-grid-node');
    if (this.dataGrid) {
      this.dataGrid.elementToDataGridNode.set(this._element, this);
    }

    if (this._hasChildren) {
      this._element.classList.add('parent');
    }
    if (this.expanded) {
      this._element.classList.add('expanded');
    }
    if (this.selected) {
      this._element.classList.add('selected');
    }
    if (this.revealed) {
      this._element.classList.add('revealed');
    }
    if (this._dirty) {
      this._element.classList.add('dirty');
    }
    if (this._inactive) {
      this._element.classList.add('inactive');
    }
    if (this.isCreationNode) {
      this._element.classList.add('creation-node');
    }
    return this._element;
  }

  existingElement(): Element|null {
    return this._element || null;
  }

  protected resetElement(): void {
    this._element = null;
  }

  protected createCells(element: Element): void {
    element.removeChildren();
    if (!this.dataGrid || !this.parent) {
      return;
    }
    const columnsArray = this.dataGrid.visibleColumnsArray;
    const accessibleTextArray = [];
    // Add depth if node is part of a tree
    if (this._hasChildren || !this.parent._isRoot) {
      accessibleTextArray.push(i18nString(UIStrings.levelS, {PH1: this.depth + 1}));
    }
    for (let i = 0; i < columnsArray.length; ++i) {
      const column = columnsArray[i];
      const cell = element.appendChild(this.createCell(column.id));
      // Add each visibile cell to the node's accessible text by gathering 'Column Title: content'

      if (column.dataType === DataType.Boolean && this.data[column.id] === true) {
        this.setCellAccessibleName(i18nString(UIStrings.checked), cell, column.id);
      }

      accessibleTextArray.push(`${column.title}: ${this.cellAccessibleTextMap.get(column.id) || cell.textContent}`);
    }
    this.nodeAccessibleText = accessibleTextArray.join(', ');
    element.appendChild(this.createTDWithClass('corner'));
  }

  get data(): DataGridData {
    return this._data;
  }

  set data(x: DataGridData) {
    this._data = x || {};
    this.refresh();
  }

  get revealed(): boolean {
    if (this._revealed !== undefined) {
      return this._revealed;
    }

    let currentAncestor: (DataGridNode<T>|null) = this.parent;
    while (currentAncestor && !currentAncestor._isRoot) {
      if (!currentAncestor.expanded) {
        this._revealed = false;
        return false;
      }

      currentAncestor = currentAncestor.parent;
    }

    this.revealed = true;
    return true;
  }

  set revealed(x: boolean) {
    if (this._revealed === x) {
      return;
    }

    this._revealed = x;

    if (this._element) {
      this._element.classList.toggle('revealed', this._revealed);
    }

    for (let i = 0; i < this.children.length; ++i) {
      this.children[i].revealed = x && this.expanded;
    }
  }

  isDirty(): boolean {
    return this._dirty;
  }

  setDirty(dirty: boolean): void {
    if (this._dirty === dirty) {
      return;
    }
    this._dirty = dirty;
    if (!this._element) {
      return;
    }
    if (dirty) {
      this._element.classList.add('dirty');
    } else {
      this._element.classList.remove('dirty');
    }
  }

  isInactive(): boolean {
    return this._inactive;
  }

  setInactive(inactive: boolean): void {
    if (this._inactive === inactive) {
      return;
    }
    this._inactive = inactive;
    if (!this._element) {
      return;
    }
    if (inactive) {
      this._element.classList.add('inactive');
    } else {
      this._element.classList.remove('inactive');
    }
  }

  hasChildren(): boolean {
    return this._hasChildren;
  }

  setHasChildren(x: boolean): void {
    if (this._hasChildren === x) {
      return;
    }

    this._hasChildren = x;

    if (!this._element) {
      return;
    }

    this._element.classList.toggle('parent', this._hasChildren);
    this._element.classList.toggle('expanded', this._hasChildren && this.expanded);
  }

  get depth(): number {
    if (this._depth !== undefined) {
      return this._depth;
    }
    if (this.parent && !this.parent._isRoot) {
      this._depth = this.parent.depth + 1;
    } else {
      this._depth = 0;
    }
    return this._depth;
  }

  get leftPadding(): number {
    return this.depth * (this.dataGrid ? this.dataGrid.indentWidth : 1);
  }

  get shouldRefreshChildren(): boolean {
    return this._shouldRefreshChildren;
  }

  set shouldRefreshChildren(x: boolean) {
    this._shouldRefreshChildren = x;
    if (x && this.expanded) {
      this.expand();
    }
  }

  get selected(): boolean {
    return this._selected;
  }

  set selected(x: boolean) {
    if (x) {
      this.select();
    } else {
      this.deselect();
    }
  }

  get expanded(): boolean {
    return this._expanded;
  }

  set expanded(x: boolean) {
    if (x) {
      this.expand();
    } else {
      this.collapse();
    }
  }

  refresh(): void {
    if (!this.dataGrid) {
      this._element = null;
    }
    if (!this._element) {
      return;
    }
    this.createCells(this._element);
  }

  createTDWithClass(className: string): HTMLElement {
    const cell = (document.createElement('td') as HTMLElement);
    if (className) {
      cell.className = className;
    }
    const cellClass = this.dataGrid ? this.dataGrid._cellClass : null;
    if (cellClass) {
      cell.classList.add(cellClass);
    }
    return cell;
  }

  createTD(columnId: string): HTMLElement {
    const cell = this.createTDWithClass(columnId + '-column');
    nodeToColumnIdMap.set(cell, columnId);

    if (this.dataGrid) {
      const alignment = this.dataGrid._columns[columnId].align;
      if (alignment) {
        cell.classList.add(alignment);
      }

      if (columnId === this.dataGrid.disclosureColumnId) {
        cell.classList.add('disclosure');
        if (this.leftPadding) {
          cell.style.setProperty('padding-left', this.leftPadding + 'px');
        }
      }
    }

    return cell;
  }

  createCell(columnId: string): HTMLElement {
    const cell = this.createTD(columnId);
    const data = this.data[columnId];
    if (data instanceof Node) {
      cell.appendChild(data);
    } else if (data !== null && this.dataGrid) {
      this.dataGrid.setElementContent(cell, (data as string));
    }

    return cell;
  }

  setCellAccessibleName(name: string, cell: Element, columnId: string): void {
    this.cellAccessibleTextMap.set(columnId, name);
    // Mark all direct children of cell as hidden so cell name is properly announced
    for (let i = 0; i < cell.children.length; i++) {
      UI.ARIAUtils.markAsHidden(cell.children[i]);
    }
    UI.ARIAUtils.setAccessibleName(cell, name);
  }

  nodeSelfHeight(): number {
    return 20;
  }

  appendChild(child: DataGridNode<T>): void {
    this.insertChild(child, this.children.length);
  }

  resetNode(onlyCaches?: boolean): void {
    // @TODO(allada) This is a hack to make sure ViewportDataGrid can clean up these caches. Try Not To Use.
    delete this._depth;
    delete this._revealed;
    if (onlyCaches) {
      return;
    }
    if (this.previousSibling) {
      this.previousSibling.nextSibling = this.nextSibling;
    }
    if (this.nextSibling) {
      this.nextSibling.previousSibling = this.previousSibling;
    }
    this.dataGrid = null;
    this.parent = null;
    this.nextSibling = null;
    this.previousSibling = null;
    this._attached = false;
  }

  insertChild(child: DataGridNode<T>, index: number): void {
    if (!child) {
      throw 'insertChild: Node can\'t be undefined or null.';
    }
    if (child.parent === this) {
      const currentIndex = this.children.indexOf(child);
      if (currentIndex < 0) {
        console.assert(false, 'Inconsistent DataGrid state');
      }
      if (currentIndex === index) {
        return;
      }
      if (currentIndex < index) {
        --index;
      }
    }

    child.remove();

    this.children.splice(index, 0, child);
    this.setHasChildren(true);

    child.parent = this;
    child.dataGrid = this.dataGrid;
    child.recalculateSiblings(index);

    child._shouldRefreshChildren = true;

    let current: (DataGridNode<T>|null)|DataGridNode<T> = child.children[0];
    while (current) {
      current.resetNode(true);
      current.dataGrid = this.dataGrid;
      current._attached = false;
      current._shouldRefreshChildren = true;
      current = current.traverseNextNode(false, child, true);
    }

    if (this.expanded) {
      child._attach();
    }
    if (!this.revealed) {
      child.revealed = false;
    }
  }

  remove(): void {
    if (this.parent) {
      this.parent.removeChild(this);
    }
  }

  removeChild(child: DataGridNode<T>): void {
    if (!child) {
      throw 'removeChild: Node can\'t be undefined or null.';
    }
    if (child.parent !== this) {
      throw 'removeChild: Node is not a child of this node.';
    }

    if (this.dataGrid) {
      this.dataGrid.updateSelectionBeforeRemoval(child, false);
    }

    child._detach();
    child.resetNode();
    Platform.ArrayUtilities.removeElement(this.children, child, true);

    if (this.children.length <= 0) {
      this.setHasChildren(false);
    }
  }

  removeChildren(): void {
    if (this.dataGrid) {
      this.dataGrid.updateSelectionBeforeRemoval(this, true);
    }
    for (let i = 0; i < this.children.length; ++i) {
      const child = this.children[i];
      child._detach();
      child.resetNode();
    }

    this.children = [];
    this.setHasChildren(false);
  }

  recalculateSiblings(myIndex: number): void {
    if (!this.parent) {
      return;
    }

    const previousChild = this.parent.children[myIndex - 1] || null;
    if (previousChild) {
      previousChild.nextSibling = this;
    }
    this.previousSibling = previousChild;

    const nextChild = this.parent.children[myIndex + 1] || null;
    if (nextChild) {
      nextChild.previousSibling = this;
    }
    this.nextSibling = nextChild;
  }

  collapse(): void {
    if (this._isRoot) {
      return;
    }
    if (this._element) {
      this._element.classList.remove('expanded');
    }

    this._expanded = false;
    if (this.selected && this.dataGrid) {
      this.dataGrid.updateGridAccessibleName(/* text */ i18nString(UIStrings.collapsed));
    }

    for (let i = 0; i < this.children.length; ++i) {
      this.children[i].revealed = false;
    }
  }

  collapseRecursively(): void {
    let item: (DataGridNode<T>|null)|this = this;
    while (item) {
      if (item.expanded) {
        item.collapse();
      }
      item = item.traverseNextNode(false, this, true);
    }
  }

  populate(): void {
  }

  expand(): void {
    if (!this._hasChildren || this.expanded) {
      return;
    }
    if (this._isRoot) {
      return;
    }

    if (this.revealed && !this._shouldRefreshChildren) {
      for (let i = 0; i < this.children.length; ++i) {
        this.children[i].revealed = true;
      }
    }

    if (this._shouldRefreshChildren) {
      for (let i = 0; i < this.children.length; ++i) {
        this.children[i]._detach();
      }

      this.populate();

      if (this._attached) {
        for (let i = 0; i < this.children.length; ++i) {
          const child = this.children[i];
          if (this.revealed) {
            child.revealed = true;
          }
          child._attach();
        }
      }

      this._shouldRefreshChildren = false;
    }

    if (this._element) {
      this._element.classList.add('expanded');
    }
    if (this.selected && this.dataGrid) {
      this.dataGrid.updateGridAccessibleName(/* text */ i18nString(UIStrings.expanded));
    }

    this._expanded = true;
  }

  expandRecursively(): void {
    let item: (DataGridNode<T>|null)|this = this;
    while (item) {
      item.expand();
      item = item.traverseNextNode(false, this);
    }
  }

  reveal(): void {
    if (this._isRoot) {
      return;
    }
    let currentAncestor: (DataGridNode<T>|null) = this.parent;
    while (currentAncestor && !currentAncestor._isRoot) {
      if (!currentAncestor.expanded) {
        currentAncestor.expand();
      }
      currentAncestor = currentAncestor.parent;
    }

    this.element().scrollIntoViewIfNeeded(false);
  }

  select(supressSelectedEvent?: boolean): void {
    if (!this.dataGrid || !this.selectable || this.selected) {
      return;
    }

    if (this.dataGrid.selectedNode) {
      this.dataGrid.selectedNode.deselect();
    }

    this._selected = true;
    this.dataGrid.selectedNode = this;

    if (this._element) {
      this._element.classList.add('selected');
      this.dataGrid.setHasSelection(true);
      this.dataGrid.updateGridAccessibleName();
    }

    if (!supressSelectedEvent) {
      this.dataGrid.dispatchEventToListeners(Events.SelectedNode, this);
    }
  }

  revealAndSelect(): void {
    if (this._isRoot) {
      return;
    }
    this.reveal();
    this.select();
  }

  deselect(supressDeselectedEvent?: boolean): void {
    if (!this.dataGrid || this.dataGrid.selectedNode !== this || !this.selected) {
      return;
    }

    this._selected = false;
    this.dataGrid.selectedNode = null;

    if (this._element) {
      this._element.classList.remove('selected');
      this.dataGrid.setHasSelection(false);
      this.dataGrid.updateGridAccessibleName('');
    }

    if (!supressDeselectedEvent) {
      this.dataGrid.dispatchEventToListeners(Events.DeselectedNode);
    }
  }

  traverseNextNode(skipHidden: boolean, stayWithin?: DataGridNode<T>|null, dontPopulate?: boolean, info?: {
    depthChange: number,
  }): DataGridNode<T>|null {
    if (!dontPopulate && this._hasChildren) {
      this.populate();
    }

    if (info) {
      info.depthChange = 0;
    }

    let node: (DataGridNode<T>|null)|this = (!skipHidden || this.revealed) ? this.children[0] : null;
    if (node && (!skipHidden || this.expanded)) {
      if (info) {
        info.depthChange = 1;
      }
      return node;
    }

    if (this === stayWithin) {
      return null;
    }

    node = (!skipHidden || this.revealed) ? this.nextSibling : null;
    if (node) {
      return node;
    }

    node = this;
    while (node && !node._isRoot && !((!skipHidden || node.revealed) ? node.nextSibling : null) &&
           node.parent !== stayWithin) {
      if (info) {
        info.depthChange -= 1;
      }
      node = node.parent;
    }

    if (!node) {
      return null;
    }

    return (!skipHidden || node.revealed) ? node.nextSibling : null;
  }

  traversePreviousNode(skipHidden: boolean, dontPopulate?: boolean): DataGridNode<T>|null {
    let node: (DataGridNode<T>|null) = (!skipHidden || this.revealed) ? this.previousSibling : null;
    if (!dontPopulate && node && node._hasChildren) {
      node.populate();
    }

    while (node &&
           ((!skipHidden || (node.revealed && node.expanded)) ? node.children[node.children.length - 1] : null)) {
      if (!dontPopulate && node._hasChildren) {
        node.populate();
      }
      node = ((!skipHidden || (node.revealed && node.expanded)) ? node.children[node.children.length - 1] : null);
    }

    if (node) {
      return node;
    }

    if (!this.parent || this.parent._isRoot) {
      return null;
    }

    return this.parent;
  }

  isEventWithinDisclosureTriangle(event: MouseEvent): boolean {
    if (!this._hasChildren) {
      return false;
    }
    const cell = UI.UIUtils.enclosingNodeOrSelfWithNodeName((event.target as Node), 'td');
    if (!cell || !(cell instanceof HTMLElement) || !cell.classList.contains('disclosure')) {
      return false;
    }

    const left = cell.totalOffsetLeft() + this.leftPadding;
    return event.pageX >= left && event.pageX <= left + this.disclosureToggleWidth;
  }

  _attach(): void {
    if (!this.dataGrid || this._attached) {
      return;
    }

    this._attached = true;

    const previousNode = this.traversePreviousNode(true, true);
    const previousElement = previousNode ? previousNode.element() : this.dataGrid._topFillerRow;
    this.dataGrid.dataTableBody.insertBefore(this.element(), previousElement.nextSibling);

    if (this.expanded) {
      for (let i = 0; i < this.children.length; ++i) {
        this.children[i]._attach();
      }
    }
  }

  _detach(): void {
    if (!this._attached) {
      return;
    }

    this._attached = false;

    if (this._element) {
      this._element.remove();
    }

    for (let i = 0; i < this.children.length; ++i) {
      this.children[i]._detach();
    }
  }

  savePosition(): void {
    if (this._savedPosition) {
      return;
    }

    if (!this.parent) {
      throw 'savePosition: Node must have a parent.';
    }
    this._savedPosition = {parent: this.parent, index: this.parent.children.indexOf(this)};
  }

  restorePosition(): void {
    if (!this._savedPosition) {
      return;
    }

    if (this.parent !== this._savedPosition.parent) {
      this._savedPosition.parent.insertChild(this, this._savedPosition.index);
    }

    this._savedPosition = null;
  }
}

export class CreationDataGridNode<T> extends DataGridNode<T> {
  isCreationNode: boolean;
  constructor(
      data?: {
        [x: string]: any,
      }|null,
      hasChildren?: boolean) {
    super(data, hasChildren);
    this.isCreationNode = true;
  }

  makeNormal(): void {
    this.isCreationNode = false;
  }
}

export class DataGridWidget<T> extends UI.Widget.VBox {
  _dataGrid: DataGridImpl<T>;
  constructor(dataGrid: DataGridImpl<T>) {
    super();
    this._dataGrid = dataGrid;
    this.element.appendChild(dataGrid.element);
    this.setDefaultFocusedElement(dataGrid.element);
  }

  wasShown(): void {
    this._dataGrid.wasShown();
  }

  willHide(): void {
    this._dataGrid.willHide();
  }

  onResize(): void {
    this._dataGrid.onResize();
  }

  elementsToRestoreScrollPositionsFor(): Element[] {
    return [this._dataGrid._scrollContainer];
  }
}
export interface Parameters {
  displayName: string;
  columns: ColumnDescriptor[];
  editCallback?: ((arg0: any, arg1: string, arg2: any, arg3: any) => any);
  deleteCallback?: ((arg0: any) => any);
  refreshCallback?: (() => any);
}
export interface ColumnDescriptor {
  id: string;
  title?: Common.UIString.LocalizedString;
  titleDOMFragment?: DocumentFragment|null;
  sortable: boolean;
  sort?: Order|null;
  align?: Align|null;
  width?: string;
  fixedWidth?: boolean;
  editable?: boolean;
  nonSelectable?: boolean;
  longText?: boolean;
  disclosure?: boolean;
  weight?: number;
  allowInSortByEvenWhenHidden?: boolean;
  dataType?: DataType|null;
  defaultWeight?: number;
}

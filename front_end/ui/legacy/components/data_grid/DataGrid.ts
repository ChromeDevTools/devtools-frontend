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

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable rulesdir/check_license_header */

import * as Common from '../../../../core/common/common.js';
import * as i18n from '../../../../core/i18n/i18n.js';
import * as Platform from '../../../../core/platform/platform.js';
import * as VisualLogging from '../../../visual_logging/visual_logging.js';
import * as UI from '../../legacy.js';

import dataGridStyles from './dataGrid.css.js';

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
  /**
   *@description Accessible text indicating an empty row is created.
   */
  emptyRowCreated: 'An empty table row has been created. You may double click or use context menu to edit.',
};
const str_ = i18n.i18n.registerUIStrings('ui/legacy/components/data_grid/DataGrid.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

const elementToLongTextMap = new WeakMap<Element, string>();

const nodeToColumnIdMap = new WeakMap<Node, string>();

const elementToPreferedWidthMap = new WeakMap<Element, number>();

const elementToPositionMap = new WeakMap<Element, number>();

const elementToIndexMap = new WeakMap<Element, number>();

export class DataGridImpl<T> extends Common.ObjectWrapper.ObjectWrapper<EventTypes<T>> {
  element: HTMLDivElement;
  displayName: string;
  private editCallback: ((arg0: any, arg1: string, arg2: any, arg3: any) => void)|undefined;
  private readonly deleteCallback: ((arg0: any) => void)|undefined;
  private readonly refreshCallback: (() => void)|undefined;
  private dataTableHeaders: {
    [x: string]: Element,
  };
  scrollContainerInternal: Element;
  private dataContainerInternal: Element;
  private readonly dataTable: Element;
  protected inline: boolean;
  private columnsArray: ColumnDescriptor[];
  columns: {
    [x: string]: ColumnDescriptor,
  };
  visibleColumnsArray: ColumnDescriptor[];
  cellClass: string|null;
  private dataTableHeadInternal: HTMLTableSectionElement;
  private readonly headerRow: Element;
  private readonly dataTableColumnGroup: Element;
  dataTableBody: Element;
  topFillerRow: HTMLElement;
  private bottomFillerRow: HTMLElement;
  private editing: boolean;
  selectedNode: DataGridNode<T>|null;
  expandNodesWhenArrowing: boolean;
  indentWidth: number;
  private resizers: HTMLElement[];
  private columnWidthsInitialized: boolean;
  private cornerWidth: number;
  private resizeMethod: ResizeMethod;
  private headerContextMenuCallback: ((arg0: UI.ContextMenu.SubMenu) => void)|null;
  private rowContextMenuCallback: ((arg0: UI.ContextMenu.ContextMenu, arg1: DataGridNode<T>) => void)|null;
  elementToDataGridNode: WeakMap<Node, DataGridNode<T>>;
  disclosureColumnId?: string;
  private sortColumnCell?: Element;
  private rootNodeInternal?: DataGridNode<T>;
  private editingNode?: DataGridNode<T>|null;
  private columnWeightsSetting?: Common.Settings.Setting<any>;
  creationNode?: CreationDataGridNode<any>;
  private currentResizer?: EventTarget|null;
  private dataGridWidget?: any;

  constructor(dataGridParameters: Parameters) {
    super();
    const {displayName, columns: columnsArray, editCallback, deleteCallback, refreshCallback} = dataGridParameters;
    this.element = document.createElement('div');
    this.element.classList.add('data-grid');
    this.element.tabIndex = 0;
    this.element.addEventListener('keydown', this.keyDown.bind(this), false);
    this.element.addEventListener('contextmenu', this.contextMenu.bind(this), true);
    this.element.addEventListener('focusin', event => {
      this.updateGridAccessibleNameOnFocus();
      event.consume(true);
    });
    this.element.addEventListener('focusout', event => {
      event.consume(true);
    });

    UI.ARIAUtils.markAsApplication(this.element);
    this.displayName = displayName;

    this.editCallback = editCallback;
    this.deleteCallback = deleteCallback;
    this.refreshCallback = refreshCallback;

    this.dataTableHeaders = {};

    this.dataContainerInternal = this.element.createChild('div', 'data-container');
    this.dataTable = this.dataContainerInternal.createChild('table', 'data');
    this.scrollContainerInternal = this.dataContainerInternal;

    // FIXME: Add a createCallback which is different from editCallback and has different
    // behavior when creating a new node.
    if (editCallback) {
      this.dataTable.addEventListener('dblclick', this.ondblclick.bind(this), false);
    }
    this.dataTable.addEventListener('mousedown', this.mouseDownInDataTable.bind(this));
    this.dataTable.addEventListener('click', this.clickInDataTable.bind(this), true);

    this.inline = false;

    this.columnsArray = [];
    this.columns = {};
    this.visibleColumnsArray = columnsArray;

    columnsArray.forEach(column => this.innerAddColumn(column));

    this.cellClass = null;

    this.dataTableColumnGroup = this.dataTable.createChild('colgroup');

    this.dataTableHeadInternal = this.dataTable.createChild('thead') as HTMLTableSectionElement;
    this.headerRow = this.dataTableHeadInternal.createChild('tr');

    this.dataTableBody = this.dataTable.createChild('tbody');
    this.topFillerRow = (this.dataTableBody.createChild('tr', 'data-grid-filler-row revealed') as HTMLElement);
    UI.ARIAUtils.setHidden(this.topFillerRow, true);
    this.bottomFillerRow = (this.dataTableBody.createChild('tr', 'data-grid-filler-row revealed') as HTMLElement);
    UI.ARIAUtils.setHidden(this.bottomFillerRow, true);

    this.setVerticalPadding(0, 0, true);
    this.refreshHeader();

    this.editing = false;
    this.selectedNode = null;
    this.expandNodesWhenArrowing = false;
    this.setRootNode(new DataGridNode<T>());

    this.setHasSelection(false);

    this.indentWidth = 15;
    this.resizers = [];
    this.columnWidthsInitialized = false;
    this.cornerWidth = CornerWidth;
    this.resizeMethod = ResizeMethod.NEAREST;

    this.headerContextMenuCallback = null;
    this.rowContextMenuCallback = null;

    this.elementToDataGridNode = new WeakMap();
  }

  private firstSelectableNode(): DataGridNode<T>|null|undefined {
    let firstSelectableNode: (DataGridNode<T>|undefined) = this.rootNodeInternal;
    while (firstSelectableNode && !firstSelectableNode.selectable) {
      firstSelectableNode = firstSelectableNode.traverseNextNode(true) || undefined;
    }
    return firstSelectableNode;
  }

  private lastSelectableNode(): DataGridNode<T>|undefined {
    let lastSelectableNode: DataGridNode<T>|(DataGridNode<T>| undefined) = this.rootNodeInternal;
    let iterator: (DataGridNode<T>|undefined) = this.rootNodeInternal;
    while (iterator) {
      if (iterator.selectable) {
        lastSelectableNode = iterator;
      }
      iterator = iterator.traverseNextNode(true) || undefined;
    }
    return lastSelectableNode;
  }

  setElementContent(element: Element, value: string): void {
    const columnId = this.columnIdFromNode(element);
    if (!columnId) {
      return;
    }
    const column = this.columns[columnId];
    const parentElement = element.parentElement;
    let gridNode;
    if (parentElement) {
      gridNode = this.elementToDataGridNode.get(parentElement);
    }
    if (column.dataType === DataType.BOOLEAN) {
      DataGridImpl.setElementBoolean(element, Boolean(value), gridNode);
    } else if (value !== null) {
      DataGridImpl.setElementText(element, value, Boolean(column.longText), gridNode);
    }
  }

  static setElementText(element: Element, newText: string, longText: boolean, gridNode?: DataGridNode<string>): void {
    if (longText && newText.length > 1000) {
      element.textContent = Platform.StringUtilities.trimEndWithMaxLength(newText, 1000);
      UI.Tooltip.Tooltip.install(element as HTMLElement, newText);
      elementToLongTextMap.set(element, newText);
    } else {
      element.textContent = newText;
      UI.Tooltip.Tooltip.install(element as HTMLElement, '');
      elementToLongTextMap.delete(element);
    }
    if (gridNode) {
      DataGridImpl.updateNodeAccessibleText(gridNode);
    }
  }

  static setElementBoolean(element: Element, value: boolean, gridNode?: DataGridNode<string>): void {
    element.textContent = value ? '\u2713' : '';
    UI.Tooltip.Tooltip.install(element as HTMLElement, '');
    if (gridNode) {
      DataGridImpl.updateNodeAccessibleText(gridNode);
    }
  }

  static updateNodeAccessibleText(gridNode: DataGridNode<string>): void {
    let accessibleText = '';
    let colElement: Element|null = gridNode.elementInternal?.children[0] || null;
    if (!colElement) {
      return;
    }

    while (colElement && !colElement.classList.contains('corner')) {
      let columnClass = null;
      for (const cssClass of colElement.classList) {
        if (cssClass.includes('-column')) {
          columnClass = cssClass.substring(0, cssClass.indexOf('-column'));
          break;
        }
      }
      if (columnClass && gridNode.dataGrid) {
        const colName = gridNode.dataGrid.columns[columnClass];
        if (colName) {
          accessibleText += `${colName.title}: ${colElement.textContent}, `;
        }
      }
      colElement = colElement.nextElementSibling;
    }

    if (accessibleText.length > 0) {
      // Trim off comma and space at the end.
      accessibleText = accessibleText.substring(0, accessibleText.length - 2);
    }
    gridNode.nodeAccessibleText = accessibleText;
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

  announceSelectedGridNode(): void {
    // Only alert if the datagrid has focus
    if (this.element === Platform.DOMUtilities.deepActiveElement(this.element.ownerDocument) && this.selectedNode &&
        this.selectedNode.existingElement()) {
      // Update the expand/collapse state for the current selected node
      let expandText;
      if (this.selectedNode.hasChildren()) {
        expandText = this.selectedNode.expanded ? i18nString(UIStrings.expanded) : i18nString(UIStrings.collapsed);
      }
      const accessibleText =
          expandText ? `${this.selectedNode.nodeAccessibleText}, ${expandText}` : this.selectedNode.nodeAccessibleText;
      UI.ARIAUtils.alert(accessibleText);
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
      const rowHeader = i18nString(UIStrings.sRowS, {PH1: this.displayName, PH2: expandText});
      accessibleText = `${rowHeader} ${this.selectedNode.nodeAccessibleText}`;
    } else {
      // 2) If there is no selected item - Read the name of the grid and give instructions
      if (!this.rootNodeInternal) {
        return;
      }
      const children = this.enumerateChildren(this.rootNodeInternal, [], 1);
      const items = i18nString(UIStrings.rowsS, {PH1: children.length});
      accessibleText = i18nString(UIStrings.sSUseTheUpAndDownArrowKeysTo, {PH1: this.displayName, PH2: items});
    }
    UI.ARIAUtils.alert(accessibleText);
  }

  private innerAddColumn(column: ColumnDescriptor, position?: number): void {
    column.defaultWeight = column.weight;

    const columnId = column.id;
    if (columnId in this.columns) {
      this.innerRemoveColumn(columnId);
    }

    if (position === undefined) {
      position = this.columnsArray.length;
    }

    this.columnsArray.splice(position, 0, column);
    this.columns[columnId] = column;
    if (column.disclosure) {
      this.disclosureColumnId = columnId;
    }

    const cell = document.createElement('th');
    cell.setAttribute(
        'jslog',
        `${
            VisualLogging.tableHeader()
                .track({click: column.sortable, resize: true})
                .context(Platform.StringUtilities.toKebabCase(columnId))}`);
    cell.className = columnId + '-column';
    nodeToColumnIdMap.set(cell, columnId);
    this.dataTableHeaders[columnId] = cell;

    const div = document.createElement('div');
    if (column.titleDOMFragment) {
      div.appendChild(column.titleDOMFragment);
    } else {
      div.textContent = column.title || null;
    }
    cell.appendChild(div);

    if (column.sort) {
      cell.classList.add(column.sort);
      this.sortColumnCell = cell;
    }

    if (column.sortable) {
      cell.addEventListener('click', this.clickInHeaderCell.bind(this), false);
      cell.classList.add('sortable');
      const icon = document.createElement('span');
      icon.className = 'sort-order-icon';
      cell.createChild('div', 'sort-order-icon-container').appendChild(icon);
    }
  }

  addColumn(column: ColumnDescriptor, position?: number): void {
    this.innerAddColumn(column, position);
  }

  private innerRemoveColumn(columnId: string): void {
    const column = this.columns[columnId];
    if (!column) {
      return;
    }
    delete this.columns[columnId];
    const index = this.columnsArray.findIndex(columnConfig => columnConfig.id === columnId);
    this.columnsArray.splice(index, 1);
    const cell = this.dataTableHeaders[columnId];
    if (cell.parentElement) {
      cell.parentElement.removeChild(cell);
    }
    delete this.dataTableHeaders[columnId];
  }

  removeColumn(columnId: string): void {
    this.innerRemoveColumn(columnId);
  }

  setCellClass(cellClass: string): void {
    this.cellClass = cellClass;
  }

  private refreshHeader(): void {
    this.dataTableColumnGroup.removeChildren();
    this.headerRow.removeChildren();
    this.topFillerRow.removeChildren();
    this.bottomFillerRow.removeChildren();

    for (let i = 0; i < this.visibleColumnsArray.length; ++i) {
      const column = this.visibleColumnsArray[i];
      const columnId = column.id;
      const dataColumn = (this.dataTableColumnGroup.createChild('col') as HTMLElement);
      if (column.width) {
        dataColumn.style.width = column.width;
      }
      this.headerRow.appendChild(this.dataTableHeaders[columnId]);
      const topFillerRowCell = (this.topFillerRow.createChild('th', 'top-filler-td') as HTMLTableCellElement);
      topFillerRowCell.textContent = column.title || null;
      topFillerRowCell.scope = 'col';
      const bottomFillerRowChild = this.bottomFillerRow.createChild('td', 'bottom-filler-td');
      nodeToColumnIdMap.set(bottomFillerRowChild, columnId);
    }

    const headerCorner = this.headerRow.createChild('th', 'corner');
    UI.ARIAUtils.setHidden(headerCorner, true);

    const topFillerRowCornerCell = (this.topFillerRow.createChild('th', 'corner') as HTMLTableCellElement);
    topFillerRowCornerCell.classList.add('top-filler-td');
    topFillerRowCornerCell.scope = 'col';

    this.bottomFillerRow.createChild('td', 'corner').classList.add('bottom-filler-td');

    this.dataTableColumnGroup.createChild('col', 'corner');
  }

  protected setVerticalPadding(top: number, bottom: number, isConstructorTime: boolean = false): void {
    const topPx = top + 'px';
    const bottomPx = (top || bottom) ? bottom + 'px' : 'auto';
    if (this.topFillerRow.style.height === topPx && this.bottomFillerRow.style.height === bottomPx) {
      return;
    }
    this.topFillerRow.style.height = topPx;
    this.bottomFillerRow.style.height = bottomPx;
    if (!isConstructorTime) {
      this.dispatchEventToListeners(Events.PADDING_CHANGED);
    }
  }

  protected setRootNode(rootNode: DataGridNode<T>): void {
    if (this.rootNodeInternal) {
      this.rootNodeInternal.removeChildren();
      this.rootNodeInternal.dataGrid = null;
      this.rootNodeInternal.isRoot = false;
    }
    this.rootNodeInternal = rootNode;
    rootNode.isRoot = true;
    rootNode.setHasChildren(false);
    rootNode.expandedInternal = true;
    rootNode.revealedInternal = true;
    rootNode.selectable = false;
    rootNode.dataGrid = this;
  }

  rootNode(): DataGridNode<T> {
    let rootNode: DataGridNode<T>|(DataGridNode<T>| undefined) = this.rootNodeInternal;
    if (!rootNode) {
      rootNode = new DataGridNode();
      this.setRootNode(rootNode);
    }
    return rootNode;
  }

  private ondblclick(event: Event): void {
    if (this.editing || this.editingNode) {
      return;
    }

    const columnId = this.columnIdFromNode((event.target as Node));
    if (!columnId || !this.columns[columnId].editable) {
      return;
    }
    this.startEditing((event.target as Node));
  }

  private startEditingColumnOfDataGridNode(node: DataGridNode<T>, cellIndex: number): void {
    this.editing = true;
    this.editingNode = node;
    this.editingNode.select();

    const editingNodeElement = this.editingNode.element();
    if (!editingNodeElement) {
      return;
    }
    const element = editingNodeElement.children[cellIndex];
    const elementLongText = elementToLongTextMap.get(element);
    if (elementLongText) {
      element.textContent = elementLongText;
    }
    const column = this.visibleColumnsArray[cellIndex];
    if (column.dataType === DataType.BOOLEAN) {
      const checkboxLabel = UI.UIUtils.CheckboxLabel.create(undefined, (node.data[column.id] as boolean));
      UI.ARIAUtils.setLabel(checkboxLabel, column.title || '');

      let hasChanged = false;
      checkboxLabel.style.height = '100%';
      const checkboxElement = checkboxLabel.checkboxElement;
      checkboxElement.classList.add('inside-datagrid');
      const initialValue = checkboxElement.checked;

      checkboxElement.addEventListener('change', () => {
        hasChanged = true;
        this.editingCommitted(element, checkboxElement.checked, initialValue, undefined, 'forward');
      }, false);

      checkboxElement.addEventListener('keydown', event => {
        if (event.key === 'Tab') {
          event.consume(true);
          hasChanged = true;
          return this.editingCommitted(
              element, checkboxElement.checked, initialValue, undefined, event.shiftKey ? 'backward' : 'forward');
        }
        if (event.key === ' ') {
          event.consume(true);
          checkboxElement.checked = !checkboxElement.checked;
        } else if (event.key === 'Enter') {
          event.consume(true);
          hasChanged = true;
          this.editingCommitted(element, checkboxElement.checked, initialValue, undefined, 'forward');
        }
      }, false);

      checkboxElement.addEventListener('blur', () => {
        if (hasChanged) {
          return;
        }
        this.editingCommitted(element, checkboxElement.checked, checkboxElement.checked, undefined, 'next');
      }, false);

      element.innerHTML = '';
      element.appendChild(checkboxLabel);
      checkboxElement.focus();
    } else {
      UI.InplaceEditor.InplaceEditor.startEditing(element, this.startEditingConfig(element));
      const componentSelection = element.getComponentSelection();
      if (componentSelection) {
        componentSelection.selectAllChildren(element);
      }
    }
  }

  startEditingNextEditableColumnOfDataGridNode(node: DataGridNode<T>, columnIdentifier: string, inclusive?: boolean):
      void {
    const column = this.columns[columnIdentifier];
    const cellIndex = this.visibleColumnsArray.indexOf(column);
    const nextEditableColumn = this.nextEditableColumn(cellIndex, false, inclusive);
    if (nextEditableColumn !== -1) {
      this.startEditingColumnOfDataGridNode(node, nextEditableColumn);
    }
  }

  private startEditing(target: Node): void {
    const element = (UI.UIUtils.enclosingNodeOrSelfWithNodeName(target, 'td') as Element | null);
    if (!element) {
      return;
    }

    this.editingNode = this.dataGridNodeFromNode(target);
    if (!this.editingNode) {
      if (!this.creationNode) {
        return;
      }
      this.editingNode = this.creationNode;
    }

    // Force editing the 1st column when editing the creation node
    if (this.editingNode instanceof CreationDataGridNode && this.editingNode.isCreationNode) {
      this.startEditingColumnOfDataGridNode(this.editingNode, this.nextEditableColumn(-1));
      return;
    }

    const columnId = this.columnIdFromNode(target);
    if (!columnId) {
      return;
    }
    const column = this.columns[columnId];
    const cellIndex = this.visibleColumnsArray.indexOf(column);
    if (this.editingNode) {
      this.startEditingColumnOfDataGridNode(this.editingNode, cellIndex);
    }
  }

  renderInline(): void {
    this.element.classList.add('inline');
    this.cornerWidth = 0;
    this.inline = true;
    this.updateWidths();
  }

  private startEditingConfig(_element: Element): UI.InplaceEditor.Config<any> {
    return new UI.InplaceEditor.Config(this.editingCommitted.bind(this), this.editingCancelled.bind(this), undefined);
  }

  private editingCommitted(
      element: Element,
      newText: any,
      _oldText: string|boolean|null,
      _context: string|undefined,
      moveDirection: string,
      ): void {
    const columnId = this.columnIdFromNode(element);
    if (!columnId) {
      this.editingCancelled(element);
      return;
    }
    const column = this.columns[columnId];
    const cellIndex = this.visibleColumnsArray.indexOf(column);
    if (!this.editingNode) {
      return;
    }
    const valueBeforeEditing = this.editingNode.data[columnId];
    const currentEditingNode = this.editingNode;

    function moveToNextIfNeeded(this: DataGridImpl<T>, wasChange: boolean): void {
      if (!moveDirection) {
        return;
      }

      if (moveDirection === 'forward') {
        const firstEditableColumn = this.nextEditableColumn(-1);
        const isCreationNode = currentEditingNode instanceof CreationDataGridNode && currentEditingNode.isCreationNode;
        if (isCreationNode && cellIndex === firstEditableColumn && !wasChange) {
          return;
        }

        const nextEditableColumn = this.nextEditableColumn(cellIndex);
        if (nextEditableColumn !== -1) {
          this.startEditingColumnOfDataGridNode(currentEditingNode, nextEditableColumn);
          return;
        }

        const nextDataGridNode = currentEditingNode.traverseNextNode(true, null, true);
        if (nextDataGridNode) {
          this.startEditingColumnOfDataGridNode(nextDataGridNode, firstEditableColumn);
          return;
        }
        if (isCreationNode && wasChange && this.creationNode) {
          this.addCreationNode(false);
          this.startEditingColumnOfDataGridNode(this.creationNode, firstEditableColumn);
          return;
        }
        return;
      }

      if (moveDirection === 'backward') {
        const prevEditableColumn = this.nextEditableColumn(cellIndex, true);
        if (prevEditableColumn !== -1) {
          this.startEditingColumnOfDataGridNode(currentEditingNode, prevEditableColumn);
          return;
        }

        const lastEditableColumn = this.nextEditableColumn(this.visibleColumnsArray.length, true);
        const nextDataGridNode = currentEditingNode.traversePreviousNode(true, true);
        if (nextDataGridNode) {
          this.startEditingColumnOfDataGridNode(nextDataGridNode, lastEditableColumn);
        }
        return;
      }
    }

    // Show trimmed text after editing.
    this.setElementContent(element, newText);

    if (valueBeforeEditing === newText) {
      this.editingCancelled(element);
      moveToNextIfNeeded.call(this, false);
      return;
    }

    // Update the text in the datagrid that we typed
    this.editingNode.data[columnId] = newText;
    if (!this.editCallback) {
      return;
    }
    // Make the callback - expects an editing node (table row), the column number that is being edited,
    // the text that used to be there, and the new text.
    this.editCallback(this.editingNode, columnId, valueBeforeEditing, newText);

    if (this.editingNode instanceof CreationDataGridNode && this.editingNode.isCreationNode) {
      this.addCreationNode(false);
    }

    this.editingCancelled(element);
    moveToNextIfNeeded.call(this, true);
  }

  private editingCancelled(_element: Element): void {
    this.editing = false;
    this.editingNode = null;
  }

  private nextEditableColumn(cellIndex: number, moveBackward?: boolean, inclusive?: boolean): number {
    const increment = moveBackward ? -1 : 1;
    const start = inclusive ? cellIndex : cellIndex + increment;
    const columns = this.visibleColumnsArray;
    for (let i = start; (i >= 0) && (i < columns.length); i += increment) {
      if (columns[i].editable) {
        return i;
      }
    }
    return -1;
  }

  sortColumnId(): string|null {
    if (!this.sortColumnCell) {
      return null;
    }
    return nodeToColumnIdMap.get(this.sortColumnCell) || null;
  }

  sortOrder(): string|null {
    if (!this.sortColumnCell || this.sortColumnCell.classList.contains(Order.Ascending)) {
      return Order.Ascending;
    }
    if (this.sortColumnCell.classList.contains(Order.Descending)) {
      return Order.Descending;
    }
    return null;
  }

  isSortOrderAscending(): boolean {
    return !this.sortColumnCell || this.sortColumnCell.classList.contains(Order.Ascending);
  }

  private autoSizeWidths(widths: number[], minPercent: number, maxPercent?: number): number[] {
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
    for (let i = 0; i < this.columnsArray.length; ++i) {
      widths.push((this.columnsArray[i].title || '').length);
    }

    maxDescentLevel = maxDescentLevel || 0;
    if (!this.rootNodeInternal) {
      return;
    }
    const children = this.enumerateChildren(this.rootNodeInternal, [], maxDescentLevel + 1);
    for (let i = 0; i < children.length; ++i) {
      const node = children[i];
      for (let j = 0; j < this.columnsArray.length; ++j) {
        const text = String(node.data[this.columnsArray[j].id]);
        if (text.length > widths[j]) {
          widths[j] = text.length;
        }
      }
    }

    widths = this.autoSizeWidths(widths, minPercent, maxPercent);

    for (let i = 0; i < this.columnsArray.length; ++i) {
      this.columnsArray[i].weight = widths[i];
    }
    this.columnWidthsInitialized = false;
    this.updateWidths();
  }

  private enumerateChildren(rootNode: DataGridNode<T>, result: DataGridNode<T>[], maxLevel: number): DataGridNode<T>[] {
    if (!rootNode.isRoot) {
      result.push(rootNode);
    }
    if (!maxLevel) {
      return [];
    }
    for (let i = 0; i < rootNode.children.length; ++i) {
      this.enumerateChildren(rootNode.children[i], result, maxLevel - 1);
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
    if (!this.columnWidthsInitialized && this.element.offsetWidth) {
      // Give all the columns initial widths now so that during a resize,
      // when the two columns that get resized get a percent value for
      // their widths, all the other columns already have percent values
      // for their widths.

      // Use container size to avoid changes of table width caused by change of column widths.
      const tableWidth = this.element.offsetWidth - this.cornerWidth;
      const cells = this.dataTableHeadInternal.rows[0].cells;
      const numColumns = cells.length - 1;  // Do not process corner column.
      for (let i = 0; i < numColumns; i++) {
        const column = this.visibleColumnsArray[i];
        if (!column.weight) {
          column.weight = 100 * this.getPreferredWidth(i) / tableWidth || 10;
        }
      }
      this.columnWidthsInitialized = true;
    }
    this.applyColumnWeights();
  }

  indexOfVisibleColumn(columnId: string): number {
    return this.visibleColumnsArray.findIndex(column => column.id === columnId);
  }

  setName(name: string): void {
    this.columnWeightsSetting =
        Common.Settings.Settings.instance().createSetting('data-grid-' + name + '-column-weights', {});
    this.loadColumnWeights();
  }

  private resetColumnWeights(): void {
    for (const column of this.columnsArray) {
      if (!column.defaultWeight) {
        continue;
      }
      column.weight = column.defaultWeight;
    }
    this.applyColumnWeights();
    this.saveColumnWeights();
  }

  private loadColumnWeights(): void {
    if (!this.columnWeightsSetting) {
      return;
    }
    const weights = this.columnWeightsSetting.get();
    for (let i = 0; i < this.columnsArray.length; ++i) {
      const column = this.columnsArray[i];
      const weight = weights[column.id];
      if (weight) {
        column.weight = weight;
      }
    }
    this.applyColumnWeights();
  }

  private saveColumnWeights(): void {
    if (!this.columnWeightsSetting) {
      return;
    }
    const weights: {
      [x: string]: any,
    } = {};
    for (let i = 0; i < this.columnsArray.length; ++i) {
      const column = this.columnsArray[i];
      weights[column.id] = column.weight;
    }
    this.columnWeightsSetting.set(weights);
  }

  wasShown(): void {
    this.loadColumnWeights();
  }

  willHide(): void {
  }

  private getPreferredWidth(columnIndex: number): number {
    return elementToPreferedWidthMap.get(this.dataTableColumnGroup.children[columnIndex]) ||
        this.dataTableHeadInternal.rows[0].cells[columnIndex].offsetWidth;
  }

  private applyColumnWeights(): void {
    let tableWidth = this.element.offsetWidth - this.cornerWidth;
    if (tableWidth <= 0) {
      return;
    }

    let sumOfWeights = 0.0;
    const fixedColumnWidths = [];
    for (let i = 0; i < this.visibleColumnsArray.length; ++i) {
      const column = this.visibleColumnsArray[i];
      if (column.fixedWidth) {
        const width = this.getPreferredWidth(i);
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
      this.setPreferredWidth(i, width);
    }

    this.positionResizers();
  }

  setColumnsVisibility(columnsVisibility: Set<string>): void {
    this.visibleColumnsArray = [];
    for (const column of this.columnsArray) {
      if (columnsVisibility.has(column.id)) {
        this.visibleColumnsArray.push(column);
      }
    }
    this.refreshHeader();
    this.applyColumnWeights();
    const nodes = this.enumerateChildren(this.rootNode(), [], -1);
    for (const node of nodes) {
      node.refresh();
    }
  }

  get scrollContainer(): HTMLElement {
    return this.scrollContainerInternal as HTMLElement;
  }

  private positionResizers(): void {
    const headerTableColumns = this.dataTableColumnGroup.children;
    const numColumns = headerTableColumns.length - 1;  // Do not process corner column.
    const left: number[] = [];
    const resizers = this.resizers;

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
      left[i] = (left[i - 1] || 0) + this.dataTableHeadInternal.rows[0].cells[i].offsetWidth;
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
            resizer, this.startResizerDragging.bind(this), this.resizerDragging.bind(this),
            this.endResizerDragging.bind(this), 'col-resize');
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
    for (const column in this.columns) {
      emptyData[column] = null;
    }
    this.creationNode = new CreationDataGridNode(emptyData, hasChildren);
    UI.ARIAUtils.alert(i18nString(UIStrings.emptyRowCreated));
    this.rootNode().appendChild(this.creationNode);
  }

  private keyDown(event: Event): void {
    if (!(event instanceof KeyboardEvent)) {
      return;
    }
    if (this.selectedNode) {
      if ((this.selectedNode.element() as HTMLElement).tabIndex < 0) {
        void VisualLogging.logKeyDown(this.selectedNode.element(), event);
      }
    }

    if (event.shiftKey || event.metaKey || event.ctrlKey || this.editing || UI.UIUtils.isEditing()) {
      return;
    }

    let handled = false;
    let nextSelectedNode;
    if (!this.selectedNode) {
      // Select the first or last node based on the arrow key direction
      if (event.key === 'ArrowUp' && !event.altKey) {
        nextSelectedNode = this.lastSelectableNode();
      } else if (event.key === 'ArrowDown' && !event.altKey) {
        nextSelectedNode = this.firstSelectableNode();
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
      } else if (this.selectedNode.parent && !this.selectedNode.parent.isRoot) {
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
      if (this.deleteCallback) {
        handled = true;
        this.deleteCallback(this.selectedNode);
      }
    } else if (event.key === 'Enter') {
      if (this.editCallback) {
        handled = true;
        const selectedNodeElement = this.selectedNode.element();
        if (!selectedNodeElement) {
          return;
        }
        this.startEditing(selectedNodeElement.children[this.nextEditableColumn(-1)]);
      } else {
        this.dispatchEventToListeners(Events.OPENED_NODE, this.selectedNode);
      }
    }

    if (nextSelectedNode) {
      nextSelectedNode.reveal();
      nextSelectedNode.select();
    }

    if (handled && this.element !== document.activeElement && !this.element.contains(document.activeElement)) {
      // crbug.com/1005449, crbug.com/1329956
      // navigational or delete keys pressed but current DataGrid panel has lost focus;
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

  private clickInHeaderCell(event: Event): void {
    const cell = UI.UIUtils.enclosingNodeOrSelfWithNodeName((event.target as Node), 'th');
    if (!cell) {
      return;
    }
    this.sortByColumnHeaderCell((cell as HTMLElement));
  }

  private sortByColumnHeaderCell(cell: Element): void {
    if (!nodeToColumnIdMap.has(cell) || !cell.classList.contains('sortable')) {
      return;
    }

    let sortOrder = Order.Ascending;
    if ((cell === this.sortColumnCell) && this.isSortOrderAscending()) {
      sortOrder = Order.Descending;
    }

    if (this.sortColumnCell) {
      this.sortColumnCell.classList.remove(Order.Ascending, Order.Descending);
    }
    this.sortColumnCell = cell;

    cell.classList.add(sortOrder);

    this.dispatchEventToListeners(Events.SORTING_CHANGED);
  }

  markColumnAsSortedBy(columnId: string, sortOrder: Order): void {
    if (this.sortColumnCell) {
      this.sortColumnCell.classList.remove(Order.Ascending, Order.Descending);
    }
    this.sortColumnCell = this.dataTableHeaders[columnId];
    this.sortColumnCell.classList.add(sortOrder);
  }

  headerTableHeader(columnId: string): Element {
    return this.dataTableHeaders[columnId];
  }

  private mouseDownInDataTable(event: Event): void {
    const target = (event.target as Node);
    const gridNode = this.dataGridNodeFromNode(target);
    if (!gridNode || !gridNode.selectable || gridNode.isEventWithinDisclosureTriangle((event as MouseEvent))) {
      return;
    }

    const columnId = this.columnIdFromNode(target);
    if (columnId && this.columns[columnId].nonSelectable) {
      return;
    }

    if ((event as MouseEvent).metaKey) {
      if (gridNode.selected) {
        gridNode.deselect();
      } else {
        gridNode.select();
      }
    } else {
      gridNode.select();
      this.dispatchEventToListeners(Events.OPENED_NODE, gridNode);
    }
  }

  setHeaderContextMenuCallback(callback: ((arg0: UI.ContextMenu.SubMenu) => void)|null): void {
    this.headerContextMenuCallback = callback;
  }

  setRowContextMenuCallback(callback: ((arg0: UI.ContextMenu.ContextMenu, arg1: DataGridNode<T>) => void)|null): void {
    this.rowContextMenuCallback = callback;
  }

  private contextMenu(event: Event): void {
    if (!(event instanceof MouseEvent)) {
      return;
    }
    const contextMenu = new UI.ContextMenu.ContextMenu(event);
    const target = (event.target as Node);

    const sortableVisibleColumns = this.visibleColumnsArray.filter(column => {
      return (column.sortable && column.title);
    });

    const sortableHiddenColumns = this.columnsArray.filter(
        column => sortableVisibleColumns.indexOf(column) === -1 && column.allowInSortByEvenWhenHidden);

    const sortableColumns = [...sortableVisibleColumns, ...sortableHiddenColumns];
    if (sortableColumns.length > 0) {
      const sortMenu =
          contextMenu.defaultSection().appendSubMenuItem(i18nString(UIStrings.sortByString), false, 'sort-by');
      for (const column of sortableColumns) {
        const headerCell = this.dataTableHeaders[column.id];
        sortMenu.defaultSection().appendItem(
            (column.title as string), this.sortByColumnHeaderCell.bind(this, headerCell), {
              jslogContext: Platform.StringUtilities.toKebabCase(column.id),
            });
      }
    }

    if (target.isSelfOrDescendant(this.dataTableHeadInternal)) {
      if (this.headerContextMenuCallback) {
        this.headerContextMenuCallback(contextMenu);
      }
      contextMenu.defaultSection().appendItem(
          i18nString(UIStrings.resetColumns), this.resetColumnWeights.bind(this), {jslogContext: 'reset-columns'});
      void contextMenu.show();
      return;
    }

    // Add header context menu to a subsection available from the body
    const headerSubMenu =
        contextMenu.defaultSection().appendSubMenuItem(i18nString(UIStrings.headerOptions), false, 'header-options');
    if (this.headerContextMenuCallback) {
      this.headerContextMenuCallback(headerSubMenu);
    }
    headerSubMenu.defaultSection().appendItem(
        i18nString(UIStrings.resetColumns), this.resetColumnWeights.bind(this), {jslogContext: 'reset-columns'});

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
    if (this.refreshCallback && (!gridNode || gridNode !== this.creationNode)) {
      contextMenu.defaultSection().appendItem(
          i18nString(UIStrings.refresh), this.refreshCallback.bind(this), {jslogContext: 'refresh'});
    }

    if (gridNode && gridNode.selectable && !gridNode.isEventWithinDisclosureTriangle(event)) {
      if (this.editCallback) {
        if (gridNode === this.creationNode) {
          const firstEditColumnIndex = this.nextEditableColumn(-1);
          const tableCellElement = gridNode.element().children[firstEditColumnIndex];
          contextMenu.defaultSection().appendItem(
              i18nString(UIStrings.addNew), this.startEditing.bind(this, tableCellElement), {jslogContext: 'add-new'});
        } else if (isContextMenuKey) {
          const firstEditColumnIndex = this.nextEditableColumn(-1);
          if (firstEditColumnIndex > -1) {
            const firstColumn = this.visibleColumnsArray[firstEditColumnIndex];
            if (firstColumn && firstColumn.editable) {
              contextMenu.defaultSection().appendItem(
                  i18nString(UIStrings.editS, {PH1: String(firstColumn.title)}),
                  this.startEditingColumnOfDataGridNode.bind(this, gridNode, firstEditColumnIndex),
                  {jslogContext: 'edit'});
            }
          }
        } else {
          const columnId = this.columnIdFromNode(target);
          if (columnId && this.columns[columnId].editable) {
            contextMenu.defaultSection().appendItem(
                i18nString(UIStrings.editS, {PH1: String(this.columns[columnId].title)}),
                this.startEditing.bind(this, target), {jslogContext: 'edit'});
          }
        }
      }
      if (this.deleteCallback && gridNode !== this.creationNode) {
        contextMenu.defaultSection().appendItem(
            i18nString(UIStrings.delete), this.deleteCallback.bind(this, gridNode), {jslogContext: 'delete'});
      }
      if (this.rowContextMenuCallback) {
        this.rowContextMenuCallback(contextMenu, gridNode);
      }
    }

    void contextMenu.show();
  }

  private clickInDataTable(event: Event): void {
    const gridNode = this.dataGridNodeFromNode((event.target as Node));
    if (!gridNode || !gridNode.hasChildren() || !gridNode.isEventWithinDisclosureTriangle((event as MouseEvent))) {
      return;
    }

    if (gridNode.expanded) {
      if ((event as MouseEvent).altKey) {
        gridNode.collapseRecursively();
      } else {
        gridNode.collapse();
      }
    } else {
      if ((event as MouseEvent).altKey) {
        gridNode.expandRecursively();
      } else {
        gridNode.expand();
      }
    }
  }

  setResizeMethod(method: ResizeMethod): void {
    this.resizeMethod = method;
  }

  private startResizerDragging(event: Event): boolean {
    this.currentResizer = event.target;
    return true;
  }

  private endResizerDragging(): void {
    this.currentResizer = null;
    this.saveColumnWeights();
  }

  private resizerDragging(event: MouseEvent): void {
    const resizer = (this.currentResizer as HTMLElement);
    if (!resizer) {
      return;
    }

    // Constrain the dragpoint to be within the containing div of the
    // datagrid.
    let dragPoint: number = event.clientX - this.element.getBoundingClientRect().left;
    let leftEdgeOfPreviousColumn = 0;
    // Constrain the dragpoint to be within the space made up by the
    // column directly to the left and the column directly to the right.
    let leftCellIndex = elementToIndexMap.get(resizer);
    if (leftCellIndex === undefined) {
      return;
    }
    let rightCellIndex: number = leftCellIndex + 1;
    for (let i = 0; i < leftCellIndex; i++) {
      leftEdgeOfPreviousColumn += this.getPreferredWidth(i);
    }

    // Differences for other resize methods
    if (this.resizeMethod === ResizeMethod.LAST) {
      rightCellIndex = this.resizers.length;
    } else if (this.resizeMethod === ResizeMethod.FIRST) {
      leftEdgeOfPreviousColumn += this.getPreferredWidth(leftCellIndex) - this.getPreferredWidth(0);
      leftCellIndex = 0;
    }

    const rightEdgeOfNextColumn =
        leftEdgeOfPreviousColumn + this.getPreferredWidth(leftCellIndex) + this.getPreferredWidth(rightCellIndex);

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

    this.setPreferredWidth(leftCellIndex, dragPoint - leftEdgeOfPreviousColumn);
    this.setPreferredWidth(rightCellIndex, rightEdgeOfNextColumn - dragPoint);

    const leftColumn = this.visibleColumnsArray[leftCellIndex];
    const rightColumn = this.visibleColumnsArray[rightCellIndex];
    if (leftColumn.weight && rightColumn.weight) {
      const sumOfWeights = leftColumn.weight + rightColumn.weight;
      const delta = rightEdgeOfNextColumn - leftEdgeOfPreviousColumn;
      leftColumn.weight = (dragPoint - leftEdgeOfPreviousColumn) * sumOfWeights / delta;
      rightColumn.weight = (rightEdgeOfNextColumn - dragPoint) * sumOfWeights / delta;
    }

    this.positionResizers();
    this.updateWidths();
    event.preventDefault();
  }

  private setPreferredWidth(columnIndex: number, width: number): void {
    const dataTableChildElement = (this.dataTableColumnGroup.children[columnIndex] as HTMLElement);
    elementToPreferedWidthMap.set(dataTableChildElement, width);
    dataTableChildElement.style.width = width + 'px';
  }

  columnOffset(columnId: string): number {
    if (!this.element.offsetWidth) {
      return 0;
    }
    for (let i = 1; i < this.visibleColumnsArray.length; ++i) {
      if (columnId === this.visibleColumnsArray[i].id) {
        if (this.resizers[i - 1]) {
          return elementToPositionMap.get(this.resizers[i - 1]) || 0;
        }
      }
    }
    return 0;
  }

  asWidget(element?: HTMLElement): DataGridWidget<T> {
    if (!this.dataGridWidget) {
      this.dataGridWidget = new DataGridWidget(this, element);
    }
    return this.dataGridWidget;
  }

  topFillerRowElement(): HTMLElement {
    return this.topFillerRow;
  }

  // Note on the following methods:
  // The header row is a child of the scrollable container, and uses position: sticky
  // so it can visually obscure other elements below it in the grid. We need to manually
  // subtract the header's height when calculating the actual client area in which
  // data rows are visible. However, if a caller has set a different scroll container
  // then we report 0 height and the caller is expected to ensure their chosen scroll
  // container's height matches the visible scrollable data area as seen by the user.

  protected headerHeightInScroller(): number {
    return this.scrollContainer === this.dataContainerInternal ? this.headerHeight() : 0;
  }

  headerHeight(): number {
    return this.dataTableHeadInternal.offsetHeight;
  }

  revealNode(element: HTMLElement): void {
    element.scrollIntoViewIfNeeded(false);
    // The header row is a child of the scrollable container, and uses position: sticky
    // so scrollIntoViewIfNeeded may place the element behind it. If the element is
    // obscured by the header, adjust the scrollTop so that the element is fully revealed.
    if (element.offsetTop - this.scrollContainer.scrollTop < this.headerHeight()) {
      this.scrollContainer.scrollTop = element.offsetTop - this.headerHeight();
    }
  }
}

// Keep in sync with .data-grid col.corner style rule.
export const CornerWidth = 14;

export const enum Events {
  SELECTED_NODE = 'SelectedNode',
  DESELECTED_NODE = 'DeselectedNode',
  OPENED_NODE = 'OpenedNode',
  SORTING_CHANGED = 'SortingChanged',
  PADDING_CHANGED = 'PaddingChanged',
}

export type EventTypes<T> = {
  [Events.SELECTED_NODE]: DataGridNode<T>,
  [Events.DESELECTED_NODE]: void,
  [Events.OPENED_NODE]: DataGridNode<T>,
  [Events.SORTING_CHANGED]: void,
  [Events.PADDING_CHANGED]: void,
};

export enum Order {
  /* eslint-disable @typescript-eslint/naming-convention -- Used by web_tests. */
  Ascending = 'sort-ascending',
  Descending = 'sort-descending',
  /* eslint-enable @typescript-eslint/naming-convention */
}

export const enum Align {
  CENTER = 'center',
  RIGHT = 'right',
}

export const enum DataType {
  STRING = 'String',
  BOOLEAN = 'Boolean',
}

export const ColumnResizePadding = 34;
export const CenterResizerOverBorderAdjustment = 3;

export const enum ResizeMethod {
  NEAREST = 'nearest',
  FIRST = 'first',
  LAST = 'last',
}

export type DataGridData = {
  [key: string]: any,
};

export class DataGridNode<T> {
  elementInternal: HTMLElement|null;
  expandedInternal: boolean;
  private selectedInternal: boolean;
  private dirty: boolean;
  private inactive: boolean;
  key!: string;
  private depthInternal!: number|undefined;
  revealedInternal!: boolean|undefined;
  protected attachedInternal: boolean;
  private savedPosition: {
    parent: DataGridNode<T>,
    index: number,
  }|null;
  private shouldRefreshChildrenInternal: boolean;
  private dataInternal: DataGridData;
  private hasChildrenInternal: boolean;
  children: DataGridNode<T>[];
  dataGrid: DataGridImpl<T>|null;
  parent: DataGridNode<T>|null;
  previousSibling: DataGridNode<T>|null;
  nextSibling: DataGridNode<T>|null;
  #disclosureToggleHitBoxWidth: number = 20;
  selectable: boolean;
  isRoot: boolean;
  nodeAccessibleText: string;
  cellAccessibleTextMap: Map<string, string>;
  isCreationNode: boolean;

  constructor(data?: DataGridData|null, hasChildren?: boolean) {
    this.elementInternal = null;
    this.expandedInternal = false;
    this.selectedInternal = false;
    this.dirty = false;
    this.inactive = false;
    this.attachedInternal = false;
    this.savedPosition = null;
    this.shouldRefreshChildrenInternal = true;
    this.dataInternal = data || {};
    this.hasChildrenInternal = hasChildren || false;
    this.children = [];
    this.dataGrid = null;
    this.parent = null;
    this.previousSibling = null;
    this.nextSibling = null;

    this.selectable = true;

    this.isRoot = false;

    this.nodeAccessibleText = '';
    this.cellAccessibleTextMap = new Map();
    this.isCreationNode = false;
  }

  element(): Element {
    if (!this.elementInternal) {
      const element = this.createElement();
      this.createCells(element);
    }
    return this.elementInternal as Element;
  }

  protected createElement(): Element {
    this.elementInternal = document.createElement('tr');
    this.elementInternal.setAttribute(
        'jslog', `${VisualLogging.tableRow().track({keydown: 'ArrowUp|ArrowDown|ArrowLeft|ArrowRight|Enter|Space'})}`);
    this.elementInternal.classList.add('data-grid-data-grid-node');
    if (this.dataGrid) {
      this.dataGrid.elementToDataGridNode.set(this.elementInternal, this);
    }

    if (this.hasChildrenInternal) {
      this.elementInternal.classList.add('parent');
    }
    if (this.expanded) {
      this.elementInternal.classList.add('expanded');
    }
    if (this.selected) {
      this.elementInternal.classList.add('selected');
    }
    if (this.revealed) {
      this.elementInternal.classList.add('revealed');
    }
    if (this.dirty) {
      this.elementInternal.classList.add('dirty');
    }
    if (this.inactive) {
      this.elementInternal.classList.add('inactive');
    }
    if (this.isCreationNode) {
      this.elementInternal.classList.add('creation-node');
    }
    return this.elementInternal;
  }

  existingElement(): Element|null {
    return this.elementInternal || null;
  }

  protected resetElement(): void {
    this.elementInternal = null;
  }

  protected createCells(element: Element): void {
    element.removeChildren();
    if (!this.dataGrid || !this.parent) {
      return;
    }
    const columnsArray = this.dataGrid.visibleColumnsArray;
    const accessibleTextArray = [];
    // Add depth if node is part of a tree
    if (this.hasChildrenInternal || !this.parent.isRoot) {
      accessibleTextArray.push(i18nString(UIStrings.levelS, {PH1: this.depth + 1}));
    }
    for (let i = 0; i < columnsArray.length; ++i) {
      const column = columnsArray[i];
      const cell = element.appendChild(this.createCell(column.id));
      // Add each visibile cell to the node's accessible text by gathering 'Column Title: content'

      if (column.dataType === DataType.BOOLEAN && this.data[column.id] === true) {
        this.setCellAccessibleName(i18nString(UIStrings.checked), cell, column.id);
      }

      accessibleTextArray.push(`${column.title}: ${this.cellAccessibleTextMap.get(column.id) || cell.textContent}`);
    }
    this.nodeAccessibleText = accessibleTextArray.join(', ');

    const cornerCell = this.createTDWithClass('corner');
    UI.ARIAUtils.setHidden(cornerCell, true);
    element.appendChild(cornerCell);
  }

  get data(): DataGridData {
    return this.dataInternal;
  }

  set data(x: DataGridData) {
    this.dataInternal = x || {};
    this.refresh();
  }

  get revealed(): boolean {
    if (this.revealedInternal !== undefined) {
      return this.revealedInternal;
    }

    let currentAncestor: (DataGridNode<T>|null) = this.parent;
    while (currentAncestor && !currentAncestor.isRoot) {
      if (!currentAncestor.expanded) {
        this.revealedInternal = false;
        return false;
      }

      currentAncestor = currentAncestor.parent;
    }

    this.revealed = true;
    return true;
  }

  set revealed(x: boolean) {
    if (this.revealedInternal === x) {
      return;
    }

    this.revealedInternal = x;

    if (this.elementInternal) {
      this.elementInternal.classList.toggle('revealed', this.revealedInternal);
    }

    for (let i = 0; i < this.children.length; ++i) {
      this.children[i].revealed = x && this.expanded;
    }
  }

  isDirty(): boolean {
    return this.dirty;
  }

  setDirty(dirty: boolean): void {
    if (this.dirty === dirty) {
      return;
    }
    this.dirty = dirty;
    if (!this.elementInternal) {
      return;
    }
    if (dirty) {
      this.elementInternal.classList.add('dirty');
    } else {
      this.elementInternal.classList.remove('dirty');
    }
  }

  isInactive(): boolean {
    return this.inactive;
  }

  setInactive(inactive: boolean): void {
    if (this.inactive === inactive) {
      return;
    }
    this.inactive = inactive;
    if (!this.elementInternal) {
      return;
    }
    if (inactive) {
      this.elementInternal.classList.add('inactive');
    } else {
      this.elementInternal.classList.remove('inactive');
    }
  }

  hasChildren(): boolean {
    return this.hasChildrenInternal;
  }

  setHasChildren(x: boolean): void {
    if (this.hasChildrenInternal === x) {
      return;
    }

    this.hasChildrenInternal = x;

    if (!this.elementInternal) {
      return;
    }

    this.elementInternal.classList.toggle('parent', this.hasChildrenInternal);
    this.elementInternal.classList.toggle('expanded', this.hasChildrenInternal && this.expanded);
  }

  get depth(): number {
    if (this.depthInternal !== undefined) {
      return this.depthInternal;
    }
    if (this.parent && !this.parent.isRoot) {
      this.depthInternal = this.parent.depth + 1;
    } else {
      this.depthInternal = 0;
    }
    return this.depthInternal;
  }

  get leftPadding(): number {
    return this.depth * (this.dataGrid ? this.dataGrid.indentWidth : 1);
  }

  get shouldRefreshChildren(): boolean {
    return this.shouldRefreshChildrenInternal;
  }

  set shouldRefreshChildren(x: boolean) {
    this.shouldRefreshChildrenInternal = x;
    if (x && this.expanded) {
      this.expand();
    }
  }

  get selected(): boolean {
    return this.selectedInternal;
  }

  set selected(x: boolean) {
    if (x) {
      this.select();
    } else {
      this.deselect();
    }
  }

  get expanded(): boolean {
    return this.expandedInternal;
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
      this.elementInternal = null;
    }
    if (!this.elementInternal) {
      return;
    }
    this.createCells(this.elementInternal);
  }

  createTDWithClass(className: string): HTMLElement {
    const cell = document.createElement('td');
    if (className) {
      cell.className = className;
    }
    const cellClass = this.dataGrid ? this.dataGrid.cellClass : null;
    if (cellClass) {
      cell.classList.add(cellClass);
    }
    return cell;
  }

  createTD(columnId: string): HTMLElement {
    const cell = this.createTDWithClass(columnId + '-column');
    nodeToColumnIdMap.set(cell, columnId);

    if (this.dataGrid) {
      const editableCell = this.dataGrid.columns[columnId].editable;

      cell.setAttribute(
          'jslog',
          `${
              VisualLogging.tableCell()
                  .track({
                    click: true,
                    keydown: editableCell ? 'Enter|Space|Escape' : false,
                    dblclick: editableCell,
                    change: editableCell,
                  })
                  .context(Platform.StringUtilities.toKebabCase(columnId))}`);
      const alignment = this.dataGrid.columns[columnId].align;
      if (alignment) {
        cell.classList.add(alignment);
      }

      if (columnId === this.dataGrid.disclosureColumnId) {
        cell.classList.add('disclosure');
        if (this.leftPadding) {
          cell.style.setProperty('padding-left', this.leftPadding + 'px');
        }
      }

      // Allow accessibility tool to identify the editable cell and display context menu
      if (editableCell) {
        cell.tabIndex = 0;
        cell.ariaHasPopup = 'true';
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
    UI.ARIAUtils.setLabel(cell, name);
  }

  nodeSelfHeight(): number {
    return 20;
  }

  appendChild(child: DataGridNode<T>): void {
    this.insertChild(child, this.children.length);
  }

  resetNode(onlyCaches?: boolean): void {
    // @TODO(allada) This is a hack to make sure ViewportDataGrid can clean up these caches. Try Not To Use.
    delete this.depthInternal;
    delete this.revealedInternal;
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
    this.attachedInternal = false;
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

    child.shouldRefreshChildrenInternal = true;

    let current: (DataGridNode<T>|null)|DataGridNode<T> = child.children[0];
    while (current) {
      current.resetNode(true);
      current.dataGrid = this.dataGrid;
      current.attachedInternal = false;
      current.shouldRefreshChildrenInternal = true;
      current = current.traverseNextNode(false, child, true);
    }

    if (this.expanded) {
      child.attach();
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

    child.detach();
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
      child.detach();
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
    if (this.isRoot) {
      return;
    }
    if (this.elementInternal) {
      this.elementInternal.classList.remove('expanded');
    }

    this.expandedInternal = false;
    if (this.selected && this.dataGrid) {
      this.dataGrid.announceSelectedGridNode();
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
    if (!this.hasChildrenInternal || this.expandedInternal) {
      return;
    }
    if (this.isRoot) {
      return;
    }

    if (this.revealed && !this.shouldRefreshChildrenInternal) {
      for (let i = 0; i < this.children.length; ++i) {
        this.children[i].revealed = true;
      }
    }

    if (this.shouldRefreshChildrenInternal) {
      for (let i = 0; i < this.children.length; ++i) {
        this.children[i].detach();
      }

      this.populate();

      if (this.attachedInternal) {
        for (let i = 0; i < this.children.length; ++i) {
          const child = this.children[i];
          if (this.revealed) {
            child.revealed = true;
          }
          child.attach();
        }
      }

      this.shouldRefreshChildrenInternal = false;
    }

    if (this.elementInternal) {
      this.elementInternal.classList.add('expanded');
    }
    if (this.selected && this.dataGrid) {
      this.dataGrid.announceSelectedGridNode();
    }

    this.expandedInternal = true;
  }

  expandRecursively(): void {
    let item: (DataGridNode<T>|null)|this = this;
    while (item) {
      item.expand();
      item = item.traverseNextNode(false, this);
    }
  }

  reveal(): void {
    if (this.isRoot || !this.dataGrid) {
      return;
    }
    let currentAncestor: (DataGridNode<T>|null) = this.parent;
    while (currentAncestor && !currentAncestor.isRoot) {
      if (!currentAncestor.expanded) {
        currentAncestor.expand();
      }
      currentAncestor = currentAncestor.parent;
    }

    this.dataGrid.revealNode(this.element() as HTMLElement);
  }

  select(supressSelectedEvent?: boolean): void {
    if (!this.dataGrid || !this.selectable || this.selected) {
      return;
    }

    if (this.dataGrid.selectedNode) {
      this.dataGrid.selectedNode.deselect();
    }

    this.selectedInternal = true;
    this.dataGrid.selectedNode = this;

    if (this.elementInternal) {
      this.elementInternal.classList.add('selected');
      this.elementInternal.focus();
      this.dataGrid.setHasSelection(true);
      this.dataGrid.announceSelectedGridNode();
    }

    if (!supressSelectedEvent) {
      this.dataGrid.dispatchEventToListeners(Events.SELECTED_NODE, this);
    }
  }

  revealAndSelect(): void {
    if (this.isRoot) {
      return;
    }
    this.reveal();
    this.select();
  }

  deselect(supressDeselectedEvent?: boolean): void {
    if (!this.dataGrid || this.dataGrid.selectedNode !== this || !this.selected) {
      return;
    }

    this.selectedInternal = false;
    this.dataGrid.selectedNode = null;

    if (this.elementInternal) {
      this.elementInternal.classList.remove('selected');
      this.dataGrid.setHasSelection(false);
    }

    if (!supressDeselectedEvent) {
      this.dataGrid.dispatchEventToListeners(Events.DESELECTED_NODE);
    }
  }

  traverseNextNode(skipHidden: boolean, stayWithin?: DataGridNode<T>|null, dontPopulate?: boolean, info?: {
    depthChange: number,
  }): DataGridNode<T>|null {
    if (!dontPopulate && this.hasChildrenInternal) {
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
    while (node && !node.isRoot && !((!skipHidden || node.revealed) ? node.nextSibling : null) &&
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
    if (!dontPopulate && node && node.hasChildrenInternal) {
      node.populate();
    }

    while (node &&
           ((!skipHidden || (node.revealed && node.expanded)) ? node.children[node.children.length - 1] : null)) {
      if (!dontPopulate && node.hasChildrenInternal) {
        node.populate();
      }
      node = ((!skipHidden || (node.revealed && node.expanded)) ? node.children[node.children.length - 1] : null);
    }

    if (node) {
      return node;
    }

    if (!this.parent || this.parent.isRoot) {
      return null;
    }

    return this.parent;
  }

  isEventWithinDisclosureTriangle(event: MouseEvent): boolean {
    if (!this.hasChildrenInternal) {
      return false;
    }
    const cell = UI.UIUtils.enclosingNodeOrSelfWithNodeName((event.target as Node), 'td');
    if (!cell || !(cell instanceof HTMLElement) || !cell.classList.contains('disclosure')) {
      return false;
    }

    const left = cell.getBoundingClientRect().left + this.leftPadding;
    return event.pageX >= left && event.pageX <= left + this.#disclosureToggleHitBoxWidth;
  }

  private attach(): void {
    if (!this.dataGrid || this.attachedInternal) {
      return;
    }

    this.attachedInternal = true;

    const previousNode = this.traversePreviousNode(true, true);
    const previousElement = previousNode ? previousNode.element() : this.dataGrid.topFillerRow;
    this.dataGrid.dataTableBody.insertBefore(this.element(), previousElement.nextSibling);

    if (this.expandedInternal) {
      for (let i = 0; i < this.children.length; ++i) {
        this.children[i].attach();
      }
    }
  }

  private detach(): void {
    if (!this.attachedInternal) {
      return;
    }

    this.attachedInternal = false;

    if (this.elementInternal) {
      this.elementInternal.remove();
    }

    for (let i = 0; i < this.children.length; ++i) {
      this.children[i].detach();
    }
  }

  savePosition(): void {
    if (this.savedPosition) {
      return;
    }

    if (!this.parent) {
      throw 'savePosition: Node must have a parent.';
    }
    this.savedPosition = {parent: this.parent, index: this.parent.children.indexOf(this)};
  }

  restorePosition(): void {
    if (!this.savedPosition) {
      return;
    }

    if (this.parent !== this.savedPosition.parent) {
      this.savedPosition.parent.insertChild(this, this.savedPosition.index);
    }

    this.savedPosition = null;
  }
}

export class CreationDataGridNode<T> extends DataGridNode<T> {
  override isCreationNode: boolean;
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
  readonly dataGrid: DataGridImpl<T>;
  constructor(dataGrid: DataGridImpl<T>, element?: HTMLElement) {
    super(undefined, undefined, element);
    this.dataGrid = dataGrid;
    this.element.appendChild(dataGrid.element);
    this.setDefaultFocusedElement(dataGrid.element);
  }

  override wasShown(): void {
    this.registerCSSFiles([dataGridStyles]);
    this.dataGrid.wasShown();
  }

  override willHide(): void {
    this.dataGrid.willHide();
  }

  override onResize(): void {
    this.dataGrid.onResize();
  }

  override elementsToRestoreScrollPositionsFor(): Element[] {
    return [this.dataGrid.scrollContainer];
  }
}

export interface DataGridWidgetOptions<T> {
  implParams: Parameters;
  dataGridImpl?: DataGridImpl<T>;
  markAsRoot?: boolean;
  nodes: DataGridNode<T>[];
}

export class DataGridWidgetElement<T> extends UI.Widget.WidgetElement<DataGridWidget<T>> {
  #options: DataGridWidgetOptions<T>;

  constructor() {
    super();
    // default values for options
    this.#options = {
      implParams: {
        displayName: 'dataGrid',
        columns: [],
      },
      nodes: [],
    };
  }

  set options(options: DataGridWidgetOptions<T>) {
    this.#options = options;
  }

  override createWidget(): DataGridWidget<T> {
    const {
      implParams,
      markAsRoot,
      nodes,
    } = this.#options;

    if (!this.#options.dataGridImpl) {
      this.#options.dataGridImpl = new DataGridImpl<T>(implParams);
    }

    this.#options.dataGridImpl.rootNode().removeChildren();
    for (const node of nodes) {
      this.#options.dataGridImpl.rootNode().appendChild(node);
    }

    // Translate existing DataGridImpl ("ObjectWrapper") events to DOM CustomEvents so clients can
    // use lit templates to bind listeners.
    this.#options.dataGridImpl.addEventListener(Events.SELECTED_NODE, this.#selectedNode.bind(this));
    this.#options.dataGridImpl.addEventListener(Events.DESELECTED_NODE, this.#deselectedNode.bind(this));
    this.#options.dataGridImpl.addEventListener(Events.OPENED_NODE, this.#openedNode.bind(this));
    this.#options.dataGridImpl.addEventListener(Events.SORTING_CHANGED, this.#sortingChanged.bind(this));
    this.#options.dataGridImpl.addEventListener(Events.PADDING_CHANGED, this.#paddingChanged.bind(this));
    const widget = this.#options.dataGridImpl.asWidget(this);

    if (markAsRoot) {
      widget.markAsRoot();
    }
    return widget;
  }

  #selectedNode(event: Common.EventTarget.EventTargetEvent<DataGridNode<T>>): void {
    const domEvent = new CustomEvent('selectedNode', {detail: event.data});
    this.dispatchEvent(domEvent);
  }

  #deselectedNode(): void {
    const domEvent = new CustomEvent('deselectedNode');
    this.dispatchEvent(domEvent);
  }

  #openedNode(event: Common.EventTarget.EventTargetEvent<DataGridNode<T>>): void {
    const domEvent = new CustomEvent('openedNode', {detail: event.data});
    this.dispatchEvent(domEvent);
  }

  #sortingChanged(): void {
    const domEvent = new CustomEvent('sortingChanged');
    this.dispatchEvent(domEvent);
  }

  #paddingChanged(): void {
    const domEvent = new CustomEvent('paddingChanged');
    this.dispatchEvent(domEvent);
  }
}

customElements.define('devtools-data-grid-widget', DataGridWidgetElement);

export interface Parameters {
  displayName: string;
  columns: ColumnDescriptor[];
  editCallback?: ((arg0: any, arg1: string, arg2: any, arg3: any) => void);
  deleteCallback?: ((arg0: any) => void);
  refreshCallback?: (() => void);
}
export interface ColumnDescriptor {
  id: Lowercase<string>;
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

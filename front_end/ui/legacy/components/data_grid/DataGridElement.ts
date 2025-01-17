// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Platform from '../../../../core/platform/platform.js';

import dataGridStyles from './dataGrid.css.js';
import {Align, Events as DataGridEvents} from './DataGrid.js';
import {SortableDataGrid, SortableDataGridNode} from './SortableDataGrid.js';

const DUMMY_COLUMN_ID = 'dummy';  // SortableDataGrid.create requires at least one column.

/**
 * A data grid (table) element that can be used as progressive enhancement over a <table> element.
 *
 * It can be used as
 * ```
 * <devtools-new-data-grid striped name=${'Display Name'}>
 *   <table>
 *     <tr>
 *       <th id="column-1">Column 1</th>
 *       <th id="column-2">Column 2</th>
 *     </tr>
 *     <tr>
 *       <td>Value 1</td>
 *       <td>Value 2</td>
 *     </tr>
 *   </table>
 * </devtools-new-data-grid>
 * ```
 * where a row with <th> configures the columns and rows with <td> provide the data.
 *
 * Under the hood it uses SortableDataGrid, which extends ViewportDataGrid so only
 * visible rows are layed out and sorting is provided out of the box.
 *
 * @attr striped
 * @attr displayName
 * @prop columnsOrder
 */
class DataGridElement extends HTMLElement {
  static readonly observedAttributes = ['striped', 'name'];

  #dataGrid = SortableDataGrid.create([DUMMY_COLUMN_ID], [], '') as SortableDataGrid<DataGridElementNode>;
  #mutationObserver = new MutationObserver(this.#onChange.bind(this));
  #shadowRoot: ShadowRoot;
  #columnsOrder: string[] = [];

  constructor() {
    super();
    // TODO(dsv): Move this to the data_grid.css once all the data grid usage is migrated to this web component.
    this.style.display = 'flex';
    this.#dataGrid.element.style.flex = 'auto';

    this.#shadowRoot = this.attachShadow({mode: 'open', delegatesFocus: true});
    this.#shadowRoot.appendChild(this.#dataGrid.element);
    this.#shadowRoot.adoptedStyleSheets = [dataGridStyles];

    this.#dataGrid.addEventListener(
        DataGridEvents.SELECTED_NODE,
        e => this.dispatchEvent(new CustomEvent('select', {detail: (e.data as DataGridElementNode).configElement})));
    this.#dataGrid.addEventListener(
        DataGridEvents.DESELECTED_NODE, () => this.dispatchEvent(new CustomEvent('select', {detail: null})));
    this.#dataGrid.setRowContextMenuCallback((menu, node) => {
      this.dispatchEvent(
          new CustomEvent('contextmenu', {detail: {menu, element: (node as DataGridElementNode).configElement}}));
    });

    this.#mutationObserver.observe(this, {childList: true, attributes: true, subtree: true, characterData: true});
    this.#updateColumns();
    this.#addNodes(this.querySelectorAll('tr'));
  }

  attributeChangedCallback(name: string, oldValue: string|null, newValue: string|null): void {
    if (oldValue === newValue) {
      return;
    }
    switch (name) {
      case 'striped':
        this.#dataGrid.setStriped(newValue !== 'true');
        break;
      case 'name':
        this.#dataGrid.displayName = newValue ?? '';
        break;
    }
  }

  set striped(striped: boolean) {
    this.toggleAttribute('striped', striped);
  }

  get striped(): boolean {
    return this.hasAttribute('striped');
  }

  set displayName(displayName: string) {
    this.setAttribute('name', displayName);
  }

  get displayName(): string|null {
    return this.getAttribute('name');
  }

  get columnsOrder(): string[] {
    return this.#columnsOrder;
  }

  #updateColumns(): void {
    for (const column of Object.keys(this.#dataGrid.columns)) {
      this.#dataGrid.removeColumn(column);
    }
    this.#columnsOrder = [];
    for (const column of this.querySelectorAll('th[id]') || []) {
      const id = column.id as Lowercase<string>;
      this.#columnsOrder.push(id);
      const title = (column.textContent?.trim() || '') as Platform.UIString.LocalizedString;
      const sortable = column.hasAttribute('sortable');
      const width = column.getAttribute('width') ?? undefined;
      const fixedWidth = column.hasAttribute('fixed');
      let align = column.getAttribute('align') ?? undefined;
      if (align !== Align.CENTER && align !== Align.RIGHT) {
        align = undefined;
      }
      this.#dataGrid.addColumn({id, title, sortable, fixedWidth, width, align});
    }
    if (this.#columnsOrder.length) {
      this.#dataGrid.setColumnsVisibility(new Set(this.#columnsOrder));
    }
  }

  #needUpdateColumns(mutationList: MutationRecord[]): boolean {
    for (const mutation of mutationList) {
      for (const element of [...mutation.removedNodes, ...mutation.addedNodes]) {
        if (element.nodeName === 'TH') {
          return true;
        }
      }
      if (mutation.target instanceof HTMLElement && mutation.target.closest('th')) {
        return true;
      }
    }
    return false;
  }

  #addNodes(nodes: NodeList): void {
    for (const element of nodes) {
      if (element instanceof HTMLTableRowElement && element.querySelector('td')) {
        const parentNode = this.#dataGrid.rootNode();  // TODO(dsv): support nested nodes
        const nextNode = element.nextElementSibling ? DataGridElementNode.get(element.nextElementSibling) : null;
        const index = nextNode ? parentNode.children.indexOf(nextNode) : parentNode.children.length;
        const node = new DataGridElementNode(element, this);
        parentNode.insertChild(node, index);
        if (element.hasAttribute('selected')) {
          node.select();
        }
      }
    }
  }

  #removeNodes(nodes: NodeList): void {
    for (const element of nodes) {
      if (element instanceof HTMLTableRowElement && element.querySelector('td')) {
        const node = DataGridElementNode.get(element);
        if (node) {
          node.remove();
        }
      }
    }
  }

  #updateNode(node: Node): void {
    const dataRow = node instanceof HTMLElement ? node.closest('tr') : null;
    const dataGridNode = dataRow ? DataGridElementNode.get(dataRow) : null;
    if (dataGridNode) {
      dataGridNode.refresh();
    }
  }

  #onChange(mutationList: MutationRecord[]): void {
    if (this.#needUpdateColumns(mutationList)) {
      this.#updateColumns();
    }

    for (const mutation of mutationList) {
      this.#removeNodes(mutation.removedNodes);
      this.#addNodes(mutation.addedNodes);
      this.#updateNode(mutation.target);
    }
  }
}

class DataGridElementNode extends SortableDataGridNode<DataGridElementNode> {
  static #elementToNode = new WeakMap<Element, DataGridElementNode>();
  #configElement: Element;
  #dataGridElement: DataGridElement;
  constructor(configElement: Element, dataGridElement: DataGridElement) {
    super();
    this.#configElement = configElement;
    DataGridElementNode.#elementToNode.set(configElement, this);
    this.#dataGridElement = dataGridElement;
    this.#updateData();
  }

  static get(configElement: Element|undefined): DataGridElementNode|undefined {
    return configElement && DataGridElementNode.#elementToNode.get(configElement);
  }

  get configElement(): Element {
    return this.#configElement;
  }

  #updateData(): void {
    const cells = this.#configElement.querySelectorAll('td');
    for (let i = 0; i < cells.length; ++i) {
      const cell = cells[i];
      const columnId = this.#dataGridElement.columnsOrder[i];
      this.data[columnId] = cell.dataset.value ?? cell.textContent ?? '';
    }
  }

  override refresh(): void {
    this.#updateData();
    if (this.#configElement.hasAttribute('selected')) {
      this.select();
    }
    super.refresh();
  }

  override createCell(columnId: string): HTMLElement {
    const cell = this.createTD(columnId);
    const index = this.#dataGridElement.columnsOrder.indexOf(columnId);
    const configCell = this.#configElement.querySelectorAll('td')[index];
    if (!configCell) {
      throw new Error(`Column ${columnId} not found in the data grid`);
    }
    for (const child of configCell.childNodes) {
      cell.appendChild(child.cloneNode(true));
    }
    for (const cssClass of configCell.classList) {
      cell.classList.add(cssClass);
    }
    cell.title = configCell.title;
    if (configCell.hasAttribute('aria-label')) {
      this.setCellAccessibleName(configCell.getAttribute('aria-label') || '', cell, columnId);
    }

    return cell;
  }
}

// TODO(dsv): Rename to devtools-data-grid once the other one is removed.
customElements.define('devtools-new-data-grid', DataGridElement);

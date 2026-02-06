// Copyright 2014 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @typescript-eslint/naming-convention */
import * as Platform from '../../../../core/platform/platform.js';
import { ViewportDataGrid, ViewportDataGridNode } from './ViewportDataGrid.js';
export class SortableDataGrid extends ViewportDataGrid {
    sortingFunction;
    constructor(dataGridParameters) {
        super(dataGridParameters);
        this.sortingFunction = SortableDataGrid.TrivialComparator;
        this.setRootNode((new SortableDataGridNode()));
    }
    static TrivialComparator(_a, _b) {
        return 0;
    }
    static NumericComparator(columnId, a, b) {
        const aNumber = a.getNumericValue(columnId);
        const bNumber = b.getNumericValue(columnId);
        return aNumber < bNumber ? -1 : (aNumber > bNumber ? 1 : 0);
    }
    static StringComparator(columnId, a, b) {
        const aValue = a.data[columnId];
        const bValue = b.data[columnId];
        const aString = aValue instanceof Node ? aValue.textContent : String(aValue);
        const bString = bValue instanceof Node ? bValue.textContent : String(bValue);
        if (!aString || !bString) {
            return 0;
        }
        return aString < bString ? -1 : (aString > bString ? 1 : 0);
    }
    static Comparator(comparator, reverseMode, a, b) {
        if (a.isCreationNode && !b.isCreationNode) {
            return 1;
        }
        if (!a.isCreationNode && b.isCreationNode) {
            return -1;
        }
        return reverseMode ? comparator(b, a) : comparator(a, b);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    static create(columnNames, values, displayName) {
        const numColumns = columnNames.length;
        if (!numColumns) {
            return null;
        }
        const columns = [];
        for (let i = 0; i < columnNames.length; ++i) {
            const id = String(i);
            columns.push({ id, title: columnNames[i], sortable: true });
        }
        const nodes = [];
        for (let i = 0; i < values.length / numColumns; ++i) {
            const data = {};
            for (let j = 0; j < columnNames.length; ++j) {
                data[j] = values[numColumns * i + j];
            }
            const node = new SortableDataGridNode(data);
            node.selectable = false;
            nodes.push(node);
        }
        const dataGrid = new SortableDataGrid({ displayName, columns });
        const length = nodes.length;
        const rootNode = dataGrid.rootNode();
        for (let i = 0; i < length; ++i) {
            rootNode.appendChild(nodes[i]);
        }
        dataGrid.addEventListener("SortingChanged" /* Events.SORTING_CHANGED */, sortDataGrid);
        function sortDataGrid() {
            const nodes = dataGrid.rootNode().children;
            const sortColumnId = dataGrid.sortColumnId();
            if (!sortColumnId) {
                return;
            }
            let columnIsNumeric = true;
            for (let i = 0; i < nodes.length; i++) {
                if (nodes[i].isCreationNode) {
                    continue;
                }
                const value = nodes[i].data[sortColumnId];
                if (isNaN(value instanceof Node ? value.textContent : value)) {
                    columnIsNumeric = false;
                    break;
                }
            }
            const comparator = columnIsNumeric ? SortableDataGrid.NumericComparator : SortableDataGrid.StringComparator;
            dataGrid.sortNodes(comparator.bind(null, sortColumnId), !dataGrid.isSortOrderAscending());
        }
        return dataGrid;
    }
    insertChild(node) {
        const root = this.rootNode();
        root.insertChildOrdered(node);
    }
    sortNodes(comparator, reverseMode) {
        this.sortingFunction = SortableDataGrid.Comparator.bind(null, comparator, reverseMode);
        this.rootNode().recalculateSiblings(0);
        this.rootNode().sortChildren();
        this.scheduleUpdateStructure();
    }
}
export class SortableDataGridNode extends ViewportDataGridNode {
    #numericData = new Map();
    #childrenDirty = true;
    #lastSortingFunction = null;
    get data() {
        return super.data;
    }
    set data(x) {
        this.#numericData.clear();
        super.data = x;
    }
    getNumericValue(columnId) {
        let value = this.#numericData.get(columnId);
        if (value === undefined) {
            const rawValue = this.data[columnId];
            value = Number(rawValue instanceof Node ? rawValue.textContent : rawValue);
            this.#numericData.set(columnId, value);
        }
        return value;
    }
    insertChild(child, index) {
        super.insertChild(child, index);
        this.#childrenDirty = true;
    }
    removeChild(child) {
        super.removeChild(child);
        this.#childrenDirty = true;
    }
    refresh() {
        this.#numericData.clear();
        super.refresh();
        this.parent?.markChildrenDirty();
    }
    expand() {
        super.expand();
        this.sortChildren();
    }
    markChildrenDirty() {
        this.#childrenDirty = true;
    }
    insertChildOrdered(node) {
        const dataGrid = this.dataGrid;
        if (dataGrid) {
            this.insertChild(node, Platform.ArrayUtilities.upperBound(this.children, node, dataGrid.sortingFunction));
        }
    }
    sortChildren() {
        const dataGrid = this.dataGrid;
        if (!dataGrid || !this.expanded) {
            return;
        }
        if (this.#childrenDirty || this.#lastSortingFunction !== dataGrid.sortingFunction) {
            this.children.sort(dataGrid.sortingFunction);
            this.#childrenDirty = false;
            this.#lastSortingFunction = dataGrid.sortingFunction;
            for (let i = 0; i < this.children.length; ++i) {
                const child = this.children[i];
                child.recalculateSiblings(i);
            }
        }
        for (let i = 0; i < this.children.length; ++i) {
            const child = this.children[i];
            child.sortChildren();
        }
    }
}
//# sourceMappingURL=SortableDataGrid.js.map
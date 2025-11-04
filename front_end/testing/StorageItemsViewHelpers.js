// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
export function getCellElementFromNodeAndColumnId(dataGrid, node, columnId) {
    const column = dataGrid.columns[columnId];
    const cellIndex = dataGrid.visibleColumnsArray.indexOf(column);
    return node.element()?.children[cellIndex] || null;
}
export function selectNodeByKey(dataGrid, key) {
    for (const node of dataGrid.rootNode().children) {
        if (node?.data?.key === key) {
            node.select();
            return node;
        }
    }
    return null;
}
//# sourceMappingURL=StorageItemsViewHelpers.js.map
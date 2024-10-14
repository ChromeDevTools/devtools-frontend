// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as DataGrid from '../ui/legacy/components/data_grid/data_grid.js';

export function getCellElementFromNodeAndColumnId<T>(
    dataGrid: DataGrid.DataGrid.DataGridImpl<T>, node: DataGrid.DataGrid.DataGridNode<T>, columnId: string): Element|
    null {
  const column = dataGrid.columns[columnId];
  const cellIndex = dataGrid.visibleColumnsArray.indexOf(column);
  return node.element()?.children[cellIndex] || null;
}

export function selectNodeByKey<T>(
    dataGrid: DataGrid.DataGrid.DataGridImpl<T>, key: string|null): DataGrid.DataGrid.DataGridNode<T>|null {
  for (const node of dataGrid.rootNode().children) {
    if (node?.data?.key === key) {
      node.select();
      return node;
    }
  }
  return null;
}

// Copyright (c) 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import {type Cell, type Column, type Row} from './DataGridUtils.js';

export class ColumnHeaderClickEvent extends Event {
  static readonly eventName = 'columnheaderclick';

  data: {
    column: Column,
    columnIndex: number,
  };

  constructor(column: Column, columnIndex: number) {
    super(ColumnHeaderClickEvent.eventName);
    this.data = {
      column,
      columnIndex,
    };
  }
}

export class ContextMenuColumnSortClickEvent extends Event {
  static readonly eventName = 'contextmenucolumnsortclick';
  data: {
    column: Column,
  };

  constructor(column: Column) {
    super(ContextMenuColumnSortClickEvent.eventName);
    this.data = {
      column,
    };
  }
}

export class ContextMenuHeaderResetClickEvent extends Event {
  static readonly eventName = 'contextmenuheaderresetclick';
  constructor() {
    super(ContextMenuHeaderResetClickEvent.eventName);
  }
}

export class NewUserFilterTextEvent extends Event {
  static readonly eventName = 'newuserfiltertext';
  data: {filterText: string};

  constructor(filterText: string) {
    super(NewUserFilterTextEvent.eventName, {
      composed: true,
    });

    this.data = {
      filterText,
    };
  }
}

export class BodyCellFocusedEvent extends Event {
  static readonly eventName = 'cellfocused';
  /**
   * Although the DataGrid cares only about the focused cell, and has no concept
   * of a focused row, many components that render a data grid want to know what
   * row is active, so on the cell focused event we also send the row that the
   * cell is part of.
   */
  data: {
    cell: Cell,
    row: Row,
  };

  constructor(cell: Cell, row: Row) {
    super(BodyCellFocusedEvent.eventName, {
      composed: true,
    });
    this.data = {
      cell,
      row,
    };
  }
}

declare global {
  interface HTMLElementEventMap {
    [ColumnHeaderClickEvent.eventName]: ColumnHeaderClickEvent;
    [ContextMenuColumnSortClickEvent.eventName]: ContextMenuColumnSortClickEvent;
    [ContextMenuHeaderResetClickEvent.eventName]: ContextMenuHeaderResetClickEvent;
    [NewUserFilterTextEvent.eventName]: NewUserFilterTextEvent;
    [BodyCellFocusedEvent.eventName]: BodyCellFocusedEvent;
  }
}

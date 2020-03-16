/*
 * Copyright (C) 2008 Apple Inc. All Rights Reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 * 1. Redistributions of source code must retain the above copyright
 *    notice, this list of conditions and the following disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright
 *    notice, this list of conditions and the following disclaimer in the
 *    documentation and/or other materials provided with the distribution.
 *
 * THIS SOFTWARE IS PROVIDED BY APPLE INC. ``AS IS'' AND ANY
 * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
 * PURPOSE ARE DISCLAIMED.  IN NO EVENT SHALL APPLE INC. OR
 * CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
 * EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
 * PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 * PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY
 * OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

import * as Common from '../common/common.js';
import * as DataGrid from '../data_grid/data_grid.js';
import * as UI from '../ui/ui.js';

/**
 * @unrestricted
 */
export class DatabaseTableView extends UI.View.SimpleView {
  constructor(database, tableName) {
    super(Common.UIString.UIString('Database'));

    this.database = database;
    this.tableName = tableName;

    this.element.classList.add('storage-view', 'table');

    this._visibleColumnsSetting =
        Common.Settings.Settings.instance().createSetting('databaseTableViewVisibleColumns', {});

    this.refreshButton = new UI.Toolbar.ToolbarButton(Common.UIString.UIString('Refresh'), 'largeicon-refresh');
    this.refreshButton.addEventListener(UI.Toolbar.ToolbarButton.Events.Click, this._refreshButtonClicked, this);
    this._visibleColumnsInput = new UI.Toolbar.ToolbarInput(Common.UIString.UIString('Visible columns'), '', 1);
    this._visibleColumnsInput.addEventListener(
        UI.Toolbar.ToolbarInput.Event.TextChanged, this._onVisibleColumnsChanged, this);

    /** @type {?DataGrid.DataGrid.DataGridImpl} */
    this._dataGrid;
  }

  /**
   * @override
   */
  wasShown() {
    this.update();
  }

  /**
   * @override
   * @return {!Promise<!Array<!UI.Toolbar.ToolbarItem>>}
   */
  async toolbarItems() {
    return [this.refreshButton, this._visibleColumnsInput];
  }

  /**
   * @param {string} tableName
   * @return {string}
   */
  _escapeTableName(tableName) {
    return tableName.replace(/\"/g, '""');
  }

  update() {
    this.database.executeSql(
        'SELECT rowid, * FROM "' + this._escapeTableName(this.tableName) + '"', this._queryFinished.bind(this),
        this._queryError.bind(this));
  }

  _queryFinished(columnNames, values) {
    this.detachChildWidgets();
    this.element.removeChildren();

    this._dataGrid = DataGrid.SortableDataGrid.SortableDataGrid.create(columnNames, values, ls`Database`);
    this._visibleColumnsInput.setVisible(!!this._dataGrid);
    if (!this._dataGrid) {
      this._emptyWidget = new UI.EmptyWidget.EmptyWidget(ls`The "${this.tableName}"\ntable is empty.`);
      this._emptyWidget.show(this.element);
      return;
    }
    this._dataGrid.setStriped(true);
    this._dataGrid.asWidget().show(this.element);
    this._dataGrid.autoSizeColumns(5);

    this._columnsMap = new Map();
    for (let i = 1; i < columnNames.length; ++i) {
      this._columnsMap.set(columnNames[i], String(i));
    }
    this._lastVisibleColumns = '';
    const visibleColumnsText = this._visibleColumnsSetting.get()[this.tableName] || '';
    this._visibleColumnsInput.setValue(visibleColumnsText);
    this._onVisibleColumnsChanged();
  }

  _onVisibleColumnsChanged() {
    if (!this._dataGrid) {
      return;
    }
    const text = this._visibleColumnsInput.value();
    const parts = text.split(/[\s,]+/);
    const matches = new Set();
    const columnsVisibility = {};
    columnsVisibility['0'] = true;
    for (let i = 0; i < parts.length; ++i) {
      const part = parts[i];
      if (this._columnsMap.has(part)) {
        matches.add(part);
        columnsVisibility[this._columnsMap.get(part)] = true;
      }
    }
    const newVisibleColumns = [...matches].sort().join(', ');
    if (newVisibleColumns.length === 0) {
      for (const v of this._columnsMap.values()) {
        columnsVisibility[v] = true;
      }
    }
    if (newVisibleColumns === this._lastVisibleColumns) {
      return;
    }
    const visibleColumnsRegistry = this._visibleColumnsSetting.get();
    visibleColumnsRegistry[this.tableName] = text;
    this._visibleColumnsSetting.set(visibleColumnsRegistry);
    this._dataGrid.setColumnsVisiblity(columnsVisibility);
    this._lastVisibleColumns = newVisibleColumns;
  }

  _queryError(error) {
    this.detachChildWidgets();
    this.element.removeChildren();

    const errorMsgElement = createElement('div');
    errorMsgElement.className = 'storage-table-error';
    errorMsgElement.textContent = ls`An error occurred trying to\nread the "${this.tableName}" table.`;
    this.element.appendChild(errorMsgElement);
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _refreshButtonClicked(event) {
    this.update();
  }
}

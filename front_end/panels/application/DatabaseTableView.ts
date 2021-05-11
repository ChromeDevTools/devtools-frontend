// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

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

/* eslint-disable rulesdir/no_underscored_properties */

import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as DataGrid from '../../ui/legacy/components/data_grid/data_grid.js';
import * as UI from '../../ui/legacy/legacy.js';

import type {Database} from './DatabaseModel.js'; // eslint-disable-line no-unused-vars

const UIStrings = {
  /**
  *@description Text in Database Table View of the Application panel
  */
  database: 'Database',
  /**
  *@description Text to refresh the page
  */
  refresh: 'Refresh',
  /**
  *@description Text in Database Table View of the Application panel
  */
  visibleColumns: 'Visible columns',
  /**
  *@description Text in Database Table View of the Application panel
  *@example {database} PH1
  */
  theStableIsEmpty: 'The "{PH1}" table is empty.',
  /**
  *@description Error msg element text content in Database Table View of the Application panel
  *@example {database} PH1
  */
  anErrorOccurredTryingToreadTheS: 'An error occurred trying to read the "{PH1}" table.',
};
const str_ = i18n.i18n.registerUIStrings('panels/application/DatabaseTableView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export interface VisibleColumnsSetting {
  [tableName: string]: string;
}
export class DatabaseTableView extends UI.View.SimpleView {
  database: Database;
  tableName: string;
  _lastVisibleColumns: string;
  _columnsMap: Map<string, string>;
  _visibleColumnsSetting: Common.Settings.Setting<VisibleColumnsSetting>;
  refreshButton: UI.Toolbar.ToolbarButton;
  _visibleColumnsInput: UI.Toolbar.ToolbarInput;
  _dataGrid: DataGrid.SortableDataGrid.SortableDataGrid<DataGrid.SortableDataGrid.SortableDataGridNode<unknown>>|null;
  _emptyWidget?: UI.EmptyWidget.EmptyWidget;

  constructor(database: Database, tableName: string) {
    super(i18nString(UIStrings.database));

    this.database = database;
    this.tableName = tableName;
    this._lastVisibleColumns = '';
    this._columnsMap = new Map();

    this.element.classList.add('storage-view', 'table');

    this._visibleColumnsSetting =
        Common.Settings.Settings.instance().createSetting('databaseTableViewVisibleColumns', {});

    this.refreshButton = new UI.Toolbar.ToolbarButton(i18nString(UIStrings.refresh), 'largeicon-refresh');
    this.refreshButton.addEventListener(UI.Toolbar.ToolbarButton.Events.Click, this._refreshButtonClicked, this);
    this._visibleColumnsInput = new UI.Toolbar.ToolbarInput(i18nString(UIStrings.visibleColumns), '', 1);
    this._visibleColumnsInput.addEventListener(
        UI.Toolbar.ToolbarInput.Event.TextChanged, this._onVisibleColumnsChanged, this);

    this._dataGrid = null;
  }

  wasShown(): void {
    this.update();
  }

  async toolbarItems(): Promise<UI.Toolbar.ToolbarItem[]> {
    return [this.refreshButton, this._visibleColumnsInput];
  }

  _escapeTableName(tableName: string): string {
    return tableName.replace(/\"/g, '""');
  }

  update(): void {
    this.database.executeSql(
        'SELECT rowid, * FROM "' + this._escapeTableName(this.tableName) + '"', this._queryFinished.bind(this),
        this._queryError.bind(this));
  }

  // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _queryFinished(columnNames: string[], values: any[]): void {
    this.detachChildWidgets();
    this.element.removeChildren();

    this._dataGrid =
        DataGrid.SortableDataGrid.SortableDataGrid.create(columnNames, values, i18nString(UIStrings.database));
    this._visibleColumnsInput.setVisible(Boolean(this._dataGrid));
    if (!this._dataGrid) {
      this._emptyWidget = new UI.EmptyWidget.EmptyWidget(i18nString(UIStrings.theStableIsEmpty, {PH1: this.tableName}));
      this._emptyWidget.show(this.element);
      return;
    }
    this._dataGrid.setStriped(true);
    this._dataGrid.asWidget().show(this.element);
    this._dataGrid.autoSizeColumns(5);

    this._columnsMap.clear();
    for (let i = 1; i < columnNames.length; ++i) {
      this._columnsMap.set(columnNames[i], String(i));
    }
    this._lastVisibleColumns = '';
    const visibleColumnsText = this._visibleColumnsSetting.get()[this.tableName] || '';
    this._visibleColumnsInput.setValue(visibleColumnsText);
    this._onVisibleColumnsChanged();
  }

  _onVisibleColumnsChanged(): void {
    if (!this._dataGrid) {
      return;
    }
    const text = this._visibleColumnsInput.value();
    const parts = text.split(/[\s,]+/);
    const matches = new Set<string>();
    const columnsVisibility = new Set<string>();
    columnsVisibility.add('0');
    for (const part of parts) {
      const mappedColumn = this._columnsMap.get(part);
      if (mappedColumn !== undefined) {
        matches.add(part);
        columnsVisibility.add(mappedColumn);
      }
    }
    const newVisibleColumns = [...matches].sort().join(', ');
    if (newVisibleColumns.length === 0) {
      for (const v of this._columnsMap.values()) {
        columnsVisibility.add(v);
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

  _queryError(): void {
    this.detachChildWidgets();
    this.element.removeChildren();

    const errorMsgElement = document.createElement('div');
    errorMsgElement.className = 'storage-table-error';
    errorMsgElement.textContent = i18nString(UIStrings.anErrorOccurredTryingToreadTheS, {PH1: this.tableName});
    this.element.appendChild(errorMsgElement);
  }

  _refreshButtonClicked(_event: Common.EventTarget.EventTargetEvent): void {
    this.update();
  }
}

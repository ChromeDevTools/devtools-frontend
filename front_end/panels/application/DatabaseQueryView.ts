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

import * as i18n from '../../core/i18n/i18n.js';
import * as DataGrid from '../../ui/legacy/components/data_grid/data_grid.js';
import * as UI from '../../ui/legacy/legacy.js';

import type {Database} from './DatabaseModel.js'; // eslint-disable-line no-unused-vars

const UIStrings = {
  /**
  *@description Data grid name for Database Query data grids
  */
  databaseQuery: 'Database Query',
  /**
  *@description Aria text for table selected in WebSQL DatabaseQueryView in Application panel
  *@example {"SELECT * FROM LOGS"} PH1
  */
  queryS: 'Query: {PH1}',
};
const str_ = i18n.i18n.registerUIStrings('panels/application/DatabaseQueryView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class DatabaseQueryView extends UI.Widget.VBox {
  database: Database;
  _queryWrapper: HTMLElement;
  _promptContainer: HTMLElement;
  _promptElement: HTMLElement;
  _prompt: UI.TextPrompt.TextPrompt;
  _proxyElement: Element;
  _queryResults: HTMLElement[];
  _virtualSelectedIndex: number;
  _lastSelectedElement!: Element|null;
  _selectionTimeout: number;
  constructor(database: Database) {
    super();

    this.database = database;

    this.element.classList.add('storage-view', 'query', 'monospace');
    this.element.addEventListener('selectstart', this._selectStart.bind(this), false);

    this._queryWrapper = this.element.createChild('div', 'database-query-group-messages');
    this._queryWrapper.addEventListener('focusin', (this._onFocusIn.bind(this) as EventListener));
    this._queryWrapper.addEventListener('focusout', (this._onFocusOut.bind(this) as EventListener));
    this._queryWrapper.addEventListener('keydown', (this._onKeyDown.bind(this) as EventListener));
    this._queryWrapper.tabIndex = -1;

    this._promptContainer = this.element.createChild('div', 'database-query-prompt-container');
    this._promptContainer.appendChild(UI.Icon.Icon.create('smallicon-text-prompt', 'prompt-icon'));
    this._promptElement = this._promptContainer.createChild('div');
    this._promptElement.className = 'database-query-prompt';
    this._promptElement.addEventListener('keydown', (this._promptKeyDown.bind(this) as EventListener));

    this._prompt = new UI.TextPrompt.TextPrompt();
    this._prompt.initialize(this.completions.bind(this), ' ');
    this._proxyElement = this._prompt.attach(this._promptElement);

    this.element.addEventListener('click', this._messagesClicked.bind(this), true);

    this._queryResults = [];
    this._virtualSelectedIndex = -1;
    this._selectionTimeout = 0;
  }

  _messagesClicked(): void {
    this._prompt.focus();
    if (!this._prompt.isCaretInsidePrompt() && !this.element.hasSelection()) {
      this._prompt.moveCaretToEndOfPrompt();
    }
  }

  _onKeyDown(event: KeyboardEvent): void {
    if (UI.UIUtils.isEditing() || !this._queryResults.length || event.shiftKey) {
      return;
    }
    switch (event.key) {
      case 'ArrowUp':
        if (this._virtualSelectedIndex > 0) {
          this._virtualSelectedIndex--;
        } else {
          return;
        }
        break;
      case 'ArrowDown':
        if (this._virtualSelectedIndex < this._queryResults.length - 1) {
          this._virtualSelectedIndex++;
        } else {
          return;
        }
        break;
      case 'Home':
        this._virtualSelectedIndex = 0;
        break;
      case 'End':
        this._virtualSelectedIndex = this._queryResults.length - 1;
        break;
      default:
        return;
    }
    event.consume(true);
    this._updateFocusedItem();
  }

  _onFocusIn(event: FocusEvent): void {
    // Make default selection when moving from external (e.g. prompt) to the container.
    if (this._virtualSelectedIndex === -1 && this._isOutsideViewport((event.relatedTarget as Element | null)) &&
        event.target === this._queryWrapper && this._queryResults.length) {
      this._virtualSelectedIndex = this._queryResults.length - 1;
    }
    this._updateFocusedItem();
  }

  _onFocusOut(event: FocusEvent): void {
    if (this._isOutsideViewport((event.relatedTarget as Element | null))) {
      this._virtualSelectedIndex = -1;
    }
    this._updateFocusedItem();

    this._queryWrapper.scrollTop = 10000000;
  }

  _isOutsideViewport(element: Element|null): boolean {
    return element !== null && !element.isSelfOrDescendant(this._queryWrapper);
  }

  _updateFocusedItem(): void {
    let index: number = this._virtualSelectedIndex;
    if (this._queryResults.length && this._virtualSelectedIndex < 0) {
      index = this._queryResults.length - 1;
    }

    const selectedElement = index >= 0 ? this._queryResults[index] : null;
    const changed = this._lastSelectedElement !== selectedElement;
    const containerHasFocus = this._queryWrapper === this.element.ownerDocument.deepActiveElement();

    if (selectedElement && (changed || containerHasFocus) && this.element.hasFocus()) {
      if (!selectedElement.hasFocus()) {
        selectedElement.focus();
      }
    }

    if (this._queryResults.length && !this._queryWrapper.hasFocus()) {
      this._queryWrapper.tabIndex = 0;
    } else {
      this._queryWrapper.tabIndex = -1;
    }
    this._lastSelectedElement = selectedElement;
  }

  async completions(_expression: string, prefix: string, _force?: boolean): Promise<UI.SuggestBox.Suggestions> {
    if (!prefix) {
      return [];
    }

    prefix = prefix.toLowerCase();
    const tableNames = await this.database.tableNames();
    return tableNames.map(name => name + ' ')
        .concat(SQL_BUILT_INS)
        .filter(proposal => proposal.toLowerCase().startsWith(prefix))
        .map(completion => ({text: completion} as UI.SuggestBox.Suggestion));
  }

  _selectStart(_event: Event): void {
    if (this._selectionTimeout) {
      clearTimeout(this._selectionTimeout);
    }

    this._prompt.clearAutocomplete();

    function moveBackIfOutside(this: DatabaseQueryView): void {
      this._selectionTimeout = 0;
      if (!this._prompt.isCaretInsidePrompt() && !this.element.hasSelection()) {
        this._prompt.moveCaretToEndOfPrompt();
      }
      this._prompt.autoCompleteSoon();
    }

    this._selectionTimeout = window.setTimeout(moveBackIfOutside.bind(this), 100);
  }

  _promptKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      this._enterKeyPressed(event);
      return;
    }
  }

  async _enterKeyPressed(event: KeyboardEvent): Promise<void> {
    event.consume(true);

    const query = this._prompt.textWithCurrentSuggestion();
    this._prompt.clearAutocomplete();

    if (!query.length) {
      return;
    }

    this._prompt.setEnabled(false);
    try {
      // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await new Promise<{columnNames: string[], values: any[]}>((resolve, reject) => {
        this.database.executeSql(
            query, (columnNames, values) => resolve({columnNames, values}), errorText => reject(errorText));
      });
      this._queryFinished(query, result.columnNames, result.values);
    } catch (e) {
      this._appendErrorQueryResult(query, e);
    }
    this._prompt.setEnabled(true);
    this._prompt.setText('');
    this._prompt.focus();
  }

  // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _queryFinished(query: string, columnNames: string[], values: any[]): void {
    const dataGrid =
        DataGrid.SortableDataGrid.SortableDataGrid.create(columnNames, values, i18nString(UIStrings.databaseQuery));
    const trimmedQuery = query.trim();

    let view: DataGrid.DataGrid.DataGridWidget<unknown>|null = null;
    if (dataGrid) {
      dataGrid.setStriped(true);
      dataGrid.renderInline();
      dataGrid.autoSizeColumns(5);
      view = dataGrid.asWidget();
      dataGrid.setFocusable(false);
    }
    this._appendViewQueryResult(trimmedQuery, view);

    if (trimmedQuery.match(/^create /i) || trimmedQuery.match(/^drop table /i)) {
      this.dispatchEventToListeners(Events.SchemaUpdated, this.database);
    }
  }

  _appendViewQueryResult(query: string, view: UI.Widget.Widget|null): void {
    const resultElement = this._appendQueryResult(query);
    if (view) {
      view.show(resultElement);
    } else {
      resultElement.remove();
    }

    this._scrollResultIntoView();
  }

  _appendErrorQueryResult(query: string, errorText: string): void {
    const resultElement = this._appendQueryResult(query);
    resultElement.classList.add('error');
    resultElement.appendChild(UI.Icon.Icon.create('smallicon-error', 'prompt-icon'));
    UI.UIUtils.createTextChild(resultElement, errorText);

    this._scrollResultIntoView();
  }

  _scrollResultIntoView(): void {
    this._queryResults[this._queryResults.length - 1].scrollIntoView(false);
    this._promptElement.scrollIntoView(false);
  }

  _appendQueryResult(query: string): HTMLDivElement {
    const element = (document.createElement('div') as HTMLElement);
    element.className = 'database-user-query';
    element.tabIndex = -1;

    UI.ARIAUtils.setAccessibleName(element, i18nString(UIStrings.queryS, {PH1: query}));
    this._queryResults.push(element);
    this._updateFocusedItem();

    element.appendChild(UI.Icon.Icon.create('smallicon-user-command', 'prompt-icon'));

    const commandTextElement = document.createElement('span');
    commandTextElement.className = 'database-query-text';
    commandTextElement.textContent = query;
    element.appendChild(commandTextElement);

    const resultElement = document.createElement('div');
    resultElement.className = 'database-query-result';
    element.appendChild(resultElement);

    this._queryWrapper.appendChild(element);
    return resultElement;
  }
}

// TODO(crbug.com/1167717): Make this a const enum again
// eslint-disable-next-line rulesdir/const_enum
export enum Events {
  SchemaUpdated = 'SchemaUpdated',
}


export const SQL_BUILT_INS = [
  'SELECT ',
  'FROM ',
  'WHERE ',
  'LIMIT ',
  'DELETE FROM ',
  'CREATE ',
  'DROP ',
  'TABLE ',
  'INDEX ',
  'UPDATE ',
  'INSERT INTO ',
  'VALUES (',
];

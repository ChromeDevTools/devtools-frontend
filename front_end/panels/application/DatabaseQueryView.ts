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

import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as DataGrid from '../../ui/legacy/components/data_grid/data_grid.js';
import * as UI from '../../ui/legacy/legacy.js';

import {type Database} from './DatabaseModel.js';

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
export class DatabaseQueryView extends Common.ObjectWrapper.eventMixin<EventTypes, typeof UI.Widget.VBox>(
    UI.Widget.VBox) {
  database: Database;
  private queryWrapper: HTMLElement;
  private readonly promptContainer: HTMLElement;
  private readonly promptElement: HTMLElement;
  private prompt: UI.TextPrompt.TextPrompt;
  private readonly proxyElement: Element;
  private queryResults: HTMLElement[];
  private virtualSelectedIndex: number;
  private lastSelectedElement!: Element|null;
  private selectionTimeout: number;
  constructor(database: Database) {
    super();

    this.database = database;

    this.element.classList.add('storage-view', 'query', 'monospace');
    this.element.addEventListener('selectstart', this.selectStart.bind(this), false);

    this.queryWrapper = this.element.createChild('div', 'database-query-group-messages');
    this.queryWrapper.addEventListener('focusin', (this.onFocusIn.bind(this) as EventListener));
    this.queryWrapper.addEventListener('focusout', (this.onFocusOut.bind(this) as EventListener));
    this.queryWrapper.addEventListener('keydown', (this.onKeyDown.bind(this) as EventListener));
    this.queryWrapper.tabIndex = -1;

    this.promptContainer = this.element.createChild('div', 'database-query-prompt-container');
    this.promptContainer.appendChild(UI.Icon.Icon.create('smallicon-text-prompt', 'prompt-icon'));
    this.promptElement = this.promptContainer.createChild('div');
    this.promptElement.className = 'database-query-prompt';
    this.promptElement.addEventListener('keydown', (this.promptKeyDown.bind(this) as EventListener));

    this.prompt = new UI.TextPrompt.TextPrompt();
    this.prompt.initialize(this.completions.bind(this), ' ');
    this.proxyElement = this.prompt.attach(this.promptElement);

    this.element.addEventListener('click', this.messagesClicked.bind(this), true);

    this.queryResults = [];
    this.virtualSelectedIndex = -1;
    this.selectionTimeout = 0;
  }

  private messagesClicked(): void {
    this.prompt.focus();
    if (!this.prompt.isCaretInsidePrompt() && !this.element.hasSelection()) {
      this.prompt.moveCaretToEndOfPrompt();
    }
  }

  private onKeyDown(event: KeyboardEvent): void {
    if (UI.UIUtils.isEditing() || !this.queryResults.length || event.shiftKey) {
      return;
    }
    switch (event.key) {
      case 'ArrowUp':
        if (this.virtualSelectedIndex > 0) {
          this.virtualSelectedIndex--;
        } else {
          return;
        }
        break;
      case 'ArrowDown':
        if (this.virtualSelectedIndex < this.queryResults.length - 1) {
          this.virtualSelectedIndex++;
        } else {
          return;
        }
        break;
      case 'Home':
        this.virtualSelectedIndex = 0;
        break;
      case 'End':
        this.virtualSelectedIndex = this.queryResults.length - 1;
        break;
      default:
        return;
    }
    event.consume(true);
    this.updateFocusedItem();
  }

  private onFocusIn(event: FocusEvent): void {
    // Make default selection when moving from external (e.g. prompt) to the container.
    if (this.virtualSelectedIndex === -1 && this.isOutsideViewport((event.relatedTarget as Element | null)) &&
        event.target === this.queryWrapper && this.queryResults.length) {
      this.virtualSelectedIndex = this.queryResults.length - 1;
    }
    this.updateFocusedItem();
  }

  private onFocusOut(event: FocusEvent): void {
    if (this.isOutsideViewport((event.relatedTarget as Element | null))) {
      this.virtualSelectedIndex = -1;
    }
    this.updateFocusedItem();

    this.queryWrapper.scrollTop = 10000000;
  }

  private isOutsideViewport(element: Element|null): boolean {
    return element !== null && !element.isSelfOrDescendant(this.queryWrapper);
  }

  private updateFocusedItem(): void {
    let index: number = this.virtualSelectedIndex;
    if (this.queryResults.length && this.virtualSelectedIndex < 0) {
      index = this.queryResults.length - 1;
    }

    const selectedElement = index >= 0 ? this.queryResults[index] : null;
    const changed = this.lastSelectedElement !== selectedElement;
    const containerHasFocus = this.queryWrapper === Platform.DOMUtilities.deepActiveElement(this.element.ownerDocument);

    if (selectedElement && (changed || containerHasFocus) && this.element.hasFocus()) {
      if (!selectedElement.hasFocus()) {
        selectedElement.focus();
      }
    }

    if (this.queryResults.length && !this.queryWrapper.hasFocus()) {
      this.queryWrapper.tabIndex = 0;
    } else {
      this.queryWrapper.tabIndex = -1;
    }
    this.lastSelectedElement = selectedElement;
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

  private selectStart(_event: Event): void {
    if (this.selectionTimeout) {
      clearTimeout(this.selectionTimeout);
    }

    this.prompt.clearAutocomplete();

    function moveBackIfOutside(this: DatabaseQueryView): void {
      this.selectionTimeout = 0;
      if (!this.prompt.isCaretInsidePrompt() && !this.element.hasSelection()) {
        this.prompt.moveCaretToEndOfPrompt();
      }
      this.prompt.autoCompleteSoon();
    }

    this.selectionTimeout = window.setTimeout(moveBackIfOutside.bind(this), 100);
  }

  private promptKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      void this.enterKeyPressed(event);
      return;
    }
  }

  private async enterKeyPressed(event: KeyboardEvent): Promise<void> {
    event.consume(true);

    const query = this.prompt.textWithCurrentSuggestion();
    this.prompt.clearAutocomplete();

    if (!query.length) {
      return;
    }

    this.prompt.setEnabled(false);
    try {
      // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await new Promise<{columnNames: string[], values: any[]}>((resolve, reject) => {
        void this.database.executeSql(
            query, (columnNames, values) => resolve({columnNames, values}), errorText => reject(errorText));
      });
      this.queryFinished(query, result.columnNames, result.values);
    } catch (e) {
      this.appendErrorQueryResult(query, e);
    }
    this.prompt.setEnabled(true);
    this.prompt.setText('');
    this.prompt.focus();
  }

  // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private queryFinished(query: string, columnNames: string[], values: any[]): void {
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
    this.appendViewQueryResult(trimmedQuery, view);

    if (trimmedQuery.match(/^create /i) || trimmedQuery.match(/^drop table /i)) {
      this.dispatchEventToListeners(Events.SchemaUpdated, this.database);
    }
  }

  private appendViewQueryResult(query: string, view: UI.Widget.Widget|null): void {
    const resultElement = this.appendQueryResult(query);
    if (view) {
      view.show(resultElement);
    } else {
      resultElement.remove();
    }

    this.scrollResultIntoView();
  }

  private appendErrorQueryResult(query: string, errorText: string): void {
    const resultElement = this.appendQueryResult(query);
    resultElement.classList.add('error');
    resultElement.appendChild(UI.Icon.Icon.create('smallicon-error', 'prompt-icon'));
    UI.UIUtils.createTextChild(resultElement, errorText);

    this.scrollResultIntoView();
  }

  private scrollResultIntoView(): void {
    this.queryResults[this.queryResults.length - 1].scrollIntoView(false);
    this.promptElement.scrollIntoView(false);
  }

  private appendQueryResult(query: string): HTMLDivElement {
    const element = document.createElement('div');
    element.className = 'database-user-query';
    element.tabIndex = -1;

    UI.ARIAUtils.setAccessibleName(element, i18nString(UIStrings.queryS, {PH1: query}));
    this.queryResults.push(element);
    this.updateFocusedItem();

    element.appendChild(UI.Icon.Icon.create('smallicon-user-command', 'prompt-icon'));

    const commandTextElement = document.createElement('span');
    commandTextElement.className = 'database-query-text';
    commandTextElement.textContent = query;
    element.appendChild(commandTextElement);

    const resultElement = document.createElement('div');
    resultElement.className = 'database-query-result';
    element.appendChild(resultElement);

    this.queryWrapper.appendChild(element);
    return resultElement;
  }
}

// TODO(crbug.com/1167717): Make this a const enum again
// eslint-disable-next-line rulesdir/const_enum
export enum Events {
  SchemaUpdated = 'SchemaUpdated',
}

export type EventTypes = {
  [Events.SchemaUpdated]: Database,
};

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

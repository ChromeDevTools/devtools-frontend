// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/*
 * Copyright (C) 2008 Nokia Inc.  All rights reserved.
 * Copyright (C) 2013 Samsung Electronics. All rights reserved.
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
 * THIS SOFTWARE IS PROVIDED ``AS IS'' AND ANY
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
import type * as Platform from '../../core/platform/platform.js';
import * as Protocol from '../../generated/protocol.js';
import * as TextUtils from '../../models/text_utils/text_utils.js';
import * as JSON5 from '../../third_party/json5/json5.js';
import type * as DataGridImpl from '../../ui/legacy/components/data_grid/data_grid.js';
import * as DataGrid from '../../ui/legacy/components/data_grid/data_grid.js';
import * as SourceFrame from '../../ui/legacy/components/source_frame/source_frame.js';
import type * as UI from '../../ui/legacy/legacy.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import type {ExtensionStorage} from './ExtensionStorageModel.js';
import {StorageItemsView} from './StorageItemsView.js';

const UIStrings = {
  /**
   *@description Text in ExtensionStorage Items View of the Application panel
   */
  extensionStorage: 'Extension Storage',
  /**
   *@description Text in ExtensionStorage Items View of the Application panel
   */
  key: 'Key',
  /**
   *@description Text for the value of something
   */
  value: 'Value',
  /**
   *@description Name for the "Extension Storage Items" table that shows the content of the extension Storage.
   */
  extensionStorageItems: 'Extension Storage Items',
  /**
   *@description Text for announcing that the "Extension Storage Items" table was cleared, that is, all
   * entries were deleted.
   */
  extensionStorageItemsCleared: 'Extension Storage Items cleared',
  /**
   *@description Text for announcing a Extension Storage key/value item has been deleted
   */
  extensionStorageItemDeleted: 'The storage item was deleted.',
};
const str_ = i18n.i18n.registerUIStrings('panels/application/ExtensionStorageItemsView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export namespace ExtensionStorageItemsDispatcher {
  export const enum Events {
    ITEM_EDITED = 'ItemEdited',
    ITEMS_REFRESHED = 'ItemsRefreshed',
  }

  export type EventTypes = {
    [Events.ITEM_EDITED]: void,
    [Events.ITEMS_REFRESHED]: void,
  };
}

export class ExtensionStorageItemsView extends StorageItemsView {
  #extensionStorage: ExtensionStorage;
  #grid: DataGrid.DataGridWithPreview.DataGridWithPreview;
  readonly extensionStorageItemsDispatcher:
      Common.ObjectWrapper.ObjectWrapper<ExtensionStorageItemsDispatcher.EventTypes>;

  constructor(extensionStorage: ExtensionStorage) {
    super(i18nString(UIStrings.extensionStorage), 'extensionStoragePanel');

    this.#extensionStorage = extensionStorage;
    this.element.setAttribute('jslog', `${VisualLogging.pane().context('extension-storage-data')}`);
    this.element.classList.add('storage-view', 'table');

    this.extensionStorageItemsDispatcher =
        new Common.ObjectWrapper.ObjectWrapper<ExtensionStorageItemsDispatcher.EventTypes>();

    this.#grid = this.#createGrid();
    this.refreshItems();
  }

  get #isEditable(): boolean {
    // The managed storage area is always read only, since it exposes values
    // set by enterprise policy.
    return this.#extensionStorage.storageArea !== Protocol.Extensions.StorageArea.Managed;
  }

  /**
   * When parsing a value provided by the user, attempt to treat it as JSON,
   * falling back to a string otherwise.
   */
  parseValue(input: string): unknown {
    try {
      return JSON5.parse(input);
    } catch {
      return input;
    }
  }

  #createGrid(): DataGrid.DataGridWithPreview.DataGridWithPreview {
    const columns = ([
      {id: 'key', title: i18nString(UIStrings.key), sortable: true, editable: true, longText: true, weight: 50},
      {id: 'value', title: i18nString(UIStrings.value), sortable: false, editable: true, longText: true, weight: 50},
    ] as DataGrid.DataGrid.ColumnDescriptor[]);

    const grid = new DataGrid.DataGridWithPreview.DataGridWithPreview(
        'extension-storage', this.element, columns, {
          refreshItems: this.refreshItems.bind(this),
          edit: this.#isEditable ? {
            removeItem: async key => {
              await this.#extensionStorage.removeItem(key);
              this.refreshItems();
            },
            setItem: async (key, value) => {
              await this.#extensionStorage.setItem(key, this.parseValue(value));
              this.refreshItems();
              this.extensionStorageItemsDispatcher.dispatchEventToListeners(
                  ExtensionStorageItemsDispatcher.Events.ITEM_EDITED);
            },
          } :
                                   undefined,
          createPreview: this.#createPreview.bind(this),
          setCanDeleteSelected: canSelect => {
            if (!this.#isEditable) {
              return;
            }
            this.setCanDeleteSelected(canSelect);
          },
        },
        {
          title: i18nString(UIStrings.extensionStorageItems),
          itemDeleted: i18nString(UIStrings.extensionStorageItemDeleted),
          itemsCleared: i18nString(UIStrings.extensionStorageItemsCleared),
        });
    grid.showPreview(null, null);

    return grid;
  }

  #createPreview(key: string, value: string): Promise<UI.Widget.Widget|null> {
    const url = 'extension-storage://' + this.#extensionStorage.extensionId + '/' + this.#extensionStorage.storageArea +
            '/preview/' + key as Platform.DevToolsPath.UrlString;
    const provider = TextUtils.StaticContentProvider.StaticContentProvider.fromString(
        url,
        Common.ResourceType.resourceTypes.XHR,
        value as string,
    );
    return SourceFrame.PreviewFactory.PreviewFactory.createPreview(
        provider,
        'text/plain',
    );
  }

  setStorage(extensionStorage: ExtensionStorage): void {
    this.#extensionStorage = extensionStorage;

    // When changing storage area, recreate the grid. This is needed as
    // DataGridImpl does not currently changing from editable to non-editable
    // after creation.
    this.#grid.detach();
    this.#grid = this.#createGrid();

    this.refreshItems();
  }

  #extensionStorageItemsCleared(): void {
    if (!this.isShowing()) {
      return;
    }

    this.#grid.clearItems();
  }

  override deleteSelectedItem(): void {
    if (!this.#isEditable) {
      return;
    }
    this.#grid.deleteSelectedItem();
  }

  override refreshItems(): void {
    const filteredItems = (item: string[]): string => `${item[0]} ${item[1]}`;
    void this.#extensionStorage.getItems().then(items => {
      const itemsArray =
          Object.entries(items).map(([key, value]) => [key, typeof value === 'string' ? value : JSON.stringify(value)]);
      items && this.#grid.showItems(this.filter(itemsArray, filteredItems));
      this.extensionStorageItemsDispatcher.dispatchEventToListeners(
          ExtensionStorageItemsDispatcher.Events.ITEMS_REFRESHED);
    });
  }

  override deleteAllItems(): void {
    if (!this.#isEditable) {
      return;
    }
    this.#extensionStorage.clear().then(
        () => {
          this.#extensionStorageItemsCleared();
        },
        () => {
          throw new Error('Unable to clear storage.');
        });
  }

  getEntriesForTesting(): Array<{key: string, value: string}> {
    return this.#grid.dataGridForTesting.rootNode().children.filter(node => node.data.key).map(node => (node.data as {
                                                                                                 key: string,
                                                                                                 value: string,
                                                                                               }));
  }

  get dataGridForTesting(): DataGridImpl.DataGrid.DataGridImpl<unknown> {
    return this.#grid.dataGridForTesting;
  }
}

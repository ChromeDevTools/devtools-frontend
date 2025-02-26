// Copyright 2021 The Chromium Authors. All rights reserved.
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
import * as TextUtils from '../../models/text_utils/text_utils.js';
import * as SourceFrame from '../../ui/legacy/components/source_frame/source_frame.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import {DOMStorage} from './DOMStorageModel.js';
import {KeyValueStorageItemsView} from './KeyValueStorageItemsView.js';

const UIStrings = {
  /**
   *@description Name for the "DOM Storage Items" table that shows the content of the DOM Storage.
   */
  domStorageItems: 'DOM Storage Items',
  /**
   *@description Text for announcing that the "DOM Storage Items" table was cleared, that is, all
   * entries were deleted.
   */
  domStorageItemsCleared: 'DOM Storage Items cleared',
  /**
   *@description Text for announcing a DOM Storage key/value item has been deleted
   */
  domStorageItemDeleted: 'The storage item was deleted.',
} as const;
const str_ = i18n.i18n.registerUIStrings('panels/application/DOMStorageItemsView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class DOMStorageItemsView extends KeyValueStorageItemsView {
  private domStorage: DOMStorage;
  private eventListeners: Common.EventTarget.EventDescriptor[];

  constructor(domStorage: DOMStorage) {
    super(i18nString(UIStrings.domStorageItems), 'dom-storage', true);

    this.domStorage = domStorage;
    if (domStorage.storageKey) {
      this.setStorageKey(domStorage.storageKey);
    }

    this.element.classList.add('storage-view', 'table');

    this.showPreview(null, null);

    this.eventListeners = [];
    this.setStorage(domStorage);
  }

  protected createPreview(key: string, value: string): Promise<UI.Widget.Widget|null> {
    const protocol = this.domStorage.isLocalStorage ? 'localstorage' : 'sessionstorage';
    const url = `${protocol}://${key}` as Platform.DevToolsPath.UrlString;
    const provider = TextUtils.StaticContentProvider.StaticContentProvider.fromString(
        url,
        Common.ResourceType.resourceTypes.XHR,
        value,
    );
    return SourceFrame.PreviewFactory.PreviewFactory.createPreview(
        provider,
        'text/plain',
    );
  }

  setStorage(domStorage: DOMStorage): void {
    Common.EventTarget.removeEventListeners(this.eventListeners);
    this.domStorage = domStorage;
    const storageKind = domStorage.isLocalStorage ? 'local-storage-data' : 'session-storage-data';
    this.element.setAttribute('jslog', `${VisualLogging.pane().context(storageKind)}`);
    if (domStorage.storageKey) {
      this.setStorageKey(domStorage.storageKey);
    }
    this.eventListeners = [
      this.domStorage.addEventListener(DOMStorage.Events.DOM_STORAGE_ITEMS_CLEARED, this.domStorageItemsCleared, this),
      this.domStorage.addEventListener(DOMStorage.Events.DOM_STORAGE_ITEM_REMOVED, this.domStorageItemRemoved, this),
      this.domStorage.addEventListener(DOMStorage.Events.DOM_STORAGE_ITEM_ADDED, this.domStorageItemAdded, this),
      this.domStorage.addEventListener(DOMStorage.Events.DOM_STORAGE_ITEM_UPDATED, this.domStorageItemUpdated, this),
    ];
    this.refreshItems();
  }

  private domStorageItemsCleared(): void {
    if (!this.isShowing()) {
      return;
    }

    this.itemsCleared();
  }

  override itemsCleared(): void {
    super.itemsCleared();
    UI.ARIAUtils.alert(i18nString(UIStrings.domStorageItemsCleared));
  }

  private domStorageItemRemoved(event: Common.EventTarget.EventTargetEvent<DOMStorage.DOMStorageItemRemovedEvent>):
      void {
    if (!this.isShowing()) {
      return;
    }

    this.itemRemoved(event.data.key);
  }

  override itemRemoved(key: string): void {
    super.itemRemoved(key);
    UI.ARIAUtils.alert(i18nString(UIStrings.domStorageItemDeleted));
  }

  private domStorageItemAdded(event: Common.EventTarget.EventTargetEvent<DOMStorage.DOMStorageItemAddedEvent>): void {
    if (!this.isShowing()) {
      return;
    }

    this.itemAdded(event.data.key, event.data.value);
  }

  private domStorageItemUpdated(event: Common.EventTarget.EventTargetEvent<DOMStorage.DOMStorageItemUpdatedEvent>):
      void {
    if (!this.isShowing()) {
      return;
    }

    this.itemUpdated(event.data.key, event.data.value);
  }

  override refreshItems(): void {
    void this.#refreshItems();
  }

  async #refreshItems(): Promise<void> {
    const items = await this.domStorage.getItems();
    if (!items) {
      return;
    }
    const filteredItems =
        this.filter(items.map(item => ({key: item[0], value: item[1]})), item => `${item.key} ${item.value}`);
    this.showItems(filteredItems);
  }

  override deleteAllItems(): void {
    this.domStorage.clear();
    // explicitly clear the view because the event won't be fired when it has no items
    this.domStorageItemsCleared();
  }

  protected removeItem(key: string): void {
    this.domStorage?.removeItem(key);
  }

  protected setItem(key: string, value: string): void {
    this.domStorage?.setItem(key, value);
  }
}

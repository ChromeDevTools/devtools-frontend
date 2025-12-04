// Copyright 2025 The Chromium Authors
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
/* eslint no-return-assign: "off" */
import * as i18n from '../../core/i18n/i18n.js';
import * as Geometry from '../../models/geometry/geometry.js';
import * as UI from '../../ui/legacy/legacy.js';
import { Directives as LitDirectives, html, nothing, render } from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import * as ApplicationComponents from './components/components.js';
import { StorageItemsToolbar } from './StorageItemsToolbar.js';
const { ARIAUtils } = UI;
const { EmptyWidget } = UI.EmptyWidget;
const { VBox, widgetConfig } = UI.Widget;
const { Size } = Geometry;
const { repeat } = LitDirectives;
const UIStrings = {
    /**
     * @description Text that shows in the Application Panel if no value is selected for preview
     */
    noPreviewSelected: 'No value selected',
    /**
     * @description Preview text when viewing storage in Application panel
     */
    selectAValueToPreview: 'Select a value to preview',
    /**
     * @description Text for announcing number of entries after filtering
     * @example {5} PH1
     */
    numberEntries: 'Number of entries shown in table: {PH1}',
    /**
     * @description Text in DOMStorage Items View of the Application panel
     */
    key: 'Key',
    /**
     * @description Text for the value of something
     */
    value: 'Value',
};
const str_ = i18n.i18n.registerUIStrings('panels/application/KeyValueStorageItemsView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
const MAX_VALUE_LENGTH = 4096;
/**
 * A helper typically used in the Application panel. Renders a split view
 * between a DataGrid displaying key-value pairs and a preview Widget.
 */
export class KeyValueStorageItemsView extends UI.Widget.VBox {
    #preview;
    #previewValue;
    #items = [];
    #selectedKey = null;
    #view;
    #isSortOrderAscending = true;
    #editable;
    #toolbar;
    metadataView;
    constructor(title, id, editable, view, metadataView, opts) {
        metadataView ??= new ApplicationComponents.StorageMetadataView.StorageMetadataView();
        if (!view) {
            view = (input, output, target) => {
                // clang-format off
                render(html `
            <devtools-widget
              .widgetConfig=${widgetConfig(StorageItemsToolbar, { metadataView })}
              class=flex-none
              ${UI.Widget.widgetRef(StorageItemsToolbar, view => { output.toolbar = view; })}
            ></devtools-widget>
            <devtools-split-view sidebar-position="second" name="${id}-split-view-state">
               <devtools-widget
                  slot="main"
                  .widgetConfig=${widgetConfig(VBox, { minimumSize: new Size(0, 50) })}>
                <devtools-data-grid
                  .name=${`${id}-datagrid-with-preview`}
                  striped
                  style="flex: auto"
                  @sort=${(e) => input.onSort(e.detail.ascending)}
                  @refresh=${input.onReferesh}
                  @create=${(e) => input.onCreate(e.detail.key, e.detail.value)}
                  @deselect=${() => input.onSelect(null)}
                >
                  <table>
                    <tr>
                      <th id="key" sortable ?editable=${input.editable}>
                        ${i18nString(UIStrings.key)}
                      </th>
                      <th id="value" ?editable=${input.editable}>
                        ${i18nString(UIStrings.value)}
                      </th>
                    </tr>
                    ${repeat(input.items, item => item.key, item => html `
                      <tr data-key=${item.key} data-value=${item.value}
                          @select=${() => input.onSelect(item)}
                          @edit=${(e) => input.onEdit(item.key, item.value, e.detail.columnId, e.detail.valueBeforeEditing, e.detail.newText)}
                          @delete=${() => input.onDelete(item.key)}
                          selected=${(input.selectedKey === item.key) || nothing}>
                        <td>${item.key}</td>
                        <td>${item.value.substr(0, MAX_VALUE_LENGTH)}</td>
                      </tr>`)}
                      <tr placeholder></tr>
                  </table>
                </devtools-data-grid>
              </devtools-widget>
              <devtools-widget
                  slot="sidebar"
                  .widgetConfig=${widgetConfig(VBox, { minimumSize: new Size(0, 50) })}
                  jslog=${VisualLogging.pane('preview').track({ resize: true })}>
               ${input.preview?.element}
              </devtools-widget>
            </devtools-split-view>`, 
                // clang-format on
                target);
            };
        }
        super(opts);
        this.metadataView = metadataView;
        this.#editable = editable;
        this.#view = view;
        this.performUpdate();
        this.#preview =
            new EmptyWidget(i18nString(UIStrings.noPreviewSelected), i18nString(UIStrings.selectAValueToPreview));
        this.#previewValue = null;
        this.showPreview(null, null);
    }
    wasShown() {
        super.wasShown();
        this.refreshItems();
    }
    performUpdate() {
        const that = this;
        const viewOutput = {
            set toolbar(toolbar) {
                that.#toolbar?.removeEventListener("DeleteSelected" /* StorageItemsToolbar.Events.DELETE_SELECTED */, that.deleteSelectedItem, that);
                that.#toolbar?.removeEventListener("DeleteAll" /* StorageItemsToolbar.Events.DELETE_ALL */, that.deleteAllItems, that);
                that.#toolbar?.removeEventListener("Refresh" /* StorageItemsToolbar.Events.REFRESH */, that.refreshItems, that);
                that.#toolbar = toolbar;
                that.#toolbar.addEventListener("DeleteSelected" /* StorageItemsToolbar.Events.DELETE_SELECTED */, that.deleteSelectedItem, that);
                that.#toolbar.addEventListener("DeleteAll" /* StorageItemsToolbar.Events.DELETE_ALL */, that.deleteAllItems, that);
                that.#toolbar.addEventListener("Refresh" /* StorageItemsToolbar.Events.REFRESH */, that.refreshItems, that);
            }
        };
        const viewInput = {
            items: this.#items,
            selectedKey: this.#selectedKey,
            editable: this.#editable,
            preview: this.#preview,
            onSelect: (item) => {
                this.#toolbar?.setCanDeleteSelected(Boolean(item));
                if (!item) {
                    void this.#previewEntry(null);
                }
                else {
                    void this.#previewEntry(item);
                }
            },
            onSort: (ascending) => {
                this.#isSortOrderAscending = ascending;
            },
            onCreate: (key, value) => {
                this.#createCallback(key, value);
            },
            onEdit: (key, value, columnId, valueBeforeEditing, newText) => {
                this.#editingCallback(key, value, columnId, valueBeforeEditing, newText);
            },
            onDelete: (key) => {
                this.#deleteCallback(key);
            },
            onReferesh: () => {
                this.refreshItems();
            },
        };
        this.#view(viewInput, viewOutput, this.contentElement);
    }
    get toolbar() {
        return this.#toolbar;
    }
    refreshItems() {
    }
    deleteAllItems() {
    }
    itemsCleared() {
        this.#items = [];
        this.performUpdate();
        this.#toolbar?.setCanDeleteSelected(false);
    }
    itemRemoved(key) {
        const index = this.#items.findIndex(item => item.key === key);
        if (index === -1) {
            return;
        }
        this.#items.splice(index, 1);
        this.performUpdate();
        this.#toolbar?.setCanDeleteSelected(this.#items.length > 1);
    }
    itemAdded(key, value) {
        if (this.#items.some(item => item.key === key)) {
            return;
        }
        this.#items.push({ key, value });
        this.performUpdate();
    }
    itemUpdated(key, value) {
        const item = this.#items.find(item => item.key === key);
        if (!item) {
            return;
        }
        if (item.value === value) {
            return;
        }
        item.value = value;
        this.performUpdate();
        if (this.#selectedKey !== key) {
            return;
        }
        if (this.#previewValue !== value) {
            void this.#previewEntry({ key, value });
        }
        this.#toolbar?.setCanDeleteSelected(true);
    }
    showItems(items) {
        const sortDirection = this.#isSortOrderAscending ? 1 : -1;
        this.#items = [...items].sort((item1, item2) => sortDirection * (item1.key > item2.key ? 1 : -1));
        const selectedItem = this.#items.find(item => item.key === this.#selectedKey);
        if (!selectedItem) {
            this.#selectedKey = null;
        }
        else {
            void this.#previewEntry(selectedItem);
        }
        this.performUpdate();
        this.#toolbar?.setCanDeleteSelected(Boolean(this.#selectedKey));
        ARIAUtils.LiveAnnouncer.alert(i18nString(UIStrings.numberEntries, { PH1: this.#items.length }));
    }
    deleteSelectedItem() {
        if (!this.#selectedKey) {
            return;
        }
        this.#deleteCallback(this.#selectedKey);
    }
    #createCallback(key, value) {
        this.setItem(key, value);
        this.#removeDupes(key, value);
        void this.#previewEntry({ key, value });
    }
    isEditAllowed(_columnIdentifier, _oldText, _newText) {
        return true;
    }
    #editingCallback(key, value, columnIdentifier, oldText, newText) {
        if (!this.isEditAllowed(columnIdentifier, oldText, newText)) {
            return;
        }
        if (columnIdentifier === 'key') {
            if (typeof oldText === 'string') {
                this.removeItem(oldText);
            }
            this.setItem(newText, value);
            this.#removeDupes(newText, value);
            void this.#previewEntry({ key: newText, value });
        }
        else {
            this.setItem(key, newText);
            void this.#previewEntry({ key, value: newText });
        }
    }
    #removeDupes(key, value) {
        for (let i = this.#items.length - 1; i >= 0; --i) {
            const child = this.#items[i];
            if ((child.key === key) && (value !== child.value)) {
                this.#items.splice(i, 1);
            }
        }
    }
    #deleteCallback(key) {
        this.removeItem(key);
    }
    showPreview(preview, value) {
        if (this.#preview && this.#previewValue === value) {
            return;
        }
        if (this.#preview) {
            this.#preview.detach();
        }
        if (!preview) {
            preview = new EmptyWidget(i18nString(UIStrings.noPreviewSelected), i18nString(UIStrings.selectAValueToPreview));
        }
        this.#previewValue = value;
        this.#preview = preview;
        this.performUpdate();
    }
    async #previewEntry(entry) {
        if (entry?.value) {
            this.#selectedKey = entry.key;
            const preview = await this.createPreview(entry.key, entry.value);
            // Selection could've changed while the preview was loaded
            if (this.#selectedKey === entry.key) {
                this.showPreview(preview, entry.value);
            }
        }
        else {
            this.#selectedKey = null;
            this.showPreview(null, null);
        }
    }
    set editable(editable) {
        this.#editable = editable;
        this.performUpdate();
    }
    keys() {
        return this.#items.map(item => item.key);
    }
}
//# sourceMappingURL=KeyValueStorageItemsView.js.map
// Copyright 2025 The Chromium Authors. All rights reserved.
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
import * as i18n from '../../core/i18n/i18n.js';
import * as DataGrid from '../../ui/legacy/components/data_grid/data_grid.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import {StorageItemsView} from './StorageItemsView.js';

const {ARIAUtils} = UI;
const {EmptyWidget} = UI.EmptyWidget;
const {SplitWidget} = UI.SplitWidget;
const {Widget, VBox} = UI.Widget;
const {DataGridImpl, DataGridNode, Events} = DataGrid.DataGrid;

type DataGridImpl<T> = DataGrid.DataGrid.DataGridImpl<T>;
type DataGridNode<T> = DataGrid.DataGrid.DataGridNode<T>;
type Events = DataGrid.DataGrid.Events;
type Widget = UI.Widget.Widget;
type SplitWidget = UI.SplitWidget.SplitWidget;
type VBox = UI.Widget.VBox;

const UIStrings = {
  /**
   *@description Text that shows in the Applicaiton Panel if no value is selected for preview
   */
  noPreviewSelected: 'No value selected',
  /**
   *@description Preview text when viewing storage in Application panel
   */
  selectAValueToPreview: 'Select a value to preview',
  /**
   *@description Text for announcing number of entries after filtering
   *@example {5} PH1
   */
  numberEntries: 'Number of entries shown in table: {PH1}',
  /**
   *@description Text in DOMStorage Items View of the Application panel
   */
  key: 'Key',
  /**
   *@description Text for the value of something
   */
  value: 'Value',
};
const str_ = i18n.i18n.registerUIStrings('panels/application/KeyValueStorageItemsView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

/**
 * A helper typically used in the Application panel. Renders a split view
 * between a DataGrid displaying key-value pairs and a preview Widget.
 */
export abstract class KeyValueStorageItemsView extends StorageItemsView {
  #dataGrid: DataGridImpl<unknown>;
  readonly #splitWidget: SplitWidget;
  readonly #previewPanel: VBox;
  #preview: Widget|null;
  #previewValue: string|null;

  constructor(title: string, id: string, editable: boolean) {
    super(title, id);
    this.#dataGrid = new DataGridImpl({
      displayName: title,
      columns: [
        {id: 'key', title: i18nString(UIStrings.key), sortable: true, editable, longText: true, weight: 50},
        {id: 'value', title: i18nString(UIStrings.value), sortable: false, editable, longText: true, weight: 50}
      ],
      refreshCallback: this.refreshItems.bind(this),
      ...(editable ? {
        editCallback: this.#editingCallback.bind(this),
        deleteCallback: this.#deleteCallback.bind(this),
      } :
                     {}),
    });
    this.#dataGrid.addEventListener(Events.SELECTED_NODE, event => {
      void this.#previewEntry(event.data);
    });
    this.#dataGrid.addEventListener(Events.DESELECTED_NODE, () => {
      void this.#previewEntry(null);
    });
    this.#dataGrid.addEventListener(Events.SORTING_CHANGED, this.refreshItems, this);
    this.#dataGrid.setStriped(true);
    this.#dataGrid.setName(`${id}-datagrid-with-preview`);

    this.#splitWidget = new SplitWidget(
        /* isVertical: */ false, /* secondIsSidebar: */ true, `${id}-split-view-state`);
    this.#splitWidget.show(this.contentElement);

    this.#previewPanel = new VBox();
    this.#previewPanel.setMinimumSize(0, 50);
    this.#previewPanel.element.setAttribute('jslog', `${VisualLogging.pane('preview').track({resize: true})}`);
    const resizer = this.#previewPanel.element.createChild('div', 'preview-panel-resizer');
    const dataGridWidget = this.#dataGrid.asWidget();
    dataGridWidget.setMinimumSize(0, 50);
    this.#splitWidget.setMainWidget(dataGridWidget);
    this.#splitWidget.setSidebarWidget(this.#previewPanel);
    this.#splitWidget.installResizer(resizer);

    this.#preview = null;
    this.#previewValue = null;

    this.showPreview(null, null);
  }

  get dataGridForTesting(): DataGridImpl<unknown> {
    return this.#dataGrid;
  }

  get previewPanelForTesting(): VBox {
    return this.#previewPanel;
  }

  itemsCleared(): void {
    this.#dataGrid.rootNode().removeChildren();
    this.#dataGrid.addCreationNode(false);
    this.setCanDeleteSelected(false);
  }

  itemRemoved(key: string): void {
    const rootNode = this.#dataGrid.rootNode();
    const children = rootNode.children;

    for (let i = 0; i < children.length; ++i) {
      const childNode = children[i];
      if (childNode.data.key === key) {
        rootNode.removeChild(childNode);
        this.setCanDeleteSelected(children.length > 1);
        return;
      }
    }
  }

  itemAdded(key: string, value: string): void {
    const rootNode = this.#dataGrid.rootNode();
    const children = rootNode.children;

    for (let i = 0; i < children.length; ++i) {
      if (children[i].data.key === key) {
        return;
      }
    }

    const childNode = new DataGridNode({key, value}, false);
    rootNode.insertChild(childNode, children.length - 1);
  }

  itemUpdated(key: string, value: string): void {
    const childNode = this.#dataGrid.rootNode().children.find((child: DataGridNode<unknown>) => child.data.key === key);
    if (!childNode) {
      return;
    }
    if (childNode.data.value !== value) {
      childNode.data.value = value;
      childNode.refresh();
    }
    if (!childNode.selected) {
      return;
    }
    if (this.#previewValue !== value) {
      void this.#previewEntry(childNode);
    }
    this.setCanDeleteSelected(true);
  }

  showItems(items: {key: string, value: string}[]): void {
    const rootNode = this.#dataGrid.rootNode();
    let selectedKey: null = null;
    for (const node of rootNode.children) {
      if (!node.selected) {
        continue;
      }
      selectedKey = node.data.key;
      break;
    }
    rootNode.removeChildren();
    let selectedNode: DataGridNode<unknown>|null = null;
    const sortDirection = this.#dataGrid.isSortOrderAscending() ? 1 : -1;
    // Make a copy to avoid sorting the original array.
    const filteredList = [...items].sort((item1, item2) => {
      return sortDirection * (item1.key > item2.key ? 1 : -1);
    });
    for (const {key, value} of filteredList) {
      const node = new DataGridNode({key, value}, false);
      node.selectable = true;
      rootNode.appendChild(node);
      if (!selectedNode || key === selectedKey) {
        selectedNode = node;
      }
    }
    if (selectedNode) {
      selectedNode.selected = true;
    }
    this.#dataGrid.addCreationNode(false);
    this.setCanDeleteSelected(Boolean(selectedNode));
    ARIAUtils.alert(i18nString(UIStrings.numberEntries, {PH1: filteredList.length}));
  }

  override deleteSelectedItem(): void {
    if (!this.#dataGrid.selectedNode) {
      return;
    }

    this.#deleteCallback(this.#dataGrid.selectedNode);
  }

  #editingCallback(editingNode: DataGridNode<unknown>, columnIdentifier: string, oldText: string, newText: string):
      void {
    if (columnIdentifier === 'key') {
      if (typeof oldText === 'string') {
        this.removeItem(oldText);
      }
      this.setItem(newText, editingNode.data.value || '');
      this.#removeDupes(editingNode);
    } else {
      this.setItem(editingNode.data.key || '', newText);
    }
  }

  #removeDupes(masterNode: DataGridNode<unknown>): void {
    const rootNode = this.#dataGrid.rootNode();
    const children = rootNode.children;
    for (let i = children.length - 1; i >= 0; --i) {
      const childNode = children[i];
      if ((childNode.data.key === masterNode.data.key) && (masterNode !== childNode)) {
        rootNode.removeChild(childNode);
      }
    }
  }

  #deleteCallback(node: DataGridNode<unknown>): void {
    if (!node || node.isCreationNode) {
      return;
    }

    this.removeItem(node.data.key);
  }

  showPreview(preview: Widget|null, value: string|null): void {
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
    preview.show(this.#previewPanel.contentElement);
  }

  async #previewEntry(entry: DataGridNode<unknown>|null): Promise<void> {
    const value = entry && entry.data && entry.data.value;
    if (entry && entry.data && entry.data.value) {
      const preview = await this.createPreview(entry.data.key, value as string);
      // Selection could've changed while the preview was loaded
      if (entry.selected) {
        this.showPreview(preview, value);
      }
    } else {
      this.showPreview(null, value);
    }
  }

  set editable(editable: boolean) {
    if (editable) {
      this.#dataGrid.editCallback = this.#editingCallback.bind(this);
      this.#dataGrid.deleteCallback = this.#deleteCallback.bind(this);
    } else {
      this.#dataGrid.editCallback = undefined;
      this.#dataGrid.deleteCallback = undefined;
    }
  }

  protected abstract setItem(key: string, value: string): void;
  protected abstract removeItem(key: string): void;
  protected abstract createPreview(key: string, value: string): Promise<Widget|null>;
}

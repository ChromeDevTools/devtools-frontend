// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../core/i18n/i18n.js';
import * as UI from '../../ui/legacy/legacy.js';

import networkManageCustomHeadersViewStyles from './networkManageCustomHeadersView.css.js';

const UIStrings = {
  /**
   *@description Text in Network Manage Custom Headers View of the Network panel
   */
  manageHeaderColumns: 'Manage Header Columns',
  /**
   *@description Placeholder text content in Network Manage Custom Headers View of the Network panel
   */
  noCustomHeaders: 'No custom headers',
  /**
   *@description Text of add button in Network Manage Custom Headers View of the Network panel
   */
  addCustomHeader: 'Add custom header…',
  /**
   *@description Text in Network Manage Custom Headers View of the Network panel
   */
  headerName: 'Header Name',
};
const str_ = i18n.i18n.registerUIStrings('panels/network/NetworkManageCustomHeadersView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

interface CustomHeader {
  header: string;
}

export class NetworkManageCustomHeadersView extends UI.Widget.VBox implements UI.ListWidget.Delegate<CustomHeader> {
  private readonly list: UI.ListWidget.ListWidget<CustomHeader>;
  private readonly columnConfigs: Map<string, {
    title: string,
    editable: boolean,
  }>;
  private addHeaderColumnCallback: (arg0: string) => boolean;
  private changeHeaderColumnCallback: (arg0: string, arg1: string) => boolean;
  private readonly removeHeaderColumnCallback: (arg0: string) => boolean;
  private editor?: UI.ListWidget.Editor<CustomHeader>;

  constructor(
      columnData: {
        title: string,
        editable: boolean,
      }[],
      addHeaderColumnCallback: (arg0: string) => boolean,
      changeHeaderColumnCallback: (arg0: string, arg1: string) => boolean,
      removeHeaderColumnCallback: (arg0: string) => boolean) {
    super(true);

    this.contentElement.classList.add('custom-headers-wrapper');
    this.contentElement.createChild('div', 'header').textContent = i18nString(UIStrings.manageHeaderColumns);

    this.list = new UI.ListWidget.ListWidget(this);
    this.list.element.classList.add('custom-headers-list');

    const placeholder = document.createElement('div');
    placeholder.classList.add('custom-headers-list-list-empty');
    placeholder.textContent = i18nString(UIStrings.noCustomHeaders);
    this.list.setEmptyPlaceholder(placeholder);
    this.list.show(this.contentElement);
    this.contentElement.appendChild(
        UI.UIUtils.createTextButton(i18nString(UIStrings.addCustomHeader), this.addButtonClicked.bind(this), {
          className: 'add-button',
          jslogContext: 'network.add-custom-header',
        }));

    this.columnConfigs = new Map();
    columnData.forEach(columnData => this.columnConfigs.set(columnData.title.toLowerCase(), columnData));

    this.addHeaderColumnCallback = addHeaderColumnCallback;
    this.changeHeaderColumnCallback = changeHeaderColumnCallback;
    this.removeHeaderColumnCallback = removeHeaderColumnCallback;

    this.contentElement.tabIndex = 0;
  }

  override wasShown(): void {
    this.headersUpdated();
    this.list.registerCSSFiles([networkManageCustomHeadersViewStyles]);
    this.registerCSSFiles([networkManageCustomHeadersViewStyles]);
  }

  private headersUpdated(): void {
    this.list.clear();
    this.columnConfigs.forEach(headerData => this.list.appendItem({header: headerData.title}, headerData.editable));
  }

  private addButtonClicked(): void {
    this.list.addNewItem(this.columnConfigs.size, {header: ''});
  }

  renderItem(item: CustomHeader, _editable: boolean): Element {
    const element = document.createElement('div');
    element.classList.add('custom-headers-list-item');
    const header = element.createChild('div', 'custom-header-name');
    header.textContent = item.header;
    UI.Tooltip.Tooltip.install(header, item.header);
    return element;
  }

  removeItemRequested(item: CustomHeader, _index: number): void {
    this.removeHeaderColumnCallback(item.header);
    this.columnConfigs.delete(item.header.toLowerCase());
    this.headersUpdated();
  }

  commitEdit(item: CustomHeader, editor: UI.ListWidget.Editor<CustomHeader>, isNew: boolean): void {
    const headerId = editor.control('header').value.trim();
    let success;
    if (isNew) {
      success = this.addHeaderColumnCallback(headerId);
    } else {
      success = this.changeHeaderColumnCallback(item.header, headerId);
    }

    if (success && !isNew) {
      this.columnConfigs.delete(item.header.toLowerCase());
    }
    if (success) {
      this.columnConfigs.set(headerId.toLowerCase(), {title: headerId, editable: true});
    }

    this.headersUpdated();
  }

  beginEdit(item: CustomHeader): UI.ListWidget.Editor<CustomHeader> {
    const editor = this.createEditor();
    editor.control('header').value = item.header;
    return editor;
  }

  private createEditor(): UI.ListWidget.Editor<CustomHeader> {
    if (this.editor) {
      return this.editor;
    }

    const editor = new UI.ListWidget.Editor<CustomHeader>();
    this.editor = editor;
    const content = editor.contentElement();

    const titles = content.createChild('div', 'custom-headers-edit-row');
    titles.createChild('div', 'custom-headers-header').textContent = i18nString(UIStrings.headerName);

    const fields = content.createChild('div', 'custom-headers-edit-row');
    fields.createChild('div', 'custom-headers-header')
        .appendChild(editor.createInput('header', 'text', 'x-custom-header', validateHeader.bind(this)));

    return editor;

    function validateHeader(
        this: NetworkManageCustomHeadersView, item: CustomHeader, _index: number,
        _input: UI.ListWidget.EditorControl): UI.ListWidget.ValidatorResult {
      let valid = true;
      const headerId = editor.control('header').value.trim().toLowerCase();
      if (this.columnConfigs.has(headerId) && item.header !== headerId) {
        valid = false;
      }
      return {valid, errorMessage: undefined};
    }
  }
}

// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';  // eslint-disable-line no-unused-vars
import * as Host from '../host/host.js';
import * as SourceFrame from '../source_frame/source_frame.js';
import * as TextUtils from '../text_utils/text_utils.js';  // eslint-disable-line no-unused-vars
import * as UI from '../ui/ui.js';

export class BinaryResourceView extends UI.Widget.VBox {
  /**
   * @param {string} base64content
   * @param {string} contentUrl
   * @param {!Common.ResourceType.ResourceType} resourceType
   */
  constructor(base64content, contentUrl, resourceType) {
    super();
    this.registerRequiredCSS('network/binaryResourceView.css');

    /** @type {boolean} */
    this._empty = !base64content.length;
    if (this._empty) {
      new UI.EmptyWidget.EmptyWidget('No data present in selected item').show(this.element);
      return;
    }

    this._binaryResourceViewFactory =
        new SourceFrame.BinaryResourceViewFactory.BinaryResourceViewFactory(base64content, contentUrl, resourceType);

    this._toolbar = new UI.Toolbar.Toolbar('binary-view-toolbar', this.element);

    /** @type {!Array<!BinaryViewObject>} */
    this._binaryViewObjects = [
      new BinaryViewObject(
          'base64', ls`Base64`, ls`Copied as Base64`,
          this._binaryResourceViewFactory.createBase64View.bind(this._binaryResourceViewFactory),
          this._binaryResourceViewFactory.base64.bind(this._binaryResourceViewFactory)),
      new BinaryViewObject(
          'hex', ls`Hex Viewer`, ls`Copied as Hex`,
          this._binaryResourceViewFactory.createHexView.bind(this._binaryResourceViewFactory),
          this._binaryResourceViewFactory.hex.bind(this._binaryResourceViewFactory)),
      new BinaryViewObject(
          'utf8', ls`UTF-8`, ls`Copied as UTF-8`,
          this._binaryResourceViewFactory.createUtf8View.bind(this._binaryResourceViewFactory),
          this._binaryResourceViewFactory.utf8.bind(this._binaryResourceViewFactory)),
    ];
    this._binaryViewTypeSetting = Common.Settings.Settings.instance().createSetting('binaryViewType', 'hex');
    this._binaryViewTypeCombobox =
        new UI.Toolbar.ToolbarComboBox(this._binaryViewTypeChanged.bind(this), ls`Binary view type`);
    for (const viewObject of this._binaryViewObjects) {
      this._binaryViewTypeCombobox.addOption(
          this._binaryViewTypeCombobox.createOption(viewObject.label, viewObject.type));
    }
    this._toolbar.appendToolbarItem(this._binaryViewTypeCombobox);

    const copyButton = new UI.Toolbar.ToolbarButton(ls`Copy to clipboard`, 'largeicon-copy');
    copyButton.addEventListener(UI.Toolbar.ToolbarButton.Events.Click, event => {
      this._copySelectedViewToClipboard();
    }, this);
    this._toolbar.appendToolbarItem(copyButton);

    this._copiedText = new UI.Toolbar.ToolbarText();
    this._copiedText.element.classList.add('binary-view-copied-text');
    this._toolbar.element.appendChild(this._copiedText.element);

    /** @type {?number} */
    this._addFadeoutSettimeoutId = null;

    /** @type {?UI.Widget.Widget} */
    this._lastView = null;
    this._updateView();
  }

  /**
   * @return {?BinaryViewObject}
   */
  _getCurrentViewObject() {
    const filter = obj => obj.type === this._binaryViewTypeSetting.get();
    const binaryViewObject = this._binaryViewObjects.find(filter);
    console.assert(
        binaryViewObject,
        `No binary view found for binary view type found in setting 'binaryViewType': ${
            this._binaryViewTypeSetting.get()}`);
    return binaryViewObject || null;
  }

  async _copySelectedViewToClipboard() {
    const viewObject = this._getCurrentViewObject();
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.copyText((await viewObject.content()).content);
    this._copiedText.setText(viewObject.copiedMessage);
    this._copiedText.element.classList.remove('fadeout');
    /**
     * @this {!BinaryResourceView}
     */
    function addFadeoutClass() {
      this._copiedText.element.classList.add('fadeout');
    }
    if (this._addFadeoutSettimeoutId) {
      clearTimeout(this._addFadeoutSettimeoutId);
      this._addFadeoutSettimeoutId = null;
    }
    this._addFadeoutSettimeoutId = setTimeout(addFadeoutClass.bind(this), 2000);
  }

  /**
   * @override
   */
  wasShown() {
    if (!this._empty) {
      this._updateView();
    }
  }

  _updateView() {
    const newViewObject = this._getCurrentViewObject();
    if (!newViewObject) {
      return;
    }

    const newView = newViewObject.getView();
    if (newView === this._lastView) {
      return;
    }

    if (this._lastView) {
      this._lastView.detach();
    }
    this._lastView = newView;

    newView.show(this.element, this._toolbar.element);
    this._binaryViewTypeCombobox.selectElement().value = this._binaryViewTypeSetting.get();
  }

  _binaryViewTypeChanged() {
    const newViewType = this._binaryViewTypeCombobox.selectedOption().value;
    if (this._binaryViewTypeSetting.get() === newViewType) {
      return;
    }
    this._binaryViewTypeSetting.set(newViewType);
    this._updateView();
  }

  /**
   * @param {!UI.ContextMenu.ContextMenu} contextMenu
   * @param {string} submenuItemText
   */
  addCopyToContextMenu(contextMenu, submenuItemText) {
    if (this._empty) {
      return;
    }
    const copyMenu = contextMenu.clipboardSection().appendSubMenuItem(submenuItemText);
    const footerSection = copyMenu.footerSection();

    footerSection.appendItem(ls`Copy as Base64`, async () => {
      const content = await this._binaryResourceViewFactory.base64();
      Host.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(content.content);
    });
    footerSection.appendItem(ls`Copy as Hex`, async () => {
      const content = await this._binaryResourceViewFactory.hex();
      Host.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(content.content);
    });
    footerSection.appendItem(ls`Copy as UTF-8`, async () => {
      const content = await this._binaryResourceViewFactory.utf8();
      Host.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(content.content);
    });
  }
}

export class BinaryViewObject {
  /**
   * @param {string} type
   * @param {string} label
   * @param {string} copiedMessage
   * @param {function():!UI.Widget.Widget} createViewFn
   * @param {function():Promise<!TextUtils.ContentProvider.DeferredContent>} deferredContent
   */
  constructor(type, label, copiedMessage, createViewFn, deferredContent) {
    this.type = type;
    this.label = label;
    this.copiedMessage = copiedMessage;
    this.content = deferredContent;
    this._createViewFn = createViewFn;

    /** @type {?UI.Widget.Widget} */
    this._view = null;
  }

  /**
   * @return {!UI.Widget.Widget}
   */
  getView() {
    if (!this._view) {
      this._view = this._createViewFn();
    }
    return this._view;
  }
}

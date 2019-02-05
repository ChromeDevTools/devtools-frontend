// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

Network.BinaryResourceView = class extends UI.VBox {
  /**
   * @param {string} base64content
   * @param {string} contentUrl
   * @param {!Common.ResourceType} resourceType
   */
  constructor(base64content, contentUrl, resourceType) {
    super();
    this.registerRequiredCSS('network/binaryResourceView.css');

    /** @type {boolean} */
    this._empty = !base64content.length;
    if (this._empty) {
      new UI.EmptyWidget('No data present in selected item').show(this.element);
      return;
    }

    this._binaryResourceViewFactory =
        new SourceFrame.BinaryResourceViewFactory(base64content, contentUrl, resourceType);

    this._toolbar = new UI.Toolbar('binary-view-toolbar', this.element);

    /** @type {!Array<!Network.BinaryResourceView.BinaryViewObject>} */
    this._binaryViewObjects = [
      new Network.BinaryResourceView.BinaryViewObject(
          'base64', ls`Base64`, ls`Copied as Base64`,
          this._binaryResourceViewFactory.createBase64View.bind(this._binaryResourceViewFactory),
          this._binaryResourceViewFactory.base64.bind(this._binaryResourceViewFactory)),
      new Network.BinaryResourceView.BinaryViewObject(
          'hex', ls`Hex Viewer`, ls`Copied as Hex`,
          this._binaryResourceViewFactory.createHexView.bind(this._binaryResourceViewFactory),
          this._binaryResourceViewFactory.hex.bind(this._binaryResourceViewFactory)),
      new Network.BinaryResourceView.BinaryViewObject(
          'utf8', ls`UTF-8`, ls`Copied as UTF-8`,
          this._binaryResourceViewFactory.createUtf8View.bind(this._binaryResourceViewFactory),
          this._binaryResourceViewFactory.utf8.bind(this._binaryResourceViewFactory)),
    ];
    this._binaryViewTypeSetting = Common.settings.createSetting('binaryViewType', 'hex');
    this._binaryViewTypeCombobox = new UI.ToolbarComboBox(this._binaryViewTypeChanged.bind(this));
    for (const viewObject of this._binaryViewObjects) {
      this._binaryViewTypeCombobox.addOption(
          this._binaryViewTypeCombobox.createOption(viewObject.label, viewObject.label, viewObject.type));
    }
    this._toolbar.appendToolbarItem(this._binaryViewTypeCombobox);

    const copyButton = new UI.ToolbarButton(ls`Copy to clipboard`, 'largeicon-copy');
    copyButton.addEventListener(UI.ToolbarButton.Events.Click, this._copySelectedViewToClipboard.bind(this), this);
    this._toolbar.appendToolbarItem(copyButton);

    this._copiedText = new UI.ToolbarText();
    this._copiedText.element.classList.add('binary-view-copied-text');
    this._toolbar.element.appendChild(this._copiedText.element);

    /** @type {?number} */
    this._addFadeoutSettimeoutId = null;

    /** @type {?UI.Widget} */
    this._lastView = null;
    this._updateView();
  }

  /**
   * @return {?Network.BinaryResourceView.BinaryViewObject}
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
    InspectorFrontendHost.copyText(await viewObject.content());
    this._copiedText.setText(viewObject.copiedMessage);
    this._copiedText.element.classList.remove('fadeout');
    /**
     * @this {!Network.BinaryResourceView}
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
    if (!this._empty)
      this._updateView();
  }

  _updateView() {
    const newViewObject = this._getCurrentViewObject();
    if (!newViewObject)
      return;

    const newView = newViewObject.getView();
    if (newView === this._lastView)
      return;

    if (this._lastView)
      this._lastView.detach();
    this._lastView = newView;

    newView.show(this.element, this._toolbar.element);
    this._binaryViewTypeCombobox.selectElement().value = this._binaryViewTypeSetting.get();
  }

  _binaryViewTypeChanged() {
    const newViewType = this._binaryViewTypeCombobox.selectedOption().value;
    if (this._binaryViewTypeSetting.get() === newViewType)
      return;
    this._binaryViewTypeSetting.set(newViewType);
    this._updateView();
  }

  /**
   * @param {!UI.ContextMenu} contextMenu
   * @param {string} submenuItemText
   */
  addCopyToContextMenu(contextMenu, submenuItemText) {
    if (this._empty)
      return;
    const copyMenu = contextMenu.clipboardSection().appendSubMenuItem(submenuItemText);
    const footerSection = copyMenu.footerSection();

    footerSection.appendItem(
        ls`Copy as Base64`, async () => InspectorFrontendHost.copyText(await this._binaryResourceViewFactory.base64()));
    footerSection.appendItem(
        ls`Copy as Hex`, async () => InspectorFrontendHost.copyText(await this._binaryResourceViewFactory.hex()));
    footerSection.appendItem(
        ls`Copy as UTF-8`, async () => InspectorFrontendHost.copyText(await this._binaryResourceViewFactory.utf8()));
  }
};

Network.BinaryResourceView.BinaryViewObject = class {
  /**
   * @param {string} type
   * @param {string} label
   * @param {string} copiedMessage
   * @param {function():!UI.Widget} createViewFn
   * @param {function():Promise<string>} content
   */
  constructor(type, label, copiedMessage, createViewFn, content) {
    this.type = type;
    this.label = label;
    this.copiedMessage = copiedMessage;
    this.content = content;
    this._createViewFn = createViewFn;

    /** @type {?UI.Widget} */
    this._view = null;
  }

  /**
   * @return {!UI.Widget}
   */
  getView() {
    if (!this._view)
      this._view = this._createViewFn();
    return this._view;
  }
};

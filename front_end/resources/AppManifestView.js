// Copyright (c) 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @implements {SDK.TargetManager.Observer}
 * @unrestricted
 */
Resources.AppManifestView = class extends UI.VBox {
  constructor() {
    super(true);
    this.registerRequiredCSS('resources/appManifestView.css');

    Common.moduleSetting('colorFormat').addChangeListener(this._updateManifest.bind(this, true));

    this._emptyView = new UI.EmptyWidget(Common.UIString('No manifest detected'));
    this._emptyView.appendLink(
        'https://developers.google.com/web/fundamentals/engage-and-retain/web-app-manifest/?utm_source=devtools');

    this._emptyView.show(this.contentElement);
    this._emptyView.hideWidget();

    this._reportView = new UI.ReportView(Common.UIString('App Manifest'));
    this._reportView.show(this.contentElement);
    this._reportView.hideWidget();

    this._errorsSection = this._reportView.appendSection(Common.UIString('Errors and warnings'));
    this._installabilitySection = this._reportView.appendSection(Common.UIString('Installability'));
    this._identitySection = this._reportView.appendSection(Common.UIString('Identity'));

    this._presentationSection = this._reportView.appendSection(Common.UIString('Presentation'));
    this._iconsSection = this._reportView.appendSection(Common.UIString('Icons'));

    this._nameField = this._identitySection.appendField(Common.UIString('Name'));
    this._shortNameField = this._identitySection.appendField(Common.UIString('Short name'));

    this._startURLField = this._presentationSection.appendField(Common.UIString('Start URL'));

    const themeColorField = this._presentationSection.appendField(Common.UIString('Theme color'));
    this._themeColorSwatch = InlineEditor.ColorSwatch.create();
    themeColorField.appendChild(this._themeColorSwatch);

    const backgroundColorField = this._presentationSection.appendField(Common.UIString('Background color'));
    this._backgroundColorSwatch = InlineEditor.ColorSwatch.create();
    backgroundColorField.appendChild(this._backgroundColorSwatch);

    this._orientationField = this._presentationSection.appendField(Common.UIString('Orientation'));
    this._displayField = this._presentationSection.appendField(Common.UIString('Display'));

    this._throttler = new Common.Throttler(1000);
    SDK.targetManager.observeTargets(this);
  }

  /**
   * @override
   * @param {!SDK.Target} target
   */
  targetAdded(target) {
    if (this._target)
      return;
    this._target = target;
    this._resourceTreeModel = target.model(SDK.ResourceTreeModel);
    this._serviceWorkerManager = target.model(SDK.ServiceWorkerManager);
    if (!this._resourceTreeModel || !this._serviceWorkerManager)
      return;

    this._updateManifest(true);

    this._registeredListeners = [
      this._resourceTreeModel.addEventListener(
          SDK.ResourceTreeModel.Events.DOMContentLoaded, this._updateManifest.bind(this, true)),
      this._serviceWorkerManager.addEventListener(
          SDK.ServiceWorkerManager.Events.RegistrationUpdated, this._updateManifest.bind(this, false))
    ];
  }

  /**
   * @override
   * @param {!SDK.Target} target
   */
  targetRemoved(target) {
    if (this._target !== target)
      return;
    if (!this._resourceTreeModel || !this._serviceWorkerManager)
      return;
    delete this._resourceTreeModel;
    delete this._serviceWorkerManager;
    Common.EventTarget.removeEventListeners(this._registeredListeners);
  }

  /**
   * @param {boolean} immediately
   */
  async _updateManifest(immediately) {
    const {url, data, errors} = await this._resourceTreeModel.fetchAppManifest();
    const installabilityErrors = await this._resourceTreeModel.getInstallabilityErrors();
    this._throttler.schedule(() => this._renderManifest(url, data, errors, installabilityErrors), immediately);
  }

  /**
   * @param {string} url
   * @param {?string} data
   * @param {!Array<!Protocol.Page.AppManifestError>} errors
   * @param {!Array<string>} installabilityErrors
   */
  async _renderManifest(url, data, errors, installabilityErrors) {
    if (!data && !errors.length) {
      this._emptyView.showWidget();
      this._reportView.hideWidget();
      return;
    }
    this._emptyView.hideWidget();
    this._reportView.showWidget();

    const link = Components.Linkifier.linkifyURL(url);
    link.tabIndex = 0;
    this._reportView.setURL(link);
    this._errorsSection.clearContent();
    this._errorsSection.element.classList.toggle('hidden', !errors.length);
    for (const error of errors) {
      this._errorsSection.appendRow().appendChild(
          UI.createIconLabel(error.message, error.critical ? 'smallicon-error' : 'smallicon-warning'));
    }

    if (!data)
      return;

    if (data.charCodeAt(0) === 0xFEFF)
      data = data.slice(1);  // Trim the BOM as per https://tools.ietf.org/html/rfc7159#section-8.1.

    const parsedManifest = JSON.parse(data);
    this._nameField.textContent = stringProperty('name');
    this._shortNameField.textContent = stringProperty('short_name');

    this._startURLField.removeChildren();
    const startURL = stringProperty('start_url');
    if (startURL) {
      const completeURL = /** @type {string} */ (Common.ParsedURL.completeURL(url, startURL));
      const link = Components.Linkifier.linkifyURL(completeURL, {text: startURL});
      link.tabIndex = 0;
      this._startURLField.appendChild(link);
    }

    this._themeColorSwatch.classList.toggle('hidden', !stringProperty('theme_color'));
    const themeColor = Common.Color.parse(stringProperty('theme_color') || 'white') || Common.Color.parse('white');
    this._themeColorSwatch.setColor(/** @type {!Common.Color} */ (themeColor));
    this._themeColorSwatch.setFormat(Common.Color.detectColorFormat(this._themeColorSwatch.color()));
    this._backgroundColorSwatch.classList.toggle('hidden', !stringProperty('background_color'));
    const backgroundColor =
        Common.Color.parse(stringProperty('background_color') || 'white') || Common.Color.parse('white');
    this._backgroundColorSwatch.setColor(/** @type {!Common.Color} */ (backgroundColor));
    this._backgroundColorSwatch.setFormat(Common.Color.detectColorFormat(this._backgroundColorSwatch.color()));

    this._orientationField.textContent = stringProperty('orientation');
    const displayType = stringProperty('display');
    this._displayField.textContent = displayType;

    const icons = parsedManifest['icons'] || [];
    this._iconsSection.clearContent();

    for (const icon of icons) {
      const title = (icon['sizes'] || '') + '\n' + (icon['type'] || '');
      const field = this._iconsSection.appendField(title);
      const image = await this._loadImage(Common.ParsedURL.completeURL(url, icon['src']));
      if (image)
        field.appendChild(image);
    }

    this._installabilitySection.clearContent();
    this._installabilitySection.element.classList.toggle('hidden', !installabilityErrors.length);
    for (const error of installabilityErrors)
      this._installabilitySection.appendRow().appendChild(UI.createIconLabel(error, 'smallicon-warning'));

    /**
     * @param {string} name
     * @return {string}
     */
    function stringProperty(name) {
      const value = parsedManifest[name];
      if (typeof value !== 'string')
        return '';
      return value;
    }
  }

  /**
   * @param {?string} url
   * @return {!Promise<?Image>}
   */
  async _loadImage(url) {
    const image = createElement('img');
    image.style.maxWidth = '200px';
    image.style.maxHeight = '200px';
    const result = new Promise((f, r) => {
      image.onload = f;
      image.onerror = r;
    });
    image.src = url;
    image.alt = ls`Image from ${url}`;
    try {
      await result;
      return image;
    } catch (e) {
    }
    return null;
  }
};

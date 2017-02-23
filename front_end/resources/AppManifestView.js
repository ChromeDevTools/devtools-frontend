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

    this._emptyView = new UI.EmptyWidget(Common.UIString('No manifest detected'));
    var p = this._emptyView.appendParagraph();
    var linkElement = UI.createExternalLink('https://developers.google.com/web/fundamentals/engage-and-retain/web-app-manifest/?utm_source=devtools',
        Common.UIString('Read more about the web manifest'));
    p.appendChild(UI.formatLocalized('A web manifest allows you to control how your app behaves when launched and displayed to the user. %s', [linkElement]));

    this._emptyView.show(this.contentElement);
    this._emptyView.hideWidget();

    this._reportView = new UI.ReportView(Common.UIString('App Manifest'));
    this._reportView.show(this.contentElement);
    this._reportView.hideWidget();

    this._errorsSection = this._reportView.appendSection(Common.UIString('Errors and warnings'));
    this._identitySection = this._reportView.appendSection(Common.UIString('Identity'));
    var toolbar = this._identitySection.createToolbar();
    toolbar.renderAsLinks();
    var addToHomeScreen =
        new UI.ToolbarButton(Common.UIString('Add to homescreen'), undefined, Common.UIString('Add to homescreen'));
    addToHomeScreen.addEventListener(UI.ToolbarButton.Events.Click, this._addToHomescreen, this);
    toolbar.appendToolbarItem(addToHomeScreen);

    this._presentationSection = this._reportView.appendSection(Common.UIString('Presentation'));
    this._iconsSection = this._reportView.appendSection(Common.UIString('Icons'));

    this._nameField = this._identitySection.appendField(Common.UIString('Name'));
    this._shortNameField = this._identitySection.appendField(Common.UIString('Short name'));

    this._startURLField = this._presentationSection.appendField(Common.UIString('Start URL'));

    var themeColorField = this._presentationSection.appendField(Common.UIString('Theme color'));
    this._themeColorSwatch = InlineEditor.ColorSwatch.create();
    themeColorField.appendChild(this._themeColorSwatch);

    var backgroundColorField = this._presentationSection.appendField(Common.UIString('Background color'));
    this._backgroundColorSwatch = InlineEditor.ColorSwatch.create();
    backgroundColorField.appendChild(this._backgroundColorSwatch);

    this._orientationField = this._presentationSection.appendField(Common.UIString('Orientation'));
    this._displayField = this._presentationSection.appendField(Common.UIString('Display'));

    SDK.targetManager.observeTargets(this, SDK.Target.Capability.DOM);
  }

  /**
   * @override
   * @param {!SDK.Target} target
   */
  targetAdded(target) {
    if (this._resourceTreeModel)
      return;
    var resourceTreeModel = SDK.ResourceTreeModel.fromTarget(target);
    if (!resourceTreeModel)
      return;
    this._resourceTreeModel = resourceTreeModel;
    this._updateManifest();
    resourceTreeModel.addEventListener(SDK.ResourceTreeModel.Events.MainFrameNavigated, this._updateManifest, this);
  }

  /**
   * @override
   * @param {!SDK.Target} target
   */
  targetRemoved(target) {
    var resourceTreeModel = SDK.ResourceTreeModel.fromTarget(target);
    if (!this._resourceTreeModel || this._resourceTreeModel !== resourceTreeModel)
      return;
    resourceTreeModel.removeEventListener(SDK.ResourceTreeModel.Events.MainFrameNavigated, this._updateManifest, this);
    delete this._resourceTreeModel;
  }

  _updateManifest() {
    this._resourceTreeModel.fetchAppManifest(this._renderManifest.bind(this));
  }

  /**
   * @param {string} url
   * @param {?string} data
   * @param {!Array<!Protocol.Page.AppManifestError>} errors
   */
  _renderManifest(url, data, errors) {
    if (!data && !errors.length) {
      this._emptyView.showWidget();
      this._reportView.hideWidget();
      return;
    }
    this._emptyView.hideWidget();
    this._reportView.showWidget();

    this._reportView.setURL(Components.Linkifier.linkifyURL(url));
    this._errorsSection.clearContent();
    this._errorsSection.element.classList.toggle('hidden', !errors.length);
    for (var error of errors) {
      this._errorsSection.appendRow().appendChild(
          UI.createLabel(error.message, error.critical ? 'smallicon-error' : 'smallicon-warning'));
    }

    if (!data)
      return;

    var parsedManifest = JSON.parse(data);
    this._nameField.textContent = stringProperty('name');
    this._shortNameField.textContent = stringProperty('short_name');
    this._startURLField.removeChildren();
    var startURL = stringProperty('start_url');
    if (startURL) {
      this._startURLField.appendChild(Components.Linkifier.linkifyURL(
          /** @type {string} */ (Common.ParsedURL.completeURL(url, startURL)), startURL));
    }

    this._themeColorSwatch.classList.toggle('hidden', !stringProperty('theme_color'));
    var themeColor = Common.Color.parse(stringProperty('theme_color') || 'white') || Common.Color.parse('white');
    this._themeColorSwatch.setColor(/** @type {!Common.Color} */ (themeColor));
    this._backgroundColorSwatch.classList.toggle('hidden', !stringProperty('background_color'));
    var backgroundColor =
        Common.Color.parse(stringProperty('background_color') || 'white') || Common.Color.parse('white');
    this._backgroundColorSwatch.setColor(/** @type {!Common.Color} */ (backgroundColor));

    this._orientationField.textContent = stringProperty('orientation');
    this._displayField.textContent = stringProperty('display');

    var icons = parsedManifest['icons'] || [];
    this._iconsSection.clearContent();
    for (var icon of icons) {
      var title = (icon['sizes'] || '') + '\n' + (icon['type'] || '');
      var field = this._iconsSection.appendField(title);
      var imageElement = field.createChild('img');
      imageElement.style.maxWidth = '200px';
      imageElement.style.maxHeight = '200px';
      imageElement.src = Common.ParsedURL.completeURL(url, icon['src']);
    }

    /**
     * @param {string} name
     * @return {string}
     */
    function stringProperty(name) {
      var value = parsedManifest[name];
      if (typeof value !== 'string')
        return '';
      return value;
    }
  }

  /**
   * @param {!Common.Event} event
   */
  _addToHomescreen(event) {
    var target = SDK.targetManager.mainTarget();
    if (target && target.hasBrowserCapability()) {
      target.pageAgent().requestAppBanner();
      Common.console.show();
    }
  }
};

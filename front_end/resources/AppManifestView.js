// Copyright (c) 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @constructor
 * @extends {WebInspector.VBox}
 * @implements {WebInspector.TargetManager.Observer}
 */
WebInspector.AppManifestView = function() {
  WebInspector.VBox.call(this, true);
  this.registerRequiredCSS('resources/appManifestView.css');

  this._reportView = new WebInspector.ReportView(WebInspector.UIString('App Manifest'));
  this._reportView.show(this.contentElement);

  this._errorsSection =
      this._reportView.appendSection(WebInspector.UIString('Errors and warnings'));
  this._identitySection = this._reportView.appendSection(WebInspector.UIString('Identity'));
  var toolbar = this._identitySection.createToolbar();
  toolbar.renderAsLinks();
  var addToHomeScreen = new WebInspector.ToolbarButton(
      WebInspector.UIString('Add to homescreen'), undefined,
      WebInspector.UIString('Add to homescreen'));
  addToHomeScreen.addEventListener('click', this._addToHomescreen.bind(this));
  toolbar.appendToolbarItem(addToHomeScreen);

  this._presentationSection = this._reportView.appendSection(WebInspector.UIString('Presentation'));
  this._iconsSection = this._reportView.appendSection(WebInspector.UIString('Icons'));

  this._nameField = this._identitySection.appendField(WebInspector.UIString('Name'));
  this._shortNameField = this._identitySection.appendField(WebInspector.UIString('Short name'));

  this._startURLField = this._presentationSection.appendField(WebInspector.UIString('Start URL'));

  var themeColorField = this._presentationSection.appendField(WebInspector.UIString('Theme color'));
  this._themeColorSwatch = WebInspector.ColorSwatch.create();
  themeColorField.appendChild(this._themeColorSwatch);

  var backgroundColorField =
      this._presentationSection.appendField(WebInspector.UIString('Background color'));
  this._backgroundColorSwatch = WebInspector.ColorSwatch.create();
  backgroundColorField.appendChild(this._backgroundColorSwatch);

  this._orientationField =
      this._presentationSection.appendField(WebInspector.UIString('Orientation'));
  this._displayField = this._presentationSection.appendField(WebInspector.UIString('Display'));

  WebInspector.targetManager.observeTargets(this, WebInspector.Target.Capability.DOM);
};

WebInspector.AppManifestView.prototype = {
  /**
   * @override
   * @param {!WebInspector.Target} target
   */
  targetAdded: function(target) {
    if (this._resourceTreeModel)
      return;
    var resourceTreeModel = WebInspector.ResourceTreeModel.fromTarget(target);
    this._resourceTreeModel = resourceTreeModel;
    this._updateManifest();
    resourceTreeModel.addEventListener(
        WebInspector.ResourceTreeModel.Events.MainFrameNavigated, this._updateManifest, this);
  },

  /**
   * @override
   * @param {!WebInspector.Target} target
   */
  targetRemoved: function(target) {},

  _updateManifest: function() {
    this._resourceTreeModel.fetchAppManifest(this._renderManifest.bind(this));
  },

  /**
   * @param {string} url
   * @param {?string} data
   * @param {!Array<!PageAgent.AppManifestError>} errors
   */
  _renderManifest: function(url, data, errors) {
    this._reportView.setURL(url);
    this._errorsSection.clearContent();
    this._errorsSection.element.classList.toggle('hidden', !errors.length);
    for (var error of errors)
      this._errorsSection.appendRow().appendChild(
          createLabel(error.message, error.critical ? 'error-icon' : 'warning-icon'));

    if (!data)
      data = '{}';

    var parsedManifest = JSON.parse(data);
    this._nameField.textContent = stringProperty('name');
    this._shortNameField.textContent = stringProperty('short_name');
    this._startURLField.removeChildren();
    var startURL = stringProperty('start_url');
    if (startURL)
      this._startURLField.appendChild(WebInspector.linkifyResourceAsNode(
          /** @type {string} */ (WebInspector.ParsedURL.completeURL(url, startURL)), undefined,
          undefined, undefined, undefined, startURL));

    this._themeColorSwatch.classList.toggle('hidden', !stringProperty('theme_color'));
    var themeColor = WebInspector.Color.parse(stringProperty('theme_color') || 'white') ||
        WebInspector.Color.parse('white');
    this._themeColorSwatch.setColor(/** @type {!WebInspector.Color} */ (themeColor));
    this._backgroundColorSwatch.classList.toggle('hidden', !stringProperty('background_color'));
    var backgroundColor = WebInspector.Color.parse(stringProperty('background_color') || 'white') ||
        WebInspector.Color.parse('white');
    this._backgroundColorSwatch.setColor(/** @type {!WebInspector.Color} */ (backgroundColor));

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
      imageElement.src = WebInspector.ParsedURL.completeURL(url, icon['src']);
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
  },

  _addToHomescreen: function() {
    var target = WebInspector.targetManager.mainTarget();
    if (target && target.hasBrowserCapability()) {
      target.pageAgent().requestAppBanner();
      WebInspector.console.show();
    }
  },

  __proto__: WebInspector.VBox.prototype
};

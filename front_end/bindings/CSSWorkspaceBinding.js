// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @implements {SDK.SDKModelObserver<!SDK.CSSModel>}
 */
Bindings.CSSWorkspaceBinding = class {
  /**
   * @param {!SDK.TargetManager} targetManager
   * @param {!Workspace.Workspace} workspace
   */
  constructor(targetManager, workspace) {
    this._workspace = workspace;

    /** @type {!Map.<!SDK.CSSModel, !Bindings.CSSWorkspaceBinding.ModelInfo>} */
    this._modelToInfo = new Map();
    targetManager.observeModels(SDK.CSSModel, this);
  }

  /**
   * @override
   * @param {!SDK.CSSModel} cssModel
   */
  modelAdded(cssModel) {
    this._modelToInfo.set(cssModel, new Bindings.CSSWorkspaceBinding.ModelInfo(cssModel, this._workspace));
  }

  /**
   * @override
   * @param {!SDK.CSSModel} cssModel
   */
  modelRemoved(cssModel) {
    this._modelToInfo.get(cssModel)._dispose();
    this._modelToInfo.delete(cssModel);
  }

  /**
   * @param {!SDK.CSSStyleSheetHeader} header
   */
  updateLocations(header) {
    this._modelToInfo.get(header.cssModel())._updateLocations(header);
  }

  /**
   * @param {!SDK.CSSLocation} rawLocation
   * @param {function(!Bindings.LiveLocation)} updateDelegate
   * @param {!Bindings.LiveLocationPool} locationPool
   * @return {!Bindings.CSSWorkspaceBinding.LiveLocation}
   */
  createLiveLocation(rawLocation, updateDelegate, locationPool) {
    return this._modelToInfo.get(rawLocation.cssModel())._createLiveLocation(rawLocation, updateDelegate, locationPool);
  }

  /**
   * @param {!SDK.CSSProperty} cssProperty
   * @param {boolean} forName
   * @return {?Workspace.UILocation}
   */
  propertyUILocation(cssProperty, forName) {
    var style = cssProperty.ownerStyle;
    if (!style || style.type !== SDK.CSSStyleDeclaration.Type.Regular || !style.styleSheetId)
      return null;
    var header = style.cssModel().styleSheetHeaderForId(style.styleSheetId);
    if (!header)
      return null;

    var range = forName ? cssProperty.nameRange() : cssProperty.valueRange();
    if (!range)
      return null;

    var lineNumber = range.startLine;
    var columnNumber = range.startColumn;
    var rawLocation = new SDK.CSSLocation(
        header, header.lineNumberInSource(lineNumber), header.columnNumberInSource(lineNumber, columnNumber));
    return this.rawLocationToUILocation(rawLocation);
  }

  /**
   * @param {?SDK.CSSLocation} rawLocation
   * @return {?Workspace.UILocation}
   */
  rawLocationToUILocation(rawLocation) {
    if (!rawLocation)
      return null;
    return this._modelToInfo.get(rawLocation.cssModel())._rawLocationToUILocation(rawLocation);
  }
};

Bindings.CSSWorkspaceBinding.ModelInfo = class {
  /**
   * @param {!SDK.CSSModel} cssModel
   * @param {!Workspace.Workspace} workspace
   */
  constructor(cssModel, workspace) {
    this._eventListeners = [
      cssModel.addEventListener(SDK.CSSModel.Events.StyleSheetAdded, this._styleSheetAdded, this),
      cssModel.addEventListener(SDK.CSSModel.Events.StyleSheetRemoved, this._styleSheetRemoved, this)
    ];

    this._stylesSourceMapping = new Bindings.StylesSourceMapping(cssModel, workspace);
    this._sassSourceMapping =
        new Bindings.SASSSourceMapping(cssModel, workspace, Bindings.NetworkProject.forTarget(cssModel.target()));

    /** @type {!Multimap<!SDK.CSSStyleSheetHeader, !Bindings.CSSWorkspaceBinding.LiveLocation>} */
    this._locations = new Multimap();
    /** @type {!Multimap<string, !Bindings.CSSWorkspaceBinding.LiveLocation>} */
    this._unboundLocations = new Multimap();
  }

  /**
   * @param {!SDK.CSSLocation} rawLocation
   * @param {function(!Bindings.LiveLocation)} updateDelegate
   * @param {!Bindings.LiveLocationPool} locationPool
   * @return {!Bindings.CSSWorkspaceBinding.LiveLocation}
   */
  _createLiveLocation(rawLocation, updateDelegate, locationPool) {
    var location = new Bindings.CSSWorkspaceBinding.LiveLocation(rawLocation, this, updateDelegate, locationPool);
    var header = rawLocation.header();
    if (header) {
      location._header = header;
      this._locations.set(header, location);
      location.update();
    } else {
      this._unboundLocations.set(rawLocation.url, location);
    }
    return location;
  }

  /**
   * @param {!Bindings.CSSWorkspaceBinding.LiveLocation} location
   */
  _disposeLocation(location) {
    if (location._header)
      this._locations.remove(location._header, location);
    else
      this._unboundLocations.remove(location._url, location);
  }

  /**
   * @param {!SDK.CSSStyleSheetHeader} header
   */
  _updateLocations(header) {
    for (var location of this._locations.get(header))
      location.update();
  }

  /**
   * @param {!Common.Event} event
   */
  _styleSheetAdded(event) {
    var header = /** @type {!SDK.CSSStyleSheetHeader} */ (event.data);
    if (!header.sourceURL)
      return;

    for (var location of this._unboundLocations.get(header.sourceURL)) {
      location._header = header;
      this._locations.set(header, location);
      location.update();
    }
    this._unboundLocations.removeAll(header.sourceURL);
  }

  /**
   * @param {!Common.Event} event
   */
  _styleSheetRemoved(event) {
    var header = /** @type {!SDK.CSSStyleSheetHeader} */ (event.data);
    for (var location of this._locations.get(header)) {
      location._header = null;
      this._unboundLocations.set(location._url, location);
      location.update();
    }
    this._locations.removeAll(header);
  }

  /**
   * @param {!SDK.CSSLocation} rawLocation
   * @return {?Workspace.UILocation}
   */
  _rawLocationToUILocation(rawLocation) {
    var uiLocation = null;
    uiLocation = uiLocation || this._sassSourceMapping.rawLocationToUILocation(rawLocation);
    uiLocation = uiLocation || this._stylesSourceMapping.rawLocationToUILocation(rawLocation);
    return uiLocation;
  }

  _dispose() {
    Common.EventTarget.removeEventListeners(this._eventListeners);
    this._stylesSourceMapping.dispose();
    this._sassSourceMapping.dispose();
  }
};

/**
 * @unrestricted
 */
Bindings.CSSWorkspaceBinding.LiveLocation = class extends Bindings.LiveLocationWithPool {
  /**
   * @param {!SDK.CSSLocation} rawLocation
   * @param {!Bindings.CSSWorkspaceBinding.ModelInfo} info
   * @param {function(!Bindings.LiveLocation)} updateDelegate
   * @param {!Bindings.LiveLocationPool} locationPool
   */
  constructor(rawLocation, info, updateDelegate, locationPool) {
    super(updateDelegate, locationPool);
    this._url = rawLocation.url;
    this._lineNumber = rawLocation.lineNumber;
    this._columnNumber = rawLocation.columnNumber;
    this._info = info;
    this._header = null;
  }

  /**
   * @override
   * @return {?Workspace.UILocation}
   */
  uiLocation() {
    if (!this._header)
      return null;
    var rawLocation = new SDK.CSSLocation(this._header, this._lineNumber, this._columnNumber);
    return this._info._rawLocationToUILocation(rawLocation);
  }

  /**
   * @override
   */
  dispose() {
    super.dispose();
    this._info._disposeLocation(this);
  }

  /**
   * @override
   * @return {boolean}
   */
  isBlackboxed() {
    return false;
  }
};

/**
 * @type {!Bindings.CSSWorkspaceBinding}
 */
Bindings.cssWorkspaceBinding;

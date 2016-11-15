// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @implements {SDK.TargetManager.Observer}
 * @unrestricted
 */
Bindings.CSSWorkspaceBinding = class {
  /**
   * @param {!SDK.TargetManager} targetManager
   * @param {!Workspace.Workspace} workspace
   * @param {!Bindings.NetworkMapping} networkMapping
   */
  constructor(targetManager, workspace, networkMapping) {
    this._workspace = workspace;
    this._networkMapping = networkMapping;

    /** @type {!Map.<!SDK.CSSModel, !Bindings.CSSWorkspaceBinding.TargetInfo>} */
    this._modelToTargetInfo = new Map();
    targetManager.observeTargets(this);
  }

  /**
   * @override
   * @param {!SDK.Target} target
   */
  targetAdded(target) {
    var cssModel = SDK.CSSModel.fromTarget(target);
    if (cssModel) {
      this._modelToTargetInfo.set(
          cssModel, new Bindings.CSSWorkspaceBinding.TargetInfo(cssModel, this._workspace, this._networkMapping));
    }
  }

  /**
   * @override
   * @param {!SDK.Target} target
   */
  targetRemoved(target) {
    var cssModel = SDK.CSSModel.fromTarget(target);
    if (cssModel)
      this._modelToTargetInfo.remove(cssModel)._dispose();
  }

  /**
   * @param {!SDK.CSSStyleSheetHeader} header
   * @return {?Bindings.CSSWorkspaceBinding.TargetInfo}
   */
  _targetInfo(header) {
    return this._modelToTargetInfo.get(header.cssModel()) || null;
  }

  /**
   * @param {!SDK.CSSStyleSheetHeader} header
   * @return {!Bindings.CSSWorkspaceBinding.TargetInfo}
   */
  _ensureTargetInfo(header) {
    var targetInfo = this._modelToTargetInfo.get(header.cssModel());
    if (!targetInfo) {
      targetInfo =
          new Bindings.CSSWorkspaceBinding.TargetInfo(header.cssModel(), this._workspace, this._networkMapping);
      this._modelToTargetInfo.set(header.cssModel(), targetInfo);
    }
    return targetInfo;
  }

  /**
   * @param {!SDK.CSSStyleSheetHeader} header
   */
  updateLocations(header) {
    var targetInfo = this._targetInfo(header);
    if (targetInfo)
      targetInfo._updateLocations(header);
  }

  /**
   * @param {!SDK.CSSLocation} rawLocation
   * @param {function(!Bindings.LiveLocation)} updateDelegate
   * @param {!Bindings.LiveLocationPool} locationPool
   * @return {!Bindings.CSSWorkspaceBinding.LiveLocation}
   */
  createLiveLocation(rawLocation, updateDelegate, locationPool) {
    var header =
        rawLocation.styleSheetId ? rawLocation.cssModel().styleSheetHeaderForId(rawLocation.styleSheetId) : null;
    return new Bindings.CSSWorkspaceBinding.LiveLocation(
        rawLocation.cssModel(), header, rawLocation, this, updateDelegate, locationPool);
  }

  /**
   * @param {!Bindings.CSSWorkspaceBinding.LiveLocation} location
   */
  _addLiveLocation(location) {
    this._ensureTargetInfo(location._header)._addLocation(location);
  }

  /**
   * @param {!Bindings.CSSWorkspaceBinding.LiveLocation} location
   */
  _removeLiveLocation(location) {
    var targetInfo = this._targetInfo(location._header);
    if (targetInfo)
      targetInfo._removeLocation(location);
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
    var header = rawLocation.cssModel().styleSheetHeaderForId(rawLocation.styleSheetId);
    if (!header)
      return null;
    var targetInfo = this._targetInfo(header);
    return targetInfo ? targetInfo._rawLocationToUILocation(header, rawLocation.lineNumber, rawLocation.columnNumber) :
                        null;
  }
};

/**
 * @unrestricted
 */
Bindings.CSSWorkspaceBinding.TargetInfo = class {
  /**
   * @param {!SDK.CSSModel} cssModel
   * @param {!Workspace.Workspace} workspace
   * @param {!Bindings.NetworkMapping} networkMapping
   */
  constructor(cssModel, workspace, networkMapping) {
    this._cssModel = cssModel;
    this._stylesSourceMapping = new Bindings.StylesSourceMapping(cssModel, workspace, networkMapping);
    this._sassSourceMapping =
        new Bindings.SASSSourceMapping(cssModel, networkMapping, Bindings.NetworkProject.forTarget(cssModel.target()));

    /** @type {!Multimap<!SDK.CSSStyleSheetHeader, !Bindings.LiveLocation>} */
    this._locations = new Multimap();
  }

  /**
   * @param {!Bindings.CSSWorkspaceBinding.LiveLocation} location
   */
  _addLocation(location) {
    var header = location._header;
    this._locations.set(header, location);
    location.update();
  }

  /**
   * @param {!Bindings.CSSWorkspaceBinding.LiveLocation} location
   */
  _removeLocation(location) {
    this._locations.remove(location._header, location);
  }

  /**
   * @param {!SDK.CSSStyleSheetHeader} header
   */
  _updateLocations(header) {
    for (var location of this._locations.get(header))
      location.update();
  }

  /**
   * @param {!SDK.CSSStyleSheetHeader} header
   * @param {number} lineNumber
   * @param {number=} columnNumber
   * @return {?Workspace.UILocation}
   */
  _rawLocationToUILocation(header, lineNumber, columnNumber) {
    var rawLocation = new SDK.CSSLocation(header, lineNumber, columnNumber);
    var uiLocation = null;
    uiLocation = uiLocation || this._sassSourceMapping.rawLocationToUILocation(rawLocation);
    uiLocation = uiLocation || this._stylesSourceMapping.rawLocationToUILocation(rawLocation);
    return uiLocation;
  }

  _dispose() {
    this._stylesSourceMapping.dispose();
    this._sassSourceMapping.dispose();
  }
};

/**
 * @unrestricted
 */
Bindings.CSSWorkspaceBinding.LiveLocation = class extends Bindings.LiveLocationWithPool {
  /**
   * @param {!SDK.CSSModel} cssModel
   * @param {?SDK.CSSStyleSheetHeader} header
   * @param {!SDK.CSSLocation} rawLocation
   * @param {!Bindings.CSSWorkspaceBinding} binding
   * @param {function(!Bindings.LiveLocation)} updateDelegate
   * @param {!Bindings.LiveLocationPool} locationPool
   */
  constructor(cssModel, header, rawLocation, binding, updateDelegate, locationPool) {
    super(updateDelegate, locationPool);
    this._cssModel = cssModel;
    this._rawLocation = rawLocation;
    this._binding = binding;
    if (!header)
      this._clearStyleSheet();
    else
      this._setStyleSheet(header);
  }

  /**
   * @param {!Common.Event} event
   */
  _styleSheetAdded(event) {
    console.assert(!this._header);
    var header = /** @type {!SDK.CSSStyleSheetHeader} */ (event.data);
    if (header.sourceURL && header.sourceURL === this._rawLocation.url)
      this._setStyleSheet(header);
  }

  /**
   * @param {!Common.Event} event
   */
  _styleSheetRemoved(event) {
    console.assert(this._header);
    var header = /** @type {!SDK.CSSStyleSheetHeader} */ (event.data);
    if (this._header !== header)
      return;
    this._binding._removeLiveLocation(this);
    this._clearStyleSheet();
  }

  /**
   * @param {!SDK.CSSStyleSheetHeader} header
   */
  _setStyleSheet(header) {
    this._header = header;
    this._binding._addLiveLocation(this);
    this._cssModel.removeEventListener(SDK.CSSModel.Events.StyleSheetAdded, this._styleSheetAdded, this);
    this._cssModel.addEventListener(SDK.CSSModel.Events.StyleSheetRemoved, this._styleSheetRemoved, this);
  }

  _clearStyleSheet() {
    delete this._header;
    this._cssModel.removeEventListener(SDK.CSSModel.Events.StyleSheetRemoved, this._styleSheetRemoved, this);
    this._cssModel.addEventListener(SDK.CSSModel.Events.StyleSheetAdded, this._styleSheetAdded, this);
  }

  /**
   * @override
   * @return {?Workspace.UILocation}
   */
  uiLocation() {
    var cssLocation = this._rawLocation;
    if (this._header) {
      var targetInfo = this._binding._targetInfo(this._header);
      return targetInfo._rawLocationToUILocation(this._header, cssLocation.lineNumber, cssLocation.columnNumber);
    }
    var uiSourceCode = this._binding._networkMapping.uiSourceCodeForStyleURL(cssLocation.url, cssLocation.header());
    if (!uiSourceCode)
      return null;
    return uiSourceCode.uiLocation(cssLocation.lineNumber, cssLocation.columnNumber);
  }

  /**
   * @override
   */
  dispose() {
    super.dispose();
    if (this._header)
      this._binding._removeLiveLocation(this);
    this._cssModel.removeEventListener(SDK.CSSModel.Events.StyleSheetAdded, this._styleSheetAdded, this);
    this._cssModel.removeEventListener(SDK.CSSModel.Events.StyleSheetRemoved, this._styleSheetRemoved, this);
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

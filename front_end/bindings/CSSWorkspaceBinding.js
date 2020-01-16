// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {LiveLocation as LiveLocationInterface, LiveLocationPool, LiveLocationWithPool} from './LiveLocation.js';  // eslint-disable-line no-unused-vars
import {SASSSourceMapping} from './SASSSourceMapping.js';
import {StylesSourceMapping} from './StylesSourceMapping.js';

/**
 * @implements {SDK.SDKModelObserver<!SDK.CSSModel>}
 */
export class CSSWorkspaceBinding {
  /**
   * @param {!SDK.TargetManager} targetManager
   * @param {!Workspace.Workspace} workspace
   */
  constructor(targetManager, workspace) {
    this._workspace = workspace;

    /** @type {!Map.<!SDK.CSSModel, !ModelInfo>} */
    this._modelToInfo = new Map();
    /** @type {!Array<!SourceMapping>} */
    this._sourceMappings = [];
    targetManager.observeModels(SDK.CSSModel, this);
  }

  /**
   * @override
   * @param {!SDK.CSSModel} cssModel
   */
  modelAdded(cssModel) {
    this._modelToInfo.set(cssModel, new ModelInfo(cssModel, this._workspace));
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
   * @param {function(!LiveLocationInterface)} updateDelegate
   * @param {!LiveLocationPool} locationPool
   * @return {!LiveLocation}
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
    const style = cssProperty.ownerStyle;
    if (!style || style.type !== SDK.CSSStyleDeclaration.Type.Regular || !style.styleSheetId) {
      return null;
    }
    const header = style.cssModel().styleSheetHeaderForId(style.styleSheetId);
    if (!header) {
      return null;
    }

    const range = forName ? cssProperty.nameRange() : cssProperty.valueRange();
    if (!range) {
      return null;
    }

    const lineNumber = range.startLine;
    const columnNumber = range.startColumn;
    const rawLocation = new SDK.CSSLocation(
        header, header.lineNumberInSource(lineNumber), header.columnNumberInSource(lineNumber, columnNumber));
    return this.rawLocationToUILocation(rawLocation);
  }

  /**
   * @param {!SDK.CSSLocation} rawLocation
   * @return {?Workspace.UILocation}
   */
  rawLocationToUILocation(rawLocation) {
    for (let i = this._sourceMappings.length - 1; i >= 0; --i) {
      const uiLocation = this._sourceMappings[i].rawLocationToUILocation(rawLocation);
      if (uiLocation) {
        return uiLocation;
      }
    }
    return this._modelToInfo.get(rawLocation.cssModel())._rawLocationToUILocation(rawLocation);
  }

  /**
   * @param {!Workspace.UILocation} uiLocation
   * @return {!Array<!SDK.CSSLocation>}
   */
  uiLocationToRawLocations(uiLocation) {
    for (let i = this._sourceMappings.length - 1; i >= 0; --i) {
      const rawLocations = this._sourceMappings[i].uiLocationToRawLocations(uiLocation);
      if (rawLocations.length) {
        return rawLocations;
      }
    }
    const rawLocations = [];
    for (const modelInfo of this._modelToInfo.values()) {
      rawLocations.push(...modelInfo._uiLocationToRawLocations(uiLocation));
    }
    return rawLocations;
  }

  /**
   * @param {!SourceMapping} sourceMapping
   */
  addSourceMapping(sourceMapping) {
    this._sourceMappings.push(sourceMapping);
  }
}

/**
 * @interface
 */
export class SourceMapping {
  /**
   * @param {!SDK.CSSLocation} rawLocation
   * @return {?Workspace.UILocation}
   */
  rawLocationToUILocation(rawLocation) {
  }

  /**
   * @param {!Workspace.UILocation} uiLocation
   * @return {!Array<!SDK.CSSLocation>}
   */
  uiLocationToRawLocations(uiLocation) {
  }
}

export class ModelInfo {
  /**
   * @param {!SDK.CSSModel} cssModel
   * @param {!Workspace.Workspace} workspace
   */
  constructor(cssModel, workspace) {
    this._eventListeners = [
      cssModel.addEventListener(SDK.CSSModel.Events.StyleSheetAdded, this._styleSheetAdded, this),
      cssModel.addEventListener(SDK.CSSModel.Events.StyleSheetRemoved, this._styleSheetRemoved, this)
    ];

    this._stylesSourceMapping = new StylesSourceMapping(cssModel, workspace);
    const sourceMapManager = cssModel.sourceMapManager();
    this._sassSourceMapping = new SASSSourceMapping(cssModel.target(), sourceMapManager, workspace);

    /** @type {!Platform.Multimap<!SDK.CSSStyleSheetHeader, !LiveLocation>} */
    this._locations = new Platform.Multimap();
    /** @type {!Platform.Multimap<string, !LiveLocation>} */
    this._unboundLocations = new Platform.Multimap();
  }

  /**
   * @param {!SDK.CSSLocation} rawLocation
   * @param {function(!LiveLocationInterface)} updateDelegate
   * @param {!LiveLocationPool} locationPool
   * @return {!LiveLocation}
   */
  _createLiveLocation(rawLocation, updateDelegate, locationPool) {
    const location = new LiveLocation(rawLocation, this, updateDelegate, locationPool);
    const header = rawLocation.header();
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
   * @param {!LiveLocation} location
   */
  _disposeLocation(location) {
    if (location._header) {
      this._locations.delete(location._header, location);
    } else {
      this._unboundLocations.delete(location._url, location);
    }
  }

  /**
   * @param {!SDK.CSSStyleSheetHeader} header
   */
  _updateLocations(header) {
    for (const location of this._locations.get(header)) {
      location.update();
    }
  }

  /**
   * @param {!Common.Event} event
   */
  _styleSheetAdded(event) {
    const header = /** @type {!SDK.CSSStyleSheetHeader} */ (event.data);
    if (!header.sourceURL) {
      return;
    }

    for (const location of this._unboundLocations.get(header.sourceURL)) {
      location._header = header;
      this._locations.set(header, location);
      location.update();
    }
    this._unboundLocations.deleteAll(header.sourceURL);
  }

  /**
   * @param {!Common.Event} event
   */
  _styleSheetRemoved(event) {
    const header = /** @type {!SDK.CSSStyleSheetHeader} */ (event.data);
    for (const location of this._locations.get(header)) {
      location._header = null;
      this._unboundLocations.set(location._url, location);
      location.update();
    }
    this._locations.deleteAll(header);
  }

  /**
   * @param {!SDK.CSSLocation} rawLocation
   * @return {?Workspace.UILocation}
   */
  _rawLocationToUILocation(rawLocation) {
    let uiLocation = null;
    uiLocation = uiLocation || this._sassSourceMapping.rawLocationToUILocation(rawLocation);
    uiLocation = uiLocation || this._stylesSourceMapping.rawLocationToUILocation(rawLocation);
    uiLocation = uiLocation || Bindings.resourceMapping.cssLocationToUILocation(rawLocation);
    return uiLocation;
  }

  /**
   * @param {!Workspace.UILocation} uiLocation
   * @return {!Array<!SDK.CSSLocation>}
   */
  _uiLocationToRawLocations(uiLocation) {
    let rawLocations = this._sassSourceMapping.uiLocationToRawLocations(uiLocation);
    if (rawLocations.length) {
      return rawLocations;
    }
    rawLocations = this._stylesSourceMapping.uiLocationToRawLocations(uiLocation);
    if (rawLocations.length) {
      return rawLocations;
    }
    return Bindings.resourceMapping.uiLocationToCSSLocations(uiLocation);
  }

  _dispose() {
    Common.EventTarget.removeEventListeners(this._eventListeners);
    this._stylesSourceMapping.dispose();
    this._sassSourceMapping.dispose();
  }
}

/**
 * @unrestricted
 */
export class LiveLocation extends LiveLocationWithPool {
  /**
   * @param {!SDK.CSSLocation} rawLocation
   * @param {!ModelInfo} info
   * @param {function(!LiveLocationInterface)} updateDelegate
   * @param {!LiveLocationPool} locationPool
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
    if (!this._header) {
      return null;
    }
    const rawLocation = new SDK.CSSLocation(this._header, this._lineNumber, this._columnNumber);
    return Bindings.cssWorkspaceBinding.rawLocationToUILocation(rawLocation);
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
}
